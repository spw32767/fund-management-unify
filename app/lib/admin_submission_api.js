// app/lib/admin_submission_api.js
import apiClient from './api';

// Admin Submission Management API
export const adminSubmissionAPI = {
  
  // Get submission details
  async getSubmissionDetails(submissionId) {
    // GET /api/v1/admin/submissions/:id/details
    return apiClient.get(`/admin/submissions/${submissionId}/details`);
  },

  // Approve submission
  async approveSubmission(submissionId, data) {
    try {
      const response = await apiClient.put(`/admin/submissions/${submissionId}/approve`, data);
      return response;
    } catch (error) {
      console.error('Error approving submission:', error);
      throw error;
    }
  },

  // Reject submission
  async rejectSubmission(submissionId, data) {
    try {
      const response = await apiClient.put(`/admin/submissions/${submissionId}/reject`, data);
      return response;
    } catch (error) {
      console.error('Error rejecting submission:', error);
      throw error;
    }
  },

  // Request revision
  async requestRevision(submissionId, data) {
    try {
      const response = await apiClient.put(`/admin/submissions/${submissionId}/request-revision`, data);
      return response;
    } catch (error) {
      console.error('Error requesting revision:', error);
      throw error;
    }
  },

  // Export submissions
  async exportSubmissions(params) {
    try {
      const response = await apiClient.get('/admin/submissions/export', { params });
      return response;
    } catch (error) {
      console.error('Error exporting submissions:', error);
      throw error;
    }
  },

  async getUsersByIds(ids = []) {
    if (!ids.length) return { users: [] };
    const res = await apiClient.get('/admin/users', { params: { ids: ids.join(',') } }); // { users: [{user_id, user_fname, user_lname, email}] }
    return res;
  },
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