// app/lib/admin_announcement_api.js
import { apiClient } from "@/app/lib/api";

export const adminAnnouncementAPI = {
  // List (q, type, status, year_id, page, limit, sort)
  async list(filters = {}) {
    return apiClient.get("/announcements", filters); // GET /api/v1/announcements
  },

  async get(id) {
    return apiClient.get(`/announcements/${id}`);    // GET /api/v1/announcements/:id
  },

  // Create (metadata + file) — multipart POST
  async create(form) {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") fd.append(k, v);
    });
    return apiClient.postFormData("/announcements", fd); // POST /api/v1/announcements
  },

  // Update metadata (JSON) — ไม่มีไฟล์
  async update(id, payload) {
    return apiClient.put(`/announcements/${id}`, payload); // PUT JSON /api/v1/announcements/:id
  },

  // Replace file — multipart PUT (แทนไฟล์)
  async replaceFile(id, file) {
    const fd = new FormData();
    fd.append("file", file);
    return apiClient.putFormData(`/announcements/${id}`, fd); // PUT multipart /announcements/:id
  },

  // Delete (admin)
  async remove(id) {
    return apiClient.delete(`/announcements/${id}`); // DELETE /api/v1/announcements/:id
  },
};

export default adminAnnouncementAPI;
