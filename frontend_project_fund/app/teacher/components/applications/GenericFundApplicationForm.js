"use client";

import { useState } from "react";
import { FileText, Upload, Save, Send, X, Eye } from "lucide-react";
import PageLayout from "../common/PageLayout";
import SimpleCard from "../common/SimpleCard";

// =================================================================
// MOCK DATA
// =================================================================

// TODO: Replace with real applicant data from API
const MOCK_APPLICANT = {
  name: "Jane Doe",
  phone: "081-234-5678",
};

// TODO: Replace with real requirements fetched based on subcategoryId
const MOCK_REQUIREMENTS = {
  science: {
    title: "แบบคำขอทุนวิทยาศาสตร์ (Science Fund Application)",
    files: [
      { id: "proposal", label: "Project Proposal", required: true },
      { id: "budget", label: "Budget Plan", required: true },
      { id: "cv", label: "Applicant CV", required: false },
    ],
  },
  arts: {
    title: "แบบคำขอทุนศิลปศาสตร์ (Arts Fund Application)",
    files: [
      { id: "proposal", label: "Project Proposal", required: true },
    ],
  },
};

// Mocked subcategoryId (would normally come from route params)
const MOCK_SUBCATEGORY_ID = "science";

// Optional overrides for specific subcategoryId
// eslint-disable-next-line no-unused-vars
const FundOverrides = {
  // [subcategoryId]: CustomComponent
};

// =================================================================
// FILE UPLOAD COMPONENT
// =================================================================
function FileUpload({ onFileSelect, accept, multiple = false }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    onFileSelect(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    onFileSelect(files);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById("generic-file-input").click()}
    >
      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
      <p className="text-sm text-gray-600">คลิกหรือลากไฟล์มาวางที่นี่</p>
      <input
        id="generic-file-input"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}

// Phone number formatting helper
const formatPhoneNumber = (value) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
};

// =================================================================
// MAIN COMPONENT
// =================================================================
export default function FundApplicationPage() {
  const subcategoryId = MOCK_SUBCATEGORY_ID; // TODO: obtain from router
  const OverrideComponent = FundOverrides[subcategoryId];
  if (OverrideComponent) return <OverrideComponent />;

  const config = MOCK_REQUIREMENTS[subcategoryId];

  const [formData, setFormData] = useState({
    name: MOCK_APPLICANT.name,
    phone: MOCK_APPLICANT.phone,
  });
  const [uploadedFiles, setUploadedFiles] = useState({});

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (fileId, files) => {
    setUploadedFiles((prev) => ({ ...prev, [fileId]: files[0] }));
  };

  const handleRemoveFile = (fileId) => {
    setUploadedFiles((prev) => {
      const newFiles = { ...prev };
      delete newFiles[fileId];
      return newFiles;
    });
  };

  const viewFile = (fileId) => {
    // TODO: implement file preview
    console.log("view file", fileId);
  };

  const saveDraft = () => {
    // TODO: implement save draft API
    console.log("save draft", formData, uploadedFiles);
  };

  const submitApplication = () => {
    // TODO: implement submit API
    console.log("submit application", formData, uploadedFiles);
  };

  return (
    <PageLayout title={config?.title || "Fund Application"} icon={FileText}>
      <form className="space-y-6">
        {/* Basic Applicant Info */}
        <SimpleCard title="ข้อมูลพื้นฐาน (Basic Information)" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อ (Name)
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เบอร์โทรศัพท์ (Phone Number)
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", formatPhoneNumber(e.target.value))}
                placeholder="081-234-5678"
                maxLength={12}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">รูปแบบ (Format): XXX-XXX-XXXX</p>
            </div>
          </div>
        </SimpleCard>

        {/* File Attachments */}
        <SimpleCard title="เอกสารแนบ (File Attachments)" icon={Upload}>
          <div className="space-y-6">
            {config.files.map((fileReq) => (
              <div key={fileReq.id} className="border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {fileReq.label}
                  {fileReq.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {uploadedFiles[fileReq.id] ? (
                  <div className="flex items-center justify-between bg-green-50 p-3 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        {uploadedFiles[fileReq.id].name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => viewFile(fileReq.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(fileReq.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <FileUpload
                    onFileSelect={(files) => handleFileUpload(fileReq.id, files)}
                    accept=".pdf"
                  />
                )}
              </div>
            ))}
          </div>
        </SimpleCard>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={saveDraft}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </button>
          <button
            type="button"
            onClick={submitApplication}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
            Submit
          </button>
        </div>
      </form>
    </PageLayout>
  );
}