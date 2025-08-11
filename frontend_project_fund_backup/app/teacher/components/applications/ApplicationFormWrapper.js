// ApplicationFormWrapper.js - Wrapper component สำหรับเลือกประเภทฟอร์ม
"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import FormTypeSelector from "./FormTypeSelector";
import ApplicationForm from "./ApplicationForm"; // ฟอร์มขอทุนวิจัยเดิม
import PublicationRewardForm from "./PublicationRewardForm"; // ฟอร์มขอเบิกเงินรางวัล

export default function ApplicationFormWrapper({ selectedFund }) {
  const [selectedFormType, setSelectedFormType] = useState(null);

  // ถ้ามี selectedFund แสดงว่ามาจากหน้า ResearchFundContent
  // ให้แสดงฟอร์มขอทุนวิจัยเลย
  if (selectedFund) {
    return <ApplicationForm selectedFund={selectedFund} />;
  }

  const handleSelectForm = (formType) => {
    setSelectedFormType(formType);
  };

  const handleBack = () => {
    setSelectedFormType(null);
  };

  // ถ้ายังไม่ได้เลือกประเภทฟอร์ม
  if (!selectedFormType) {
    return <FormTypeSelector onSelectForm={handleSelectForm} />;
  }

  // แสดงฟอร์มตามประเภทที่เลือก
  return (
    <div className="mt-6">
      {/* ปุ่มย้อนกลับ */}
      <button
        onClick={handleBack}
        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft size={20} />
        <span>กลับไปเลือกประเภทคำร้อง</span>
      </button>

      {/* แสดงฟอร์มตามที่เลือก */}
      {selectedFormType === 'research-fund' && <ApplicationForm />}
      {selectedFormType === 'publication-reward' && <PublicationRewardForm />}
    </div>
  );
}