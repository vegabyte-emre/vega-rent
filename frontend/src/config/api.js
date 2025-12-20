import { API_URL } from '../config/api';
// Runtime config - config.js dosyasından veya env'den alınır
const getApiUrl = () => {
  // Önce runtime config'e bak (Portainer deployment için)
  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__?.API_URL) {
    return window.__RUNTIME_CONFIG__.API_URL;
  }
  // Fallback: build-time env variable
  return process.env.REACT_APP_BACKEND_URL || '';
};

export const API_URL = getApiUrl();
export default API_URL;
