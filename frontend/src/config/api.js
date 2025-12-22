// Runtime config - doğrudan window'dan al
export const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.REACT_APP_BACKEND_URL) {
    return window.REACT_APP_BACKEND_URL;
  }
  return process.env.REACT_APP_BACKEND_URL || 'http://72.61.158.147:8001';
};

// Sabit değer için (build time)
export const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://72.61.158.147:8001';

// Runtime'da kullanmak için bu fonksiyonu kullan
export default getApiUrl;
