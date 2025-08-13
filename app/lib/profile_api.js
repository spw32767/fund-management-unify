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