// app/lib/notifications_api.js
import apiClient from './api';

export const NOTIFICATIONS_UPDATED_EVENT = 'notifications:updated';

function broadcastUnread(unread, { refreshList = false } = {}) {
  if (typeof window === 'undefined') return;

  const detail = { refreshList };
  if (typeof unread === 'number' && Number.isFinite(unread)) {
    detail.unread = unread;
  }

  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT, { detail }));
}

async function syncUnreadFromResponse(resp, { fallbackRefresh = false, refreshList = false } = {}) {
  const unread = typeof resp?.unread === 'number' ? resp.unread : null;
  if (unread !== null) {
    broadcastUnread(unread, { refreshList });
    return unread;
  }

  if (!fallbackRefresh) return null;

  try {
    const counter = await apiClient.get('/notifications/counter');
    if (typeof counter?.unread === 'number') {
      broadcastUnread(counter.unread, { refreshList });
      return counter.unread;
    }
  } catch (error) {
    console.warn('Failed to refresh notification counter', error);
  }

  return null;
}

/**
 * Notifications API (frontend client)
 * Flow ใหม่:
 * - เมื่อส่งคำร้อง: แจ้งผู้ยื่น + หัวหน้าสาขา
 * - เมื่อหัวหน้าสาขาเห็นควร/ไม่เห็นควร:
 *   - แจ้งผู้ยื่น
 *   - แจ้งแอดมิน "เฉพาะกรณีเห็นควรพิจารณา"
 * - เมื่อแอดมินอนุมัติ/ไม่อนุมัติ:
 *   - แจ้งผู้ยื่น (กรณีอนุมัติ backend จะดึงจำนวนเงินจากตาราง detail)
 */
export const notificationsAPI = {
  /** ดึงรายการของผู้ใช้ปัจจุบัน */
  async list({ unreadOnly = false, limit = 20, offset = 0 } = {}) {
    const params = { limit, offset };
    if (unreadOnly) params.unreadOnly = 1;
    return apiClient.get('/notifications', { params });
  },

  /** จำนวนที่ยังไม่อ่าน */
  async count() {
    const res = await apiClient.get('/notifications/counter');
    await syncUnreadFromResponse(res);
    return res;
  },

  /** มาร์คว่าอ่านแล้ว (รายการเดียว) */
  async markRead(notificationId) {
    const res = await apiClient.patch(`/notifications/${notificationId}/read`);
    await syncUnreadFromResponse(res, { fallbackRefresh: true, refreshList: true });
    return res;
  },

  /** มาร์คว่าอ่านทั้งหมดของผู้ใช้ปัจจุบัน */
  async markAllRead() {
    const res = await apiClient.post('/notifications/mark-all-read');
    await syncUnreadFromResponse(res, { fallbackRefresh: true, refreshList: true });
    return res;
  },

  /**
   * อีเวนต์: ผู้ใช้ส่งคำร้องสำเร็จ
   * (เรียกหลัง submitSubmission(submissionId) สำเร็จ)
   * -> แจ้ง ผู้ยื่น + หัวหน้าสาขาปัจจุบัน
   */
  async notifySubmissionSubmitted(submissionId, details = {}) {
    const payload = {};
    if (details && typeof details === 'object') {
      const submitterName = typeof details.submitter_name === 'string'
        ? details.submitter_name.trim()
        : '';
      if (submitterName) {
        payload.submitter_name = submitterName;
      }
    }

    const res = await apiClient.post(
      `/notifications/events/submissions/${submissionId}/submitted`,
      payload
    );

    await syncUnreadFromResponse(res, { fallbackRefresh: true, refreshList: true });

    return res;
  },

  /**
   * อีเวนต์: หัวหน้าสาขา “เห็นควรพิจารณา”
   * -> แจ้งผู้ยื่น + แจ้งแอดมิน
   */
  async notifyDeptHeadRecommended(submissionId, { comment } = {}) {
    const res = await apiClient.post(
      `/notifications/events/submissions/${submissionId}/dept-head/recommended`,
      { comment: comment || '' }
    );

    await syncUnreadFromResponse(res, { fallbackRefresh: true, refreshList: true });

    return res;
  },

  /**
   * อีเวนต์: หัวหน้าสาขา “ไม่เห็นควรพิจารณา”
   * -> แจ้งผู้ยื่นเท่านั้น (ไม่แจ้งแอดมิน)
   */
  async notifyDeptHeadNotRecommended(submissionId, { reason, comment } = {}) {
    const res = await apiClient.post(
      `/notifications/events/submissions/${submissionId}/dept-head/not-recommended`,
      { reason: reason || '', comment: comment || '' }
    );

    await syncUnreadFromResponse(res, { fallbackRefresh: true, refreshList: true });

    return res;
  },

  /**
   * อีเวนต์: แอดมิน “อนุมัติ”
   * -> แจ้งผู้ยื่น พร้อม “จำนวนเงินที่อนุมัติ” (backend ดึงจากตาราง detail)
   *    (ถ้ามี) ส่งเลขอ้างอิงประกาศไปด้วย
   */
  async notifySubmissionApproved(submissionId, { announce_reference_number } = {}) {
    const res = await apiClient.post(
      `/notifications/events/submissions/${submissionId}/approved`,
      { announce_reference_number: announce_reference_number || '' }
    );

    await syncUnreadFromResponse(res, { fallbackRefresh: true, refreshList: true });

    return res;
  },

  /**
   * อีเวนต์: แอดมิน “ไม่อนุมัติ”
   * -> แจ้งผู้ยื่น พร้อมเหตุผล (ถ้าไม่ส่ง reason มาที่ backend จะอ่านจาก submissions เอง)
   */
  async notifySubmissionRejected(submissionId, { reason } = {}) {
    const res = await apiClient.post(
      `/notifications/events/submissions/${submissionId}/rejected`,
      { reason: reason || '' }
    );

    await syncUnreadFromResponse(res, { fallbackRefresh: true, refreshList: true });

    return res;
  },

  /** สร้างแจ้งเตือนแบบ manual (ถ้าจำเป็น) */
  async create(payload) {
    const res = await apiClient.post('/notifications', payload);
    await syncUnreadFromResponse(res, { fallbackRefresh: true, refreshList: true });
    return res;
  },
};

export default notificationsAPI;