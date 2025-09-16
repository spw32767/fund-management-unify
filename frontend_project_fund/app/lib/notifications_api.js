// app/lib/notifications_api.js
import apiClient from './api';

/**
 * Notifications API (frontend client)
 * - ไม่แตะ UX; ใช้เรียก endpoint ฝั่ง Go ที่คุณเพิ่งเพิ่มไว้
 * - สไตล์เดียวกับ admin_submission_api.js
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
   */
  async notifySubmissionSubmitted(submissionId) {
    return apiClient.post(`/notifications/events/submissions/${submissionId}/submitted`);
  },

  /* แจ้งเตือนเมื่อ "อนุมัติ" */
  async notifySubmissionApproved(submissionId, { announce_reference_number } = {}) {
    return apiClient.post(
      `/notifications/events/submissions/${submissionId}/approved`,
      { announce_reference_number: announce_reference_number || '' }
    );
  },

  /* แจ้งเตือนเมื่อ "ไม่อนุมัติ" */
  async notifySubmissionRejected(submissionId, { reason } = {}) {
    return apiClient.post(
      `/notifications/events/submissions/${submissionId}/rejected`,
      { reason: reason || '' }
    );
  },

  async create(payload) {
    return apiClient.post('/notifications', payload);
  },

  
};

export default notificationsAPI;
