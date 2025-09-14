class PixelTodoApp {
    constructor() {
        this.currentFilter = 'all';
        this.currentPriorityFilter = null;
        this.todos = [];
        this.isOffline = false;

        this.initializeElements();
        this.bindEvents();
        this.initializeFilterState();
        this.initializeDateInputs();
        this.loadTodos();
        this.checkOnlineStatus();

        // Debug: Force render after a short delay to ensure DOM is ready
        setTimeout(() => {
            console.log('Force re-render after initialization');
            this.renderTodos();
        }, 100);
    }

    initializeElements() {
        // Forms and inputs
        this.addTodoForm = document.getElementById('addTodoForm');
        this.todoTitle = document.getElementById('todoTitle');
        this.todoDescription = document.getElementById('todoDescription');
        this.todoPriority = document.getElementById('todoPriority');
        this.todoDueDate = document.getElementById('todoDueDate');
        this.expandFormBtn = document.getElementById('expandFormBtn');
        this.expandedForm = document.getElementById('expandedForm');

        // Display elements
        this.todosList = document.getElementById('todosList');
        this.loadingState = document.getElementById('loadingState');
        this.emptyState = document.getElementById('emptyState');
        this.statsDisplay = document.getElementById('statsDisplay');
        this.totalCount = document.getElementById('totalCount');
        this.completionRate = document.getElementById('completionRate');

        // Filter elements
        this.filterTabs = document.querySelectorAll('.filter-tab');
        this.priorityFilters = document.querySelectorAll('.priority-filter');

        // Other elements
        this.offlineIndicator = document.getElementById('offlineIndicator');
        this.toastContainer = document.getElementById('toastContainer');

        // Templates
        this.todoItemTemplate = document.getElementById('todoItemTemplate');
        this.editModalTemplate = document.getElementById('editModalTemplate');
    }

    initializeFilterState() {
        // Ensure the correct filter tab is active on initialization
        this.filterTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.filter === this.currentFilter) {
                tab.classList.add('active');
            }
        });

        // Ensure no priority filters are active initially
        this.priorityFilters.forEach(filter => {
            filter.classList.remove('active');
        });
    }

    initializeDateInputs() {
        // Check if datetime-local is supported
        const dateInput = document.createElement('input');
        dateInput.type = 'datetime-local';
        const isDateTimeSupported = dateInput.type === 'datetime-local';

        if (!isDateTimeSupported) {
            console.warn('datetime-local not supported, falling back to text input');
            // Convert datetime-local inputs to text inputs for unsupported browsers
            document.querySelectorAll('input[type="datetime-local"]').forEach(input => {
                input.type = 'text';
                input.placeholder = 'YYYY-MM-DD HH:MM';
                input.pattern = '\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}';
                input.title = '格式: 2025-12-25 14:30';
            });
        }

        // Add touch/click handlers for better mobile experience
        document.querySelectorAll('.due-date-input').forEach(input => {
            input.addEventListener('focus', (e) => {
                // For mobile devices, ensure the input is visible
                setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            });

            // Add click handler to calendar icon area
            input.addEventListener('click', (e) => {
                if (e.target.type === 'datetime-local') {
                    e.target.showPicker && e.target.showPicker();
                }
            });
        });
    }

    initializeSingleDateInput(input) {
        if (!input) return;

        // Check if datetime-local is supported
        const dateInput = document.createElement('input');
        dateInput.type = 'datetime-local';
        const isDateTimeSupported = dateInput.type === 'datetime-local';

        if (!isDateTimeSupported && input.type === 'datetime-local') {
            input.type = 'text';
            input.placeholder = 'YYYY-MM-DD HH:MM';
            input.pattern = '\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}';
            input.title = '格式: 2025-12-25 14:30';
        }

        // Add focus handler for mobile
        input.addEventListener('focus', (e) => {
            setTimeout(() => {
                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        });

        // Add click handler
        input.addEventListener('click', (e) => {
            if (e.target.type === 'datetime-local') {
                e.target.showPicker && e.target.showPicker();
            }
        });

        // Force input to be interactive
        input.style.pointerEvents = 'auto';
        input.style.userSelect = 'auto';
        input.readOnly = false;
        input.disabled = false;

        console.log('Initialized date input:', {
            type: input.type,
            value: input.value,
            supported: isDateTimeSupported
        });
    }

    bindEvents() {
        // Form submission
        this.addTodoForm.addEventListener('submit', (e) => this.handleAddTodo(e));

        // Expand form toggle
        this.expandFormBtn.addEventListener('click', () => this.toggleExpandedForm());

        // Filter tabs
        this.filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.handleFilterChange(e));
        });

        // Priority filters
        this.priorityFilters.forEach(filter => {
            filter.addEventListener('click', (e) => this.handlePriorityFilter(e));
        });

        // Online/offline events
        window.addEventListener('online', () => this.handleOnlineStatus(true));
        window.addEventListener('offline', () => this.handleOnlineStatus(false));
    }

    toggleExpandedForm() {
        const isExpanded = this.expandedForm.style.display !== 'none';
        this.expandedForm.style.display = isExpanded ? 'none' : 'block';
        this.expandFormBtn.textContent = isExpanded ? '详情' : '收起';
    }

    async handleAddTodo(e) {
        e.preventDefault();

        const title = this.todoTitle.value.trim();
        if (!title) return;

        const todoData = {
            title: title,
            description: this.todoDescription.value.trim(),
            priority: this.todoPriority.value,
            due_date: this.todoDueDate.value || null
        };

        try {
            let newTodo;
            if (this.isOffline) {
                newTodo = await TodoStorage.saveTodo(todoData);
                this.showToast('任务已保存到本地', 'success');
            } else {
                newTodo = await TodoAPI.createTodo(todoData);
                await TodoStorage.saveTodo(newTodo);
                this.showToast('任务添加成功', 'success');
            }

            this.todos.unshift(newTodo);
            this.renderTodos();
            this.updateStats();
            this.resetForm();
        } catch (error) {
            this.showToast('添加任务失败', 'error');
            console.error('Error adding todo:', error);
        }
    }

    resetForm() {
        this.addTodoForm.reset();
        this.expandedForm.style.display = 'none';
        this.expandFormBtn.textContent = '详情';
    }

    handleFilterChange(e) {
        e.preventDefault();

        // Remove active class from all tabs
        this.filterTabs.forEach(tab => tab.classList.remove('active'));

        // Add active class to clicked tab
        e.target.classList.add('active');

        // Update current filter
        this.currentFilter = e.target.dataset.filter;

        console.log('Filter changed to:', this.currentFilter);

        // Re-render todos
        this.renderTodos();
    }

    handlePriorityFilter(e) {
        e.preventDefault();

        const priority = e.target.dataset.priority;

        // Toggle priority filter
        if (this.currentPriorityFilter === priority) {
            this.currentPriorityFilter = null;
            e.target.classList.remove('active');
        } else {
            // Remove active from all priority filters
            this.priorityFilters.forEach(filter => filter.classList.remove('active'));

            this.currentPriorityFilter = priority;
            e.target.classList.add('active');
        }

        this.renderTodos();
    }

    async loadTodos() {
        try {
            this.showLoading(true);

            if (this.isOffline) {
                this.todos = await TodoStorage.getAllTodos();
                console.log('Loaded todos from local storage:', this.todos);
            } else {
                this.todos = await TodoAPI.getTodos();
                console.log('Loaded todos from API:', this.todos);
                // Sync with local storage
                await TodoStorage.syncTodos(this.todos);
            }

            this.renderTodos();
            this.updateStats();
        } catch (error) {
            console.error('Error loading todos:', error);
            // Try loading from local storage as fallback
            this.todos = await TodoStorage.getAllTodos();
            console.log('Fallback: Loaded todos from local storage:', this.todos);
            this.renderTodos();
            this.updateStats();
            this.showToast('从本地缓存加载', 'warning');
        } finally {
            this.showLoading(false);
        }
    }

    renderTodos() {
        const filteredTodos = this.filterTodos();

        console.log('Rendering todos:', {
            totalTodos: this.todos.length,
            filteredTodos: filteredTodos.length,
            currentFilter: this.currentFilter,
            currentPriorityFilter: this.currentPriorityFilter
        });

        if (filteredTodos.length === 0) {
            if (this.todos.length === 0) {
                this.showEmptyState(true);
            } else {
                // Has todos but filtered out - show empty message but not the empty state illustration
                this.showEmptyState(false);
                this.todosList.innerHTML = '<div class="no-results">没有符合条件的任务</div>';
            }
            return;
        }

        this.showEmptyState(false);

        this.todosList.innerHTML = filteredTodos.map(todo => this.createTodoElement(todo)).join('');

        // Bind events for todo items
        this.bindTodoEvents();
    }

    filterTodos() {
        return this.todos.filter(todo => {
            // Status filter
            let statusMatch = true;
            if (this.currentFilter === 'completed') {
                statusMatch = todo.completed === true;
            } else if (this.currentFilter === 'pending') {
                statusMatch = todo.completed === false;
            } else if (this.currentFilter === 'all') {
                statusMatch = true; // Show all todos regardless of completion status
            }

            // Priority filter
            let priorityMatch = true;
            if (this.currentPriorityFilter) {
                priorityMatch = todo.priority === this.currentPriorityFilter;
            }

            return statusMatch && priorityMatch;
        });
    }

    createTodoElement(todo) {
        const template = this.todoItemTemplate.content.cloneNode(true);
        const todoItem = template.querySelector('.todo-item');

        todoItem.dataset.todoId = todo.id;

        // Set completion state
        if (todo.completed) {
            todoItem.classList.add('completed');
        }

        // Set priority
        todoItem.classList.add(`priority-${todo.priority}`);

        // Fill content
        const checkbox = todoItem.querySelector('.todo-checkbox .checkbox-icon');
        const title = todoItem.querySelector('.todo-title');
        const description = todoItem.querySelector('.todo-description');
        const priority = todoItem.querySelector('.todo-priority');
        const date = todoItem.querySelector('.todo-date');

        checkbox.textContent = todo.completed ? '✓' : '';
        title.textContent = todo.title;
        description.textContent = todo.description || '';
        description.style.display = todo.description ? 'block' : 'none';

        // Priority display
        const priorityLabels = {
            'high': '高优先级',
            'medium': '中优先级',
            'low': '低优先级'
        };
        priority.textContent = priorityLabels[todo.priority];
        priority.className = `todo-priority priority-${todo.priority}`;

        // Date display
        if (todo.due_date) {
            const dueDate = new Date(todo.due_date);
            date.textContent = dueDate.toLocaleDateString('zh-CN');

            // Check if overdue
            if (dueDate < new Date() && !todo.completed) {
                date.classList.add('overdue');
            }
        } else {
            date.style.display = 'none';
        }

        return todoItem.outerHTML;
    }

    bindTodoEvents() {
        // Toggle completion
        document.querySelectorAll('[data-action="toggle"]').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleTodo(e));
        });

        // Edit todo
        document.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => this.editTodo(e));
        });

        // Delete todo
        document.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteTodo(e));
        });
    }

    async toggleTodo(e) {
        const todoId = parseInt(e.target.closest('.todo-item').dataset.todoId);
        const todo = this.todos.find(t => t.id === todoId);

        if (!todo) return;

        const updatedData = { ...todo, completed: !todo.completed };

        try {
            if (this.isOffline) {
                await TodoStorage.updateTodo(todoId, updatedData);
                this.showToast('任务状态已更新', 'success');
            } else {
                await TodoAPI.updateTodo(todoId, updatedData);
                await TodoStorage.updateTodo(todoId, updatedData);
                this.showToast(todo.completed ? '任务标记为待办' : '任务完成！', 'success');
            }

            // Update local array
            const index = this.todos.findIndex(t => t.id === todoId);
            if (index !== -1) {
                this.todos[index] = updatedData;
            }

            this.renderTodos();
            this.updateStats();

            // Trigger completion animation
            if (window.PixelAnimations && !todo.completed) {
                const todoElement = document.querySelector(`[data-todo-id="${todoId}"]`);
                if (todoElement) {
                    PixelAnimations.triggerTodoCompletion(todoElement);
                }
            }
        } catch (error) {
            this.showToast('更新失败', 'error');
            console.error('Error toggling todo:', error);
        }
    }

    async deleteTodo(e) {
        const todoId = parseInt(e.target.closest('.todo-item').dataset.todoId);

        if (!confirm('确定要删除这个任务吗？')) {
            return;
        }

        try {
            if (this.isOffline) {
                await TodoStorage.deleteTodo(todoId);
                this.showToast('任务已删除', 'success');
            } else {
                await TodoAPI.deleteTodo(todoId);
                await TodoStorage.deleteTodo(todoId);
                this.showToast('任务删除成功', 'success');
            }

            // Remove from local array
            this.todos = this.todos.filter(t => t.id !== todoId);

            this.renderTodos();
            this.updateStats();
        } catch (error) {
            this.showToast('删除失败', 'error');
            console.error('Error deleting todo:', error);
        }
    }

    editTodo(e) {
        const todoId = parseInt(e.target.closest('.todo-item').dataset.todoId);
        const todo = this.todos.find(t => t.id === todoId);

        if (!todo) return;

        this.showEditModal(todo);
    }

    showEditModal(todo) {
        const template = this.editModalTemplate.content.cloneNode(true);
        const modal = template.querySelector('.modal-overlay');

        // Fill form with current values
        const form = modal.querySelector('.edit-todo-form');
        form.querySelector('[name="title"]').value = todo.title;
        form.querySelector('[name="description"]').value = todo.description || '';
        form.querySelector('[name="priority"]').value = todo.priority;

        // Format date for datetime-local input
        let formattedDate = '';
        if (todo.due_date) {
            try {
                const date = new Date(todo.due_date);
                if (!isNaN(date.getTime())) {
                    // Format as YYYY-MM-DDTHH:MM for datetime-local (local time, not UTC)
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
                }
            } catch (error) {
                console.warn('Invalid date format:', todo.due_date);
            }
        }

        const dueDateInput = form.querySelector('[name="due_date"]');
        dueDateInput.value = formattedDate;

        // Initialize date input for the modal (since it's dynamically created)
        this.initializeSingleDateInput(dueDateInput);

        console.log('Edit modal opened with date:', {
            originalDate: todo.due_date,
            formattedDate: formattedDate,
            inputValue: dueDateInput.value,
            inputType: dueDateInput.type
        });

        // Bind events
        form.addEventListener('submit', (e) => this.handleEditSubmit(e, todo.id, modal));
        modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        modal.querySelector('[data-action="close"]').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        document.body.appendChild(modal);
    }

    async handleEditSubmit(e, todoId, modal) {
        e.preventDefault();

        const form = e.target;
        const updatedData = {
            title: form.querySelector('[name="title"]').value.trim(),
            description: form.querySelector('[name="description"]').value.trim(),
            priority: form.querySelector('[name="priority"]').value,
            due_date: form.querySelector('[name="due_date"]').value || null
        };

        if (!updatedData.title) {
            this.showToast('标题不能为空', 'error');
            return;
        }

        try {
            if (this.isOffline) {
                await TodoStorage.updateTodo(todoId, updatedData);
                this.showToast('任务已更新', 'success');
            } else {
                await TodoAPI.updateTodo(todoId, updatedData);
                await TodoStorage.updateTodo(todoId, updatedData);
                this.showToast('任务更新成功', 'success');
            }

            // Update local array
            const index = this.todos.findIndex(t => t.id === todoId);
            if (index !== -1) {
                this.todos[index] = { ...this.todos[index], ...updatedData };
            }

            this.renderTodos();
            this.updateStats();
            document.body.removeChild(modal);
        } catch (error) {
            this.showToast('更新失败', 'error');
            console.error('Error updating todo:', error);
        }
    }

    updateStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Debug removed - stats working correctly

        if (this.totalCount) {
            this.totalCount.textContent = `${total} 个任务`;
        } else {
            console.error('totalCount element not found');
        }

        if (this.completionRate) {
            this.completionRate.textContent = `${completionRate}%`;
        } else {
            console.error('completionRate element not found');
        }
    }

    showLoading(show) {
        this.loadingState.style.display = show ? 'block' : 'none';
        this.todosList.style.display = show ? 'none' : 'block';
    }

    showEmptyState(show) {
        this.emptyState.style.display = show ? 'block' : 'none';
    }

    checkOnlineStatus() {
        this.handleOnlineStatus(navigator.onLine);
    }

    handleOnlineStatus(isOnline) {
        this.isOffline = !isOnline;
        this.offlineIndicator.style.display = isOnline ? 'none' : 'block';

        if (isOnline) {
            this.showToast('连接已恢复', 'success');
            this.syncOfflineData();
        } else {
            this.showToast('离线模式', 'warning');
        }
    }

    async syncOfflineData() {
        try {
            // Sync offline changes when back online
            const localTodos = await TodoStorage.getOfflineChanges();

            for (const localTodo of localTodos) {
                if (localTodo.isNew) {
                    await TodoAPI.createTodo(localTodo);
                } else if (localTodo.isDeleted) {
                    await TodoAPI.deleteTodo(localTodo.id);
                } else if (localTodo.isModified) {
                    await TodoAPI.updateTodo(localTodo.id, localTodo);
                }
            }

            await TodoStorage.clearOfflineChanges();
            await this.loadTodos(); // Reload to get latest state
        } catch (error) {
            console.error('Error syncing offline data:', error);
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        this.toastContainer.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (this.toastContainer.contains(toast)) {
                    this.toastContainer.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PixelTodoApp();
});