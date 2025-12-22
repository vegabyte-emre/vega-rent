// Runtime config - her zaman window'dan al
export const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.REACT_APP_BACKEND_URL) {
    return window.REACT_APP_BACKEND_URL;
  }
  return process.env.REACT_APP_BACKEND_URL || 'http://72.61.158.147:8001';
};

// Her kullanımda güncel değer almak için getter
Object.defineProperty(exports, 'API_URL', {
  get: getApiUrl
});

export const API_URL = getApiUrl();
export default getApiUrl;
