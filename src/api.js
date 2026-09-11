import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/', // Replace with your backend API URL
});

export const createShortUrl = async (originalUrl, customShortUrl) => {
    try {
        const response = await api.post('/url', { originalUrl, customShortUrl });
        return response.data;
    } catch (error) {
        console.error('Error creating short URL:', error);
        throw error;
    }
};

export const getAllUrls = async () => {
    try {
        const response = await api.get('/getall');
        return response.data;
    } catch (error) {
        console.error('Error fetching all URLs:', error);
        throw error;
    }
};

