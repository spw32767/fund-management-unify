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

const normalizeStatusCode = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  if (['6', 'closed', 'admin_closed', 'ปิดทุน'].includes(normalized)) return 'closed';
  if (['1', 'approved', 'อนุมัติ'].includes(normalized)) return 'approved';
  return normalized;
};

const normalizeEventAttachment = (event = {}) => {
  const attachment =
    event?.attachment ||
    event?.file ||
    event?.document ||
    event?.File ||
    event;
  const fileId = pickFirst(
    event?.file_id,
    event?.attachment_id,
    event?.event_file_id,
    attachment?.event_file_id,
    attachment?.file_id,
    attachment?.id,
    attachment?.fileId
  );
  const originalName = pickFirst(
    event?.original_name,
    event?.original_filename,
    event?.attachment_name,
    event?.document_name,
    event?.display_name,
    event?.file_original_name,
    attachment?.original_name,
    attachment?.original_filename,
    attachment?.display_name,
    attachment?.document_name,
    attachment?.file_original_name,
    attachment?.title
  );
  const fileName = pickFirst(
    event?.file_name,
    event?.filename,
    attachment?.file_name,
    attachment?.filename,
    attachment?.name,
    originalName
  );
  const filePath = pickFirst(
    event?.file_path,
    event?.attachment_path,
    event?.stored_path,
    attachment?.stored_path,
    attachment?.file_path,
    attachment?.path,
    attachment?.url
  );

  const derivedName = (() => {
    if (originalName) return originalName;
    if (fileName) return fileName;
    if (typeof filePath === 'string' && filePath.includes('/')) {
      return filePath.split('/').pop();
    }
    return filePath || null;
  })();

  if (fileId == null && !derivedName && !filePath) {
    return null;
  }

  return {
    file_id: fileId ?? null,
    file_name: fileName ?? derivedName ?? null,
    original_name: derivedName ?? null,
    display_name: derivedName ?? null,
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
  const attachments = [];
  const seenKeys = new Set();
  const pushAttachment = (candidate) => {
    if (!candidate) return;
    const normalized = normalizeEventAttachment(candidate);
    if (!normalized) return;
    const key =
      normalized.file_id != null
        ? `id:${normalized.file_id}`
        : normalized.file_path
        ? `path:${normalized.file_path}`
        : normalized.file_name
        ? `name:${normalized.file_name}`
        : null;
    if (key && seenKeys.has(key)) return;
    if (key) seenKeys.add(key);
    attachments.push(normalized);
  };

  const attachmentGroups = [
    event?.attachments,
    event?.attachment_list,
    event?.attachmentList,
    event?.attachment_files,
    event?.files,
    event?.Files,
    event?.documents,
    event?.Documents,
    event?.Attachments,
  ];
  attachmentGroups.forEach((group) => {
    if (!group) return;
    if (Array.isArray(group)) {
      group.forEach((item) => pushAttachment(item));
      return;
    }
    if (typeof group === 'object') {
      Object.values(group).forEach((item) => pushAttachment(item));
    }
  });

  pushAttachment(event?.attachment);
  pushAttachment(event?.file);
  pushAttachment(event?.document);
  pushAttachment(event?.File);
  if (attachments.length === 0) {
    pushAttachment(event);
  }

  const primaryAttachment = attachments[0] || null;

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

  const statusAfter = event?.status_after || event?.StatusAfter || event?.statusAfter || null;
  const statusAfterId = pickFirst(
    event?.status_after_id,
    event?.StatusAfterID,
    statusAfter?.application_status_id,
    statusAfter?.ApplicationStatusID
  );
  const statusAfterCode = pickFirst(
    statusAfter?.status_code,
    statusAfter?.StatusCode,
    statusAfter?.code,
    statusAfter?.status,
    statusAfter?.statusCode
  );
  const statusAfterName = pickFirst(
    statusAfter?.status_name,
    statusAfter?.StatusName,
    statusAfter?.name,
    statusAfter?.title
  );

  const rawStatus = pickFirst(
    event?.status,
    event?.event_status,
    event?.state,
    event?.status_code,
    statusAfterCode
  );
  const normalizedStatus = normalizeStatusCode(rawStatus);
  const statusLabel =
    pickFirst(
      event?.status_name,
      event?.status_label,
      event?.event_status_label,
      event?.status_display,
      event?.status_text,
      statusAfterName
    ) || (normalizedStatus === 'closed' ? 'ปิดทุน' : normalizedStatus === 'approved' ? 'อนุมัติ' : null);

  return {
    id: pickFirst(event?.event_id, event?.id, event?.research_fund_event_id, event?.timeline_id),
    submission_id: pickFirst(event?.submission_id, event?.SubmissionID),
    amount: amount ?? 0,
    comment: pickFirst(event?.comment, event?.note, event?.description, '') || '',
    status: normalizedStatus,
    status_code: rawStatus ?? normalizedStatus,
    status_label: statusLabel,
    status_name: statusLabel,
    status_after_id: statusAfterId ?? null,
    status_after: statusAfter
      ? {
          status_code: statusAfterCode ?? null,
          status_name: statusAfterName ?? null,
          application_status_id: statusAfterId ?? null,
        }
      : null,
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
    attachment: primaryAttachment,
    attachments,
    files: attachments,
    file_id: primaryAttachment?.file_id ?? null,
    file_name: primaryAttachment?.file_name ?? null,
    file_path: primaryAttachment?.file_path ?? null,
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

  const statusId = toNumberOrNull(
    pickFirst(totals?.status_id, totals?.statusId, totals?.status_after_id, fallback?.status_id)
  );
  const statusCodeRaw = pickFirst(
    totals?.status_code,
    totals?.status,
    totals?.state,
    fallback?.status_code,
    fallback?.status
  );
  const statusNormalized = normalizeStatusCode(statusCodeRaw) || (isClosed ? 'closed' : 'approved');
  const statusName =
    pickFirst(
      totals?.status_name,
      totals?.status_label,
      totals?.status_text,
      fallback?.status_name,
      fallback?.status_label
    ) || (statusNormalized === 'closed' ? 'ปิดทุน' : statusNormalized === 'approved' ? 'อนุมัติ' : null);

  return {
    approved_amount: approvedAmount,
    paid_amount: paidAmount,
    pending_amount: pendingAmount ?? 0,
    remaining_amount: remainingAmount,
    is_closed: isClosed,
    status: statusNormalized,
    status_code: statusCodeRaw ?? statusNormalized,
    status_name: statusName,
    status_label: statusName,
    status_id: statusId ?? null,
    last_event_at: pickFirst(totals?.last_event_at, totals?.latest_event_at, totals?.updated_at) || null,
    raw: totals,
  };
};

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

    const resolvedType = pickFirst(
      candidate?.type,
      submission?.submission_type,
      submission?.SubmissionType
    );

    if (resolvedType) {
      const data = candidate?.data !== undefined ? candidate.data : candidate;
      return { type: resolvedType, data };
    }
  }

  const type = pickFirst(submission?.submission_type, submission?.SubmissionType);
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
    console.error('[adminSubmissionAPI] fallback submission fetch failed', error);
    throw error;
  }

  let usersPayload = null;
  try {
    usersPayload = await apiClient.get(`/submissions/${submissionId}/users`);
  } catch (error) {
    console.warn('[adminSubmissionAPI] fallback users fetch failed', error);
  }

  let documentsPayload = null;
  try {
    documentsPayload = await apiClient.get(`/submissions/${submissionId}/documents`);
  } catch (error) {
    console.warn('[adminSubmissionAPI] fallback documents fetch failed', error);
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

const normalizeFileUploadRecord = (payload = {}) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const file =
    payload?.file ||
    payload?.File ||
    payload?.data?.file ||
    payload;

  if (!file || typeof file !== 'object') {
    return null;
  }

  const fileId = pickFirst(file?.file_id, file?.FileID, file?.id, file?.fileId);
  const storedPath = pickFirst(
    file?.file_path,
    file?.stored_path,
    file?.storedPath,
    file?.path,
    file?.url
  );
  const originalName = pickFirst(
    file?.original_name,
    file?.original_filename,
    file?.display_name,
    file?.file_original_name,
    file?.name
  );
  const fileName = pickFirst(
    file?.file_name,
    file?.filename,
    originalName,
    (typeof storedPath === 'string' && storedPath.includes('/'))
      ? storedPath.split('/').pop()
      : storedPath
  );
  const displayName = pickFirst(
    file?.display_name,
    originalName,
    fileName
  );

  return {
    file_id: fileId ?? null,
    file_name: fileName ?? null,
    original_name: originalName ?? fileName ?? null,
    display_name: displayName ?? originalName ?? fileName ?? null,
    file_path: storedPath ?? null,
    stored_path: storedPath ?? null,
    mime_type: pickFirst(file?.mime_type, file?.content_type) ?? null,
    file_size: pickFirst(file?.file_size, file?.size) ?? null,
    uploaded_by: pickFirst(file?.uploaded_by, file?.user_id) ?? null,
    uploaded_at: pickFirst(file?.uploaded_at, file?.create_at, file?.created_at) ?? null,
    raw: file,
  };
};

// Admin Submission Management API
export const adminSubmissionAPI = {
  
  // Admin detail view
  // GET /api/v1/admin/submissions/:id/details
  async getSubmissionDetails(submissionId) {
    if (!submissionId) {
      throw new Error('submissionId is required');
    }

    let primary;
    try {
      primary = await apiClient.get(`/admin/submissions/${submissionId}/details`);
    } catch (error) {
      console.warn('[adminSubmissionAPI] primary details fetch failed', error);
      return buildFallbackSubmissionDetails(submissionId);
    }
    const payload =
      primary && typeof primary === 'object' && !Array.isArray(primary)
        ? { ...primary }
        : primary;

    const extractSubmission = (source) => {
      if (!source || typeof source !== 'object') return null;
      if (source.submission && typeof source.submission === 'object') {
        return source.submission;
      }
      if (source.data && typeof source.data === 'object') {
        if (source.data.submission && typeof source.data.submission === 'object') {
          return source.data.submission;
        }
      }
      return null;
    };

    const needsSupplement = (submission) => {
      if (!submission || typeof submission !== 'object') return true;
      const requiredKeys = [
        'admin_comment',
        'head_comment',
        'admin_rejection_reason',
        'head_rejection_reason',
        'admin_approved_by',
        'admin_approved_at',
        'admin_rejected_by',
        'admin_rejected_at',
        'head_approved_by',
        'head_approved_at',
      ];
      return requiredKeys.some((key) => !(key in submission));
    };

    const submissionFromPrimary = extractSubmission(payload) || primary;
    let supplementalSubmission = null;

    if (needsSupplement(submissionFromPrimary)) {
      try {
        const fallback = await apiClient.get(`/submissions/${submissionId}`);
        supplementalSubmission = extractSubmission(fallback) || fallback;
      } catch (error) {
        console.warn('[adminSubmissionAPI] fallback submission fetch failed', error);
      }
    }

    const mergedSubmission = (() => {
      if (submissionFromPrimary && supplementalSubmission) {
        return { ...supplementalSubmission, ...submissionFromPrimary };
      }
      if (submissionFromPrimary) return submissionFromPrimary;
      if (supplementalSubmission) return supplementalSubmission;
      return null;
    })();

    if (!mergedSubmission) {
      return buildFallbackSubmissionDetails(submissionId);
    }

    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return {
        ...payload,
        submission: mergedSubmission,
        supplemental_submission:
          supplementalSubmission && !payload.supplemental_submission
            ? supplementalSubmission
            : payload.supplemental_submission,
      };
    }

    return {
      submission: mergedSubmission,
      supplemental_submission: supplementalSubmission,
    };
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
  // payload may include the 4 approve amounts + admin_comment
  async approveSubmission(submissionId, payload) {
    return apiClient.post(`/admin/submissions/${submissionId}/approve`, payload);
  },

  // POST /api/v1/admin/submissions/:id/reject
  // payload: { admin_rejection_reason }
  async rejectSubmission(submissionId, payload) {
    return apiClient.post(`/admin/submissions/${submissionId}/reject`, payload);
  },

  async requestRevision(submissionId, payload = {}) {
    return apiClient.post(`/admin/submissions/${submissionId}/request-revision`, payload);
  },

  async getUsersByIds(ids = []) {
    if (!ids.length) return { users: [] };
    const res = await apiClient.get('/admin/users', { params: { ids: ids.join(',') } }); // { users: [{user_id, user_fname, user_lname, email}] }
    return res;
  },

  async getSubmissionDocuments(submissionId, params = {}) {
    if (!submissionId) {
      throw new Error('submissionId is required');
    }

    const query = params && typeof params === 'object' ? { ...params } : {};
    let lastError = null;

    try {
      const result = await apiClient.get(`/submissions/${submissionId}/documents`, query);
      if (result !== undefined && result !== null) {
        if (typeof result === 'object' && !Array.isArray(result)) {
          return { ...result, source: result.source ?? 'general' };
        }
        return result;
      }
    } catch (error) {
      lastError = error;
      console.warn('[adminSubmissionAPI] primary documents fetch failed', error);
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
      console.warn('[adminSubmissionAPI] fallback documents fetch failed', fallbackError);
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
    // GET /api/v1/document-types   (หรือใช้ /admin/document-types ถ้าอยากดึงทั้งหมดแบบไม่กรอง)
    return apiClient.get('/document-types', params);
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

    const body = response?.data || response || {};
    const eventSource = body?.event || body?.data || body;
    const event = normalizeResearchFundEvent(eventSource);
    const events = Array.isArray(body?.events)
      ? body.events.map((item) => normalizeResearchFundEvent(item))
      : undefined;
    const totals = normalizeResearchFundTotals(body?.summary || body?.totals || body, {});

    return {
      event,
      events,
      totals,
      raw: body,
    };
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
    const totals = normalizeResearchFundTotals(
      body?.summary || body?.totals || body
    );
      const events = Array.isArray(body?.events)
      ? body.events.map((item) => normalizeResearchFundEvent(item))
      : undefined;

    return {
      totals,
      events,
      meta: body?.meta || null,
    };
  },

  async getFileUpload(fileId) {
    if (!fileId) {
      return { file: null, raw: null };
    }

    try {
      const response = await apiClient.get(`/files/managed/${fileId}`);
      const payload =
        response && typeof response === 'object' && !Array.isArray(response)
          ? response
          : { file: response };
      const normalized =
        normalizeFileUploadRecord(payload) || normalizeFileUploadRecord(payload?.file);

      return {
        file: normalized,
        raw: payload,
        success: payload?.success ?? (normalized ? true : undefined),
      };
    } catch (error) {
      if (error?.status === 404 || String(error?.status) === '404') {
        return { file: null, raw: null, success: false };
      }
      console.warn('[adminSubmissionAPI] getFileUpload failed', fileId, error);
      throw error;
    }
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
      const response = await apiClient.get('/admin/submissions', { params });
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