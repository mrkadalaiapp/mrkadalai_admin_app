const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://13.201.49.59:5500/api';

export const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;

    const token = localStorage.getItem("token");
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
        credentials: 'include',
        ...options,
    };


    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || response.statusText);
        }

        return data;
    } catch (error) {
        throw error;
    }
};