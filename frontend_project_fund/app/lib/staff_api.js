// app/lib/staff_api.js - Staff specific API methods

import apiClient from '../lib/api';
import { targetRolesUtils } from '../lib/target_roles_utils';

// Staff API methods for role-based fund access
export const staffAPI = {
  
  // Get all categories and subcategories visible to staff
  async getVisibleFundsStructure(year = '2568') {
    try {
      console.log('Getting staff funds structure for year:', year);

      // Step 1: Get years to convert year to year_id
      const yearsResponse = await apiClient.get('/years');
      console.log('Years response:', yearsResponse);
      
      const targetYear = yearsResponse.years?.find(y => y.year === year);
      if (!targetYear) {
        throw new Error(`Year ${year} not found`);
      }

      // Step 2: Get categories for the year
      const categoriesResponse = await apiClient.get('/categories', { 
        year_id: targetYear.year_id 
      });
      console.log('Categories response:', categoriesResponse);

      if (!categoriesResponse.categories) {
        return { categories: [] };
      }

      // Step 3: Get subcategories for each category - Staff specific endpoint
      const categoriesWithSubs = await Promise.all(
        categoriesResponse.categories.map(async (category) => {
          try {
            console.log(`Getting staff subcategories for category ${category.category_id}`);
            
            // เรียก Staff specific endpoint
            const subResponse = await apiClient.get('/staff/subcategories', {
              category_id: category.category_id,
              year_id: targetYear.year_id
            });
            
            console.log(`Staff subcategories for category ${category.category_id}:`, subResponse);
            
            return {
              ...category,
              subcategories: subResponse.subcategories || []
            };
          } catch (error) {
            console.error(`Error fetching staff subcategories for category ${category.category_id}:`, error);
            return {
              ...category,
              subcategories: []
            };
          }
        })
      );

      // Filter out categories with no visible subcategories
      const filteredCategories = categoriesWithSubs.filter(
        cat => cat.subcategories && cat.subcategories.length > 0
      );

      console.log('Final staff result:', filteredCategories);

      return {
        categories: filteredCategories,
        year: year,
        year_id: targetYear.year_id
      };
    } catch (error) {
      console.error('Error fetching staff funds structure:', error);
      throw error;
    }
  },

  // Get subcategories visible to staff role
  async getVisibleSubcategories(categoryId = null, yearId = null) {
    try {
      const params = {};
      if (categoryId) params.category_id = categoryId;
      if (yearId) params.year_id = yearId;
      
      console.log('Getting staff subcategories with params:', params);
      
      // เรียก Staff specific endpoint
      const response = await apiClient.get('/staff/subcategories', params);
      console.log('Staff subcategories response:', response);
      
      return response;
    } catch (error) {
      console.error('Error fetching staff subcategories:', error);
      throw error;
    }
  },

  // Check if a specific fund is visible to staff
  async checkFundVisibility(subcategoryId) {
    try {
      const response = await apiClient.get('/staff/subcategories', {
        subcategory_id: subcategoryId
      });
      
      return response.subcategories && response.subcategories.length > 0;
    } catch (error) {
      console.error('Error checking staff fund visibility:', error);
      return false;
    }
  },

  // Get staff dashboard stats
  async getDashboardStats() {
    try {
      const response = await apiClient.get('/staff/dashboard/stats');
      return response;
    } catch (error) {
      console.error('Error fetching staff dashboard stats:', error);
      throw error;
    }
  },

  // Get all applications (staff can see all)
  async getAllApplications(params = {}) {
    try {
      const response = await apiClient.get('/staff/applications', params);
      return response;
    } catch (error) {
      console.error('Error fetching staff applications:', error);
      throw error;
    }
  },

  // Get applications by status
  async getApplicationsByStatus(status, params = {}) {
    try {
      const response = await apiClient.get('/staff/applications', {
        ...params,
        status: status
      });
      return response;
    } catch (error) {
      console.error('Error fetching applications by status:', error);
      throw error;
    }
  },

  // Export applications report
  async exportApplicationsReport(params = {}) {
    try {
      const response = await apiClient.get('/staff/applications/export', params);
      return response;
    } catch (error) {
      console.error('Error exporting applications report:', error);
      throw error;
    }
  },

  // Get budget summary
  async getBudgetSummary(yearId) {
    try {
      const response = await apiClient.get('/staff/budget-summary', { year_id: yearId });
      return response;
    } catch (error) {
      console.error('Error fetching budget summary:', error);
      throw error;
    }
  },

  // Get current staff profile
  async getProfile() {
    try {
      const response = await apiClient.get('/profile');
      return response;
    } catch (error) {
      console.error('Error fetching staff profile:', error);
      throw error;
    }
  }
};

export default staffAPI;