// EmptyState.js - Reusable Empty State Component
"use client";

export default function EmptyState({ 
  icon: Icon, 
  title, 
  message, 
  action,
  variant = "default" // default, simple, bordered
}) {
  const variants = {
    default: "bg-white rounded-lg shadow-sm p-12",
    simple: "p-8",
    bordered: "border-2 border-dashed border-gray-300 rounded-lg p-12 bg-gray-50"
  };

  return (
    <div className={variants[variant]}>
      <div className="text-center">
        {Icon && (
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Icon size={32} className="text-gray-400" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6 max-w-sm mx-auto">{message}</p>
        {action && (
          <div className="flex justify-center">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

// EmptyState with illustration
export function EmptyStateIllustration({ 
  title, 
  message, 
  action,
  illustrationType = "no-data" // no-data, search, error, success
}) {
  const illustrations = {
    "no-data": (
      <svg className="w-48 h-48 mx-auto mb-4" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="80" fill="#F3F4F6"/>
        <rect x="70" y="60" width="60" height="80" rx="4" fill="#E5E7EB"/>
        <rect x="80" y="75" width="40" height="4" rx="2" fill="#9CA3AF"/>
        <rect x="80" y="85" width="40" height="4" rx="2" fill="#9CA3AF"/>
        <rect x="80" y="95" width="25" height="4" rx="2" fill="#9CA3AF"/>
      </svg>
    ),
    "search": (
      <svg className="w-48 h-48 mx-auto mb-4" viewBox="0 0 200 200" fill="none">
        <circle cx="85" cy="85" r="50" stroke="#E5E7EB" strokeWidth="8" fill="none"/>
        <line x1="120" y1="120" x2="145" y2="145" stroke="#E5E7EB" strokeWidth="8" strokeLinecap="round"/>
        <path d="M85 65 Q85 55, 75 55 Q65 55, 65 65" stroke="#9CA3AF" strokeWidth="4" fill="none"/>
        <circle cx="70" cy="75" r="3" fill="#9CA3AF"/>
        <circle cx="85" cy="75" r="3" fill="#9CA3AF"/>
        <path d="M70 90 Q85 100, 100 90" stroke="#9CA3AF" strokeWidth="4" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    "error": (
      <svg className="w-48 h-48 mx-auto mb-4" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="80" fill="#FEE2E2"/>
        <path d="M100 45 L100 110" stroke="#DC2626" strokeWidth="8" strokeLinecap="round"/>
        <circle cx="100" cy="140" r="5" fill="#DC2626"/>
      </svg>
    ),
    "success": (
      <svg className="w-48 h-48 mx-auto mb-4" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="80" fill="#D1FAE5"/>
        <path d="M70 100 L90 120 L130 80" stroke="#10B981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    )
  };

  return (
    <div className="py-12">
      {illustrations[illustrationType]}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">{message}</p>
        {action && (
          <div className="flex justify-center">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

// Export usage examples
export const EmptyStateExamples = {
  NoData: () => (
    <EmptyState
      icon={FileText}
      title="ยังไม่มีข้อมูล"
      message="ยังไม่มีคำร้องที่ถูกสร้างขึ้น เริ่มต้นด้วยการสร้างคำร้องใหม่"
      action={
        <button className="btn btn-primary">
          <Plus size={20} />
          สร้างคำร้องใหม่
        </button>
      }
    />
  ),
  
  SearchNoResults: () => (
    <EmptyStateIllustration
      illustrationType="search"
      title="ไม่พบผลการค้นหา"
      message="ไม่พบข้อมูลที่ตรงกับคำค้นหาของคุณ ลองค้นหาด้วยคำอื่น"
      action={
        <button className="btn btn-secondary">
          ล้างการค้นหา
        </button>
      }
    />
  ),
  
  Error: () => (
    <EmptyStateIllustration
      illustrationType="error"
      title="เกิดข้อผิดพลาด"
      message="ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง"
      action={
        <button className="btn btn-primary">
          ลองใหม่
        </button>
      }
    />
  ),
  
  Success: () => (
    <EmptyStateIllustration
      illustrationType="success"
      title="ส่งคำร้องสำเร็จ!"
      message="คำร้องของคุณได้ถูกส่งเรียบร้อยแล้ว เราจะแจ้งผลให้คุณทราบเร็วๆ นี้"
      action={
        <button className="btn btn-primary">
          กลับสู่หน้าหลัก
        </button>
      }
    />
  )
};