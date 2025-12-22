// Runtime config - doğrudan window'dan al (öncelikli)
export const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.REACT_APP_BACKEND_URL) {
    return window.REACT_APP_BACKEND_URL;
  }
  return process.env.REACT_APP_BACKEND_URL || 'http://72.61.158.147:8001';
};

// API_URL - runtime'da window.REACT_APP_BACKEND_URL'den al
// Template literal desteği için her zaman güncel değer döner
export const API_URL = (() => {
  // Runtime'da çalışan bir closure
  const url = {
    toString() {
      return getApiUrl();
    },
    valueOf() {
      return getApiUrl();
    }
  };
  return url;
})();

// Runtime'da kullanmak için bu fonksiyonu kullan
export default getApiUrl;
