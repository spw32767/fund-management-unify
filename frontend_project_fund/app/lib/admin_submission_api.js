// app/lib/admin_submission_api.js
import apiClient from './api';

const pickFirst = (...candidates) => {
  for (const value of candidates) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeEventAttachment = (event = {}) => {
  const attachment = event?.attachment || event?.file || event?.document || {};
  const fileId = pickFirst(
    event?.file_id,
    event?.attachment_id,
    attachment?.file_id,
    attachment?.id,
    attachment?.fileId
  );
  const fileName = pickFirst(
    event?.file_name,
    event?.attachment_name,
    attachment?.original_name,
    attachment?.file_name,
    attachment?.name,
    attachment?.title
  );
  const filePath = pickFirst(
    event?.file_path,
    event?.attachment_path,
    attachment?.file_path,
    attachment?.path,
    attachment?.stored_path,
    attachment?.url
  );

  if (fileId == null && !fileName && !filePath) {
    return null;
  }

  return {
    file_id: fileId ?? null,
    file_name: fileName ?? null,
    file_path: filePath ?? null,
  };
};

const toUserName = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const firstName = pickFirst(
      value?.user_fname,
      value?.fname,
      value?.first_name,
      value?.firstname,
      value?.name,
      value?.name_th
    );
    const lastName = pickFirst(
      value?.user_lname,
      value?.lname,
      value?.last_name,
      value?.lastname,
      value?.surname,
      value?.name_en
    );

    if (firstName || lastName) {
      return [firstName, lastName].filter(Boolean).join(' ').trim() || null;
    }

    return pickFirst(value?.display_name, value?.full_name, value?.email, value?.username) || null;
  }

  return null;
};

const toUserId = (value) => {
  if (!value) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'object') {
    return pickFirst(value?.user_id, value?.id, value?.userId, value?.uid);
  }
  return null;
};

const normalizeUserDisplayName = (...candidates) => {
  for (const candidate of candidates) {
    const name = toUserName(candidate);
    if (name) {
      return name;
    }
  }
  return null;
};

const normalizeResearchFundEvent = (event = {}) => {
  const attachment = normalizeEventAttachment(event);
  const amount = toNumberOrNull(
    pickFirst(
      event?.amount,
      event?.paid_amount,
      event?.payment_amount,
      event?.total_amount,
      event?.value
    )
  );

  const creatorCandidate = pickFirst(
    event?.created_by,
    event?.creator,
    event?.user,
    event?.createdBy,
    event?.creator_user,
    event?.created_by_user
  );

  return {
    id: pickFirst(event?.event_id, event?.id, event?.research_fund_event_id, event?.timeline_id),
    submission_id: pickFirst(event?.submission_id, event?.SubmissionID),
    amount: amount ?? 0,
    comment: pickFirst(event?.comment, event?.note, event?.description, '') || '',
    status_after_id: toNumberOrNull(
      pickFirst(
        event?.status_after_id,
        event?.status_after,
        event?.status_after_status_id,
        event?.status_after_state_id
      )
    ),
    status_before_id: toNumberOrNull(
      pickFirst(
        event?.status_before_id,
        event?.status_before,
        event?.status_before_status_id,
        event?.status_before_state_id
      )
    ),
    status: pickFirst(event?.status, event?.event_status, event?.state, event?.status_code) || null,
    status_label:
      pickFirst(
        event?.status_name,
        event?.status_label,
        event?.event_status_label,
        event?.status_display,
        event?.status_text,
        event?.status
      ) || null,
    created_at: pickFirst(event?.created_at, event?.create_at, event?.createdAt, event?.timestamp) || null,
    created_by:
      pickFirst(
        toUserId(creatorCandidate),
        event?.created_by_id,
        event?.user_id,
        event?.creator_id
      ) ?? null,
    created_by_name:
      normalizeUserDisplayName(
        event?.created_by_name,
        creatorCandidate,
        event?.creator_name,
        event?.created_by_full_name,
        event?.creator,
        event?.user_name
      ),
    attachment,
    file_id: attachment?.file_id ?? null,
    file_name: attachment?.file_name ?? null,
    file_path: attachment?.file_path ?? null,
    raw: event,
  };
};

const normalizeResearchFundTotals = (totals = {}, fallback = {}) => {
  const approvedAmount =
    toNumberOrNull(
      pickFirst(
        totals?.approved_amount,
        totals?.total_approved_amount,
        totals?.total_approved,
        fallback?.approved_amount
      )
    ) ?? 0;
  const paidAmount =
    toNumberOrNull(
      pickFirst(
        totals?.paid_amount,
        totals?.total_paid_amount,
        totals?.total_paid,
        totals?.disbursed_amount,
        totals?.payout_total,
        fallback?.paid_amount
      )
    ) ?? 0;
  const pendingAmount =
    toNumberOrNull(
      pickFirst(
        totals?.pending_amount,
        totals?.total_pending_amount,
        totals?.pending_total,
        fallback?.pending_amount
      )
    ) ?? 0;

  const remainingRaw = pickFirst(
    totals?.remaining_amount,
    totals?.balance_amount,
    totals?.balance,
    fallback?.remaining_amount
  );
  const remainingAmount = (() => {
    const direct = toNumberOrNull(remainingRaw);
    if (direct != null) return direct;
    const computed = approvedAmount - (paidAmount + (pendingAmount ?? 0));
    return Number.isFinite(computed) ? computed : 0;
  })();

  const isClosed = Boolean(
    pickFirst(
      totals?.is_closed,
      totals?.closed,
      totals?.closed_at ? true : undefined,
      totals?.status === 'closed' ? true : undefined,
      totals?.state === 'closed' ? true : undefined,
      fallback?.is_closed
    )
  );

  const status = pickFirst(totals?.status, totals?.state, fallback?.status, isClosed ? 'closed' : 'approved');

  return {
    approved_amount: approvedAmount,
    paid_amount: paidAmount,
    pending_amount: pendingAmount ?? 0,
    remaining_amount: remainingAmount,
    is_closed: isClosed,
    status,
    last_event_at: pickFirst(totals?.last_event_at, totals?.latest_event_at, totals?.updated_at) || null,
    raw: totals,
  };
};

// Admin Submission Management API
export const adminSubmissionAPI = {
  
  // Admin detail view
  // GET /api/v1/admin/submissions/:id/details
  async getSubmissionDetails(submissionId) {
    return apiClient.get(`/admin/submissions/${submissionId}/details`);
  },

  // PATCH /api/v1/admin/submissions/:id/publication-reward/approval-amounts
  // payload: { reward_approve_amount, revision_fee_approve_amount, publication_fee_approve_amount, total_approve_amount }
  async updateApprovalAmounts(submissionId, payload) {
    return apiClient.patch(
      `/admin/submissions/${submissionId}/publication-reward/approval-amounts`,
      payload
    );
  },

  // POST /api/v1/admin/submissions/:id/approve
  // payload may include the 4 approve amounts + approval_comment
  async approveSubmission(submissionId, payload) {
    return apiClient.post(`/admin/submissions/${submissionId}/approve`, payload);
  },

  // POST /api/v1/admin/submissions/:id/reject
  // payload: { rejection_reason }
  async rejectSubmission(submissionId, payload) {
    return apiClient.post(`/admin/submissions/${submissionId}/reject`, payload);
  },

  async getUsersByIds(ids = []) {
    if (!ids.length) return { users: [] };
    const res = await apiClient.get('/admin/users', { params: { ids: ids.join(',') } }); // { users: [{user_id, user_fname, user_lname, email}] }
    return res;
  },

  async getSubmissionDocuments(submissionId, params = {}) {
    // GET /api/v1/submissions/:id/documents
    return apiClient.get(`/submissions/${submissionId}/documents`, { params });
  },

  async getDocumentTypes(params = {}) {
    // GET /api/v1/document-types   (หรือใช้ /admin/document-types ถ้าอยากดึงทั้งหมดแบบไม่กรอง)
    return apiClient.get('/document-types', { params });
  },

  async getResearchFundEvents(submissionId) {
    if (!submissionId) {
      return { events: [], totals: normalizeResearchFundTotals() };
    }

    const response = await apiClient.get(`/admin/submissions/${submissionId}/research-fund/events`);
    const payload = response?.data || response;

    const listSource = Array.isArray(payload?.events)
      ? payload.events
      : Array.isArray(payload?.timeline)
        ? payload.timeline
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

    const events = listSource.map((item) => normalizeResearchFundEvent(item));

    const totals = normalizeResearchFundTotals(payload?.totals || payload?.summary || payload?.meta || payload, {
      approved_amount: payload?.approved_amount,
      paid_amount: payload?.paid_amount,
      pending_amount: payload?.pending_amount,
      remaining_amount: payload?.remaining_amount,
      is_closed: payload?.is_closed,
      status: payload?.status,
    });

    return {
      events,
      totals,
      meta: payload?.meta || null,
    };
  },

  async createResearchFundEvent(submissionId, formData) {
    if (!submissionId) {
      throw new Error('submissionId is required');
    }

    let payload = formData;
    if (!(payload instanceof FormData)) {
      const fd = new FormData();
      Object.entries(formData || {}).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => fd.append(key, v));
        } else if (value !== undefined && value !== null) {
          fd.append(key, value);
        }
      });
      payload = fd;
    }

    const response = await apiClient.postFormData(
      `/admin/submissions/${submissionId}/research-fund/events`,
      payload
    );

    const data = response?.data || response?.event || response;
    return normalizeResearchFundEvent(data);
  },

  async toggleResearchFundClosure(submissionId, payload = {}) {
    if (!submissionId) {
      throw new Error('submissionId is required');
    }

    const response = await apiClient.post(
      `/admin/submissions/${submissionId}/research-fund/toggle-closure`,
      payload || {}
    );

    const body = response?.data || response;
    const totals = normalizeResearchFundTotals(body?.totals || body);
    const events = Array.isArray(body?.events)
      ? body.events.map((item) => normalizeResearchFundEvent(item))
      : undefined;

    return {
      totals,
      events,
      meta: body?.meta || null,
    };
  }

};

// Add to existing submissions listing API
export const submissionsListingAPI = {
  
  // Get all submissions (general)
  async getAllSubmissions(params) {
    try {
      const response = await apiClient.get('/submissions', { params });
      return response;
    } catch (error) {
      console.error('Error fetching submissions:', error);
      throw error;
    }
  },

  // Search submissions
  async searchSubmissions(query, params) {
    try {
      const response = await apiClient.get('/submissions/search', {
        params: { q: query, ...params }
      });
      return response;
    } catch (error) {
      console.error('Error searching submissions:', error);
      throw error;
    }
  },

  // Get teacher submissions
  async getTeacherSubmissions(params) {
    try {
      const response = await apiClient.get('/teacher/submissions', { params });
      return response;
    } catch (error) {
      console.error('Error fetching teacher submissions:', error);
      throw error;
    }
  },

  // Get staff submissions
  async getStaffSubmissions(params) {
    try {
      const response = await apiClient.get('/staff/submissions', { params });
      return response;
    } catch (error) {
      console.error('Error fetching staff submissions:', error);
      throw error;
    }
  },

  async getAdminSubmissions(params) {
    try {
      console.log('[API] getAdminSubmissions called with params:', params);
      const response = await apiClient.get('/admin/submissions', { params });
      console.log('[API] Backend response filters:', response.filters);
      console.log('[API] Total submissions in response:', response.submissions?.length || 0);
      return response;
    } catch (error) {
      console.error('[API] Error fetching admin submissions:', error);
      throw error;
    }
  },

  // Export submissions (admin)
  async exportSubmissions(params) {
    try {
      const response = await apiClient.get('/admin/submissions/export', { params });
      return response;
    } catch (error) {
      console.error('Error exporting submissions:', error);
      throw error;
    }
  }
};

// Common API functions
export const commonAPI = {
  
  // Get years
  async getYears() {
    const response = await apiClient.get('/years');
    return response;
  },

  async getFundStructure() {
    // GET /api/v1/funds/structure
    const response = await apiClient.get('/funds/structure');
    return response;
  },

  // Get users (for dropdown)
  async getUsers() {
    try {
      const response = await apiClient.get('/users');
      return response;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  async getCategories() {
    // GET /api/v1/categories
    return apiClient.get('/categories');
  },

  async getSubcategories() {
    // GET /api/v1/subcategories
    return apiClient.get('/subcategories');
  },
  
  async getUsers() {
    // (you already have this, keep it)  GET /api/v1/users
    return apiClient.get('/users');
  },

  // --- add under adminSubmissionAPI ---
  async getBudgets(params = {}) {
    // GET /api/v1/admin/budgets
    return apiClient.get('/admin/budgets', { params });
  },

};

// Export all APIs
export default {
  adminSubmission: adminSubmissionAPI,
  submissionsListing: submissionsListingAPI,
  common: commonAPI
};