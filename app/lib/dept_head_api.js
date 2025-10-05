// app/lib/dept_head_api.js
// Dept Head endpoints + helpers (mirror admin where possible)
import apiClient from './api';

async function tryGet(path, params) {
  try {
    return await apiClient.get(path, params);
  } catch (err) {
    throw err;
  }
}
async function safeGet(path, params) {
  return await apiClient.get(path, params);
}

export const deptHeadAPI = {
  // รายการคำร้องสำหรับหัวหน้าสาขา (default: status_code=5)
  async getPendingReviews(params = {}) {
    const query = { ...params };
    if (!('status_code' in query) || query.status_code == null) {
      query.status_code = '5';
    }
    try {
      const res = await tryGet('/dept-head/submissions', query);
      return res;
    } catch (e) {
      if (e?.status === 404 || String(e?.status) === '404') {
        const res = await safeGet('/submissions', query);
        return res;
      }
      throw e;
    }
  },

  // ==== DETAILS (เหมือน admin/submissions/:id/details) ====
  async getSubmissionDetails(id) {
    if (!id) throw new Error('submission id is required');

    // 1) ใช้ endpoint สำหรับ dept head โดยตรง (role 4)
    try {
      const payload = await tryGet(`/dept-head/submissions/${id}/details`);
      return payload;
    } catch (e) {
      if (!(e?.status === 404 || String(e?.status) === '404')) throw e;
    }

    // 2) fallback: รวมจาก endpoint กลางให้มีโครงเดียวกัน (submission + details + submission_users + documents)
    const [submission, users, docs] = await Promise.all([
      safeGet(`/submissions/${id}`),
      safeGet(`/submissions/${id}/users`),
      safeGet(`/submissions/${id}/documents`),
    ]);

    const submission_users = users?.users || users?.data || users?.items || users || [];
    const documents = docs?.documents || docs?.data || docs?.items || docs || [];

    // สร้าง details ให้มี { type, data } เหมือน admin (โดยระบุจาก submission_type)
    let details = null;
    const type = submission?.submission_type || submission?.SubmissionType || null;
    if (type) {
      details = { type, data: submission?.details || submission?.Detail || null };
      // ถ้า backend กลางไม่ได้ยัด detail ลง submission ให้ใส่ข้อมูล category/subcategory สำหรับ UI
      if (!details.data) {
        details = {
          type,
          data: {
            category_id:
              submission?.category_id ?? submission?.category?.category_id ?? null,
            subcategory_id:
              submission?.subcategory_id ?? submission?.subcategory?.subcategory_id ?? null,
            category: submission?.category
              ? {
                  category_id: submission?.category?.category_id ?? submission?.category_id,
                  category_name: submission?.category?.category_name ?? null,
                }
              : undefined,
            subcategory: submission?.subcategory
              ? {
                  subcategory_id:
                    submission?.subcategory?.subcategory_id ?? submission?.subcategory_id,
                  subcategory_name: submission?.subcategory?.subcategory_name ?? null,
                }
              : undefined,
          },
        };
      }
    }

    return { submission, details, submission_users, documents, success: true };
  },

  // app/lib/dept_head_api.js
  async getSubmissionDocuments(submissionId, params = {}) {
    if (!submissionId) throw new Error('submission id is required');

    try {
      return await apiClient.get(`/dept-head/submissions/${submissionId}/documents`, params);
    } catch (error) {
      if (error?.status === 404 || error?.status === 403 || String(error?.status) === '404' || String(error?.status) === '403') {
        return apiClient.get(`/submissions/${submissionId}/documents`, params);
      }
      throw error;
    }
  },

  async getDocumentTypes(params = {}) {
    // เดิม: return apiClient.get('/document-types', { params });
    return apiClient.get('/document-types', params);
  },

  // การดำเนินการของหัวหน้าสาขา
  async recommendSubmission(id, payload = {}) {
    try {
      return await apiClient.post(`/dept-head/submissions/${id}/recommend`, payload);
    } catch (e) {
      if (e?.status === 404 || String(e?.status) === '404') {
        throw new Error('ยังไม่มี endpoint เห็นควรสำหรับหัวหน้าสาขาในระบบปัจจุบัน (404)');
      }
      throw e;
    }
  },

  async rejectSubmission(id, payload = {}) {
    try {
      return await apiClient.post(`/dept-head/submissions/${id}/reject`, payload);
    } catch (e) {
      if (e?.status === 404 || String(e?.status) === '404') {
        throw new Error('ยังไม่มี endpoint ปฏิเสธสำหรับหัวหน้าสาขาในระบบปัจจุบัน (404)');
      }
      throw e;
    }
  },

  getAnnouncement(id) {
    // GET /api/v1/announcements/:id
    return apiClient.get(`/announcements/${id}`);
  },

  listAnnouncements(params = {}) {
    // GET /api/v1/announcements?q=&type=&status=&active_only=true&...
    return apiClient.get('/announcements', params);
  },

  viewAnnouncementURL(id) {
    return `${apiClient.baseURL}/announcements/${id}/view`;
  },
  
  downloadAnnouncementURL(id) {
    return `${apiClient.baseURL}/announcements/${id}/download`;
  },

  getCategories(yearId) {
    const q = {};
    if (yearId != null) q.year_id = yearId;
    return apiClient.get('/categories', q);
  },

  getSubcategories(categoryIdOrQuery) {
    let q = {};
    if (typeof categoryIdOrQuery === 'object' && categoryIdOrQuery !== null) {
      q = { ...categoryIdOrQuery };
    } else if (categoryIdOrQuery != null) {
      q.category_id = categoryIdOrQuery;
    }
    return apiClient.get('/subcategories', q);
  },

  getAllSubcategories(_ignored = null, yearId) {
    const q = {};
    if (yearId != null) q.year_id = yearId;
    return apiClient.get('/subcategories', q);
  },
  };

export default deptHeadAPI;
