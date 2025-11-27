// app/lib/notification_messages_api.js
import apiClient from "./api";

const normalizeList = (response) => {
  if (Array.isArray(response)) return response;
  if (response && typeof response === "object") {
    if (Array.isArray(response.items)) return response.items;
    if (Array.isArray(response.data)) return response.data;
  }
  return [];
};

export const notificationMessagesAPI = {
  async list(params = {}) {
    const data = await apiClient.get("/admin/notification-messages", params);
    return normalizeList(data);
  },

  async create(payload) {
    return apiClient.post("/admin/notification-messages", payload);
  },

  async update(id, payload) {
    return apiClient.put(`/admin/notification-messages/${id}`, payload);
  },

  async reset(id) {
    return apiClient.post(`/admin/notification-messages/${id}/reset`);
  },
};

export default notificationMessagesAPI;