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
import deptHeadSubmissionAPI from './dept_head_submission_api';

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

export const deptHeadAPI = {
  async getPendingReviews(params = {}) {
    const query = { status_code: '5', ...params };
    return deptHeadSubmissionAPI.list(query);
  },

  async getSubmissionDetails(submissionId) {
    return deptHeadSubmissionAPI.getSubmissionDetails(submissionId);
  },

  async recommendSubmission(submissionId, payload = {}) {
    return deptHeadSubmissionAPI.recommendSubmission(submissionId, payload);
  },

  async rejectSubmission(submissionId, payload = {}) {
    return deptHeadSubmissionAPI.rejectSubmission(submissionId, payload);
  },

  async getSubmissionDocuments(submissionId, params = {}) {
    return deptHeadSubmissionAPI.getSubmissionDocuments(submissionId, params);
  },

  async getDocumentTypes(params = {}) {
    return deptHeadSubmissionAPI.getDocumentTypes(params);
  },
};

export const memberAPI = {
  ...teacherAPI,
  ...staffAPI,
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