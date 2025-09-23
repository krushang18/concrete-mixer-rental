import apiClient from "./api";

export const authApi = {
  // Login
  login: async (credentials) => {
    const response = await apiClient.post("/admin/auth/login", credentials);
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await apiClient.post("/admin/auth/logout");
    return response.data;
  },

  // Verify token
  verifyToken: async () => {
    const response = await apiClient.post("/admin/auth/verify-token");
    return response.data;
  },

  // Get user profile
  getProfile: async () => {
    const response = await apiClient.get("/admin/auth/profile");
    return response.data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await apiClient.put(
      "/admin/auth/change-password",
      passwordData
    );
    return response.data;
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await apiClient.post("/admin/auth/forgot-password", {
      email,
    });
    return response.data;
  },

  // Reset password
  resetPassword: async (resetData) => {
    const response = await apiClient.post(
      "/admin/auth/reset-password",
      resetData
    );
    return response.data;
  },
};
