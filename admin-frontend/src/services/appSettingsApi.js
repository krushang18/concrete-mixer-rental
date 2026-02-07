import apiClient from "./api";
import toast from "react-hot-toast";

export const appSettingsApi = {
  getDefaultTerms: async () => {
    try {
      const { data } = await apiClient.get("/admin/app-settings/default-terms");
      // data.data should be { default_terms: "..." }
      return { success: true, data: data.data };
    } catch (error) {
      console.error("Failed to fetch default terms", error);
      // Don't toast on fetch error usually, just return empty?
      // Or toast if critical.
      return { success: false, data: { default_terms: "" } };
    }
  },

  updateDefaultTerms: async (terms) => {
    try {
      const { data } = await apiClient.put("/admin/app-settings/default-terms", { terms });
      toast.success(data.message || "Default terms updated");
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update terms");
      throw error;
    }
  }
};
