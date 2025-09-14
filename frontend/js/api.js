class TodoAPI {
    static BASE_URL = '/api';

    static async request(endpoint, options = {}) {
        const url = `${this.BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        console.log('API Request:', { url, method: config.method || 'GET', body: config.body });

        try {
            const response = await fetch(url, config);

            console.log('API Response:', {
                url,
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Details:', errorText);
                throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            // Handle 204 No Content responses
            if (response.status === 204) {
                return null;
            }

            const jsonData = await response.json();
            console.log('API Response Data:', jsonData);
            return jsonData;
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error;
        }
    }

    static async getTodos(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/todos?${queryString}` : '/todos';
        console.log('TodoAPI.getTodos - requesting endpoint:', endpoint);
        const result = await this.request(endpoint);
        console.log('TodoAPI.getTodos - received data:', result);
        return result;
    }

    static async getTodo(id) {
        return await this.request(`/todos/${id}`);
    }

    static async createTodo(todoData) {
        console.log('TodoAPI.createTodo - sending data:', todoData);
        const result = await this.request('/todos', {
            method: 'POST',
            body: todoData
        });
        console.log('TodoAPI.createTodo - received result:', result);
        return result;
    }

    static async updateTodo(id, todoData) {
        console.log('TodoAPI.updateTodo - updating id:', id, 'with data:', todoData);
        const result = await this.request(`/todos/${id}`, {
            method: 'PUT',
            body: todoData
        });
        console.log('TodoAPI.updateTodo - received result:', result);
        return result;
    }

    static async deleteTodo(id) {
        return await this.request(`/todos/${id}`, {
            method: 'DELETE'
        });
    }

    static async toggleTodo(id) {
        return await this.request(`/todos/${id}/toggle`, {
            method: 'PATCH'
        });
    }

    static async getStats() {
        return await this.request('/todos/stats/summary');
    }

    static async healthCheck() {
        return await this.request('/health');
    }
}