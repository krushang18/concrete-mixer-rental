import { useEffect, useCallback } from "react";
import useAuthStore from "../store/authStore";
import { SESSION_CONFIG } from "../utils/constants";
import toast from "react-hot-toast";

export const useAuth = () => {
  const store = useAuthStore();

  return {
    ...store,
    // Convenience methods
    isLoggedIn: store.isAuthenticated,
    user: store.user,
    login: store.login,
    logout: store.logout,
    isLoading: store.isLoading,
  };
};

// Session monitoring hook
export const useSessionMonitor = () => {
  const {
    isAuthenticated,
    verifyToken,
    isSessionExpiringSoon,
    isSessionExpired,
    logout,
    updateLastActivity,
  } = useAuthStore();

  const checkSession = useCallback(async () => {
    if (!isAuthenticated) return;

    // Check if session is expired
    if (isSessionExpired()) {
      toast.error("Your session has expired. Please login again.");
      logout(false);
      return;
    }

    // Check if session is expiring soon
    if (isSessionExpiringSoon()) {
      const isValid = await verifyToken();
      if (!isValid) {
        toast.error("Your session has expired. Please login again.");
        logout(false);
      } else {
        toast("Session refreshed automatically", {
          icon: "🔄",
          duration: 2000,
        });
      }
    }
  }, [
    isAuthenticated,
    isSessionExpiringSoon,
    isSessionExpired,
    verifyToken,
    logout,
  ]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial session check
    checkSession();

    // Set up periodic session checking
    const interval = setInterval(checkSession, SESSION_CONFIG.CHECK_INTERVAL);

    // Check session when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSession();
      }
    };

    // Update activity on user interaction
    const handleUserActivity = () => {
      updateLastActivity();
    };

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("mousedown", handleUserActivity);
    document.addEventListener("keydown", handleUserActivity);
    document.addEventListener("scroll", handleUserActivity);
    document.addEventListener("touchstart", handleUserActivity);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("mousedown", handleUserActivity);
      document.removeEventListener("keydown", handleUserActivity);
      document.removeEventListener("scroll", handleUserActivity);
      document.removeEventListener("touchstart", handleUserActivity);
    };
  }, [isAuthenticated, checkSession, updateLastActivity]);
};

// Default export
const useAuthDefault = useAuth;
export default useAuthDefault;
