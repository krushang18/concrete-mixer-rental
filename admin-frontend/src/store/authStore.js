import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authApi } from "../services/authApi";
import toast from "react-hot-toast";

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      lastActivity: null,
      error: null,
      _hasHydrated: false,

      // Set hydration state
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      // Actions
      login: async (credentials) => {
        try {
          set({ isLoading: true, error: null });

          const response = await authApi.login(credentials);

          if (response.success) {
            const { user, token } = response.data;

            set({
              user,
              token,
              isAuthenticated: true,
              lastActivity: Date.now(),
              isLoading: false,
              error: null,
            });

            toast.success(`Welcome back, ${user.username}!`);
            return { success: true };
          } else {
            set({ isLoading: false, error: response.message });
            toast.error(response.message || "Login failed");
            return { success: false, error: response.message };
          }
        } catch (error) {
          const errorMessage =
            error.response?.data?.message || error.message || "Login failed";
          set({ isLoading: false, error: errorMessage });
          toast.error(errorMessage);
          return { success: false, error: errorMessage };
        }
      },

      logout: async (showMessage = true) => {
        try {
          const { token } = get();

          // Call backend logout if token exists
          if (token) {
            await authApi.logout();
          }

          if (showMessage) {
            toast.success("Logged out successfully");
          }
        } catch (error) {
          console.log("Logout API call failed:", error);
          // Continue with logout even if API call fails
        } finally {
          // Clear state regardless of API call success
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            lastActivity: null,
            error: null,
            isLoading: false,
          });
        }
      },

      verifyToken: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false });
          return false;
        }

        try {
          const response = await authApi.verifyToken();

          if (response.success) {
            set({
              lastActivity: Date.now(),
              error: null,
            });
            return true;
          } else {
            // Token invalid, clear auth
            get().logout(false);
            return false;
          }
        } catch (error) {
          console.log("Token verification failed:", error);
          get().logout(false);
          return false;
        }
      },

      updateLastActivity: () => {
        if (get().isAuthenticated) {
          set({ lastActivity: Date.now() });
        }
      },

      // Check if session is close to expiry (7.5 hours = 27000000ms)
      isSessionExpiringSoon: () => {
        const { lastActivity } = get();
        if (!lastActivity) return false;

        const SESSION_WARNING_TIME = 7.5 * 60 * 60 * 1000; // 7.5 hours
        return Date.now() - lastActivity > SESSION_WARNING_TIME;
      },

      // Check if session is expired (8 hours = 28800000ms)
      isSessionExpired: () => {
        const { lastActivity } = get();
        if (!lastActivity) return true;

        const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
        return Date.now() - lastActivity > SESSION_TIMEOUT;
      },

      // Clear any errors
      clearError: () => {
        set({ error: null });
      },

      // Initialize auth state (check token on app start)
      initializeAuth: async () => {
        const { token, isSessionExpired, _hasHydrated } = get();

        // Wait for hydration to complete
        if (!_hasHydrated) {
          return false;
        }

        if (!token) {
          set({ isAuthenticated: false });
          return false;
        }

        // Check if session is expired
        if (isSessionExpired()) {
          toast.error("Your session has expired. Please login again.");
          get().logout(false);
          return false;
        }

        // Verify token with backend
        return await get().verifyToken();
      },

      // Refresh user profile
      refreshProfile: async () => {
        try {
          const response = await authApi.getProfile();
          if (response.success) {
            set({ user: response.data.user });
            return true;
          }
          return false;
        } catch (error) {
          console.log("Profile refresh failed:", error);
          return false;
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export default useAuthStore;
