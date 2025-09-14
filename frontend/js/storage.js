class TodoStorage {
    static STORAGE_KEY = 'pixel-todos';
    static SYNC_KEY = 'pixel-todos-sync';
    static DB_NAME = 'PixelTodoDB';
    static DB_VERSION = 1;
    static STORE_NAME = 'todos';

    static db = null;

    static async initDB() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create todos store
                const store = db.createObjectStore(this.STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });

                // Create indexes
                store.createIndex('completed', 'completed', { unique: false });
                store.createIndex('priority', 'priority', { unique: false });
                store.createIndex('created_at', 'created_at', { unique: false });
            };
        });
    }

    static async transaction(mode = 'readonly') {
        const db = await this.initDB();
        return db.transaction([this.STORE_NAME], mode);
    }

    static async getAllTodos() {
        try {
            const tx = await this.transaction('readonly');
            const store = tx.objectStore(this.STORE_NAME);

            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const todos = request.result || [];
                    // Sort by created_at descending (newest first)
                    todos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    resolve(todos);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('IndexedDB failed, falling back to localStorage', error);
            return this.getFallbackTodos();
        }
    }

    static async saveTodo(todo) {
        try {
            // Ensure todo has required fields
            const todoWithDefaults = {
                ...todo,
                created_at: todo.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const tx = await this.transaction('readwrite');
            const store = tx.objectStore(this.STORE_NAME);

            return new Promise((resolve, reject) => {
                const request = store.put(todoWithDefaults);
                request.onsuccess = () => resolve(todoWithDefaults);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('IndexedDB failed, falling back to localStorage', error);
            return this.saveFallbackTodo(todo);
        }
    }

    static async createTodo(todoData) {
        const newTodo = {
            id: Date.now(), // Temporary ID for offline creation
            ...todoData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            _offline: true // Mark as created offline
        };

        return await this.saveTodo(newTodo);
    }

    static async updateTodo(id, updates) {
        try {
            const tx = await this.transaction('readwrite');
            const store = tx.objectStore(this.STORE_NAME);

            return new Promise((resolve, reject) => {
                const getRequest = store.get(id);

                getRequest.onsuccess = () => {
                    const todo = getRequest.result;
                    if (!todo) {
                        reject(new Error('Todo not found'));
                        return;
                    }

                    const updatedTodo = {
                        ...todo,
                        ...updates,
                        updated_at: new Date().toISOString(),
                        _offline_updated: true
                    };

                    const putRequest = store.put(updatedTodo);
                    putRequest.onsuccess = () => resolve(updatedTodo);
                    putRequest.onerror = () => reject(putRequest.error);
                };

                getRequest.onerror = () => reject(getRequest.error);
            });
        } catch (error) {
            console.warn('IndexedDB failed, falling back to localStorage', error);
            return this.updateFallbackTodo(id, updates);
        }
    }

    static async deleteTodo(id) {
        try {
            const tx = await this.transaction('readwrite');
            const store = tx.objectStore(this.STORE_NAME);

            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('IndexedDB failed, falling back to localStorage', error);
            return this.deleteFallbackTodo(id);
        }
    }

    static async syncTodos(serverTodos) {
        try {
            const tx = await this.transaction('readwrite');
            const store = tx.objectStore(this.STORE_NAME);

            return new Promise((resolve, reject) => {
                // Clear existing todos
                const clearRequest = store.clear();

                clearRequest.onsuccess = () => {
                    // Add all server todos
                    let completed = 0;
                    const total = serverTodos.length;

                    if (total === 0) {
                        resolve();
                        return;
                    }

                    serverTodos.forEach(todo => {
                        const putRequest = store.put(todo);

                        putRequest.onsuccess = () => {
                            completed++;
                            if (completed === total) {
                                resolve();
                            }
                        };

                        putRequest.onerror = () => reject(putRequest.error);
                    });
                };

                clearRequest.onerror = () => reject(clearRequest.error);
            });
        } catch (error) {
            console.warn('IndexedDB sync failed, using localStorage', error);
            this.syncFallbackTodos(serverTodos);
        }
    }

    static async getOfflineChanges() {
        try {
            const tx = await this.transaction('readonly');
            const store = tx.objectStore(this.STORE_NAME);

            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const todos = request.result || [];
                    const changes = todos.filter(todo =>
                        todo._offline || todo._offline_updated || todo._offline_deleted
                    );
                    resolve(changes);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('IndexedDB failed, falling back to localStorage', error);
            return this.getFallbackOfflineChanges();
        }
    }

    static async clearOfflineChanges() {
        try {
            const tx = await this.transaction('readwrite');
            const store = tx.objectStore(this.STORE_NAME);

            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const todos = request.result || [];
                    let processed = 0;
                    const total = todos.length;

                    if (total === 0) {
                        resolve();
                        return;
                    }

                    todos.forEach(todo => {
                        // Remove offline markers
                        const cleanTodo = { ...todo };
                        delete cleanTodo._offline;
                        delete cleanTodo._offline_updated;
                        delete cleanTodo._offline_deleted;

                        const putRequest = store.put(cleanTodo);
                        putRequest.onsuccess = () => {
                            processed++;
                            if (processed === total) {
                                resolve();
                            }
                        };
                        putRequest.onerror = () => reject(putRequest.error);
                    });
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('IndexedDB failed, using localStorage', error);
            this.clearFallbackOfflineChanges();
        }
    }

    static async markTodoSynced(todoId, serverTodo) {
        try {
            const tx = await this.transaction('readwrite');
            const store = tx.objectStore(this.STORE_NAME);

            return new Promise((resolve, reject) => {
                const syncedTodo = { ...serverTodo };
                delete syncedTodo._offline;
                delete syncedTodo._offline_updated;
                delete syncedTodo._offline_deleted;

                const request = store.put(syncedTodo);
                request.onsuccess = () => resolve(syncedTodo);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('IndexedDB failed, using localStorage', error);
            return this.markFallbackTodoSynced(todoId, serverTodo);
        }
    }

    static async getUnsyncedChanges() {
        return this.getOfflineChanges();
    }

    // Fallback to localStorage methods
    static getFallbackTodos() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    static saveFallbackTodo(todo) {
        const todos = this.getFallbackTodos();
        const existingIndex = todos.findIndex(t => t.id === todo.id);

        if (existingIndex >= 0) {
            todos[existingIndex] = todo;
        } else {
            todos.unshift(todo);
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(todos));
        return todo;
    }

    static updateFallbackTodo(id, updates) {
        const todos = this.getFallbackTodos();
        const todoIndex = todos.findIndex(t => t.id === id);

        if (todoIndex >= 0) {
            todos[todoIndex] = {
                ...todos[todoIndex],
                ...updates,
                updated_at: new Date().toISOString()
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(todos));
            return todos[todoIndex];
        }

        throw new Error('Todo not found');
    }

    static deleteFallbackTodo(id) {
        const todos = this.getFallbackTodos();
        const filtered = todos.filter(t => t.id !== id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
        return true;
    }

    static syncFallbackTodos(serverTodos) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serverTodos));
    }

    static getFallbackOfflineChanges() {
        const todos = this.getFallbackTodos();
        return todos.filter(todo =>
            todo._offline || todo._offline_updated || todo._offline_deleted
        );
    }

    static clearFallbackOfflineChanges() {
        const todos = this.getFallbackTodos();
        const cleanedTodos = todos.map(todo => {
            const cleanTodo = { ...todo };
            delete cleanTodo._offline;
            delete cleanTodo._offline_updated;
            delete cleanTodo._offline_deleted;
            return cleanTodo;
        });
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanedTodos));
    }

    static markFallbackTodoSynced(todoId, serverTodo) {
        const todos = this.getFallbackTodos();
        const todoIndex = todos.findIndex(t => t.id === todoId);

        if (todoIndex >= 0) {
            const syncedTodo = { ...serverTodo };
            delete syncedTodo._offline;
            delete syncedTodo._offline_updated;
            delete syncedTodo._offline_deleted;

            todos[todoIndex] = syncedTodo;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(todos));
            return syncedTodo;
        }

        throw new Error('Todo not found');
    }

    // Settings storage
    static getSetting(key, defaultValue = null) {
        const stored = localStorage.getItem(`pixel-todo-setting-${key}`);
        return stored ? JSON.parse(stored) : defaultValue;
    }

    static setSetting(key, value) {
        localStorage.setItem(`pixel-todo-setting-${key}`, JSON.stringify(value));
    }
}