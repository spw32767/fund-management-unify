// app/teacher/components/applications/ApplicationForm.js - Updated with Submission Management API
"use client";

import { useState, useEffect } from "react";
import { FileText, Upload, Plus, X, Save, Send, AlertCircle } from "lucide-react";
import PageLayout from "../common/PageLayout";
import SimpleCard from "../common/SimpleCard";
import { fundApplicationAPI, submissionAPI, fileAPI } from '../../../lib/teacher_api';

// File upload component with drag & drop
const FileUpload = ({ onFileSelect, accept, multiple = false, error }) => {
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
    const validFiles = files.slice(0, multiple ? 10 : 1);
    setSelectedFiles(validFiles);
    onFileSelect(validFiles);
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
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : error 
            ? 'border-red-300 bg-red-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          คลิกหรือลากไฟล์มาวางที่นี่
        </p>
        <p className="text-xs text-gray-400 mt-1">
          รองรับไฟล์: PDF, DOC, DOCX, XLS, XLSX (สูงสุด 10MB)
        </p>
        <input
          id="file-input"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* แสดงไฟล์ที่เลือก */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-500">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
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

export default function ApplicationForm({ selectedFund }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [years, setYears] = useState([]);
  const [currentSubmissionId, setCurrentSubmissionId] = useState(null);

  // Form data state
  const [formData, setFormData] = useState({
    // Submission basic info
    year_id: null,
    priority: 'normal',
    
    // Fund application details
    project_title: '',
    project_description: '',
    requested_amount: '',
    subcategory_id: selectedFund?.subcategory_id || null,
    
    // Additional fields based on database schema
    project_objectives: '',
    project_methodology: '',
    expected_outcomes: '',
    budget_breakdown: '',
    timeline: '',
    references: ''
  });

  // File uploads state
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [documentTypes, setDocumentTypes] = useState([]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Set subcategory from selectedFund
  useEffect(() => {
    if (selectedFund) {
      setFormData(prev => ({
        ...prev,
        subcategory_id: selectedFund.subcategory_id
      }));
    }
  }, [selectedFund]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load years and document types
      const [yearsResponse, docTypesResponse] = await Promise.all([
        fetch('/api/years').then(res => res.json()),
        fetch('/api/document-types?category=fund_application').then(res => res.json())
      ]);

      if (yearsResponse.success) {
        setYears(yearsResponse.years || []);
        // Set current year as default
        const currentYear = yearsResponse.years?.find(y => y.year === '2568');
        if (currentYear) {
          setFormData(prev => ({ ...prev, year_id: currentYear.year_id }));
        }
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileUpload = (documentTypeId, files) => {
    if (files && files.length > 0) {
      setUploadedFiles(prev => ({
        ...prev,
        [documentTypeId]: files[0] // Take first file only
      }));

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

  const validateForm = () => {
    const newErrors = {};

    // Basic validation
    if (!formData.project_title.trim()) {
      newErrors.project_title = 'กรุณากรอกชื่อโครงการ';
    }

    if (!formData.project_description.trim()) {
      newErrors.project_description = 'กรุณากรอกรายละเอียดโครงการ';
    }

    if (!formData.requested_amount || parseFloat(formData.requested_amount) <= 0) {
      newErrors.requested_amount = 'กรุณากรอกจำนวนเงินที่ขอ';
    }

    if (!formData.year_id) {
      newErrors.year_id = 'กรุณาเลือกปีงบประมาณ';
    }

    if (!formData.subcategory_id) {
      newErrors.subcategory_id = 'กรุณาเลือกประเภททุน';
    }

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
        ...formData,
        uploadedFiles,
        isDraft: true
      };

      if (currentSubmissionId) {
        // Update existing submission
        await submissionAPI.updateSubmission(currentSubmissionId, applicationData);
        alert('บันทึกร่างเรียบร้อยแล้ว');
      } else {
        // Create new submission
        const response = await fundApplicationAPI.createApplication(applicationData);
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
        ...formData,
        uploadedFiles,
        isDraft: false
      };

      let submissionId = currentSubmissionId;

      if (!submissionId) {
        // Create new application
        const response = await fundApplicationAPI.createApplication(applicationData);
        submissionId = response.submission.submission_id;
      }

      // Submit the application
      await fundApplicationAPI.submitApplication(submissionId);
      
      alert('ส่งคำร้องเรียบร้อยแล้ว');
      
      // Reset form or redirect
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
      project_title: '',
      project_description: '',
      requested_amount: '',
      subcategory_id: selectedFund?.subcategory_id || null,
      project_objectives: '',
      project_methodology: '',
      expected_outcomes: '',
      budget_breakdown: '',
      timeline: '',
      references: ''
    });
    setUploadedFiles({});
    setErrors({});
    setCurrentSubmissionId(null);
  };

  if (loading && !years.length) {
    return (
      <PageLayout
        title="สร้างคำร้องใหม่"
        subtitle="กำลังโหลดข้อมูล..."
        icon={FileText}
      >
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="แบบฟอร์มขอทุนวิจัย"
      subtitle={selectedFund ? `${selectedFund.subcategory_name}` : "สร้างคำร้องขอทุนวิจัยใหม่"}
      icon={FileText}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/teacher" },
        { label: "ทุนวิจัย", href: "/teacher/research-fund" },
        { label: "สร้างคำร้อง" }
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

            {/* ประเภททุน */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ประเภททุน
              </label>
              <input
                type="text"
                value={selectedFund?.subcategory_name || 'ไม่ได้ระบุ'}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
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

            {/* จำนวนเงินที่ขอ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                จำนวนเงินที่ขอ (บาท) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="requested_amount"
                value={formData.requested_amount}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                step="0.01"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.requested_amount ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.requested_amount && (
                <p className="text-red-500 text-sm mt-1">{errors.requested_amount}</p>
              )}
            </div>
          </div>
        </SimpleCard>

        {/* รายละเอียดโครงการ */}
        <SimpleCard title="รายละเอียดโครงการ" icon={FileText}>
          <div className="space-y-4">
            {/* ชื่อโครงการ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อโครงการ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="project_title"
                value={formData.project_title}
                onChange={handleInputChange}
                placeholder="กรอกชื่อโครงการ"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.project_title ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.project_title && (
                <p className="text-red-500 text-sm mt-1">{errors.project_title}</p>
              )}
            </div>

            {/* รายละเอียดโครงการ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                รายละเอียดโครงการ <span className="text-red-500">*</span>
              </label>
              <textarea
                name="project_description"
                value={formData.project_description}
                onChange={handleInputChange}
                rows={4}
                placeholder="อธิบายรายละเอียดโครงการ วัตถุประสงค์ และคุณค่าที่คาดว่าจะได้รับ"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.project_description ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.project_description && (
                <p className="text-red-500 text-sm mt-1">{errors.project_description}</p>
              )}
            </div>

            {/* วัตถุประสงค์ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                วัตถุประสงค์
              </label>
              <textarea
                name="project_objectives"
                value={formData.project_objectives}
                onChange={handleInputChange}
                rows={3}
                placeholder="ระบุวัตถุประสงค์ของโครงการ"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* วิธีการดำเนินงาน */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                วิธีการดำเนินงาน
              </label>
              <textarea
                name="project_methodology"
                value={formData.project_methodology}
                onChange={handleInputChange}
                rows={3}
                placeholder="อธิบายวิธีการดำเนินงานของโครงการ"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* ผลที่คาดว่าจะได้รับ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ผลที่คาดว่าจะได้รับ
              </label>
              <textarea
                name="expected_outcomes"
                value={formData.expected_outcomes}
                onChange={handleInputChange}
                rows={3}
                placeholder="ระบุผลที่คาดว่าจะได้รับจากโครงการ"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* งบประมาณ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                รายละเอียดงบประมาณ
              </label>
              <textarea
                name="budget_breakdown"
                value={formData.budget_breakdown}
                onChange={handleInputChange}
                rows={4}
                placeholder="ระบุรายละเอียดการใช้งบประมาณ เช่น ค่าอุปกรณ์ ค่าวัสดุ ค่าใช้จ่ายในการเดินทาง"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* ระยะเวลาดำเนินการ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ระยะเวลาดำเนินการ
              </label>
              <textarea
                name="timeline"
                value={formData.timeline}
                onChange={handleInputChange}
                rows={3}
                placeholder="ระบุกรอบเวลาการดำเนินโครงการ"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* เอกสารอ้างอิง */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เอกสารอ้างอิง/บรรณานุกรม
              </label>
              <textarea
                name="references"
                value={formData.references}
                onChange={handleInputChange}
                rows={3}
                placeholder="ระบุเอกสารอ้างอิงที่เกี่ยวข้อง"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </SimpleCard>

        {/* เอกสารแนบ */}
        <SimpleCard title="เอกสารแนบ" icon={Upload}>
          <div className="space-y-6">
            {documentTypes.map((docType) => (
              <div key={docType.document_type_id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {docType.document_type_name}
                  {docType.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  {uploadedFiles[docType.document_type_id] ? (
                    // แสดงไฟล์ที่เลือกแล้ว
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          {uploadedFiles[docType.document_type_id].name}
                        </span>
                        <span className="text-xs text-green-600">
                          ({(uploadedFiles[docType.document_type_id].size / 1024 / 1024).toFixed(2)} MB)
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
                    // แสดงพื้นที่อัปโหลด
                    <FileUpload
                      onFileSelect={(files) => handleFileUpload(docType.document_type_id, files)}
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      error={errors[`file_${docType.document_type_id}`]}
                    />
                  )}
                </div>
                
                {docType.description && (
                  <p className="text-xs text-gray-500 mt-1">{docType.description}</p>
                )}
              </div>
            ))}
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

        {/* คำเตือน */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">ข้อควรระวัง:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>กรุณาตรวจสอบข้อมูลให้ครบถ้วนก่อนส่งคำร้อง</li>
                <li>ไฟล์เอกสารต้องมีขนาดไม่เกิน 10MB ต่อไฟล์</li>
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