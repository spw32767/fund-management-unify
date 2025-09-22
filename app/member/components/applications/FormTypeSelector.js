// FormTypeSelector.js - Component สำหรับเลือกประเภทฟอร์ม
"use client";

import { FileText, BookOpen } from "lucide-react";

const formTypes = [
  {
    id: 'research-fund',
    title: 'แบบฟอร์มขอทุนวิจัย',
    description: 'สำหรับยื่นขอทุนสนับสนุนโครงการวิจัย การพัฒนานวัตกรรม และกิจกรรมทางวิชาการ',
    icon: FileText,
    color: 'blue'
  },
  {
    id: 'publication-reward',
    title: 'แบบฟอร์มขอเบิกเงินรางวัลการตีพิมพ์บทความ',
    description: 'สำหรับขอเบิกเงินรางวัลและค่าใช้จ่ายในการตีพิมพ์บทความวิชาการในวารสารระดับชาติและนานาชาติ',
    icon: BookOpen,
    color: 'green'
  }
];

export default function FormTypeSelector({ onSelectForm }) {
  return (
    <div className="min-h-screen flex justify-center px-4 py-12">
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">เลือกประเภทคำร้อง</h2>
        <p className="text-gray-600">กรุณาเลือกประเภทคำร้องที่ต้องการยื่น</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {formTypes.map((formType) => (
          <button
            key={formType.id}
            onClick={() => onSelectForm(formType.id)}
            className={`p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-${formType.color}-500 group`}
          >
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-${formType.color}-100 flex items-center justify-center group-hover:bg-${formType.color}-200 transition-colors`}>
              <formType.icon size={32} className={`text-${formType.color}-600`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{formType.title}</h3>
            <p className="text-sm text-gray-600">{formType.description}</p>
          </button>
        ))}
      </div>
    </div>
    </div>
  );
}