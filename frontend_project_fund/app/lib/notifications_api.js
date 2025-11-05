// app/lib/notifications_api.js
import apiClient from './api';

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
    return apiClient.get('/notifications/counter');
  },

  /** มาร์คว่าอ่านแล้ว (รายการเดียว) */
  async markRead(notificationId) {
    return apiClient.patch(`/notifications/${notificationId}/read`);
  },

  /** มาร์คว่าอ่านทั้งหมดของผู้ใช้ปัจจุบัน */
  async markAllRead() {
    return apiClient.post('/notifications/mark-all-read');
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

    return apiClient.post(
      `/notifications/events/submissions/${submissionId}/submitted`,
      payload
    );
  },

  /**
   * อีเวนต์: หัวหน้าสาขา “เห็นควรพิจารณา”
   * -> แจ้งผู้ยื่น + แจ้งแอดมิน
   */
  async notifyDeptHeadRecommended(submissionId, { comment } = {}) {
    return apiClient.post(
      `/notifications/events/submissions/${submissionId}/dept-head/recommended`,
      { comment: comment || '' }
    );
  },

  /**
   * อีเวนต์: หัวหน้าสาขา “ไม่เห็นควรพิจารณา”
   * -> แจ้งผู้ยื่นเท่านั้น (ไม่แจ้งแอดมิน)
   */
  async notifyDeptHeadNotRecommended(submissionId, { reason, comment } = {}) {
    return apiClient.post(
      `/notifications/events/submissions/${submissionId}/dept-head/not-recommended`,
      { reason: reason || '', comment: comment || '' }
    );
  },

  /**
   * อีเวนต์: แอดมิน “อนุมัติ”
   * -> แจ้งผู้ยื่น พร้อม “จำนวนเงินที่อนุมัติ” (backend ดึงจากตาราง detail)
   *    (ถ้ามี) ส่งเลขอ้างอิงประกาศไปด้วย
   */
  async notifySubmissionApproved(submissionId, { announce_reference_number } = {}) {
    return apiClient.post(
      `/notifications/events/submissions/${submissionId}/approved`,
      { announce_reference_number: announce_reference_number || '' }
    );
  },

  /**
   * อีเวนต์: แอดมิน “ไม่อนุมัติ”
   * -> แจ้งผู้ยื่น พร้อมเหตุผล (ถ้าไม่ส่ง reason มาที่ backend จะอ่านจาก submissions เอง)
   */
  async notifySubmissionRejected(submissionId, { reason } = {}) {
    return apiClient.post(
      `/notifications/events/submissions/${submissionId}/rejected`,
      { reason: reason || '' }
    );
  },

  /** สร้างแจ้งเตือนแบบ manual (ถ้าจำเป็น) */
  async create(payload) {
    return apiClient.post('/notifications', payload);
  },
};

export default notificationsAPI;