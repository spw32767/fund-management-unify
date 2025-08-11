// components/YearManagementTab.js
import React, { useState } from "react";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import StatusBadge from "./StatusBadge";

const YearManagementTab = ({ 
  years, 
  onSaveYear, 
  onDeleteYear 
}) => {
  const [editingYear, setEditingYear] = useState(null);
  const [yearForm, setYearForm] = useState({ 
    year: "", 
    budget: "", 
    status: "active" 
  });

  const handleEditYear = (year) => {
    setEditingYear(year);
    setYearForm({
      year: year.year,
      budget: year.budget.toString(),
      status: year.status
    });
  };

  const handleSaveYear = () => {
    const yearData = {
      ...yearForm,
      budget: parseFloat(yearForm.budget) || 0
    };
    
    onSaveYear(yearData, editingYear);
    setEditingYear(null);
    setYearForm({ year: "", budget: "", status: "active" });
  };

  const handleCancelEdit = () => {
    setEditingYear(null);
    setYearForm({ year: "", budget: "", status: "active" });
  };

  const handleAddNew = () => {
    setEditingYear(null);
    setYearForm({ year: "", budget: "", status: "active" });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-black text-lg font-semibold">จัดการปีงบประมาณ</h3>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          เพิ่มปีงบประมาณ
        </button>
      </div>

      {/* Add New Year Form */}
      {editingYear === null && (yearForm.year !== "" || yearForm.budget !== "") && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-3">เพิ่มปีงบประมาณใหม่</h4>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="ปีงบประมาณ (เช่น 2567)"
              value={yearForm.year}
              onChange={(e) => setYearForm({ ...yearForm, year: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="number"
              placeholder="งบประมาณ (บาท)"
              value={yearForm.budget}
              onChange={(e) => setYearForm({ ...yearForm, budget: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={yearForm.status}
              onChange={(e) => setYearForm({ ...yearForm, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">เปิดใช้งาน</option>
              <option value="inactive">ปิดใช้งาน</option>
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSaveYear}
              className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 flex items-center gap-1 transition-colors"
            >
              <Save size={16} />
              บันทึก
            </button>
            <button
              onClick={handleCancelEdit}
              className="bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 flex items-center gap-1 transition-colors"
            >
              <X size={16} />
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Years List */}
      <div className="grid gap-4">
        {years.map(year => (
          <div key={year.year_id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            {editingYear?.year_id === year.year_id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="ปีงบประมาณ"
                    value={yearForm.year}
                    onChange={(e) => setYearForm({ ...yearForm, year: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="งบประมาณ"
                    value={yearForm.budget}
                    onChange={(e) => setYearForm({ ...yearForm, budget: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select
                    value={yearForm.status}
                    onChange={(e) => setYearForm({ ...yearForm, status: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">เปิดใช้งาน</option>
                    <option value="inactive">ปิดใช้งาน</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveYear}
                    className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 flex items-center gap-1 transition-colors"
                  >
                    <Save size={16} />
                    บันทึก
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 flex items-center gap-1 transition-colors"
                  >
                    <X size={16} />
                    ยกเลิก
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-gray-900">ปีงบประมาณ {year.year}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    งบประมาณ: {year.budget.toLocaleString()} บาท
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={year.status} />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditYear(year)}
                      className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                      title="แก้ไข"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteYear(year)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="ลบ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {years.length === 0 && (
          <div className="text-center py-12">
            <div className="mb-4">
              <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <Plus size={40} className="text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีข้อมูลปีงบประมาณ</h3>
            <p className="text-gray-500 mb-4">เริ่มต้นโดยการเพิ่มปีงบประมาณใหม่</p>
            <button
              onClick={handleAddNew}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              เพิ่มปีงบประมาณแรก
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default YearManagementTab;