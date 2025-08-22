// app/lib/api.js - Updated API Client Service for Backend Communication
class APIClient {
  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    console.log('API Base URL:', this.baseURL); // Debug log
    this.accessTokenKey = 'access_token';
    this.refreshTokenKey = 'refresh_token';
    this.userKey = 'user_data';
    this.sessionKey = 'session_id';
    
    // Keep old key for backward compatibility
    this.tokenKey = 'auth_token';
    
    this.refreshTimeout = null;
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  // ==================== TOKEN MANAGEMENT ====================
  
  // Get stored access token (try new key first, fallback to old)
  getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.accessTokenKey) || localStorage.getItem(this.tokenKey);
  }

  // Get stored refresh token
  getRefreshToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.refreshTokenKey);
  }

  // Get stored user data
  getUser() {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  // Get session ID
  getSessionId() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.sessionKey);
  }

  // Set authentication data
  setAuth({ access_token, token, refresh_token, user, session_id, expires_in }) {
    if (typeof window === 'undefined') return;

    // Store access token (support both formats)
    const accessToken = access_token || token;
    if (accessToken) {
      localStorage.setItem(this.accessTokenKey, accessToken);
      // Keep old key for backward compatibility
      localStorage.setItem(this.tokenKey, accessToken);
    }

    // Store refresh token
    if (refresh_token) {
      localStorage.setItem(this.refreshTokenKey, refresh_token);
    }

    // Store user data
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    // Store session ID
    if (session_id) {
      localStorage.setItem(this.sessionKey, session_id);
    }

    // Schedule token refresh if expires_in is provided
    if (expires_in && accessToken) {
      this.scheduleTokenRefresh(accessToken, false, expires_in);
    }
  }

  // Clear authentication data
  clearAuth() {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.tokenKey); // Remove old key too

    // Clear refresh timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }

    this.isRefreshing = false;
    this.failedQueue = [];
  }

  // Check if authenticated
  isAuthenticated() {
    return !!this.getToken();
  }

  // ==================== TOKEN REFRESH LOGIC ====================
  
  // Schedule token refresh
  scheduleTokenRefresh(token, soon = false, expiresIn = null) {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Calculate refresh time (refresh 5 minutes before expiry, or 30 seconds if soon)
    let refreshIn;
    if (soon) {
      refreshIn = 30 * 1000; // 30 seconds
    } else if (expiresIn) {
      refreshIn = (expiresIn - 300) * 1000; // 5 minutes before expiry
    } else {
      refreshIn = 50 * 60 * 1000; // Default 50 minutes
    }

    this.refreshTimeout = setTimeout(() => {
      this.refreshAccessToken().catch(error => {
        console.error('Scheduled token refresh failed:', error);
      });
    }, Math.max(refreshIn, 1000)); // At least 1 second
  }

  // Refresh access token
  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new AuthError('No refresh token available');
    }

    if (this.isRefreshing) {
      // If already refreshing, wait for it to complete
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(`${this.baseURL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new AuthError(data.error || 'Token refresh failed');
      }

      // Update stored token
      if (data.access_token) {
        this.setAuth(data);
        
        // Resolve any queued requests
        this.failedQueue.forEach(({ resolve }) => {
          resolve(data.access_token);
        });
        this.failedQueue = [];

        return data.access_token;
      }

      throw new AuthError('Invalid refresh response');
    } catch (error) {
      // Reject any queued requests
      this.failedQueue.forEach(({ reject }) => {
        reject(error);
      });
      this.failedQueue = [];

      // Clear auth data on refresh failure
      this.clearAuth();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  // ==================== HTTP REQUEST METHODS ====================
  
  // Make request with retry logic for token refresh
  async makeRequestWithRetry(url, options, retryCount = 0) {
    let token = this.getToken();

    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth header if token exists
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Default options
    const config = {
      headers,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // Handle token expiration with automatic refresh
      if (response.status === 401) {
        if ((data.code === 'TOKEN_EXPIRED' || data.code === 'SESSION_EXPIRED') && retryCount === 0) {
          // If currently refreshing, wait for it to complete
          if (this.isRefreshing) {
            try {
              const newToken = await new Promise((resolve, reject) => {
                this.failedQueue.push({ resolve, reject });
              });
              
              // Retry with new token
              config.headers.Authorization = `Bearer ${newToken}`;
              return this.makeRequestWithRetry(url, config, retryCount + 1);
            } catch (refreshError) {
              throw new AuthError('Session expired. Please login again.');
            }
          }

          // Try to refresh token
          try {
            await this.refreshAccessToken();
            
            // Retry original request with new token
            const newToken = this.getToken();
            config.headers.Authorization = `Bearer ${newToken}`;
            
            return this.makeRequestWithRetry(url, config, retryCount + 1);
          } catch (refreshError) {
            // Refresh failed, clear auth and redirect
            this.clearAuth();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            throw new AuthError('Session expired. Please login again.');
          }
        } else {
          // Other auth errors or max retries reached
          this.clearAuth();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw new AuthError(data.error || 'Authentication failed');
        }
      }

      // Handle forbidden access
      if (response.status === 403) {
        throw new PermissionError(data.error || 'Access denied');
      }

      // Handle other errors
      if (!response.ok) {
        if (response.status >= 500) {
          throw new NetworkError(data.error || 'Server error occurred');
        } else {
          throw new APIError(data.error || 'Request failed', response.status, data.code);
        }
      }

      // Check for token expiry warning
      if (response.headers.get('X-Token-Expires-Soon') === 'true') {
        // Schedule refresh for soon-to-expire token
        this.scheduleTokenRefresh(token, true);
      }

      return data;
    } catch (error) {
      if (error instanceof AuthError || error instanceof APIError || error instanceof NetworkError || error instanceof PermissionError) {
        throw error;
      }

      // Network or other errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('Unable to connect to server. Please check your connection.');
      }
      
      throw new NetworkError('Network error: ' + error.message);
    }
  }

  // ==================== BASIC HTTP METHODS ====================
  
  // GET request
  async get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${this.baseURL}${endpoint}?${query}` : `${this.baseURL}${endpoint}`;
    
    return this.makeRequestWithRetry(url, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data = null) {
    const url = `${this.baseURL}${endpoint}`;
    const options = {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
    };

    return this.makeRequestWithRetry(url, options);
  }

  // PUT request
  async put(endpoint, data) {
    const url = `${this.baseURL}${endpoint}`;
    const options = {
      method: 'PUT',
      body: JSON.stringify(data),
    };

    return this.makeRequestWithRetry(url, options);
  }

  // PATCH request
  async patch(endpoint, data = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const options = {
      method: 'PATCH',
      body: JSON.stringify(data),
    };

    return this.makeRequestWithRetry(url, options);
  }

  // DELETE request
  async delete(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${this.baseURL}${endpoint}?${query}` : `${this.baseURL}${endpoint}`;
    
    return this.makeRequestWithRetry(url, { method: 'DELETE' });
  }

  // ==================== FILE UPLOAD METHODS ====================
  
  // Upload file with FormData
  async uploadFile(endpoint, file, additionalData = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional form fields
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    const token = this.getToken();
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData, browser will set it with boundary

    const url = `${this.baseURL}${endpoint}`;
    return this.makeRequestWithRetry(url, {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  // POST with FormData (for complex form submissions)
  async postFormData(endpoint, formData) {
    const token = this.getToken();
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = `${this.baseURL}${endpoint}`;
    return this.makeRequestWithRetry(url, {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  // ==================== DOWNLOAD METHODS ====================
  
  // Download file
  async downloadFile(endpoint, filename = 'download') {
    const token = this.getToken();
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(errorData.error || `Download failed: ${response.statusText}`, response.status);
      }

      const blob = await response.blob();
      
      // Create download link
      if (typeof window !== 'undefined') {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }
      
      return blob;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new NetworkError('Download failed: ' + error.message);
    }
  }

  // ==================== UTILITY METHODS ====================
  
  // Check user role
  hasRole(roleId) {
    const user = this.getUser();
    return user && user.role_id === roleId;
  }

  // Check if user is admin
  isAdmin() {
    return this.hasRole(3);
  }

  // Check if user is teacher
  isTeacher() {
    return this.hasRole(1);
  }

  // Check if user is staff
  isStaff() {
    return this.hasRole(2);
  }

  // Get user role name
  getUserRoleName() {
    const user = this.getUser();
    if (!user || !user.role_id) return 'Unknown';
    
    const roleNames = {
      1: 'Teacher',
      2: 'Staff', 
      3: 'Admin'
    };
    
    return roleNames[user.role_id] || 'Unknown';
  }
}

// ==================== ERROR CLASSES ====================

// Custom Error Classes
class APIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }
}

class AuthError extends APIError {
  constructor(message) {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

class PermissionError extends APIError {
  constructor(message) {
    super(message, 403, 'PERMISSION_ERROR');
    this.name = 'PermissionError';
  }
}

class NetworkError extends APIError {
  constructor(message) {
    super(message, 0, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

// Create singleton instance
const apiClient = new APIClient();

// ==================== AUTH API METHODS ====================

// Updated Auth API methods
export const authAPI = {
  async login(email, password) {
    const response = await apiClient.post('/login', { email, password });
    
    // Support both old and new response formats
    if (response.access_token || response.token) {
      apiClient.setAuth(response);
    }
    
    return response;
  },

  async logout() {
    try {
      // Call logout endpoint to invalidate session
      await apiClient.post('/logout');
    } catch (error) {
      // Even if logout API fails, clear local storage
      console.warn('Logout endpoint error:', error);
    } finally {
      apiClient.clearAuth();
    }
  },

  async getProfile() {
    return apiClient.get('/profile');
  },

  async changePassword(currentPassword, newPassword, confirmPassword) {
    return apiClient.put('/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
  },

  // Legacy refresh token method (using current token)
  async refreshToken() {
    return apiClient.post('/refresh-token');
  },

  // New refresh token method (using refresh token)
  async refreshAccessToken() {
    return apiClient.refreshAccessToken();
  },

  // Session management methods
  async getSessions() {
    return apiClient.get('/sessions');
  },

  async revokeOtherSessions() {
    return apiClient.post('/sessions/revoke-others');
  },

  async revokeSession(sessionId) {
    return apiClient.delete(`/sessions/${sessionId}`);
  },

  async logoutAll() {
    try {
      await apiClient.post('/logout-all');
    } finally {
      apiClient.clearAuth();
    }
  },

  // Get current user from storage
  getCurrentUser() {
    return apiClient.getUser();
  },

  // Check if authenticated
  isAuthenticated() {
    return apiClient.isAuthenticated();
  },

  // Get current session info
  getSessionInfo() {
    return {
      sessionId: apiClient.getSessionId(),
      hasRefreshToken: !!apiClient.getRefreshToken(),
    };
  },
};

// ==================== APPLICATIONS API METHODS ====================

// Applications API methods
export const applicationsAPI = {
  async getAll(filters = {}) {
    return apiClient.get('/applications', filters);
  },

  async getById(id) {
    return apiClient.get(`/applications/${id}`);
  },

  async create(applicationData) {
    return apiClient.post('/applications', applicationData);
  },

  async update(id, applicationData) {
    return apiClient.put(`/applications/${id}`, applicationData);
  },

  async delete(id) {
    return apiClient.delete(`/applications/${id}`);
  },

  async approve(id, approvedAmount, comment) {
    return apiClient.post(`/applications/${id}/approve`, {
      approved_amount: approvedAmount,
      comment,
    });
  },

  async reject(id, comment) {
    return apiClient.post(`/applications/${id}/reject`, { comment });
  },
};

// ==================== DASHBOARD API METHODS ====================

// Dashboard API methods
export const dashboardAPI = {
  async getStats() {
    return apiClient.get('/dashboard/stats');
  },

  async getBudgetSummary(yearId = null) {
    const params = yearId ? { year_id: yearId } : {};
    return apiClient.get('/dashboard/budget-summary', params);
  },

  async getApplicationsSummary(filters = {}) {
    return apiClient.get('/dashboard/applications-summary', filters);
  },
};

// ==================== SYSTEM DATA API METHODS ====================

// System data API methods
export const systemAPI = {
  async getYears() {
    return apiClient.get('/years');
  },

  async getCategories(yearId = null) {
    const params = yearId ? { year_id: yearId } : {};
    return apiClient.get('/categories', params);
  },

  async getSubcategories(categoryId = null) {
    const params = categoryId ? { category_id: categoryId } : {};
    return apiClient.get('/subcategories', params);
  },

  async getDocumentTypes() {
    return apiClient.get('/documents/types');
  },
};

// ==================== DOCUMENTS API METHODS ====================

// Documents API methods
export const documentsAPI = {
  async upload(applicationId, file, documentTypeId) {
    return apiClient.uploadFile(`/documents/upload/${applicationId}`, file, {
      document_type_id: documentTypeId,
    });
  },

  async getByApplication(applicationId) {
    return apiClient.get(`/documents/application/${applicationId}`);
  },

  async download(documentId) {
    const token = apiClient.getToken();
    const url = `${apiClient.baseURL}/documents/download/${documentId}`;
    
    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('target', '_blank');
    
    if (token) {
      // For file downloads, we might need to handle this differently
      // This is a simplified version - you might need to use a different approach
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(response => response.blob())
        .then(blob => {
          const downloadUrl = window.URL.createObjectURL(blob);
          link.href = downloadUrl;
          link.click();
          window.URL.revokeObjectURL(downloadUrl);
        });
    } else {
      link.click();
    }
  },

  async delete(documentId) {
    return apiClient.delete(`/documents/${documentId}`);
  },
};

// ==================== HEALTH CHECK API METHODS ====================

// Health check
export const healthAPI = {
  async check() {
    return apiClient.get('/health');
  },

  async getInfo() {
    return apiClient.get('/info');
  },
};

// ==================== EXPORTS ====================

// Export error classes for error handling in components
export { APIError, AuthError, PermissionError, NetworkError };

// Export the main client for advanced usage
export default apiClient;

// ==================== ANNOUNCEMENT API METHODS ====================

// Announcement API methods
export const announcementAPI = {
  async getAnnouncements(filters = {}) {
    return apiClient.get('/announcements', filters);
  },

  async getAnnouncement(id) {
    return apiClient.get(`/announcements/${id}`);
  },

  async downloadAnnouncementFile(id) {
    const token = apiClient.getToken();
    const url = `${apiClient.baseURL}/announcements/${id}/download`;
    
    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('target', '_blank');
    
    if (token) {
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(response => {
        if (response.ok) {
          return response.blob();
        }
        throw new Error('Download failed');
      })
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        link.href = downloadUrl;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
      })
      .catch(error => {
        console.error('Download error:', error);
        alert('ไม่สามารถดาวน์โหลดไฟล์ได้');
      });
    } else {
      link.click();
    }
  },

  async viewAnnouncementFile(id) {
    const token = apiClient.getToken();
    const url = `${apiClient.baseURL}/announcements/${id}/view`;
    
    if (token) {
      window.open(url, '_blank');
    }
  }
};

// Fund Forms API methods
export const fundFormAPI = {
  async getFundForms(filters = {}) {
    return apiClient.get('/fund-forms', filters);
  },

  async getFundForm(id) {
    return apiClient.get(`/fund-forms/${id}`);
  },

  async downloadFundForm(id) {
    const token = apiClient.getToken();
    const url = `${apiClient.baseURL}/fund-forms/${id}/download`;
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('target', '_blank');
    
    if (token) {
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(response => {
        if (response.ok) {
          return response.blob();
        }
        throw new Error('Download failed');
      })
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        link.href = downloadUrl;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
      })
      .catch(error => {
        console.error('Download error:', error);
        alert('ไม่สามารถดาวน์โหลดไฟล์ได้');
      });
    } else {
      link.click();
    }
  },

  async viewFundForm(id) {
    const token = apiClient.getToken();
    const url = `${apiClient.baseURL}/fund-forms/${id}/view`;
    
    if (token) {
      window.open(url, '_blank');
    }
  }
};