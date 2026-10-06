import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('log_mms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('log_mms_token');
      localStorage.removeItem('log_mms_user');
      // If not already on login or convite page, redirect
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/convite')
      ) {
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  }
);
