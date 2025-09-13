// app/lib/system_config_api.js
import apiClient from './api';

/**
 * System Config API (frontend client)
 * คุยกับ backend โดยตรงผ่าน apiClient เพื่อเลี่ยง 401 จาก /app/api/*
 */
export const systemConfigAPI = {
  /** GET /api/v1/system-config/window */
  async getWindow() {
    // apiClient จะเติม baseURL + token ให้เอง
    // baseURL มาจาก NEXT_PUBLIC_API_URL (เช่น http://localhost:8080/api/v1)
    return apiClient.get('/system-config/window');
  },

  /** GET /api/v1/system-config/current-year */
  async getCurrentYear() {
    return apiClient.get('/system-config/current-year');
  },

  /** GET /api/v1/admin/system-config (สำหรับหน้า Admin) */
  async getAdminConfig() {
    return apiClient.get('/admin/system-config');
  },

  /** ปรับ response ให้อยู่รูปแบบเดียวที่หน้า UI ใช้ง่าย */
  normalizeWindow(raw) {
    // รองรับทั้ง {success, data} และ JSON ตรงๆ
    const root =
      raw?.data && (raw.success === true || typeof raw.success === 'boolean')
        ? raw.data
        : raw ?? {};

    const out = {
      start_date: root?.start_date ?? null,
      end_date: root?.end_date ?? null,
      is_open_effective:
        typeof root?.is_open_effective === 'boolean'
          ? root.is_open_effective
          : (typeof root?.is_open_raw === 'boolean' ? root.is_open_raw : null),
      current_year: root?.current_year ?? null,
      last_updated: root?.last_updated ?? null,
      now: root?.now ?? new Date().toISOString(),
    };
    return out;
  },
};

export default systemConfigAPI;
