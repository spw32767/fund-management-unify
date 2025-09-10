// app/lib/profile_api.js - Profile related API methods

import apiClient from './api';

export const profileAPI = {
  // Fetch current user's profile
  async getProfile() {
    try {
      const response = await apiClient.get('/profile');
      return response.user || response;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  // Fetch current user's publications
  async getPublications() {
    try {
      const response = await apiClient.get('/publications');
      return response.publications || response;
    } catch (error) {
      console.error('Error fetching publications:', error);
      throw error;
    }
  },

  // Fetch current user's innovations
  async getInnovations() {
    try {
      const response = await apiClient.get('/innovations');
      return response.innovations || response;
    } catch (error) {
      console.error('Error fetching innovations:', error);
      throw error;
    }
  },

  // Change current user's password
  async changePassword(currentPassword, newPassword, confirmPassword) {
    try {
      const payload = {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      };
      const response = await apiClient.put('/change-password', payload);
      return response;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
};

export default profileAPI;