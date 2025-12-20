// Runtime config - window'dan al
const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.REACT_APP_BACKEND_URL) {
    return window.REACT_APP_BACKEND_URL;
  }
  return 'http://72.61.158.147:8001';
};

export const API_URL = getApiUrl();
export default API_URL;
