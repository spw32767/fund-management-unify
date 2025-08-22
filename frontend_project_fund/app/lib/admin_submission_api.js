// app/lib/admin_submission_api.js
import apiClient from './api';

// Admin Submission Management API
export const adminSubmissionAPI = {
  
  // Get submission details
  async getSubmissionDetails(submissionId) {
    try {
      const response = await apiClient.get(`/admin/submissions/${submissionId}/details`);
      return response;
    } catch (error) {
      console.error('Error fetching submission details:', error);
      throw error;
    }
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

  // Get admin submissions
  async getAdminSubmissions(params) {
    try {
      const response = await apiClient.get('/admin/submissions', { params });
      return response;
    } catch (error) {
      console.error('Error fetching admin submissions:', error);
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
    try {
      const response = await apiClient.get('/years');
      return response;
    } catch (error) {
      console.error('Error fetching years:', error);
      throw error;
    }
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
  }
};

// Export all APIs
export default {
  adminSubmission: adminSubmissionAPI,
  submissionsListing: submissionsListingAPI,
  common: commonAPI
};