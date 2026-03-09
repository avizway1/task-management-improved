import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth service
export const authService = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  logout: () => {
    localStorage.removeItem('token');
    return Promise.resolve();
  },
  getCurrentUser: () => api.get('/api/auth/me'),
};

// Task service
export const taskService = {
  getTasks: () => api.get('/api/tasks'),
  getTask: (id) => api.get(`/api/tasks/${id}`),
  createTask: (taskData) => api.post('/api/tasks', taskData),
  updateTask: (id, taskData) => api.put(`/api/tasks/${id}`, taskData),
  deleteTask: (id) => api.delete(`/api/tasks/${id}`),
};

// Notification service
export const notificationService = {
  getHistory: (userId, page = 1, limit = 10) => 
    api.get(`/api/notifications/history/${userId}?page=${page}&limit=${limit}`),
  getStatus: (notificationId) => 
    api.get(`/api/notifications/status/${notificationId}`),
  sendEmail: (emailData) => 
    api.post('/api/notifications/email', emailData),
  sendTaskReminder: (reminderData) => 
    api.post('/api/notifications/task-reminder', reminderData),
  testEmail: (email) => 
    api.post('/api/notifications/test-email', { to: email }),
};

// Analytics service (Python/FastAPI microservice - Port 3004)
export const analyticsService = {
  getOverview: () => api.get('/api/analytics/overview'),
  getTrends: (days = 30) => api.get(`/api/analytics/trends?days=${days}`),
  getPriorityDistribution: () => api.get('/api/analytics/priority-distribution'),
  getProductivity: () => api.get('/api/analytics/productivity'),
};

export default api;