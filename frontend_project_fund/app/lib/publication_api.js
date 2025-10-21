// app/lib/publication_api.js - Updated with submissionUsersAPI
import apiClient, { documentTypesAPI } from './api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Submission Management API (ตาม API docs)
export const submissionAPI = {
  // Create new submission
  async create(data) {
    try {
      const payload = {
        submission_type: data.submission_type,
        year_id: data.year_id,
      };
      if (data.category_id) payload.category_id = data.category_id;
      if (data.subcategory_id) payload.subcategory_id = data.subcategory_id;
      if (data.subcategory_budget_id) payload.subcategory_budget_id = data.subcategory_budget_id;
      if (data.status_id != null) payload.status_id = data.status_id;

      const response = await apiClient.post('/submissions', payload);
      return response;
    } catch (error) {
      console.error('Error creating submission:', error);
      throw error;
    }
  },

  // Get submission by ID
  async getById(id) {
    try {
      const response = await apiClient.get(`/submissions/${id}`);
      return response;
    } catch (error) {
      console.error('Error fetching submission:', error);
      throw error;
    }
  },

  // Update submission (only drafts)
  async update(id, data) {
    try {
      const response = await apiClient.put(`/submissions/${id}`, data);
      return response;
    } catch (error) {
      console.error('Error updating submission:', error);
      throw error;
    }
  },

  // Delete submission (only drafts)
  async delete(id) {
    try {
      const response = await apiClient.delete(`/submissions/${id}`);
      return response;
    } catch (error) {
      console.error('Error deleting submission:', error);
      throw error;
    }
  },

  async hardDelete(id) {
    try {
      const response = await apiClient.delete(`/submissions/${id}/hard`);
      return response;
    } catch (error) {
      console.error('Error permanently deleting submission:', error);
      throw error;
    }
  },

  // Submit submission (change status)
  async submitSubmission(id) {
    try {
      const response = await apiClient.post(`/submissions/${id}/submit`);
      return response;
    } catch (error) {
      console.error('Error submitting:', error);
      throw error;
    }
  },

  async mergeSubmissionDocuments(id) {
    try {
      const response = await apiClient.post(`/submissions/${id}/merge-documents`);
      return response;
    } catch (error) {
      console.error('Error merging submission documents:', error);
      throw error;
    }
  },


  // Get documents for submission - เพิ่มใหม่
  async getDocuments(submissionId) {
    try {
      const response = await apiClient.get(`/submissions/${submissionId}/documents`);
      return response;
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  }
};

// Submission Users Management API
export const submissionUsersAPI = {
  
  // 1. Add user to submission (co-author)
  async addUser(submissionId, userData) {
    try {
      const response = await apiClient.post(`/submissions/${submissionId}/users`, userData);
      return response;
    } catch (error) {
      console.error('Error adding user to submission:', error);
      throw error;
    }
  },

  // 2. Get all users for submission
  async getUsers(submissionId) {
    try {
      const response = await apiClient.get(`/submissions/${submissionId}/users`);
      return response;
    } catch (error) {
      console.error('Error fetching submission users:', error);
      throw error;
    }
  },

  // 3. Update user role in submission
  async updateUser(submissionId, userId, updateData) {
    try {
      const response = await apiClient.put(`/submissions/${submissionId}/users/${userId}`, updateData);
      return response;
    } catch (error) {
      console.error('Error updating submission user:', error);
      throw error;
    }
  },

  // 4. Remove user from submission
  async removeUser(submissionId, userId) {
    try {
      const response = await apiClient.delete(`/submissions/${submissionId}/users/${userId}`);
      return response;
    } catch (error) {
      console.error('Error removing user from submission:', error);
      throw error;
    }
  },

  // 5. Add multiple users at once (batch operation)
  async addMultipleUsers(submissionId, usersData) {
    try {
      const response = await apiClient.post(`/submissions/${submissionId}/users/batch`, {
        users: usersData
      });
      return response;
    } catch (error) {
      console.error('Error adding multiple users to submission:', error);
      throw error;
    }
  },

  // 6. Set all co-authors (replace existing)
  async setCoauthors(submissionId, coauthors) {
    try {
      // Prepare users data with co-author role
      const usersData = coauthors.map((coauthor, index) => ({
        user_id: coauthor.user_id,
        role: 'co_author',
        order_sequence: index + 2, // Start from 2 (1 is main author)
        is_active: true
      }));

      const response = await apiClient.post(`/submissions/${submissionId}/users/set-coauthors`, {
        coauthors: usersData
      });
      return response;
    } catch (error) {
      console.error('Error setting co-authors:', error);
      throw error;
    }
  }
};

// Publication Details API
export const publicationDetailsAPI = {
  // Add publication details to submission
  async add(submissionId, details, options = {}) {
    try {
      const params = new URLSearchParams();

      const normalizedMode = typeof options.mode === 'string'
        ? options.mode.trim().toLowerCase()
        : '';
      if (normalizedMode) {
        params.set('mode', normalizedMode);
      }

      const allowIncomplete =
        options.allowIncomplete === true || normalizedMode === 'draft';
      if (allowIncomplete) {
        params.set('allow_incomplete', '1');
      }

      const queryString = params.toString();
      const endpoint = queryString
        ? `/submissions/${submissionId}/publication-details?${queryString}`
        : `/submissions/${submissionId}/publication-details`;

      const response = await apiClient.post(endpoint, {
        article_title: details.article_title,
        journal_name: details.journal_name,
        publication_date: details.publication_date,
        publication_type: details.publication_type || 'journal',
        journal_quartile: details.journal_quartile,
        impact_factor: details.impact_factor,
        doi: details.doi,
        url: details.url,
        page_numbers: details.page_numbers,
        volume_issue: details.volume_issue,
        // ตรวจสอบว่ามี fields เหล่านี้หรือไม่
        indexing: details.indexing,
        in_isi: details.in_isi,
        in_scopus: details.in_scopus,
        in_web_of_science: details.in_web_of_science,
        in_tci: details.in_tci,
        
        
        // เงินรางวัลและการคำนวณ
        publication_reward: details.reward_amount,
        revision_fee: details.revision_fee,
        publication_fee: details.publication_fee,
        external_funding_amount: details.external_funding_amount,
        total_amount: details.total_amount,
        
        // ข้อมูลผู้แต่ง
        author_count: details.author_count,
        is_corresponding_author: details.is_corresponding_author,
        author_status: details.author_status,
        author_type: details.author_status, // เพิ่ม author_type (ใช้ค่าเดียวกับ author_status)\
        author_name_list: details.author_name_list,
        signature: details.signature,
        
        // ข้อมูลธนาคาร
        bank_account: details.bank_account,
        bank_name: details.bank_name,
        phone_number: details.phone_number,
        
        // ข้อมูลอื่นๆ
        has_university_funding: details.has_university_funding,
        funding_references: details.funding_references,
        university_rankings: details.university_rankings,
        external_fundings: details.external_fundings || [],
      });
      return response;
    } catch (error) {
      console.error('Error adding publication details:', error);
      throw error;
    }
  }
};

export const fileAPI = {
  async uploadFile(file) {
      try {
        return await apiClient.uploadFile('/files/upload', file);
      } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
      }
    },

  async getFileInfo(fileId) {
    try {
      return await apiClient.getFileInfo('GET', `/files/managed/${fileId}`);
    } catch (error) {
      console.error('Error fetching file info:', error);
      throw error;
    }
  },

  async downloadFile(fileId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/files/managed/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.blob();
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  },

  async deleteFile(fileId) {
    try {
      return await apiClient.deleteFile('DELETE', `/files/managed/${fileId}`);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
};

export const documentAPI = {
  async attachDocument(submissionId, documentData) {
    try {
      return await apiClient.post(`/submissions/${submissionId}/attach-document`, documentData);
    } catch (error) {
      console.error('Error attaching document:', error);
      throw error;
    }
  },

  async getSubmissionDocuments(submissionId) {
    try {
      return await apiClient.get(`/submissions/${submissionId}/documents`);
    } catch (error) {
      console.error('Error fetching submission documents:', error);
      throw error;
    }
  },

  async detachDocument(submissionId, documentId) {
    try {
      return await apiClient.delete(`/submissions/${submissionId}/documents/${documentId}`);
    } catch (error) {
      console.error('Error detaching document:', error);
      throw error;
    }
  }
};

// Combined Publication Reward API (ใช้ APIs ด้านบนร่วมกัน)
export const publicationRewardAPI = {

  async createApplication(applicationData) {
    try {
      const {
        submission_type = 'publication_reward',
        year_id,
        
        // Publication details
        author_status,
        article_title,
        journal_name,
        journal_issue,
        journal_pages,
        journal_month,
        journal_year,
        journal_url,
        doi,
        article_online_db,
        journal_quartile,
        impact_factor,
        publication_reward,
        
        // Files - เพิ่มส่วนนี้
        uploadedFiles = {},
        otherDocuments = [],
        
        // Coauthors
        coauthors = [],
        
        isDraft = false
      } = applicationData;

      // Step 1: Create submission
      const submissionResponse = await submissionAPI.createSubmission({
        submission_type,
        year_id,
        priority
      });

      const submissionId = submissionResponse.submission.submission_id;

      // Step 2: Add co-authors to submission_users
      if (coauthors && coauthors.length > 0) {
        try {
          await submissionUsersAPI.setCoauthors(submissionId, coauthors);
        } catch (error) {
          console.error('Error adding co-authors:', error);
          // Don't throw error here, continue with submission
        }
      }

      // Step 3: Add publication details
      const publicationDate = journal_year && journal_month 
        ? `${journal_year}-${journal_month.padStart(2, '0')}-01`
        : new Date().toISOString().split('T')[0];

      await publicationDetailsAPI.add(submissionId, {
        article_title,
        journal_name,
        publication_date: publicationDate,
        publication_type: 'journal',
        journal_quartile,
        impact_factor: parseFloat(impact_factor) || null,
        doi,
        url: journal_url,
        page_numbers: journal_pages,
        volume_issue: journal_issue,
        indexing: article_online_db,
        publication_reward: parseFloat(publication_reward),
        author_count: coauthors.length + 1, // +1 for main author
        is_corresponding_author: author_status === 'corresponding_author',
        author_status
      });

      // Step 4: Upload files and attach documents - เพิ่มส่วนนี้
      const uploadPromises = [];

      // Upload main files from uploadedFiles object
      Object.entries(uploadedFiles).forEach(([documentTypeId, files]) => {
        if (files && files.length > 0) {
          files.forEach((file, index) => {
            uploadPromises.push(
              fileAPI.uploadFile(file)
                .then(fileResponse => {
                  return documentAPI.attachDocument(submissionId, {
                    file_id: fileResponse.file.file_id,
                    document_type_id: parseInt(documentTypeId),
                    description: `${file.name}`,
                    display_order: index + 1
                  });
                })
                .then(docResponse => docResponse)
                .catch(error => {
                  console.error(`Error processing file ${file.name}:`, error);
                  throw error;
                })
            );
          });
        }
      });

      // Upload other documents
      otherDocuments.forEach((file, index) => {
        if (file) {
          uploadPromises.push(
            fileAPI.uploadFile(file)
              .then(fileResponse => {
                return documentAPI.attachDocument(submissionId, {
                  file_id: fileResponse.file.file_id,
                  document_type_id: 99, // Default type for other documents
                  description: `เอกสารอื่นๆ ${index + 1}: ${file.name}`,
                  display_order: index + 1
                });
              })
              .catch(error => {
                console.error(`Error processing other document ${file.name}:`, error);
                throw error;
              })
          );
        }
      });

      // Wait for all file uploads to complete
      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
      }

      return {
        success: true,
        submission: submissionResponse.submission,
        submissionId
      };
      
    } catch (error) {
      console.error('Error creating publication reward application:', error);
      throw error;
    }
  },
  // Submit application
  async submitApplication(submissionId) {
    try {
      const response = await submissionAPI.submit(submissionId);
      return response;
    } catch (error) {
      console.error('Error submitting application:', error);
      throw error;
    }
  },

  // Get publication reward by submission ID
  async getBySubmissionId(submissionId) {
    try {
      const response = await submissionAPI.getById(submissionId);
      return response;
    } catch (error) {
      console.error('Error fetching publication reward:', error);
      throw error;
    }
  }
};

// Helper API for form data
export const publicationFormAPI = {
  async getUsers(role = null) {
    try {
      const params = role ? { role } : {};
      const response = await apiClient.get('/users', params);
      return response;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  async getDocumentTypes() {
    try {
      const response = await documentTypesAPI.getDocumentTypes({
        fund_type: 'publication_reward',
      });
      return response;
    } catch (error) {
      console.error('Error fetching document types:', error);
      throw error;
    }
  }
};

// เพิ่มที่ด้านบนของไฟล์ หลัง import apiClient
// ========= เพิ่ม API สำหรับ Publication Reward Rates =========
export const publicationRewardRatesAPI = {
  // ดึงอัตราเงินรางวัลตามปี
  async getRatesByYear(year) {
    try {
      const response = await apiClient.get(`/publication-rewards/rates?year=${year}`);
      return response;
    } catch (error) {
      console.error('Error fetching reward rates:', error);
      throw error;
    }
  },

  // ค้นหาเงินรางวัลเฉพาะ
  async lookupRewardAmount(year, authorStatus, quartile) {
    try {
      const response = await apiClient.get(`/publication-rewards/rates/lookup?year=${year}&author_status=${authorStatus}&quartile=${quartile}`);
      return response;
    } catch (error) {
      console.error('Error looking up reward amount:', error);
      throw error;
    }
  },

  // ดึงข้อมูลทั้งหมด
  async getAllRates() {
    try {
      const response = await apiClient.get('/publication-rewards/rates/all');
      return response;
    } catch (error) {
      console.error('Error fetching all rates:', error);
      throw error;
    }
  },

  // ดึงรายการปีที่มีข้อมูล
  async getAvailableYears() {
    try {
      const response = await apiClient.get('/publication-rewards/rates/years');
      return response;
    } catch (error) {
      console.error('Error fetching available years:', error);
      throw error;
    }
  }
};

// Dynamic publication budget resolution API
export const publicationBudgetAPI = {
  async getEnabledYears(categoryId) {
    try {
      const res = await apiClient.get(`/publication-rewards/enabled-years?category_id=${categoryId}`);
      return res;
    } catch (error) {
      console.error('Error fetching enabled years:', error);
      throw error;
    }
  },

  async getValidOptions(categoryId, yearId) {
    try {
      const res = await apiClient.get(`/publication-rewards/options?category_id=${categoryId}&year_id=${yearId}`);
      return res;
    } catch (error) {
      console.error('Error fetching valid options:', error);
      throw error;
    }
  },

  async resolve(params) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/publication-rewards/resolve?${query}`);
      return res;
    } catch (error) {
      const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
      if (!message.includes('no overall budget')) {
        console.error('Error resolving publication budget:', error);
      }
      throw error;
    }
  },

  async checkAvailability(id) {
    try {
      const res = await apiClient.get(`/publication-rewards/availability/${id}`);
      return res;
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }
};

// ========= เพิ่ม API สำหรับ Reward Config (manuscript & page charge fees) =========
export const rewardConfigAPI = {
  // ดึงข้อมูลการตั้งค่าเงินรางวัล
  async getConfig(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await apiClient.get(`/reward-config${queryString ? `?${queryString}` : ''}`);
      return response;
    } catch (error) {
      console.error('Error fetching reward config:', error);
      throw error;
    }
  },

  // ค้นหาวงเงินสำหรับการคำนวณ
  async lookupMaxAmount(year, quartile) {
    try {
      const response = await apiClient.get(`/reward-config/lookup?year=${year}&quartile=${quartile}`);
      return response;
    } catch (error) {
      // ถ้าเป็น 404 หรือไม่พบ config ให้ return default value
      if (error.status === 404 || (error.message && error.message.includes('not found'))) {
        return { max_amount: 0 };
      }
      throw error;
    }
  }
};

// Export all APIs
export default {
  submission: submissionAPI,
  submissionUsers: submissionUsersAPI,
  publicationDetails: publicationDetailsAPI,
  file: fileAPI,
  document: documentAPI,
  publicationReward: publicationRewardAPI,
  form: publicationFormAPI,
  publicationRewardRates: publicationRewardRatesAPI,
  rewardConfig: rewardConfigAPI
};