// app/lib/system_config_api.js
import apiClient from './api';

/**
 * Frontend helper for System Config endpoints.
 * NOTE: This is a thin wrapper, no UI logic here.
 */
export const systemConfigAPI = {
  /** GET /api/v1/system-config/window
   *  Returns a flat JSON including all new columns + open flags.
   */
  async getWindow() {
    return apiClient.get('/system-config/window');
  },

  /** GET /api/v1/admin/system-config
   *  Returns { success, data: {...all columns...} }
   */
  async getAdmin() {
    return apiClient.get('/admin/system-config');
  },

  /** GET /api/v1/system-config/current-year
   *  Returns { current_year: string|null }
   */
  async getCurrentYear() {
    return apiClient.get('/system-config/current-year');
  },

  /**
   * Normalize various server shapes (flat vs admin-wrapped) to a consistent object.
   * We simply pass-through all fields we care about; unknown fields are ignored.
   */
  normalizeWindow(raw) {
    const root =
      raw?.data && (raw.success === true || typeof raw.success === 'boolean')
        ? raw.data
        : raw ?? {};

    const out = {
      // window core
      start_date: root?.start_date ?? null,
      end_date: root?.end_date ?? null,
      last_updated: root?.last_updated ?? null,
      current_year: root?.current_year ?? null,
      now: root?.now ?? new Date().toISOString(),

      // open flags
      is_open_effective:
        typeof root?.is_open_effective === 'boolean'
          ? root.is_open_effective
          : (typeof root?.is_open_raw === 'boolean' ? root.is_open_raw : null),
      is_open_raw:
        typeof root?.is_open_raw === 'boolean'
          ? root.is_open_raw
          : null,

      // identifiers / meta
      config_id: root?.config_id ?? null,
      system_version: root?.system_version ?? null,
      updated_by: root?.updated_by ?? null,

      // announcements (IDs pointing to system_config.config_id)
      main_annoucement: root?.main_annoucement ?? null,            // note: annoucement (DB spelling)
      reward_announcement: root?.reward_announcement ?? null,
      activity_support_announcement: root?.activity_support_announcement ?? null,
      conference_announcement: root?.conference_announcement ?? null,
      service_announcement: root?.service_announcement ?? null,
    };
    return out;
  },
};

export default systemConfigAPI;
