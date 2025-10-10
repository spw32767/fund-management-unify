// app/lib/admin_announcement_api.js
import { apiClient } from "@/app/lib/api";

/**
 * ========= Admin Announcements API =========
 * เส้นทาง: /announcements (ไม่มี /admin นำหน้า) — สอดคล้องกับ service เดิมของโปรเจกต์
 */
export const adminAnnouncementAPI = {
  // List (รับตัวกรองเช่น q, type, status, year_id, page, limit, sort)
  async list(filters = {}) {
    return apiClient.get("/announcements", filters); // GET /api/v1/announcements
  },

  async get(id) {
    if (id == null || id === "") {
      throw new Error("announcement id is required");
    }
    return apiClient.get(`/announcements/${encodeURIComponent(id)}`); // GET /api/v1/announcements/:id
  },

  // ───────── Announcements ─────────
  async create(payload = {}) {
    let fd;

    // ถ้า caller ส่ง FormData มาอยู่แล้ว ให้ใช้ต่อเลย
    if (payload instanceof FormData) {
      fd = payload;
    } else {
      // ถ้าเป็น object ธรรมดา แปลงเป็น FormData ที่นี่
      fd = new FormData();
      for (const [k, v] of Object.entries(payload)) {
        if (v === undefined || v === null || v === "") continue;
        // แปลง Date → ISO ถ้ามี
        if (v instanceof Date) {
          fd.append(k, v.toISOString());
        } else {
          fd.append(k, v);
        }
      }
      // เผื่อ caller ส่งไฟล์มาเป็น payload.file
      if (payload.file) fd.append("file", payload.file);
    }

    return apiClient.postFormData("/announcements", fd);
  },

  // Update metadata (JSON PUT)
  async update(id, body = {}) {
    if (id == null || id === "") {
      throw new Error("announcement id is required");
    }
    const payload = { ...body };
    if (payload.display_order != null) {
      payload.display_order = Number(payload.display_order); // สำคัญ: บังคับเป็น number
    }
    try {
      return await apiClient.put(`/announcements/${encodeURIComponent(id)}`, payload);
    } catch (err) {
      // โยนข้อความจาก backend ออกมาให้เห็นชัด ตอน dev
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Update announcement failed";
      throw new Error(msg);
    }
  },

  // (ออปชัน) สำหรับบันทึกลำดับทีละหลายรายการ เรียกแบบทีละตัวเรียงกัน
  async reorderForms(rows = []) {
    for (const r of rows) {
      if (!r) continue;
      const id = r.announcement_id ?? r.id ?? r.form_id;
      if (id == null || id === "") continue;
      const order = Number(r.display_order);
      if (Number.isNaN(order)) continue;
      await this.update(id, { display_order: order });
    }
    return { success: true };
  },

  // Replace file — multipart PUT
  async replaceFile(id, file) {
    const fd = new FormData();
    fd.append("file", file);
    if (id == null || id === "") {
      throw new Error("announcement id is required");
    }
    return apiClient.putFormData(`/announcements/${encodeURIComponent(id)}`, fd); // PUT multipart /announcements/:id
  },

  // Delete
  async remove(id) {
    if (id == null || id === "") {
      throw new Error("announcement id is required");
    }
    return apiClient.delete(`/announcements/${encodeURIComponent(id)}`); // DELETE /api/v1/announcements/:id
  },
};

/**
 * ========= Admin Fund Forms API =========
 * เส้นทาง: /fund-forms (รูปแบบเดียวกับประกาศ)
 */
export const adminFundFormAPI = {
  // List (q, form_type, fund_category, status, year_id, page, limit, sort)
  async list(filters = {}) {
    return apiClient.get("/fund-forms", filters); // GET /api/v1/fund-forms
  },

  async get(id) {
    return apiClient.get(`/fund-forms/${id}`); // GET /api/v1/fund-forms/:id
  },

  // ───────── Fund Forms ─────────
  async create(payload = {}) {
    let fd;

    if (payload instanceof FormData) {
      fd = payload;
    } else {
      fd = new FormData();
      for (const [k, v] of Object.entries(payload)) {
        if (v === undefined || v === null || v === "") continue;
        if (v instanceof Date) {
          fd.append(k, v.toISOString());
        } else {
          fd.append(k, v);
        }
      }
      if (payload.file) fd.append("file", payload.file);
    }

    return apiClient.postFormData("/fund-forms", fd);
  },

  // Update metadata (JSON PUT)
  async update(id, body = {}) {
    return apiClient.put(`/fund-forms/${id}`, body); // PUT JSON /api/v1/fund-forms/:id
  },

  // Replace file — multipart PUT
  async replaceFile(id, file) {
    const fd = new FormData();
    fd.append("file", file);
    return apiClient.putFormData(`/fund-forms/${id}`, fd); // PUT multipart /fund-forms/:id
  },

  // Delete
  async remove(id) {
    return apiClient.delete(`/fund-forms/${id}`); // DELETE /api/v1/fund-forms/:id
  },
};

// (ออปชัน) default export รวมไว้ตัวเดียว เผื่ออยาก import แบบ default
export default {
  adminAnnouncementAPI,
  adminFundFormAPI,
};