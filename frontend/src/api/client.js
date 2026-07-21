import axios from 'axios';

const API_BASE_URL = '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Separate client for endpoints that live at the FastAPI root
// (e.g. /health), not under /api/v1.
export const rootApi = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

export const getSites = () => api.get('/sites');
export const getSiteById = (siteId) => api.get(`/sites/${siteId}`);
export const getSiteForecast = (siteId) => api.get(`/sites/${siteId}/forecast`);
export const getRegionalSummary = () => api.get('/forecast/summary');
export const submitFeedback = (feedbackData) => api.post('/feedback', feedbackData);

export const trainModel = () => api.post('/ml/train');
export const ingestWeather = () => api.post('/ingest/weather');
export const runPredictions = (siteId) =>
  api.post('/predict/run', siteId != null ? { site_id: siteId } : {});
export const getAdminStatus = () => api.get('/status');
export const getHealth = () => rootApi.get('/health');
