import apiClient from "./api"; // Assuming default export

export const quotationMachineApi = {
  getAll: async (params = {}) => {
    try {
      const { data } = await apiClient.get("/admin/quotation-machines", { params });
      return { 
        success: true, 
        data: data.data || [], 
        pagination: data.pagination 
      };
    } catch (error) {
      console.error("Failed to fetch pricing catalog", error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const { data } = await apiClient.get(`/admin/quotation-machines/${id}`);
      return { success: true, data: data.data };
    } catch (error) {
      console.error("Failed to fetch item", error);
      throw error;
    }
  },

  create: async (machineData) => {
    try {
      const { data } = await apiClient.post("/admin/quotation-machines", machineData);
      return { success: true, data: data.data, message: data.message };
    } catch (error) {
      console.error("Failed to create item", error);
      throw error; // Let the component handle the toast
    }
  },

  update: async (id, machineData) => {
    try {
      const { data } = await apiClient.put(`/admin/quotation-machines/${id}`, machineData);
      return { success: true, message: data.message };
    } catch (error) {
      console.error("Failed to update item", error);
      throw error; // Let the component handle the toast
    }
  },

  delete: async (id) => {
    try {
      const { data } = await apiClient.delete(`/admin/quotation-machines/${id}`);
      return { success: true, message: data.message };
    } catch (error) {
      console.error("Failed to delete item", error);
      throw error; // Let the component handle the toast
    }
  }
};
