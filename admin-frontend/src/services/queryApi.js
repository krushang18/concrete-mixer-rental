import apiClient from "./api";

export const queryApi = {
  // Get all queries with filters and pagination
  getQueries: async (filters = {}) => {
    const params = new URLSearchParams();

    // Add filters to query parameters
    if (filters.status) params.append("status", filters.status);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
    if (filters.search) params.append("search", filters.search);
    if (filters.sortBy) params.append("sortBy", filters.sortBy);
    if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

    // Add pagination parameters
    if (filters.page) params.append("page", filters.page);
    if (filters.limit) params.append("limit", filters.limit);

    try {
      const response = await apiClient.get(`/admin/queries?${params}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching queries:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch queries"
      );
    }
  },
  getFilterOptions: async () => {
    const response = await apiClient.get("/admin/queries/filter-options");
    return response.data;
  },

  getPaginationSummary: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
    if (filters.search) params.append("search", filters.search);

    const response = await apiClient.get(`/admin/queries/summary?${params}`);
    return response.data;
  },

  // Get single query by ID with full details
  getQueryById: async (id) => {
    const response = await apiClient.get(`/admin/queries/${id}`);
    return response.data;
  },

  // Update query status
  updateQueryStatus: async (id, status) => {
    const response = await apiClient.put(`/admin/queries/${id}/status`, {
      status,
    });
    return response.data;
  },

  // Get query statistics for dashboard
  getQueryStats: async () => {
    try {
      const response = await apiClient.get("/admin/queries/stats");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch query stats:", error);
      // Return fallback structure if API fails
      throw error;
    }
  },

  // Validate query data before processing
  validateQueryData: (queryData) => {
    const errors = [];

    if (!queryData.company_name || queryData.company_name.trim().length < 2) {
      errors.push("Company name is required and must be at least 2 characters");
    }

    if (!queryData.email || !/\S+@\S+\.\S+/.test(queryData.email)) {
      errors.push("Valid email address is required");
    }

    if (!queryData.contact_number || queryData.contact_number.length < 10) {
      errors.push("Valid contact number is required");
    }

    if (!queryData.site_location || queryData.site_location.trim().length < 3) {
      errors.push("Site location is required");
    }

    if (!queryData.duration || queryData.duration.trim().length < 1) {
      errors.push("Project duration is required");
    }

    if (
      !queryData.work_description ||
      queryData.work_description.trim().length < 10
    ) {
      errors.push(
        "Work description is required and must be at least 10 characters"
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Format query data for display
  formatQueryForDisplay: (query) => {
    return {
      ...query,
      reference: `QRY-${String(query.id).padStart(4, "0")}`,
      formattedCreatedAt: new Date(query.created_at).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
      formattedUpdatedAt: new Date(query.updated_at).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
      daysSinceCreated: Math.floor(
        (new Date() - new Date(query.created_at)) / (1000 * 60 * 60 * 24)
      ),
      truncatedDescription:
        query.work_description.length > 100
          ? `${query.work_description.substring(0, 100)}...`
          : query.work_description,
    };
  },

  // Cache management
  clearQueryCache: () => {
    // This would work with your React Query cache
    if (window.queryClient) {
      window.queryClient.removeQueries(["queries"]);
      window.queryClient.removeQueries(["query-stats"]);
    }
  },

  // Error handling helper
  handleApiError: (error) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || "An error occurred";
      const status = error.response.status;

      if (status === 401) {
        // Handle unauthorized - redirect to login
        window.location.href = "/login";
        return "Session expired. Please login again.";
      }

      if (status === 403) {
        return "You do not have permission to perform this action.";
      }

      if (status >= 500) {
        return "Server error. Please try again later.";
      }

      return message;
    } else if (error.request) {
      // Network error
      return "Network error. Please check your connection.";
    } else {
      // Other error
      return error.message || "An unexpected error occurred.";
    }
  },
};
