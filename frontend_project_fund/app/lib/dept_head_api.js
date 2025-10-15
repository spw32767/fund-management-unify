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

const extractFirstArray = (candidate, depth = 0) => {
  if (Array.isArray(candidate)) {
    return candidate;
  }
  if (!candidate || typeof candidate !== 'object' || depth > 3) {
    return null;
  }

  const nextDepth = depth + 1;
  const keys = [
    'documents',
    'document_list',
    'files',
    'items',
    'results',
    'data',
    'rows',
    'list',
    'values',
    'attachments',
    'users',
    'submission_users',
    'records',
  ];

  for (const key of keys) {
    if (candidate[key] !== undefined) {
      const found = extractFirstArray(candidate[key], nextDepth);
      if (found) {
        return found;
      }
    }
  }

  return null;
};

const pickArray = (...candidates) => {
  for (const candidate of candidates) {
    const arr = extractFirstArray(candidate, 0);
    if (arr) {
      return arr;
    }
  }
  return [];
};

const extractSubmissionFromPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return payload ?? null;
  }
  if (payload.submission && typeof payload.submission === 'object') {
    return payload.submission;
  }
  if (
    payload.data &&
    typeof payload.data === 'object' &&
    payload.data.submission &&
    typeof payload.data.submission === 'object'
  ) {
    return payload.data.submission;
  }
  if (payload.Submission && typeof payload.Submission === 'object') {
    return payload.Submission;
  }
  return payload;
};

const deriveFallbackDetails = (submission, detailCandidate) => {
  const candidate = detailCandidate || submission?.details || submission?.Detail || submission?.detail;

  if (candidate && typeof candidate === 'object') {
    if ('type' in candidate && 'data' in candidate) {
      return candidate;
    }

    const resolvedType =
      candidate?.type ||
      submission?.submission_type ||
      submission?.SubmissionType ||
      null;

    if (resolvedType) {
      const data = candidate?.data !== undefined ? candidate.data : candidate;
      return { type: resolvedType, data };
    }
  }

  const type = submission?.submission_type || submission?.SubmissionType || null;
  if (!type) {
    return null;
  }

  return { type, data: null };
};

const buildFallbackSubmissionDetails = async (submissionId) => {
  let submissionPayload;
  try {
    submissionPayload = await apiClient.get(`/submissions/${submissionId}`);
  } catch (error) {
    console.error('[deptHeadAPI] fallback submission fetch failed', error);
    throw error;
  }

  let usersPayload = null;
  try {
    usersPayload = await apiClient.get(`/submissions/${submissionId}/users`);
  } catch (error) {
    console.warn('[deptHeadAPI] fallback users fetch failed', error);
  }

  let documentsPayload = null;
  try {
    documentsPayload = await apiClient.get(`/submissions/${submissionId}/documents`);
  } catch (error) {
    console.warn('[deptHeadAPI] fallback documents fetch failed', error);
  }

  const submission = extractSubmissionFromPayload(submissionPayload) || null;

  const submissionUsers = pickArray(
    submission?.submission_users,
    submissionPayload?.submission_users,
    submissionPayload?.users,
    submissionPayload?.data?.submission_users,
    submissionPayload?.data?.users,
    usersPayload?.submission_users,
    usersPayload?.users,
    usersPayload?.data,
    usersPayload?.items,
    usersPayload?.results,
    usersPayload
  );

  const documents = pickArray(
    submission?.documents,
    submission?.submission_documents,
    submissionPayload?.documents,
    submissionPayload?.data?.documents,
    submissionPayload?.data?.documents?.data,
    submissionPayload?.data?.documents?.items,
    submissionPayload?.data?.documents?.results,
    documentsPayload?.documents,
    documentsPayload?.data?.documents,
    documentsPayload?.data,
    documentsPayload?.items,
    documentsPayload?.results,
    documentsPayload
  );

  const details = deriveFallbackDetails(
    submission,
    submissionPayload?.details && typeof submissionPayload.details === 'object'
      ? submissionPayload.details
      : null
  );

  const normalizedSubmission = submission ? { ...submission } : null;
  if (normalizedSubmission) {
    normalizedSubmission.submission_users = submissionUsers;
    normalizedSubmission.documents = documents;
  }

  return {
    submission: normalizedSubmission,
    submission_users: submissionUsers,
    documents,
    details,
    success: Boolean(normalizedSubmission),
  };
};

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
      if (payload) {
        return payload;
      }
    } catch (e) {
      if (!(e?.status === 404 || String(e?.status) === '404')) {
        console.warn('[deptHeadAPI] primary details fetch failed', e);
        throw e;
      }
    }

    return buildFallbackSubmissionDetails(id);
  },

  // app/lib/dept_head_api.js
  async getSubmissionDocuments(submissionId, params = {}) {
    if (!submissionId) throw new Error('submission id is required');

    const query = params && typeof params === 'object' ? { ...params } : {};
    let lastError = null;

    const attempts = [
      {
        path: `/dept-head/submissions/${submissionId}/documents`,
        label: 'dept-head',
      },
      {
        path: `/submissions/${submissionId}/documents`,
        label: 'general',
      },
    ];

    for (const attempt of attempts) {
      try {
        const result = await apiClient.get(attempt.path, query);
        if (result !== undefined && result !== null) {
          if (typeof result === 'object' && !Array.isArray(result)) {
            return { ...result, source: result.source ?? attempt.label };
          }
          return result;
        }
      } catch (error) {
        lastError = error;
        console.warn(`[deptHeadAPI] ${attempt.label} documents fetch failed`, error);

        if (error?.status === 404 || String(error?.status) === '404') {
          return {
            documents: [],
            data: { documents: [] },
            success: true,
            source: attempt.label,
            error: undefined,
          };
        }
      }
    }

    if (lastError?.status === 404 || String(lastError?.status) === '404') {
      return {
        documents: [],
        data: { documents: [] },
        success: true,
        source: 'dept-head',
        error: undefined,
      };
    }

    try {
      const fallback = await buildFallbackSubmissionDetails(submissionId);
      const documents = fallback?.documents ?? [];
      const fallbackSuccessFlag =
        fallback?.success !== undefined && fallback?.success !== null
          ? Boolean(fallback.success)
          : undefined;
      const hasSubmission = fallback?.submission != null;
      const successValue =
        fallbackSuccessFlag !== undefined ? fallbackSuccessFlag : hasSubmission;
      return {
        documents,
        data: { documents },
        success: Boolean(successValue || documents.length > 0),
        source: 'fallback',
        error: lastError ? lastError.message : undefined,
      };
    } catch (fallbackError) {
      console.warn('[deptHeadAPI] fallback documents via submission details failed', fallbackError);
      return {
        documents: [],
        data: { documents: [] },
        success: false,
        source: 'error',
        error: fallbackError?.message || lastError?.message,
      };
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

  async requestRevision(id, payload = {}) {
    try {
      return await apiClient.post(`/dept-head/submissions/${id}/request-revision`, payload);
    } catch (e) {
      if (e?.status === 404 || String(e?.status) === '404') {
        throw new Error('ยังไม่มี endpoint ขอข้อมูลเพิ่มเติมสำหรับหัวหน้าสาขาในระบบปัจจุบัน (404)');
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