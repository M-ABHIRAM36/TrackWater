import axios from 'axios'

/**
 * API client for making HTTP requests to the backend
 * Handles authentication, error handling, and response formatting
 */

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message)
    }
    
    return Promise.reject(error)
  }
)

// API methods object
const apiMethods = {
  // Set authentication token
  setToken: (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete api.defaults.headers.common['Authorization']
    }
  },

  // Generic HTTP methods
  get: (url, config = {}) => api.get(url, config),
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),

  // Authentication endpoints
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    signup: (userData) => api.post('/auth/signup', userData),
    me: () => api.get('/auth/me'),
    updateProfile: (updates) => api.put('/auth/profile', updates),
    changePassword: (passwordData) => api.post('/auth/change-password', passwordData)
  },

  // Water logging endpoints
  water: {
    log: (waterData) => api.post('/water/log', waterData),
    getLogs: (params = {}) => api.get('/water/logs', { params }),
    deleteLog: (logId) => api.delete(`/water/logs/${logId}`),
    
    // Analytics endpoints
    analytics: {
      today: () => api.get('/water/analytics/today'),
      daily: (days = 30) => api.get('/water/analytics/daily', { params: { days } }),
      weekly: (weeks = 4) => api.get('/water/analytics/weekly', { params: { weeks } }),
      monthly: (months = 6) => api.get('/water/analytics/monthly', { params: { months } }),
      hourly: (startDate, endDate) => api.get('/water/analytics/hourly', { 
        params: { startDate, endDate } 
      })
    }
  },

  // Notification endpoints
  notifications: {
    getVapidKey: () => api.get('/notifications/vapid-public-key'),
    subscribe: (subscription) => api.post('/notifications/subscribe', subscription),
    unsubscribe: (endpoint) => api.post('/notifications/unsubscribe', { endpoint }),
    getSubscriptions: () => api.get('/notifications/subscriptions'),
    deleteSubscription: (id) => api.delete(`/notifications/subscriptions/${id}`),
    sendTest: () => api.post('/notifications/test'),
    toggle: (enabled) => api.post('/notifications/toggle', { enabled })
  }
}

// Export both the axios instance and the methods
export { api, apiMethods }
export default apiMethods
