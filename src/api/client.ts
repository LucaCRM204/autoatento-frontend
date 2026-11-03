import axios from 'axios';
import { API_BASE, getTenantSlug, avisarSuspendido } from '../tenant/store';

const http = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para agregar token y tenant a cada request
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const slug = getTenantSlug();
    if (slug) {
      config.headers['X-Tenant'] = slug;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores 401 / 402
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 402) {
      avisarSuspendido(error.response?.data?.error);
    } else if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default http;
