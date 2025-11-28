// app/lib/system_config_api.js
import apiClient from "./api";

// ===== helpers =====
function pickFirst(obj, keys = []) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) {
      return obj[k];
    }
  }
  return null;
}

/**
 * แปลงค่าวันเวลาให้เป็น ISO string (UTC) ที่ new Date(...) อ่านได้แน่ ๆ
 * รองรับรูปแบบ:
 *  - Date instance
 *  - ISO เดิม
 *  - MySQL DATETIME "YYYY-MM-DD HH:mm:ss" หรือ "YYYY-MM-DD HH:mm"
 *  - "YYYY-MM-DDTHH:mm:ss" (ไม่มี timezone) -> treat เป็น UTC
 */
function toISOorNull(v) {
  if (!v) return null;

  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isNaN(t) ? null : v.toISOString();
  }

  let s = String(v).trim();
  if (!s) return null;

  // "YYYY-MM-DD HH:mm(:ss)?" -> ทำเป็น UTC ISO
  let m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const sec = m[4] ?? "00";
    const iso = `${m[1]}T${m[2]}:${m[3]}:${sec}Z`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  // "YYYY-MM-DDTHH:mm(:ss)?" (ไม่มี timezone) -> treat เป็น UTC
  m = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const sec = m[4] ?? "00";
    const iso = `${m[1]}T${m[2]}:${m[3]}:${sec}Z`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  // พยายามให้ JS parse ตรง ๆ (รองรับกรณี ISO พร้อม timezone อยู่แล้ว)
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// แผนที่คีย์ช่วงเวลาแต่ละ slot (รองรับสะกดหลายแบบจาก BE)
const SLOT_TIME_KEYS = {
  main: {
    start: ["main_start_date", "main_announcement_start", "main_annoucement_start", "main_start_at"],
    end: ["main_end_date", "main_announcement_end", "main_annoucement_end", "main_end_at"],
    id: ["main_annoucement", "main_announcement", "main_ann_id"],
  },
  reward: {
    start: ["reward_start_date", "reward_announcement_start", "reward_start_at"],
    end: ["reward_end_date", "reward_announcement_end", "reward_end_at"],
    id: ["reward_announcement", "reward_ann_id"],
  },
  activity_support: {
    start: ["activity_support_start_date", "activity_support_announcement_start", "activity_support_start_at"],
    end: ["activity_support_end_date", "activity_support_announcement_end", "activity_support_end_at"],
    id: ["activity_support_announcement", "activity_support_ann_id"],
  },
  conference: {
    start: ["conference_start_date", "conference_announcement_start", "conference_start_at"],
    end: ["conference_end_date", "conference_announcement_end", "conference_end_at"],
    id: ["conference_announcement", "conference_ann_id"],
  },
  service: {
    start: ["service_start_date", "service_announcement_start", "service_start_at"],
    end: ["service_end_date", "service_announcement_end", "service_end_at"],
    id: ["service_announcement", "service_ann_id"],
  },
};

const SLOTS = ["main", "reward", "activity_support", "conference", "service"];

export const systemConfigAPI = {
  // ===== GETs =====
  async getWindow() {
    return apiClient.get("/system-config/window");
  },
  async getAdmin() {
    return apiClient.get("/admin/system-config");
  },
  async getCurrentYear() {
    return apiClient.get("/system-config/current-year");
  },
  async listAnnouncements(params = {}) {
    return apiClient.get("/announcements", params);
  },

  /**
   * ทำให้ shape ของ getWindow()/getAdmin() เป็นแบบเดียวกัน
   * และ "บังคับ" แปลงวันที่ทั้งหมดเป็น ISO (UTC) เพื่อให้ toLocalInput() ทำงานได้เสมอ
   */
  normalizeWindow(raw) {
    const root =
      raw?.data && (raw.success === true || typeof raw.success === "boolean")
        ? raw.data
        : raw ?? {};

    const normalized = {
      // window core (global เดิม) — แปลงเป็น ISO
      start_date: toISOorNull(root?.start_date),
      end_date: toISOorNull(root?.end_date),
      last_updated: toISOorNull(root?.last_updated),
      current_year: root?.current_year ?? null,
      contact_info: root?.contact_info ?? null,
      now: toISOorNull(root?.now) ?? new Date().toISOString(),

      // flags
      is_open_effective:
        typeof root?.is_open_effective === "boolean"
          ? root.is_open_effective
          : typeof root?.is_open_raw === "boolean"
          ? root.is_open_raw
          : null,
      is_open_raw: typeof root?.is_open_raw === "boolean" ? root.is_open_raw : null,

      // identifiers
      config_id: root?.config_id ?? null,
      system_version: root?.system_version ?? null,
      updated_by: root?.updated_by ?? null,

      // ids ของประกาศใน system_config (compat เดิม)
      main_annoucement: root?.main_annoucement ?? null,
      reward_announcement: root?.reward_announcement ?? null,
      activity_support_announcement: root?.activity_support_announcement ?? null,
      conference_announcement: root?.conference_announcement ?? null,
      service_announcement: root?.service_announcement ?? null,

      // อื่น ๆ
      kku_report_year: root?.kku_report_year ?? null,
      installment: root?.installment ?? null,
    };

    // เติม “เวลาเริ่ม/สิ้นสุดรายช่อง” ให้เป็น ISO เสมอ
    for (const slot of Object.keys(SLOT_TIME_KEYS)) {
      const startVal = pickFirst(root, SLOT_TIME_KEYS[slot].start);
      const endVal = pickFirst(root, SLOT_TIME_KEYS[slot].end);
      const idVal =
        normalized[slot === "main" ? "main_annoucement" : `${slot}_announcement`] ??
        pickFirst(root, SLOT_TIME_KEYS[slot].id);

      const startISO = toISOorNull(startVal);
      const endISO = toISOorNull(endVal);

      // flat
      normalized[`${slot}_start_date`] = startISO;
      normalized[`${slot}_end_date`] = endISO;

      // object
      normalized[`${slot}_window`] = {
        id: idVal ?? null,
        start_date: startISO,
        end_date: endISO,
      };
    }

    return normalized;
  },

  // ===== UPDATEs =====
  async updateAdmin(payload) {
    return apiClient.put("/admin/system-config", payload);
  },
  async updateWindow(payload) {
    return apiClient.put("/admin/system-config", payload);
  },

  /**
   * เซ็ตประกาศทีละช่อง: slot = main|reward|activity_support|conference|service
   * รองรับทั้งรูปแบบเก่า (ส่ง id ตรง ๆ) และใหม่ (ระบุ start/end)
   */
  async setAnnouncement(slot, data) {
    let payload;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const { announcement_id = null, start_date = null, end_date = null } = data;
      payload = {
        announcement_id: announcement_id ?? null,
        start_date: toISOorNull(start_date),
        end_date: toISOorNull(end_date),
      };
    } else {
      payload = { announcement_id: data ?? null };
    }
    return apiClient.patch(`/admin/system-config/announcements/${slot}`, payload);
  },

  async setAnnouncementWindow(slot, announcement_id, startISO, endISO) {
    return this.setAnnouncement(slot, {
      announcement_id: announcement_id ?? null,
      start_date: startISO ?? null,
      end_date: endISO ?? null,
    });
  },

  // ===== HISTORY =====
  async listAnnouncementHistory(slot, params = {}) {
    return apiClient.get(`/admin/system-config/announcements/${slot}/history`, params);
  },
  async listAnnouncementHistoryAll(params = {}) {
    const res = {};
    await Promise.all(
      SLOTS.map(async (slot) => {
        try {
          const r = await this.listAnnouncementHistory(slot, params);
          const items = Array.isArray(r) ? r : r?.items ?? r?.data ?? [];
          res[slot] = Array.isArray(items) ? items : [];
        } catch {
          res[slot] = [];
        }
      })
    );
    return res;
  },

  // ===== Dept Head =====
  async getCurrentDeptHead() {
    return apiClient.get("/system-config/dept-head/current");
  },
  async listDeptHeadHistory(params = {}) {
    return apiClient.get("/admin/system-config/dept-head/history", params);
  },
  async assignDeptHead(input) {
    const payload = { ...input };
    if (!payload.start_date && payload.effective_from) payload.start_date = payload.effective_from;
    if (!payload.end_date && payload.effective_to) payload.end_date = payload.effective_to;
    delete payload.effective_from;
    delete payload.effective_to;
    if (payload.start_date) payload.start_date = toISOorNull(payload.start_date);
    if (payload.end_date) payload.end_date = toISOorNull(payload.end_date);
    return apiClient.post("/admin/system-config/dept-head/assign", payload);
  },

  // ===== Shortcuts (compat เดิม) =====
  async setMainAnnouncement(id) {
    return this.setAnnouncement("main", id ?? null);
  },
  async setRewardAnnouncement(id) {
    return this.setAnnouncement("reward", id ?? null);
  },
  async setActivitySupportAnn(id) {
    return this.setAnnouncement("activity_support", id ?? null);
  },
  async setConferenceAnnouncement(id) {
    return this.setAnnouncement("conference", id ?? null);
  },
  async setServiceAnnouncement(id) {
    return this.setAnnouncement("service", id ?? null);
  },
};

export default systemConfigAPI;