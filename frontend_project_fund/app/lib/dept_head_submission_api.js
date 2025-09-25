// app/lib/dept_head_submission_api.js
import apiClient from "./api";

export const deptHeadSubmissionAPI = {
  async list(params = {}) {
    return apiClient.get("/dept-head/submissions", params);
  },

  async getSubmissionDetails(submissionId) {
    return apiClient.get(`/dept-head/submissions/${submissionId}/details`);
  },

  async recommendSubmission(submissionId, payload = {}) {
    return apiClient.post(`/dept-head/submissions/${submissionId}/recommend`, payload);
  },

  async rejectSubmission(submissionId, payload = {}) {
    return apiClient.post(`/dept-head/submissions/${submissionId}/reject`, payload);
  },

  async getSubmissionDocuments(submissionId, params = {}) {
    return apiClient.get(`/submissions/${submissionId}/documents`, params);
  },

  async getDocumentTypes(params = {}) {
    return apiClient.get("/document-types", params);
  },
};

export default deptHeadSubmissionAPI;
