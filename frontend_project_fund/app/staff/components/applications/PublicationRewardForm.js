// app/teacher/components/applications/PublicationRewardForm.js - Complete Version with Submission Management API
"use client";

import { useState, useEffect } from "react";
import { Award, Upload, Users, FileText, Plus, X, Save, Send, AlertCircle, Search } from "lucide-react";
import PageLayout from "../common/PageLayout";
import SimpleCard from "../common/SimpleCard";
import { publicationRewardAPI, submissionAPI, fileAPI } from '../../../lib/teacher_api';

// File upload component
const FileUpload = ({ onFileSelect, accept, multiple = false, error, label }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  };

  const handleFileSelection = (files) => {
    if (multiple) {
      setSelectedFiles(files);
      onFileSelect(files);
    } else {
      const validFiles = files.slice(0, 1);
      setSelectedFiles(validFiles);
      onFileSelect(validFiles);
    }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFileSelection(files);
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFileSelect(newFiles);
  };

  return (
    <div className="space-y-2">
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : error 
            ? 'border-red-300 bg-red-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById(`file-input-${label}`).click()}
      >
        <Upload className="mx-auto h-6 w-6 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          {multiple ? 'เลือกไฟล์หลายไฟล์' : 'เลือกไฟล์'}
        </p>
        <input
          id={`file-input-${label}`}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{file.name}</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
};

// Co-author selector component
const CoauthorSelector = ({ users, selectedCoauthors, onAddCoauthor, onRemoveCoauthor }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredUsers = users.filter(user =>
    !selectedCoauthors.find(c => c.user_id === user.user_id) &&
    (user.user_fname.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.user_lname.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาผู้ร่วมวิจัย..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(e.target.value.length > 0);
            }}
            onFocus={() => setShowDropdown(searchTerm.length > 0)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Dropdown */}
        {showDropdown && filteredUsers.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredUsers.slice(0, 10).map(user => (
              <button
                key={user.user_id}
                type="button"
                onClick={() => {
                  onAddCoauthor(user);
                  setSearchTerm('');
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">
                  {user.user_fname} {user.user_lname}
                </div>
                <div className="text-sm text-gray-600">{user.email}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected co-authors */}
      {selectedCoauthors.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            ผู้ร่วมวิจัยที่เลือก ({selectedCoauthors.length} คน)
          </label>
          <div className="space-y-2">
            {selectedCoauthors.map(coauthor => (
              <div key={coauthor.user_id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <div className="font-medium text-blue-900">
                    {coauthor.user_fname} {coauthor.user_lname}
                  </div>
                  <div className="text-sm text-blue-700">{coauthor.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveCoauthor(coauthor)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function PublicationRewardForm() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [users, setUsers] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [years, setYears] = useState([]);
  const [currentSubmissionId, setCurrentSubmissionId] = useState(null);

  // Form data state
  const [formData, setFormData] = useState({
    // Basic submission info
    year_id: null,
    priority: 'normal',
    
    // Publication details
    author_status: '',
    article_title: '',
    journal_name: '',
    journal_issue: '',
    journal_pages: '',
    journal_month: '',
    journal_year: new Date().getFullYear().toString(),
    journal_url: '',
    doi: '',
    article_online_db: '',
    journal_tier: '',
    journal_quartile: '',
    in_isi: false,
    in_scopus: false,
    article_type: '',
    journal_type: '',
    
    // Reward calculation
    publication_reward: 0,
    editor_fee: '',
    publication_fee: '',
    publication_fee_university: '',
    publication_fee_college: '',
    total_claim: 0,
    
    // Bank info
    bank_account: '',
    bank_name: '',
    phone_number: '',
    
    // Other info
    university_ranking: '',
    has_university_fund: '',
    university_fund_ref: ''
  });

  // Co-authors and files
  const [coauthors, setCoauthors] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [otherDocuments, setOtherDocuments] = useState([]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Calculate total claim amount
  useEffect(() => {
    const reward = parseFloat(formData.publication_reward) || 0;
    const universityFee = parseFloat(formData.publication_fee_university) || 0;
    const collegeFee = parseFloat(formData.publication_fee_college) || 0;
    
    setFormData(prev => ({
      ...prev,
      total_claim: reward + universityFee + collegeFee
    }));
  }, [formData.publication_reward, formData.publication_fee_university, formData.publication_fee_college]);

  // Calculate reward based on author status and quartile
  useEffect(() => {
    if (formData.author_status && formData.journal_quartile) {
      const reward = calculateReward(formData.author_status, formData.journal_quartile);
      setFormData(prev => ({ ...prev, publication_reward: reward }));
    }
  }, [formData.author_status, formData.journal_quartile]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load years, users, and document types
      const [yearsResponse, usersResponse, docTypesResponse] = await Promise.all([
        fetch('/api/years').then(res => res.json()),
        fetch('/api/users').then(res => res.json()),
        fetch('/api/document-types?category=publication_reward').then(res => res.json())
      ]);

      if (yearsResponse.success) {
        setYears(yearsResponse.years || []);
        const currentYear = yearsResponse.years?.find(y => y.year === '2568');
        if (currentYear) {
          setFormData(prev => ({ ...prev, year_id: currentYear.year_id }));
        }
      }

      if (usersResponse.success) {
        setUsers(usersResponse.users || []);
      }

      if (docTypesResponse.success) {
        setDocumentTypes(docTypesResponse.document_types || []);
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const calculateReward = (authorStatus, quartile) => {
    // Reward calculation logic based on author status and journal quartile
    const rewardRates = {
      'first_author': {
        'Q1': 50000,
        'Q2': 40000,
        'Q3': 30000,
        'Q4': 20000
      },
      'corresponding_author': {
        'Q1': 50000,
        'Q2': 40000,
        'Q3': 30000,
        'Q4': 20000
      },
      'co_author': {
        'Q1': 25000,
        'Q2': 20000,
        'Q3': 15000,
        'Q4': 10000
      }
    };

    return rewardRates[authorStatus]?.[quartile] || 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddCoauthor = (user) => {
    if (!coauthors.find(c => c.user_id === user.user_id)) {
      setCoauthors(prev => [...prev, user]);
    }
  };

  const handleRemoveCoauthor = (user) => {
    setCoauthors(prev => prev.filter(c => c.user_id !== user.user_id));
  };

  const handleFileUpload = (documentTypeId, files) => {
    if (files && files.length > 0) {
      if (documentTypeId === 'other') {
        // Handle multiple other documents
        setOtherDocuments(prev => [...prev, ...files]);
      } else {
        // Handle single document
        setUploadedFiles(prev => ({
          ...prev,
          [documentTypeId]: files[0]
        }));
      }

      // Clear error
      if (errors[`file_${documentTypeId}`]) {
        setErrors(prev => ({ ...prev, [`file_${documentTypeId}`]: '' }));
      }
    }
  };

  const removeFile = (documentTypeId) => {
    setUploadedFiles(prev => {
      const updated = { ...prev };
      delete updated[documentTypeId];
      return updated;
    });
  };

  const removeOtherDocument = (index) => {
    setOtherDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.author_status) newErrors.author_status = 'กรุณาเลือกสถานะผู้ยื่น';
    if (!formData.article_title.trim()) newErrors.article_title = 'กรุณากรอกชื่อบทความ';
    if (!formData.journal_name.trim()) newErrors.journal_name = 'กรุณากรอกชื่อวารสาร';
    if (!formData.journal_quartile) newErrors.journal_quartile = 'กรุณาเลือก Quartile';
    if (!formData.bank_account.trim()) newErrors.bank_account = 'กรุณากรอกเลขบัญชีธนาคาร';
    if (!formData.bank_name.trim()) newErrors.bank_name = 'กรุณากรอกชื่อธนาคาร';
    if (!formData.phone_number.trim()) newErrors.phone_number = 'กรุณากรอกเบอร์โทรศัพท์';
    if (!formData.year_id) newErrors.year_id = 'กรุณาเลือกปีงบประมาณ';

    // Check required documents
    const requiredDocs = documentTypes.filter(doc => doc.required);
    requiredDocs.forEach(doc => {
      if (!uploadedFiles[doc.document_type_id]) {
        newErrors[`file_${doc.document_type_id}`] = `กรุณาแนบ${doc.document_type_name}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveDraft = async () => {
    try {
      setSaving(true);

      const applicationData = {
        submission_type: 'publication_reward',
        year_id: formData.year_id,
        priority: formData.priority,
        ...formData,
        uploadedFiles,
        otherDocuments,
        coauthors: coauthors.map(c => c.user_id),
        isDraft: true
      };

      if (currentSubmissionId) {
        await submissionAPI.updateSubmission(currentSubmissionId, applicationData);
        alert('บันทึกร่างเรียบร้อยแล้ว');
      } else {
        const response = await publicationRewardAPI.createApplication(applicationData);
        setCurrentSubmissionId(response.submission.submission_id);
        alert('บันทึกร่างเรียบร้อยแล้ว');
      }

    } catch (error) {
      console.error('Error saving draft:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกร่าง: ' + (error.message || 'กรุณาลองใหม่อีกครั้ง'));
    } finally {
      setSaving(false);
    }
  };

  const submitApplication = async () => {
    if (!validateForm()) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      setLoading(true);

      const applicationData = {
        submission_type: 'publication_reward',
        year_id: formData.year_id,
        priority: formData.priority,
        ...formData,
        uploadedFiles,
        otherDocuments,
        coauthors: coauthors.map(c => c.user_id),
        isDraft: false
      };

      let submissionId = currentSubmissionId;

      if (!submissionId) {
        const response = await publicationRewardAPI.createApplication(applicationData);
        submissionId = response.submission.submission_id;
      }

      await publicationRewardAPI.submitApplication(submissionId);
      
      alert('ส่งคำร้องเรียบร้อยแล้ว');
      resetForm();
      
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('เกิดข้อผิดพลาดในการส่งคำร้อง: ' + (error.message || 'กรุณาลองใหม่อีกครั้ง'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      year_id: years.find(y => y.year === '2568')?.year_id || null,
      priority: 'normal',
      author_status: '',
      article_title: '',
      journal_name: '',
      journal_issue: '',
      journal_pages: '',
      journal_month: '',
      journal_year: new Date().getFullYear().toString(),
      journal_url: '',
      doi: '',
      article_online_db: '',
      journal_tier: '',
      journal_quartile: '',
      in_isi: false,
      in_scopus: false,
      article_type: '',
      journal_type: '',
      publication_reward: 0,
      editor_fee: '',
      publication_fee: '',
      publication_fee_university: '',
      publication_fee_college: '',
      total_claim: 0,
      bank_account: '',
      bank_name: '',
      phone_number: '',
      university_ranking: '',
      has_university_fund: '',
      university_fund_ref: ''
    });
    setCoauthors([]);
    setUploadedFiles({});
    setOtherDocuments([]);
    setErrors({});
    setCurrentSubmissionId(null);
  };

  if (loading && !years.length) {
    return (
      <PageLayout
        title="แบบฟอร์มขอเบิกเงินรางวัลการตีพิมพ์บทความ"
        subtitle="กำลังโหลดข้อมูล..."
        icon={Award}
      >
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="แบบฟอร์มขอเบิกเงินรางวัลการตีพิมพ์บทความ"
      subtitle="สำหรับขอเบิกเงินรางวัลและค่าใช้จ่ายในการตีพิมพ์บทความวิชาการ"
      icon={Award}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/teacher" },
        { label: "เลือกคำร้อง" },
        { label: "ขอเบิกเงินรางวัลการตีพิมพ์" }
      ]}
    >
      <form className="space-y-6">
        {/* ข้อมูลพื้นฐาน */}
        <SimpleCard title="ข้อมูลพื้นฐาน" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ปีงบประมาณ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ปีงบประมาณ <span className="text-red-500">*</span>
              </label>
              <select
                name="year_id"
                value={formData.year_id || ''}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.year_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">เลือกปีงบประมาณ</option>
                {years.map(year => (
                  <option key={year.year_id} value={year.year_id}>
                    {year.year}
                  </option>
                ))}
              </select>
              {errors.year_id && (
                <p className="text-red-500 text-sm mt-1">{errors.year_id}</p>
              )}
            </div>

            {/* สถานะผู้ยื่น */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                สถานะผู้ยื่น <span className="text-red-500">*</span>
              </label>
              <select
                name="author_status"
                value={formData.author_status}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.author_status ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">เลือกสถานะ</option>
                <option value="first_author">ผู้แต่งหลัก (First Author)</option>
                <option value="corresponding_author">ผู้แต่งที่รับผิดชอบบทความ (Corresponding Author)</option>
                <option value="co_author">ผู้แต่งร่วม (Co-author)</option>
              </select>
              {errors.author_status && (
                <p className="text-red-500 text-sm mt-1">{errors.author_status}</p>
              )}
            </div>

            {/* ระดับความสำคัญ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ระดับความสำคัญ
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="low">ต่ำ</option>
                <option value="normal">ปกติ</option>
                <option value="high">สูง</option>
                <option value="urgent">ด่วน</option>
              </select>
            </div>

            {/* เบอร์โทรศัพท์ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เบอร์โทรศัพท์ <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                placeholder="เช่น 081-234-5678"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.phone_number ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.phone_number && (
                <p className="text-red-500 text-sm mt-1">{errors.phone_number}</p>
              )}
            </div>
          </div>
        </SimpleCard>

        {/* ข้อมูลบทความ */}
        <SimpleCard title="ข้อมูลบทความ" icon={FileText}>
          <div className="space-y-4">
            {/* ชื่อบทความ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อบทความ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="article_title"
                value={formData.article_title}
                onChange={handleInputChange}
                placeholder="กรอกชื่อบทความภาษาอังกฤษ"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.article_title ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.article_title && (
                <p className="text-red-500 text-sm mt-1">{errors.article_title}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ชื่อวารสาร */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อวารสาร <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="journal_name"
                  value={formData.journal_name}
                  onChange={handleInputChange}
                  placeholder="ชื่อวารสารที่ตีพิมพ์"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                    errors.journal_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.journal_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.journal_name}</p>
                )}
              </div>

              {/* Quartile */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quartile <span className="text-red-500">*</span>
                </label>
                <select
                  name="journal_quartile"
                  value={formData.journal_quartile}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                    errors.journal_quartile ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">เลือก Quartile</option>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
                {errors.journal_quartile && (
                  <p className="text-red-500 text-sm mt-1">{errors.journal_quartile}</p>
                )}
              </div>

              {/* Volume/Issue */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Volume/Issue
                </label>
                <input
                  type="text"
                  name="journal_issue"
                  value={formData.journal_issue}
                  onChange={handleInputChange}
                  placeholder="เช่น Vol.10, No.2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* หน้า */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  หน้า
                </label>
                <input
                  type="text"
                  name="journal_pages"
                  value={formData.journal_pages}
                  onChange={handleInputChange}
                  placeholder="เช่น 123-145"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* เดือน/ปี */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เดือนที่ตีพิมพ์
                </label>
                <select
                  name="journal_month"
                  value={formData.journal_month}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="">เลือกเดือน</option>
                  <option value="มกราคม">มกราคม</option>
                  <option value="กุมภาพันธ์">กุมภาพันธ์</option>
                  <option value="มีนาคม">มีนาคม</option>
                  <option value="เมษายน">เมษายน</option>
                  <option value="พฤษภาคม">พฤษภาคม</option>
                  <option value="มิถุนายน">มิถุนายน</option>
                  <option value="กรกฎาคม">กรกฎาคม</option>
                  <option value="สิงหาคม">สิงหาคม</option>
                  <option value="กันยายน">กันยายน</option>
                  <option value="ตุลาคม">ตุลาคม</option>
                  <option value="พฤศจิกายน">พฤศจิกายน</option>
                  <option value="ธันวาคม">ธันวาคม</option>
                </select>
              </div>

              {/* ปี */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ปีที่ตีพิมพ์
                </label>
                <input
                  type="number"
                  name="journal_year"
                  value={formData.journal_year}
                  onChange={handleInputChange}
                  min="2000"
                  max={new Date().getFullYear() + 1}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* DOI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DOI
              </label>
              <input
                type="text"
                name="doi"
                value={formData.doi}
                onChange={handleInputChange}
                placeholder="เช่น 10.1016/j.example.2023.01.001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL ของบทความ
              </label>
              <input
                type="url"
                name="journal_url"
                value={formData.journal_url}
                onChange={handleInputChange}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Database checkboxes */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                ฐานข้อมูลที่ปรากฏ
              </label>
              <div className="flex gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="in_isi"
                    checked={formData.in_isi}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  ISI Web of Science
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="in_scopus"
                    checked={formData.in_scopus}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  Scopus
                </label>
              </div>
            </div>
          </div>
        </SimpleCard>

        {/* ผู้ร่วมวิจัย */}
        <SimpleCard title="ผู้ร่วมวิจัย" icon={Users}>
          <CoauthorSelector
            users={users}
            selectedCoauthors={coauthors}
            onAddCoauthor={handleAddCoauthor}
            onRemoveCoauthor={handleRemoveCoauthor}
          />
        </SimpleCard>

        {/* การคำนวณเงินรางวัล */}
        <SimpleCard title="การคำนวณเงินรางวัล" icon={Award}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* เงินรางวัลการตีพิมพ์ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เงินรางวัลการตีพิมพ์ (บาท)
              </label>
              <input
                type="number"
                name="publication_reward"
                value={formData.publication_reward}
                onChange={handleInputChange}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                คำนวณอัตโนมัติจากสถานะผู้แต่งและ Quartile
              </p>
            </div>

            {/* ค่าธรรมเนียมการตีพิมพ์ (มหาวิทยาลัย) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ค่าธรรมเนียมการตีพิมพ์ (มหาวิทยาลัย) (บาท)
              </label>
              <input
                type="number"
                name="publication_fee_university"
                value={formData.publication_fee_university}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* ค่าธรรมเนียมการตีพิมพ์ (วิทยาลัย) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ค่าธรรมเนียมการตีพิมพ์ (วิทยาลัย) (บาท)
              </label>
              <input
                type="number"
                name="publication_fee_college"
                value={formData.publication_fee_college}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* ยอดรวมที่ขอเบิก */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ยอดรวมที่ขอเบิก (บาท)
              </label>
              <input
                type="number"
                name="total_claim"
                value={formData.total_claim}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-blue-50 text-blue-800 font-semibold"
              />
            </div>
          </div>
        </SimpleCard>

        {/* ข้อมูลธนาคาร */}
        <SimpleCard title="ข้อมูลธนาคาร" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* เลขบัญชีธนาคาร */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เลขบัญชีธนาคาร <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="bank_account"
                value={formData.bank_account}
                onChange={handleInputChange}
                placeholder="กรอกเลขบัญชี"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.bank_account ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.bank_account && (
                <p className="text-red-500 text-sm mt-1">{errors.bank_account}</p>
              )}
            </div>

            {/* ชื่อธนาคาร */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อธนาคาร <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleInputChange}
                placeholder="เช่น ธนาคารกรุงเทพ"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.bank_name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.bank_name && (
                <p className="text-red-500 text-sm mt-1">{errors.bank_name}</p>
              )}
            </div>
          </div>
        </SimpleCard>

        {/* เอกสารแนบ */}
        <SimpleCard title="เอกสารแนบ" icon={Upload}>
          <div className="space-y-6">
            {/* เอกสารที่กำหนด */}
            {documentTypes.map((docType) => (
              <div key={docType.document_type_id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {docType.document_type_name}
                  {docType.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  {uploadedFiles[docType.document_type_id] ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          {uploadedFiles[docType.document_type_id].name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(docType.document_type_id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <FileUpload
                      onFileSelect={(files) => handleFileUpload(docType.document_type_id, files)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      error={errors[`file_${docType.document_type_id}`]}
                      label={docType.document_type_id}
                    />
                  )}
                </div>
                
                {docType.description && (
                  <p className="text-xs text-gray-500 mt-1">{docType.description}</p>
                )}
              </div>
            ))}

            {/* เอกสารอื่นๆ (หลายไฟล์) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เอกสารอื่นๆ (ถ้ามี)
              </label>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <FileUpload
                  onFileSelect={(files) => handleFileUpload('other', files)}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  multiple={true}
                  label="other"
                />
              </div>

              {/* แสดงเอกสารอื่นๆ ที่เลือก */}
              {otherDocuments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">เอกสารอื่นๆ ที่เลือก:</p>
                  {otherDocuments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOtherDocument(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SimpleCard>

        {/* ข้อมูลเพิ่มเติม */}
        <SimpleCard title="ข้อมูลเพิ่มเติม" icon={FileText}>
          <div className="space-y-4">
            {/* การได้รับทุนจากมหาวิทยาลัย */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ได้รับการสนับสนุนทุนจากมหาวิทยาลัยหรือไม่?
              </label>
              <select
                name="has_university_fund"
                value={formData.has_university_fund}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">เลือก</option>
                <option value="yes">ได้รับ</option>
                <option value="no">ไม่ได้รับ</option>
              </select>
            </div>

            {/* หมายเลขอ้างอิงทุน */}
            {formData.has_university_fund === 'yes' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  หมายเลขอ้างอิงทุน
                </label>
                <input
                  type="text"
                  name="university_fund_ref"
                  value={formData.university_fund_ref}
                  onChange={handleInputChange}
                  placeholder="กรอกหมายเลขอ้างอิงทุน"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* อันดับมหาวิทยาลัย */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                อันดับมหาวิทยาลัย/สถาบัน (ถ้ามี)
              </label>
              <input
                type="text"
                name="university_ranking"
                value={formData.university_ranking}
                onChange={handleInputChange}
                placeholder="เช่น QS World University Rankings #500"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </SimpleCard>

        {/* ปุ่มดำเนินการ */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving || loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'กำลังบันทึก...' : 'บันทึกร่าง'}
          </button>

          <button
            type="button"
            onClick={submitApplication}
            disabled={loading || saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
            {loading ? 'กำลังส่ง...' : 'ส่งคำร้อง'}
          </button>
        </div>

        {/* สรุปการคำนวณ */}
        {formData.total_claim > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-3">สรุปการขอเบิก</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>เงินรางวัลการตีพิมพ์:</span>
                <span className="font-medium">{formData.publication_reward.toLocaleString()} บาท</span>
              </div>
              {formData.publication_fee_university > 0 && (
                <div className="flex justify-between">
                  <span>ค่าธรรมเนียมการตีพิมพ์ (มหาวิทยาลัย):</span>
                  <span className="font-medium">{parseFloat(formData.publication_fee_university).toLocaleString()} บาท</span>
                </div>
              )}
              {formData.publication_fee_college > 0 && (
                <div className="flex justify-between">
                  <span>ค่าธรรมเนียมการตีพิมพ์ (วิทยาลัย):</span>
                  <span className="font-medium">{parseFloat(formData.publication_fee_college).toLocaleString()} บาท</span>
                </div>
              )}
              <div className="border-t border-blue-300 pt-2 flex justify-between font-semibold text-blue-900">
                <span>ยอดรวมทั้งสิ้น:</span>
                <span>{formData.total_claim.toLocaleString()} บาท</span>
              </div>
            </div>
          </div>
        )}

        {/* คำเตือน */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">ข้อควรระวัง:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>กรุณาตรวจสอบข้อมูลให้ครบถ้วนและถูกต้องก่อนส่งคำร้อง</li>
                <li>เอกสารแนบต้องเป็นไฟล์ PDF, DOC, DOCX หรือรูปภาพ ขนาดไม่เกิน 10MB</li>
                <li>เงินรางวัลจะคำนวณอัตโนมัติตามสถานะผู้แต่งและ Quartile ของวารสาร</li>
                <li>หลังจากส่งคำร้องแล้ว จะไม่สามารถแก้ไขข้อมูลได้</li>
                <li>สามารถบันทึกร่างและกลับมาแก้ไขภายหลังได้</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}