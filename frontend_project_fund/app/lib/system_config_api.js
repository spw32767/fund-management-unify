// app/lib/system_config_api.js
// Thin wrapper สำหรับ System Config ให้ใช้ apiClient รูปแบบเดียวกับไฟล์ตัวอย่าง

import apiClient from "./api"; // ใช้ฐานเดียวกับ api.js

export const systemConfigAPI = {
  /** ดึง config (public window shape) */
  async getWindow() {
    // GET /api/v1/system-config/window
    return apiClient.get("/system-config/window");
  },

  /** ดึง config (admin shape: { success, data }) */
  async getAdmin() {
    // GET /api/v1/admin/system-config
    return apiClient.get("/admin/system-config");
  },

  /** บันทึก config (admin) — รองรับ 5 คอลัมน์ประกาศด้วย */
  async updateAdmin(payload) {
    // PUT /api/v1/admin/system-config
    // payload ตัวอย่าง:
    // {
    //   current_year: "2568",
    //   start_date: "2025-09-06T23:01:58.000Z",
    //   end_date: "2025-09-30T16:59:00.000Z",
    //   main_annoucement: 1,
    //   reward_announcement: 2,
    //   activity_support_announcement: 3,
    //   conference_announcement: 4,
    //   service_announcement: 5
    // }
    return apiClient.put("/admin/system-config", payload);
  },

  /** ดึงปีงบประมาณปัจจุบัน (ถ้ามี endpoint แยก) */
  async getCurrentYear() {
    // GET /api/v1/system-config/current-year
    return apiClient.get("/system-config/current-year");
  },

  /** ดึงรายการประกาศ (ไว้ไปเติม dropdown) */
  async listAnnouncements(params = {}) {
    // GET /api/v1/announcements
    // คุณจะใช้ announcementAPI.getAnnouncements(...) จากไฟล์ api.js ก็ได้เช่นกัน
    return apiClient.get("/announcements", params);
  },

  /** ทำให้ shape ของ getWindow() / getAdmin() เป็นอ็อบเจ็กต์เดียวกัน */
  normalizeWindow(raw) {
    // ฝั่ง admin มักเป็น { success, data }, ฝั่ง public มักเป็น flat object
    const root =
      raw?.data && (raw.success === true || typeof raw.success === "boolean")
        ? raw.data
        : raw ?? {};

    return {
      // window core
      start_date: root?.start_date ?? null,
      end_date: root?.end_date ?? null,
      last_updated: root?.last_updated ?? null,
      current_year: root?.current_year ?? null,
      now: root?.now ?? new Date().toISOString(),

      // flags
      is_open_effective:
        typeof root?.is_open_effective === "boolean"
          ? root.is_open_effective
          : typeof root?.is_open_raw === "boolean"
          ? root.is_open_raw
          : null,
      is_open_raw:
        typeof root?.is_open_raw === "boolean" ? root.is_open_raw : null,

      // identifiers
      config_id: root?.config_id ?? null,
      system_version: root?.system_version ?? null,
      updated_by: root?.updated_by ?? null,

      // announcement ids (สะกดให้ตรง DB: main_annoucement)
      main_annoucement: root?.main_annoucement ?? null,
      reward_announcement: root?.reward_announcement ?? null,
      activity_support_announcement: root?.activity_support_announcement ?? null,
      conference_announcement: root?.conference_announcement ?? null,
      service_announcement: root?.service_announcement ?? null,
      // additional fields used in member forms
      kku_report_year: root?.kku_report_year ?? null,
      installment: root?.installment ?? null,
    };
  },
/** บันทึกเฉพาะ "ปีงบประมาณ + ช่วงเวลา" */
async updateWindow(payload) {
  // payload: { current_year, start_date, end_date }
  return apiClient.put("/admin/system-config", payload);
},

/** เซ็ตประกาศทีละช่อง: slot = main | reward | activity_support | conference | service */
async setAnnouncement(slot, announcement_id) {
  return apiClient.patch(`/admin/system-config/announcements/${slot}`, { announcement_id });
},

async getCurrentDeptHead() {
  return apiClient.get("/system-config/dept-head/current");
},
async listDeptHeadHistory(params = {}) {
  return apiClient.get("/admin/system-config/dept-head/history", { params });
},
async assignDeptHead(payload) {
  // { head_user_id, effective_from?, note? }
  return apiClient.post("/admin/system-config/dept-head/assign", payload);
},

// ช็อตคัต
async setMainAnnouncement(id)       { return this.setAnnouncement("main", id ?? null); },
async setRewardAnnouncement(id)     { return this.setAnnouncement("reward", id ?? null); },
async setActivitySupportAnn(id)     { return this.setAnnouncement("activity_support", id ?? null); },
async setConferenceAnnouncement(id) { return this.setAnnouncement("conference", id ?? null); },
async setServiceAnnouncement(id)    { return this.setAnnouncement("service", id ?? null); },

};
export default systemConfigAPI;