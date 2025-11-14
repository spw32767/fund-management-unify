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
import deptHeadAPI from './dept_head_api';
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

// Merge role-specific APIs. Ensure newly added teacher methods (e.g. Scopus
// publications/stats) are always available through the shared member API,
// regardless of older cached bundles spreading outdated objects.
export const memberAPI = {
  ...teacherAPI,
  ...staffAPI,
  deptHead: deptHeadAPI,
};

// Keep an explicit list of publication helpers so downstream imports that rely
// on the default export (rather than destructuring teacherAPI) always receive
// the latest implementations even if bundlers snapshot the object before the
// spreads occur.
const createMethodProxy = (methodName) => {
  return async function proxiedMethod(...args) {
    const method = teacherAPI?.[methodName];
    if (typeof method !== 'function') {
      throw new Error(`teacherAPI.${methodName} is not available`);
    }
    return method.apply(teacherAPI, args);
  };
};

const PUBLICATION_HELPERS = {
  getUserScopusPublications: createMethodProxy('getUserScopusPublications'),
  getUserScopusPublicationStats: createMethodProxy('getUserScopusPublicationStats'),
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
  ...PUBLICATION_HELPERS,
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