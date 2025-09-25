// app/lib/member_api.js - Unified member-facing API (teacher, staff, dept head)
import {
  teacherAPI,
  submissionAPI,
  submissionUsersAPI,
  fileAPI,
  documentAPI,
  fundApplicationAPI,
  publicationRewardAPI,
  submissionUtils,
} from './teacher_api';
import staffAPI from './staff_api';
import apiClient from './api';

const ROLE_NAME_BY_ID = {
  1: 'teacher',
  2: 'staff',
  3: 'admin',
  4: 'dept_head',
};

const resolveRoleName = (role) => {
  if (typeof role === 'string') {
    return role;
  }
  if (typeof role === 'number') {
    return ROLE_NAME_BY_ID[role] || null;
  }
  if (role && typeof role === 'object') {
    return resolveRoleName(role.role || role.role_id);
  }
  return null;
};

// 🔹 Shared details endpoint (ทุก role ที่ Auth ผ่านสามารถเรียกได้ แต่ข้อมูลจะถูก redaction ตาม role)
async function getSubmissionDetails(id, params = {}) {
  return apiClient.get(`/submissions/${id}/details`, params);
}

async function getSubmissionDocuments(id, params = {}) {
  return apiClient.get(`/submissions/${id}/documents`, params);
}

async function getDocumentTypes(params = {}) {
  return apiClient.get('/document-types', params);
}

export const deptHeadAPI = {
  async listSubmissions(params = {}) {
    return apiClient.get('/dept-head/submissions', { params });
  },

  async getSubmission(id, params = {}) {
    return apiClient.get(`/dept-head/submissions/${id}`, { params });
  },

  async approveSubmission(id, payload = {}) {
    return apiClient.post(`/dept-head/submissions/${id}/approve`, payload);
  },

  async rejectSubmission(id, payload = {}) {
    return apiClient.post(`/dept-head/submissions/${id}/reject`, payload);
  },

  async getSubmissionDetails(id, params = {}) {
    return this.getSubmission(id, params);
  },

  async getSubmissionDocuments(id, params = {}) {
    return getSubmissionDocuments(id, params);
  },

  async getDocumentTypes(params = {}) {
    return getDocumentTypes(params);
  },
};

export const memberAPI = {
  ...teacherAPI,
  ...staffAPI,
  // 🔹 รวม shared details ไว้ให้เรียกตรงได้เลย
  getSubmissionDetails,
  getSubmissionDocuments,
  getDocumentTypes,
  deptHead: deptHeadAPI,
};

export { teacherAPI };
export { default as staffAPI } from './staff_api';
export {
  submissionAPI,
  submissionUsersAPI,
  fileAPI,
  documentAPI,
  fundApplicationAPI,
  publicationRewardAPI,
  submissionUtils,
} from './teacher_api';

// TODO: Remove legacy exports after all imports migrate to member_api
export const memberAPICompat = {
  ...memberAPI,
  submission: submissionAPI,
  submissionUsers: submissionUsersAPI,
  file: fileAPI,
  document: documentAPI,
  fundApplication: fundApplicationAPI,
  publicationReward: publicationRewardAPI,
  utils: submissionUtils,
  deptHead: deptHeadAPI,
};

export default {
  ...memberAPICompat,
};

export const normalizeMemberRole = resolveRoleName;