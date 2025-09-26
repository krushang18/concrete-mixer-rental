// src/services/api.js - Updated version
import axios from "axios";
import toast from "react-hot-toast";

// Create axios instance
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:3000/api",
  timeout: 15000, // 15 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token and update activity
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage directly to avoid circular dependency
    const authData = localStorage.getItem("auth-storage");

    if (authData) {
      try {
        const { state } = JSON.parse(authData);
        const { token } = state;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error("Error parsing auth data:", error);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle auth errors and common responses
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const { response } = error;

    if (response?.status === 401) {
      // Token expired or invalid - clear auth and redirect
      localStorage.removeItem("auth-storage");
      toast.error("Session expired. Please login again.");

      // Updated redirect path for admin panel
      if (window.location.pathname !== "/login") {
        window.location.href = "/admin/login";
      }
    } else if (response?.status === 429) {
      toast.error("Too many requests. Please wait a moment.");
    } else if (response?.status >= 500) {
      toast.error("Server error. Please try again later.");
    } else if (response?.status === 404) {
      toast.error("Resource not found.");
    } else if (response?.data?.message) {
      // Show backend error message
      toast.error(response.data.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
