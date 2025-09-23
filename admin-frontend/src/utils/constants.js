export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/admin/auth/login",
    LOGOUT: "/admin/auth/logout",
    VERIFY: "/admin/auth/verify-token",
    PROFILE: "/admin/auth/profile",
    CHANGE_PASSWORD: "/admin/auth/change-password",
    FORGOT_PASSWORD: "/admin/auth/forgot-password",
    RESET_PASSWORD: "/admin/auth/reset-password",
  },
  DASHBOARD: {
    STATS: "/admin/dashboard/stats",
    CHARTS: "/admin/dashboard/charts",
  },
  QUERIES: {
    ALL: "/admin/queries",
    BY_ID: "/admin/queries",
    UPDATE_STATUS: "/admin/queries",
  },
  MACHINES: {
    ALL: "/admin/machines",
    ACTIVE: "/admin/machines/active",
    BY_ID: "/admin/machines",
  },
};

export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  QUERIES: "/queries",
  MACHINES: "/machines",
  CUSTOMERS: "/customers",
  QUOTATIONS: "/quotations",
  SETTINGS: "/settings",
};

export const STORAGE_KEYS = {
  AUTH: "auth-storage",
  THEME: "theme-preference",
  SIDEBAR: "sidebar-state",
};

export const SESSION_CONFIG = {
  WARNING_TIME: 7.5 * 60 * 60 * 1000, // 7.5 hours
  TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours
  CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
};

export const QUERY_STATUS = {
  NEW: "new",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
};

export const QUOTATION_STATUS = {
  DRAFT: "draft",
  SENT: "sent",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  EXPIRED: "expired",
};

export const DELIVERY_STATUS = {
  PENDING: "pending",
  DELIVERED: "delivered",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};
