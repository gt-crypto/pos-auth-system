import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // Crucial for reading/writing HttpOnly session cookies
  
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor to catch 401 unauthorized and emit clear global triggers if needed
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If server returned a standardized failure
    if (error.response && error.response.data) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject({ success: false, message: error.message || 'Network error occurred' });
  }
);

export default api;
