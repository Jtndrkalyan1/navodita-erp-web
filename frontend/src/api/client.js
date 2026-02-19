import axios from 'axios';
import toast from 'react-hot-toast';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;

    if (response) {
      switch (response.status) {
        case 401:
          // Token expired or invalid - clear and redirect to login
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          toast.error('Session expired. Please log in again.');
          break;

        case 403:
          toast.error('You do not have permission to perform this action.');
          break;

        case 404:
          // Let the caller handle 404s
          break;

        case 422:
          // Validation error
          if (response.data?.detail) {
            const messages = Array.isArray(response.data.detail)
              ? response.data.detail.map((d) => d.msg).join(', ')
              : response.data.detail;
            toast.error(`Validation error: ${messages}`);
          }
          break;

        case 500:
          toast.error('An unexpected server error occurred. Please try again.');
          break;

        default:
          if (response.data?.message) {
            toast.error(response.data.message);
          }
          break;
      }
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timed out. Please check your connection.');
    } else if (!navigator.onLine) {
      toast.error('No internet connection.');
    } else {
      toast.error('Unable to connect to the server.');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
