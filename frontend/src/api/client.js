import axios from 'axios';

const API_BASE_URL = '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getSites = () => api.get('/sites');
export const getSiteById = (siteId) => api.get(`/sites/${siteId}`);
export const getSiteForecast = (siteId) => api.get(`/sites/${siteId}/forecast`);
export const getRegionalSummary = () => api.get('/forecast/summary');
export const submitFeedback = (feedbackData) => api.post('/feedback', feedbackData);
