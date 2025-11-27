/**
 * API service for communicating with backend
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Upload a file for transformation
 * @param {File} file - File to upload
 * @returns {Promise<Object>} Upload response with uploadId and preview
 */
export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload-file', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return response.data;
};

/**
 * Get preview of uploaded file
 * @param {string} uploadId - Upload ID
 * @returns {Promise<Object>} Preview data
 */
export const getPreview = async (uploadId) => {
    const response = await api.get(`/preview/${uploadId}`);
    return response.data;
};

/**
 * Start transformation
 * @param {string} uploadId - Upload ID
 * @param {string} depositMapId - Optional deposit map ID
 * @param {string} outputFormat - Output format (csv or xlsx)
 * @returns {Promise<Object>} Transform response with transformId
 */
export const startTransform = async (uploadId, depositMapId = null, outputFormat = 'csv') => {
    const response = await api.post('/transform', {
        uploadId,
        depositMapId,
        outputFormat,
    });

    return response.data;
};

/**
 * Get transformation status
 * @param {string} transformId - Transform ID
 * @returns {Promise<Object>} Status data
 */
export const getTransformStatus = async (transformId) => {
    const response = await api.get(`/transform-status/${transformId}`);
    return response.data;
};

/**
 * Get download URL for transformed file
 * @param {string} transformId - Transform ID
 * @returns {string} Download URL
 */
export const getDownloadUrl = (transformId) => {
    return `${API_BASE_URL}/download/${transformId}`;
};

/**
 * Upload deposit mapping file
 * @param {File} file - Deposit mapping file
 * @returns {Promise<Object>} Deposit map response
 */
export const uploadDepositMap = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload-deposit-map', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return response.data;
};

/**
 * Get list of deposit mappings
 * @returns {Promise<Array>} List of deposit maps
 */
export const getDepositMaps = async () => {
    const response = await api.get('/deposit-maps');
    return response.data;
};

/**
 * Get transformation history
 * @returns {Promise<Array>} List of transformations
 */
export const getHistory = async () => {
    const response = await api.get('/history');
    return response.data;
};

/**
 * Delete a transformation
 * @param {string} transformId - Transform ID
 * @returns {Promise<Object>} Delete response
 */
export const deleteTransform = async (transformId) => {
    const response = await api.delete(`/transform/${transformId}`);
    return response.data;
};

/**
 * Check server health
 * @returns {Promise<Object>} Health status
 */
export const checkHealth = async () => {
    const response = await api.get('/health', {
        baseURL: API_BASE_URL.replace('/api', ''),
    });
    return response.data;
};

export default api;
