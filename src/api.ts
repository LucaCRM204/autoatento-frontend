import axios from 'axios';
import { API_BASE, getTenantSlug, avisarSuspendido } from './tenant/store';

// URL base del API: VITE_API_URL (con /api al final), ver .env.example.
const API_URL = API_BASE;

// Crear instancia de axios
export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: true,
});

// Interceptor: token + tenant (X-Tenant) en cada request
api.interceptors.request.use(
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
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 402) {
      // Cuenta suspendida: la app muestra la pantalla de cuenta suspendida
      avisarSuspendido(error.response?.data?.error);
    } else if (error.response?.status === 401 && !String(error.config?.url || '').includes('/auth/login')) {
      // Token expirado o inválido. Un login con credenciales malas también da
      // 401, pero ahí no se recarga: el error lo muestra la pantalla de login.
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
