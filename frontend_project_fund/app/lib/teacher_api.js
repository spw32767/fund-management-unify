// app/lib/teacher_api.js - Teacher specific API methods (Updated with Submission Users Management)

import apiClient, { dashboardAPI } from '../lib/api';
import { targetRolesUtils } from '../lib/target_roles_utils';

// Teacher API methods for role-based fund access
export const teacherAPI = {
  
  // Get all categories and subcategories visible to teacher - Using NEW API
  async getVisibleFundsStructure(year = '2568') {
    try {
      console.log('Getting teacher funds structure for year:', year);

      // Step 1: Get years to convert year to year_id
      const yearsResponse = await apiClient.get('/years');
      console.log('Years response:', yearsResponse);
      
      // Handle different response formats
      const yearsData = yearsResponse.years || yearsResponse.data || [];
      
      if (!Array.isArray(yearsData) || yearsData.length === 0) {
        throw new Error('No years data available');
      }

      const targetYear = yearsData.find(y => y.year === year);
      if (!targetYear) {
        throw new Error(`Year ${year} not found`);
      }

      // Step 2: Use NEW fund structure API
      const response = await apiClient.get('/funds/structure', {
        year_id: targetYear.year_id
      });
      
      console.log('Fund structure response:', response);

      return {
        categories: response.categories || [],
        year: year,
        year_id: targetYear.year_id
      };
    } catch (error) {
      console.error('Error fetching teacher funds structure:', error);
      throw error;
    }
  },

  // Get subcategories visible to teacher role (legacy - keep for compatibility)
  async getVisibleSubcategories(categoryId = null, yearId = null) {
    try {
      const params = {};
      if (categoryId) params.category_id = categoryId;
      if (yearId) params.year_id = yearId;
      
      console.log('Getting teacher subcategories with params:', params);
      
      // เรียก Teacher specific endpoint
      const response = await apiClient.get('/teacher/subcategories', params);
      console.log('Teacher subcategories response:', response);
      
      return response;
    } catch (error) {
      console.error('Error fetching teacher subcategories:', error);
      throw error;
    }
  },

  // Check if a specific fund is visible to teacher
  async checkFundVisibility(subcategoryId) {
    try {
      const response = await apiClient.get('/teacher/subcategories', {
        subcategory_id: subcategoryId
      });
      
      return response.subcategories && response.subcategories.length > 0;
    } catch (error) {
      console.error('Error checking teacher fund visibility:', error);
      return false;
    }
  },

  // Get teacher dashboard stats
  async getDashboardStats() {
    try {
      const response = await apiClient.get('/dashboard/stats');
      return response;
    } catch (error) {
      console.error('Error fetching teacher dashboard stats:', error);
      throw error;
    }
  },

  // Get teacher's applications
  async getMyApplications(params = {}) {
    try {
      const response = await apiClient.get('/teacher/applications', params);
      return response;
    } catch (error) {
      console.error('Error fetching teacher applications:', error);
      throw error;
    }
  },

  // Submit new application (legacy method)
  async submitApplication(applicationData) {
    try {
      const response = await apiClient.post('/applications', applicationData);
      return response;
    } catch (error) {
      console.error('Error submitting application:', error);
      throw error;
    }
  },

  // Get current teacher profile
  async getProfile() {
    try {
      const response = await apiClient.get('/profile');
      return response;
    } catch (error) {
      console.error('Error fetching teacher profile:', error);
      throw error;
    }
  }
};

// ==================== NEW SUBMISSION MANAGEMENT API ====================

export const submissionAPI = {
  
  // 1. Get user's submissions with filters
  async getSubmissions(params = {}) {
    try {
      const response = await apiClient.get('/teacher/submissions', params);
      return response;
    } catch (error) {
      console.error('Error fetching submissions:', error);
      throw error;
    }
  },

  async createSubmission(submissionData) {
    try {
      const response = await apiClient.post('/submissions', submissionData);
      return response;
    } catch (error) {
      console.error('Error creating submission:', error);
      throw error;
    }
  },

  async getSubmission(submissionId) {
    try {
      const response = await apiClient.get(`/submissions/${submissionId}`);
      return response;
    } catch (error) {
      console.error('Error fetching submission:', error);
      throw error;
    }
  },

  // 4. Update submission (draft only)
  async updateSubmission(submissionId, updateData) {
    try {
      const response = await apiClient.put(`/submissions/${submissionId}`, updateData);
      return response;
    } catch (error) {
      console.error('Error updating submission:', error);
      throw error;
    }
  },

  // 5. Delete submission (unsubmitted only)
  async deleteSubmission(submissionId) {
    try {
      const response = await apiClient.delete(`/submissions/${submissionId}`);
      return response;
    } catch (error) {
      console.error('Error deleting submission:', error);
      throw error;
    }
  },

  // 6. Submit submission (change status to submitted)
  async submitSubmission(submissionId) {
    try {
      const response = await apiClient.post(`/submissions/${submissionId}/submit`);
      return response;
    } catch (error) {
      console.error('Error submitting submission:', error);
      throw error;
    }
  }
};

// ==================== SUBMISSION USERS MANAGEMENT API ====================
export const submissionUsersAPI = {
  
  // 1. เพิ่ม user ลงใน submission (co-author, advisor, etc.)
  async addUser(submissionId, userData) {
    try {
      // รองรับการส่งข้อมูล co-author แบบง่าย
      const requestData = {
        user_id: userData.user_id,
        role: userData.role || 'coauthor', // default เป็น coauthor
        order_sequence: userData.order_sequence || 0,
        is_active: userData.is_active !== undefined ? userData.is_active : true
      };

      const response = await apiClient.post(`/submissions/${submissionId}/users`, requestData);
      return response;
    } catch (error) {
      console.error('Error adding user to submission:', error);
      throw error;
    }
  },

  // 2. ดู users ทั้งหมดใน submission
  async getUsers(submissionId) {
    try {
      const response = await apiClient.get(`/submissions/${submissionId}/users`);
      return response;
    } catch (error) {
      console.error('Error fetching submission users:', error);
      throw error;
    }
  },

  // 3. แก้ไข user ใน submission
  async updateUser(submissionId, userId, updateData) {
    try {
      const response = await apiClient.put(`/submissions/${submissionId}/users/${userId}`, updateData);
      return response;
    } catch (error) {
      console.error('Error updating submission user:', error);
      throw error;
    }
  },

  // 4. ลบ user จาก submission
  async removeUser(submissionId, userId) {
    try {
      const response = await apiClient.delete(`/submissions/${submissionId}/users/${userId}`);
      return response;
    } catch (error) {
      console.error('Error removing submission user:', error);
      throw error;
    }
  },

  // 5. เพิ่ม users หลายคนพร้อมกัน
  async addMultipleUsers(submissionId, usersData) {
    try {
      const formattedUsers = usersData.map((user, index) => ({
        user_id: typeof user === 'object' ? user.user_id : user,
        role: typeof user === 'object' ? (user.role || 'coauthor') : 'coauthor',
        order_sequence: typeof user === 'object' ? user.order_sequence : (index + 2),
        is_active: typeof user === 'object' ? (user.is_active !== undefined ? user.is_active : true) : true
      }));

      const response = await apiClient.post(`/submissions/${submissionId}/users/batch`, {
        users: formattedUsers
      });
      return response;
    } catch (error) {
      console.error('Error adding multiple users:', error);
      throw error;
    }
  },

  // 6. Set co-authors (replace all existing co-authors)
  async setCoauthors(submissionId, coauthorsData) {
    try {
      const formattedCoauthors = coauthorsData.map((coauthor, index) => {
        if (typeof coauthor === 'object' && coauthor.user_id) {
          return {
            user_id: coauthor.user_id,
            role: 'coauthor',
            order_sequence: coauthor.order_sequence || (index + 2),
            is_active: coauthor.is_active !== undefined ? coauthor.is_active : true
          };
        } else if (typeof coauthor === 'number') {
          return {
            user_id: coauthor,
            role: 'coauthor',
            order_sequence: index + 2,
            is_active: true
          };
        } else {
          throw new Error(`Invalid coauthor data: ${JSON.stringify(coauthor)}`);
        }
      });

      const response = await apiClient.post(`/submissions/${submissionId}/users/set-coauthors`, {
        coauthors: formattedCoauthors
      });
      return response;
    } catch (error) {
      console.error('Error setting co-authors:', error);
      throw error;
    }
  },

  // 7. Helper functions สำหรับ co-authors
  async getCoauthors(submissionId) {
    try {
      const response = await this.getUsers(submissionId);
      return {
        ...response,
        coauthors: response.users?.filter(user => user.role === 'coauthor') || []
      };
    } catch (error) {
      console.error('Error fetching co-authors:', error);
      throw error;
    }
  },

  // 8. เพิ่ม co-author (wrapper function)
  async addCoauthor(submissionId, coauthorData) {
    return this.addUser(submissionId, {
      ...coauthorData,
      role: 'coauthor'
    });
  },

  // 9. ลบ co-author (wrapper function)
  async removeCoauthor(submissionId, userId) {
    return this.removeUser(submissionId, userId);
  }
};

// ==================== FILE UPLOAD API ====================

export const fileAPI = {
  
  // 1. Upload file
  async uploadFile(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  // 2. Get file info
  async getFileInfo(fileId) {
    try {
      const response = await apiClient.get(`/files/${fileId}`);
      return response;
    } catch (error) {
      console.error('Error fetching file info:', error);
      throw error;
    }
  },

  // 3. Download file
  async downloadFile(fileId) {
    try {
      const response = await apiClient.get(`/files/${fileId}/download`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  },

  // 4. Delete file
  async deleteFile(fileId) {
    try {
      const response = await apiClient.delete(`/files/${fileId}`);
      return response;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
};

// ==================== DOCUMENT MANAGEMENT API ====================

export const documentAPI = {
  
  // 1. Attach document to submission
  async attachDocument(submissionId, documentData) {
    try {
      const response = await apiClient.post(`/submissions/${submissionId}/documents`, documentData);
      return response;
    } catch (error) {
      console.error('Error attaching document:', error);
      throw error;
    }
  },

  // 2. Get submission documents
  async getSubmissionDocuments(submissionId) {
    try {
      const response = await apiClient.get(`/submissions/${submissionId}/documents`);
      return response;
    } catch (error) {
      console.error('Error fetching submission documents:', error);
      throw error;
    }
  },

  // 3. Detach document from submission
  async detachDocument(submissionId, documentId) {
    try {
      const response = await apiClient.delete(`/submissions/${submissionId}/documents/${documentId}`);
      return response;
    } catch (error) {
      console.error('Error detaching document:', error);
      throw error;
    }
  }
};

// ==================== FUND APPLICATION DETAILS API ====================

export const fundApplicationAPI = {
  
  // Create publication reward application with all details and files
  async createApplication(applicationData) {
    try {
      console.log('Creating publication reward application:', applicationData);
      
      const {
        // Basic submission data
        submission_type = 'publication_reward',
        year_id,
        
        // Publication details - อัปเดตตาม database schema ใหม่
        author_status,                    // จะส่งเป็น author_type
        article_title,
        journal_name,
        journal_quartile,
        publication_date,
        publication_type,
        impact_factor,
        doi,
        url,
        page_numbers,
        volume_issue,
        indexing,
        
        // === เงินรางวัลและการคำนวณ (ใหม่) ===
        publication_reward,               // เงินรางวัลฐาน
        reward_approve_amount = 0,        // จำนวนเงินรางวัลที่อนุมัติ
        revision_fee = 0,                 // ค่าปรับปรุง
        publication_fee = 0,              // ค่าตีพิมพ์
        external_funding_amount = 0,      // รวมจำนวนเงินจากทุนที่ user แนบเข้ามา
        total_amount = 0,                 // ยอดรวมหลังหักลบ
        total_approve_amount = 0,         // จำนวนเงินจริงที่วิทยาลัยจ่ายให้
        
        // === ข้อมูลผู้แต่ง ===
        author_count = 1,
        
        // === อื่นๆ ===
        announce_reference_number = '',
        
        // Files และ Coauthors
        uploadedFiles = {},
        otherDocuments = [],
        coauthors = [],
        
        // Other data
        ...otherData
      } = applicationData;

      // Step 1: Create submission
      const submissionResponse = await submissionAPI.createSubmission({
        submission_type,
        year_id,
      });
      
      const submissionId = submissionResponse.submission.submission_id;
      console.log('Created submission:', submissionId);

      // Step 2: Add co-authors to submission_users
      if (coauthors && coauthors.length > 0) {
        console.log('Adding co-authors to submission:', coauthors);
        
        try {
          await submissionUsersAPI.setCoauthors(submissionId, coauthors);
          console.log('Co-authors added successfully');
        } catch (error) {
          console.error('Error adding co-authors:', error);
          // Don't throw error here, continue with submission
        }
      }

      // Step 3: Upload files and attach documents
      const uploadPromises = [];
      
      // Regular documents
      Object.entries(uploadedFiles).forEach(([documentTypeId, file]) => {
        if (file) {
          uploadPromises.push(
            fileAPI.uploadFile(file).then(fileResponse => 
              documentAPI.attachDocument(submissionId, {
                file_id: fileResponse.file.file_id,
                document_type_id: parseInt(documentTypeId)
              })
            )
          );
        }
      });

      // Other documents (multiple files)
      otherDocuments.forEach((file, index) => {
        uploadPromises.push(
          fileAPI.uploadFile(file).then(fileResponse => 
            documentAPI.attachDocument(submissionId, {
              file_id: fileResponse.file.file_id,
              document_type_id: 11, // Other documents type
              description: `เอกสารอื่นๆ ${index + 1}`
            })
          )
        );
      });

      await Promise.all(uploadPromises);
      console.log('Files uploaded and attached successfully');

      // Step 4: Add publication reward details - ส่งข้อมูลใหม่ที่เพิ่มเข้ามา
      const detailsResponse = await apiClient.post(`/submissions/${submissionId}/publication-details`, {
        // ข้อมูลพื้นฐาน
        article_title,
        journal_name,
        journal_quartile,
        publication_date,
        publication_type,
        impact_factor,
        doi,
        url,
        page_numbers,
        volume_issue,
        indexing,
        
        // === เงินรางวัลและการคำนวณ (ใหม่) ===
        publication_reward: parseFloat(publication_reward) || 0,
        reward_approve_amount: parseFloat(reward_approve_amount) || 0,
        revision_fee: parseFloat(revision_fee) || 0,
        publication_fee: parseFloat(publication_fee) || 0,
        external_funding_amount: parseFloat(external_funding_amount) || 0,
        total_amount: parseFloat(total_amount) || 0,
        total_approve_amount: parseFloat(total_approve_amount) || 0,
        
        // === ข้อมูลผู้แต่ง ===
        author_status,  // จะถูกแปลงเป็น author_type ใน backend
        author_count: parseInt(author_count) || 1,
        
        // === อื่นๆ ===
        announce_reference_number,
        
        // Coauthors (for reference in publication details)
        coauthors: coauthors.map(c => c.user_id),
        ...otherData
      });

      return {
        success: true,
        submission: submissionResponse.submission,
        details: detailsResponse
      };
      
    } catch (error) {
      console.error('Error creating publication reward application:', error);
      throw error;
    }
  },

  // Submit publication reward application
  async submitApplication(submissionId) {
    try {
      const response = await submissionAPI.submitSubmission(submissionId);
      return response;
    } catch (error) {
      console.error('Error submitting publication reward application:', error);
      throw error;
    }
  }
};

// ==================== PUBLICATION REWARD API ====================

export const publicationRewardAPI = {
  
  // Create publication reward application with all details and files
  async createApplication(applicationData) {
    try {
      console.log('Creating publication reward application:', applicationData);
      
      const {
        // Basic submission data
        submission_type = 'publication_reward',
        year_id,
        
        // Publication details
        author_status,
        article_title,
        journal_name,
        journal_quartile,
        publication_reward,
        
        // Files
        uploadedFiles = {},
        otherDocuments = [],
        
        // Coauthors
        coauthors = [],
        
        // Other data
        ...otherData
      } = applicationData;

      // Step 1: Create submission
      const submissionResponse = await submissionAPI.createSubmission({
        submission_type,
        year_id,
      });
      
      const submissionId = submissionResponse.submission.submission_id;
      console.log('Created submission:', submissionId);

      // Step 2: Add co-authors to submission_users
      if (coauthors && coauthors.length > 0) {
        console.log('Adding co-authors to submission:', coauthors);
        
        try {
          await submissionUsersAPI.setCoauthors(submissionId, coauthors);
          console.log('Co-authors added successfully via submissionUsersAPI');
        } catch (error) {
          console.error('Error adding co-authors:', error);
          // Don't throw error here, continue with submission
        }
      }

      // Step 3: Upload files and attach documents
      const uploadPromises = [];
      
      // Regular documents
      Object.entries(uploadedFiles).forEach(([documentTypeId, file]) => {
        if (file) {
          uploadPromises.push(
            fileAPI.uploadFile(file).then(fileResponse => 
              documentAPI.attachDocument(submissionId, {
                file_id: fileResponse.file.file_id,
                document_type_id: parseInt(documentTypeId)
              })
            )
          );
        }
      });

      // Other documents (multiple files)
      otherDocuments.forEach((file, index) => {
        uploadPromises.push(
          fileAPI.uploadFile(file).then(fileResponse => 
            documentAPI.attachDocument(submissionId, {
              file_id: fileResponse.file.file_id,
              document_type_id: 11, // Other documents type
              description: `เอกสารอื่นๆ ${index + 1}`
            })
          )
        );
      });

      await Promise.all(uploadPromises);
      console.log('Files uploaded and attached successfully');

      // Step 4: Add publication reward details
      const detailsResponse = await apiClient.post(`/submissions/${submissionId}/publication-details`, {
        author_status,
        article_title,
        journal_name,
        journal_quartile,
        publication_reward: parseFloat(publication_reward) || 0,
        coauthors,
        ...otherData
      });

      return {
        success: true,
        submission: submissionResponse.submission,
        submissionId: submissionId,
        details: detailsResponse
      };
      
    } catch (error) {
      console.error('Error creating publication reward application:', error);
      throw error;
    }
  },

  // Submit publication reward application
  async submitApplication(submissionId) {
    try {
      const response = await submissionAPI.submitSubmission(submissionId);
      return response;
    } catch (error) {
      console.error('Error submitting publication reward application:', error);
      throw error;
    }
  }
};

// ==================== UTILITY FUNCTIONS ====================

export const submissionUtils = {
  
  // Get submission type display name
  getSubmissionTypeName(type) {
    const types = {
      'fund_application': 'ใบสมัครทุนวิจัย',
      'publication_reward': 'เงินรางวัลตีพิมพ์',
      'conference_grant': 'ทุนประชุมวิชาการ',
      'training_request': 'ขอทุนฝึกอบรม'
    };
    return types[type] || type;
  },

  // Get submission status display name
  getStatusName(statusId) {
    const statuses = {
      1: 'รอพิจารณา',
      2: 'อนุมัติ',
      3: 'ไม่อนุมัติ',
      4: 'ต้องแก้ไข'
    };
    return statuses[statusId] || 'ไม่ทราบสถานะ';
  },

  // Format submission number for display
  formatSubmissionNumber(number) {
    return number || 'ยังไม่ได้กำหนด';
  },

  // Check if submission can be edited
  canEdit(submission) {
    return submission.status_id === 1 && !submission.submitted_at;
  },

  // Check if submission can be deleted
  canDelete(submission) {
    return submission.status_id === 1 && !submission.submitted_at;
  }
};

// อัปเดต default export
export default {
  ...teacherAPI,
  submission: submissionAPI,
  submissionUsers: submissionUsersAPI,  // เพิ่มใหม่
  file: fileAPI,
  document: documentAPI,
  fundApplication: fundApplicationAPI,
  publicationReward: publicationRewardAPI,
  utils: submissionUtils
};