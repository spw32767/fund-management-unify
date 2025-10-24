// app/admin/lib/legacy_submission_api.js
import apiClient from '@/app/lib/api';

export const legacySubmissionAPI = {
  async list(params = {}) {
    return apiClient.get('/admin/legacy-submissions', params);
  },

  async get(id) {
    if (!id) throw new Error('submission id is required');
    return apiClient.get(`/admin/legacy-submissions/${id}`);
  },

  async create(payload) {
    return apiClient.post('/admin/legacy-submissions', payload);
  },

  async update(id, payload) {
    if (!id) throw new Error('submission id is required');
    return apiClient.put(`/admin/legacy-submissions/${id}`, payload);
  },

  async remove(id) {
    if (!id) throw new Error('submission id is required');
    return apiClient.delete(`/admin/legacy-submissions/${id}`);
  },
};

export default legacySubmissionAPI;
