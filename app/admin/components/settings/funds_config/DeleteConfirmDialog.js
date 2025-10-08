// modals/DeleteConfirmDialog.js
import React from "react";
import { AlertCircle } from "lucide-react";

const DeleteConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  deleteTarget 
}) => {
  if (!isOpen) return null;

  const getDeleteMessage = () => {
    if (!deleteTarget) return "คุณต้องการลบรายการนี้ใช่หรือไม่?";
    
    const typeNames = {
      year: "ปีงบประมาณ",
      category: "หมวดหมู่",
      subcategory: "ทุนย่อย",
      budget: "งบประมาณ"
    };
    
    const typeName = typeNames[deleteTarget.type] || "รายการ";
    return `คุณต้องการลบ${typeName}: "${deleteTarget.name}" ใช่หรือไม่?`;
  };

  const getDeleteWarning = () => {
    switch (deleteTarget?.type) {
      case "category":
        return "การลบหมวดหมู่จะลบทุนย่อยและงบประมาณที่เกี่ยวข้องทั้งหมด";
      case "subcategory":
        return "การลบทุนย่อยจะลบงบประมาณที่เกี่ยวข้องทั้งหมด";
      case "year":
        return "การลบปีงบประมาณจะลบข้อมูลทุนทั้งหมดในปีนั้น";
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center mb-4">
          <AlertCircle className="text-red-500 mr-3" size={24} />
          <h3 className="text-lg font-semibold">ยืนยันการลบ</h3>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            {getDeleteMessage()}
          </p>
          
          {getDeleteWarning() && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">
                ⚠️ คำเตือน: {getDeleteWarning()}
              </p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            ลบ
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmDialog;