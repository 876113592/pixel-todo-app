class PixelAnimations {
    constructor() {
        this.particleCount = 15;
        this.particles = [];
        this.animationsEnabled = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.init();
    }

    init() {
        if (!this.animationsEnabled) return;

        this.createParticleContainer();
        this.generateParticles();
        this.bindEvents();

        // Matrix rain effect is disabled by default to prevent UI issues
        // Uncomment the following line if you want the matrix rain effect
        // this.createMatrixRain();
    }

    createParticleContainer() {
        this.particleContainer = document.createElement('div');
        this.particleContainer.className = 'pixel-particles';
        document.body.appendChild(this.particleContainer);
    }

    generateParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            this.createParticle();
        }
    }

    createParticle() {
        const particle = document.createElement('div');
        particle.className = 'pixel-particle';

        // Random position
        particle.style.left = Math.random() * 100 + '%';

        // Random animation delay
        particle.style.animationDelay = Math.random() * 8 + 's';

        // Random size variation
        const size = Math.random() < 0.5 ? '1px' : '2px';
        particle.style.width = size;
        particle.style.height = size;

        this.particleContainer.appendChild(particle);
        this.particles.push(particle);

        // Remove and recreate after animation completes
        particle.addEventListener('animationiteration', () => {
            particle.style.left = Math.random() * 100 + '%';
        });
    }

    createMatrixRain() {
        const matrixContainer = document.createElement('div');
        matrixContainer.className = 'matrix-rain';
        document.body.appendChild(matrixContainer);

        // Limit columns to prevent layout issues
        const maxColumns = Math.min(Math.floor(window.innerWidth / 20), 50);
        const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ█▓▒░';

        for (let i = 0; i < maxColumns; i++) {
            const column = document.createElement('div');
            column.className = 'matrix-column';
            column.style.left = i * 20 + 'px';
            column.style.animationDuration = (Math.random() * 3 + 2) + 's';
            column.style.animationDelay = Math.random() * 2 + 's';

            // Generate limited random characters to prevent overflow
            let text = '';
            const maxChars = Math.min(Math.floor(Math.random() * 8) + 5, 15);
            for (let j = 0; j < maxChars; j++) {
                text += characters[Math.floor(Math.random() * characters.length)] + '\n';
            }
            column.textContent = text; // Use textContent instead of innerHTML for safety

            matrixContainer.appendChild(column);
        }

        // Auto-cleanup after 30 seconds to prevent memory issues
        setTimeout(() => {
            if (document.body.contains(matrixContainer)) {
                document.body.removeChild(matrixContainer);
            }
        }, 30000);
    }

    bindEvents() {
        // Todo completion animation
        document.addEventListener('todoCompleted', (event) => {
            this.triggerCompletionAnimation(event.detail.element);
        });

        // Button press animations
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('pixel-btn')) {
                this.triggerButtonPressAnimation(event.target);
            }
        });

        // Success burst animation
        document.addEventListener('successAction', (event) => {
            this.triggerSuccessBurst(event.detail.element);
        });
    }

    triggerCompletionAnimation(element) {
        if (!this.animationsEnabled) return;

        element.classList.add('todo-complete-animation');

        setTimeout(() => {
            element.classList.remove('todo-complete-animation');
        }, 600);

        // Trigger success burst
        this.triggerSuccessBurst(element);
    }

    triggerButtonPressAnimation(button) {
        if (!this.animationsEnabled) return;

        button.classList.add('pixel-btn-pressed');

        setTimeout(() => {
            button.classList.remove('pixel-btn-pressed');
        }, 200);
    }

    triggerSuccessBurst(element) {
        if (!this.animationsEnabled) return;

        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Create burst particles
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'success-particle';

            // Position at center of element
            particle.style.left = centerX + 'px';
            particle.style.top = centerY + 'px';

            // Random burst direction
            const angle = (i / 8) * 2 * Math.PI;
            const distance = 50 + Math.random() * 30;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            particle.style.setProperty('--burst-x', x + 'px');
            particle.style.setProperty('--burst-y', y + 'px');

            document.body.appendChild(particle);

            // Remove after animation
            setTimeout(() => {
                if (document.body.contains(particle)) {
                    document.body.removeChild(particle);
                }
            }, 1000);
        }
    }

    // Method to trigger custom animations from app
    static triggerTodoCompletion(element) {
        document.dispatchEvent(new CustomEvent('todoCompleted', {
            detail: { element }
        }));
    }

    static triggerSuccess(element) {
        document.dispatchEvent(new CustomEvent('successAction', {
            detail: { element }
        }));
    }

    // Performance optimization
    pauseAnimations() {
        this.particleContainer.style.animationPlayState = 'paused';
    }

    resumeAnimations() {
        this.particleContainer.style.animationPlayState = 'running';
    }

    // Clean up
    destroy() {
        if (this.particleContainer && document.body.contains(this.particleContainer)) {
            document.body.removeChild(this.particleContainer);
        }

        // Clean up all matrix rain containers
        const matrixRainContainers = document.querySelectorAll('.matrix-rain');
        matrixRainContainers.forEach(container => {
            if (document.body.contains(container)) {
                document.body.removeChild(container);
            }
        });
    }
}

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if animations are supported and enabled
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.pixelAnimations = new PixelAnimations();

        // Pause animations when tab is not visible to save resources
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                window.pixelAnimations.pauseAnimations();
            } else {
                window.pixelAnimations.resumeAnimations();
            }
        });

        // Clean up animations when page unloads
        window.addEventListener('beforeunload', () => {
            if (window.pixelAnimations) {
                window.pixelAnimations.destroy();
            }
        });
    }
});

// Utility functions for easy access
window.PixelAnimations = PixelAnimations;