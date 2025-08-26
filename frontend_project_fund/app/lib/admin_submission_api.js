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

// Admin submissions API
export const submissionsListingAPI = {
  
  // Get all submissions (general)
  async getAllSubmissions(params) {
    try {
      const response = await apiClient.get('/submissions', { params });
      console.log('All submissions response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching submissions:', error);
      throw error;
    }
  },

  // Get admin submissions (admin endpoint)
  async getAdminSubmissions(params) {
    try {
      const response = await apiClient.get('/admin/submissions', { params });
      console.log('Admin submissions response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching admin submissions:', error);
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


// Common API functions (ใช้ common endpoints ที่ทุก role เข้าถึงได้)
export const commonAPI = {
  
  // Get years (common endpoint)
  async getYears() {
    try {
      const response = await apiClient.get('/years');
      console.log('Years response (common):', response);
      return response;
    } catch (error) {
      console.error('Error fetching years (common):', error);
      throw error;
    }
  },

  // Get categories with role filtering (common endpoint)
  async getCategories(params = {}) {
    try {
      const response = await apiClient.get('/categories', { params });
      console.log('Categories response (common):', response);
      return response;
    } catch (error) {
      console.error('Error fetching categories (common):', error);
      throw error;
    }
  },

  // Get subcategories with role filtering (common endpoint)
  async getSubcategories(categoryId = null, params = {}) {
    try {
      const queryParams = { ...params };
      if (categoryId) queryParams.category_id = categoryId;
      
      const response = await apiClient.get('/subcategories', { params: queryParams });
      console.log('Subcategories response (common):', response);
      return response;
    } catch (error) {
      console.error('Error fetching subcategories (common):', error);
      throw error;
    }
  },

  // Get application statuses (common endpoint)
  async getApplicationStatuses() {
    try {
      const response = await apiClient.get('/application-status');
      console.log('Application statuses response (common):', response);
      return response;
    } catch (error) {
      console.error('Error fetching application statuses (common):', error);
      throw error;
    }
  },

  // Get users (common endpoint - สำหรับ dropdown)
  async getUsers(params = {}) {
    try {
      const response = await apiClient.get('/users', { params });
      console.log('Users response (common):', response);
      return response;
    } catch (error) {
      console.error('Error fetching users (common):', error);
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