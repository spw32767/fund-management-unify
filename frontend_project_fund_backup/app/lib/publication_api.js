// app/lib/publication_api.js - Updated with submissionUsersAPI
import apiClient from './api';

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
      const response = await apiClient.post('/submissions', {
        submission_type: data.submission_type,
        year_id: data.year_id,
      });
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

  // Get documents for submission - เพิ่มใหม่
  async getDocuments(submissionId) {
    try {
      const response = await submissionAPI.getDocuments(submissionId);
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
  async add(submissionId, details) {
    try {
      const response = await apiClient.post(`/submissions/${submissionId}/publication-details`, {
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
        indexing: details.indexing,
        
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
        
        // ข้อมูลธนาคาร
        bank_account: details.bank_account,
        bank_name: details.bank_name,
        phone_number: details.phone_number,
        
        // อื่นๆ
        university_ranking: details.university_ranking,
        has_university_fund: details.has_university_fund,
        university_fund_ref: details.university_fund_ref
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

      console.log('Starting publication reward creation with data:', {
        submission_type,
        year_id,
        priority,
        uploadedFiles: Object.keys(uploadedFiles),
        otherDocuments: otherDocuments.length,
        coauthors: coauthors.length
      });

      // Step 1: Create submission
      const submissionResponse = await submissionAPI.createSubmission({
        submission_type,
        year_id,
        priority
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

      console.log('Publication details added successfully');

      // Step 4: Upload files and attach documents - เพิ่มส่วนนี้
      const uploadPromises = [];

      // Upload main files from uploadedFiles object
      Object.entries(uploadedFiles).forEach(([documentTypeId, files]) => {
        if (files && files.length > 0) {
          files.forEach((file, index) => {
            uploadPromises.push(
              fileAPI.uploadFile(file)
                .then(fileResponse => {
                  console.log(`File uploaded successfully:`, fileResponse.file);
                  return documentAPI.attachDocument(submissionId, {
                    file_id: fileResponse.file.file_id,
                    document_type_id: parseInt(documentTypeId),
                    description: `${file.name}`,
                    display_order: index + 1
                  });
                })
                .then(docResponse => {
                  console.log(`Document attached successfully:`, docResponse);
                  return docResponse;
                })
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
                console.log(`Other document uploaded:`, fileResponse.file);
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
        console.log(`Uploading ${uploadPromises.length} files...`);
        await Promise.all(uploadPromises);
        console.log('All files uploaded and attached successfully');
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
      const response = await apiClient.get('/document-types', { category: 'publication' });
      return response;
    } catch (error) {
      console.error('Error fetching document types:', error);
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
  form: publicationFormAPI
};