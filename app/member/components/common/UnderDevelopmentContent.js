// common/UnderDevelopmentContent.js
"use client";

import { Construction, ArrowLeft } from "lucide-react";
import PageLayout from "./PageLayout";

export default function UnderDevelopmentContent({ 
  currentPage, 
  title = null,
  description = null 
}) {
  const pageTitle = title || currentPage;
  const pageDescription = description || "หน้านี้อยู่ระหว่างการพัฒนา";

  return (
    <PageLayout
      title={pageTitle}
      subtitle={pageDescription}
      icon={Construction}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/teacher" },
        { label: pageTitle }
      ]}
    >
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center py-12">
          {/* Construction Icon */}
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
              <Construction size={48} className="text-yellow-600" />
            </div>
          </div>

          {/* Main Message */}
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            🚧 อยู่ระหว่างการพัฒนา
          </h2>
          
          <p className="text-gray-600 mb-2 max-w-md mx-auto">
            หน้า <span className="font-semibold text-blue-600">{pageTitle}</span> จะพร้อมใช้งานเร็วๆ นี้
          </p>
          
          <p className="text-sm text-gray-500 mb-8">
            กรุณาติดตามอัพเดทจากทีมพัฒนา
          </p>

          {/* Action Button */}
          <button 
            onClick={() => window.history.back()} 
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft size={20} />
            ย้อนกลับ
          </button>

          {/* Additional Info */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">เคล็ดลับ:</span> ใช้เมนูด้านซ้ายเพื่อเข้าถึงหน้าอื่นๆ ที่พร้อมใช้งานแล้ว
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}