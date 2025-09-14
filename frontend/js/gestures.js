class TouchGestureHandler {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.isScrolling = false;
        this.swipeThreshold = 100;
        this.timeThreshold = 500;
        this.scrollThreshold = 30;

        this.init();
    }

    init() {
        // Add touch event listeners
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });

        // Add pull-to-refresh gesture
        this.initPullToRefresh();

        // Add long-press gestures
        this.initLongPress();

        // Add tap gestures
        this.initTapGestures();
    }

    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.touchStartTime = Date.now();
        this.isScrolling = false;
    }

    handleTouchMove(e) {
        if (!this.touchStartX || !this.touchStartY) {
            return;
        }

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const diffX = this.touchStartX - touchX;
        const diffY = this.touchStartY - touchY;

        // Detect if user is scrolling vertically
        if (Math.abs(diffY) > this.scrollThreshold) {
            this.isScrolling = true;
        }

        // Prevent default for horizontal swipes to enable custom actions
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > this.scrollThreshold) {
            e.preventDefault();
        }
    }

    handleTouchEnd(e) {
        if (!this.touchStartX || !this.touchStartY) {
            return;
        }

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const timeDiff = Date.now() - this.touchStartTime;

        const diffX = this.touchStartX - touchEndX;
        const diffY = this.touchStartY - touchEndY;

        // Check for swipe gestures
        if (!this.isScrolling && timeDiff < this.timeThreshold) {
            if (Math.abs(diffX) > this.swipeThreshold && Math.abs(diffX) > Math.abs(diffY)) {
                // Horizontal swipe
                if (diffX > 0) {
                    this.handleSwipeLeft(e.target);
                } else {
                    this.handleSwipeRight(e.target);
                }
            }
        }

        // Reset values
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.isScrolling = false;
    }

    handleSwipeLeft(target) {
        const todoItem = target.closest('.todo-item');
        if (todoItem) {
            this.showTodoActions(todoItem);
        }
    }

    handleSwipeRight(target) {
        const todoItem = target.closest('.todo-item');
        if (todoItem) {
            this.hideTodoActions(todoItem);
        }
    }

    showTodoActions(todoItem) {
        // Hide actions for other items
        document.querySelectorAll('.todo-item').forEach(item => {
            if (item !== todoItem) {
                this.hideTodoActions(item);
            }
        });

        // Show actions for this item
        const actions = todoItem.querySelector('.todo-actions');
        if (actions) {
            todoItem.classList.add('swipe-active');
            actions.style.transform = 'translateX(0)';
        }
    }

    hideTodoActions(todoItem) {
        const actions = todoItem.querySelector('.todo-actions');
        if (actions) {
            todoItem.classList.remove('swipe-active');
            actions.style.transform = 'translateX(100%)';
        }
    }

    initPullToRefresh() {
        let isPulling = false;
        let startY = 0;
        let currentY = 0;
        const threshold = 100;

        const pullIndicator = document.createElement('div');
        pullIndicator.className = 'pull-refresh-indicator';
        pullIndicator.innerHTML = `
            <div class="pull-refresh-content">
                <div class="pull-refresh-icon">↓</div>
                <div class="pull-refresh-text">下拉刷新</div>
            </div>
        `;
        pullIndicator.style.display = 'none';
        document.body.appendChild(pullIndicator);

        document.addEventListener('touchstart', (e) => {
            if (window.pageYOffset === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!isPulling) return;

            currentY = e.touches[0].clientY;
            const pullDistance = currentY - startY;

            if (pullDistance > 0 && window.pageYOffset === 0) {
                e.preventDefault();
                pullIndicator.style.display = 'flex';
                pullIndicator.style.transform = `translateY(${Math.min(pullDistance - 50, threshold)}px)`;

                if (pullDistance > threshold) {
                    pullIndicator.querySelector('.pull-refresh-text').textContent = '释放刷新';
                    pullIndicator.querySelector('.pull-refresh-icon').textContent = '↑';
                } else {
                    pullIndicator.querySelector('.pull-refresh-text').textContent = '下拉刷新';
                    pullIndicator.querySelector('.pull-refresh-icon').textContent = '↓';
                }
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (!isPulling) return;

            const pullDistance = currentY - startY;

            if (pullDistance > threshold && window.pageYOffset === 0) {
                // Trigger refresh
                this.triggerRefresh();
            }

            // Hide indicator
            pullIndicator.style.display = 'none';
            pullIndicator.style.transform = 'translateY(0)';

            isPulling = false;
            startY = 0;
            currentY = 0;
        }, { passive: true });
    }

    triggerRefresh() {
        if (window.app && window.app.loadTodos) {
            window.app.loadTodos();
        }
    }

    initLongPress() {
        let pressTimer = null;

        document.addEventListener('touchstart', (e) => {
            const target = e.target.closest('.todo-item');
            if (!target) return;

            pressTimer = setTimeout(() => {
                this.handleLongPress(target);
            }, 800);
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        }, { passive: true });

        document.addEventListener('touchmove', () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        }, { passive: true });
    }

    handleLongPress(todoItem) {
        // Haptic feedback (if supported)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        // Show context menu or quick actions
        this.showContextMenu(todoItem);
    }

    showContextMenu(todoItem) {
        // Add visual feedback
        todoItem.classList.add('long-press-active');

        setTimeout(() => {
            todoItem.classList.remove('long-press-active');
        }, 200);

        // Trigger edit action
        const editBtn = todoItem.querySelector('[data-action="edit"]');
        if (editBtn) {
            editBtn.click();
        }
    }

    initTapGestures() {
        let tapCount = 0;
        let tapTimer = null;

        document.addEventListener('touchend', (e) => {
            const target = e.target.closest('.todo-item');
            if (!target) return;

            tapCount++;

            if (tapCount === 1) {
                tapTimer = setTimeout(() => {
                    // Single tap - no action (let click handler manage)
                    tapCount = 0;
                }, 300);
            } else if (tapCount === 2) {
                clearTimeout(tapTimer);
                this.handleDoubleTap(target);
                tapCount = 0;
            }
        }, { passive: true });
    }

    handleDoubleTap(todoItem) {
        // Double tap to toggle completion
        if (todoItem) {
            this.triggerTodoToggle(todoItem);
        }
    }

    triggerTodoToggle(todoItem) {
        const toggleBtn = todoItem.querySelector('[data-action="toggle"]');
        if (toggleBtn) {
            toggleBtn.click();
        }
    }
}

// Initialize gesture handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gestureHandler = new TouchGestureHandler();
});