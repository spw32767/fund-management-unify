// components/YearManagementTab.js
import React, { useMemo, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Swal from "sweetalert2";
import StatusBadge from "./StatusBadge";

const YearManagementTab = ({ years = [], onSaveYear, onDeleteYear }) => {
  // ====== Editing + Form state (keep original names) ======
  const [editingYear, setEditingYear] = useState(null);
  const [yearForm, setYearForm] = useState({
    year: "",
    budget: "",
    status: "active",
  });

  // ====== Modal visibility (derive from editing) ======
  const [showForm, setShowForm] = useState(false);

  // ====== Sorting state ======
  const [sortState, setSortState] = useState({ key: null, dir: "asc" });
  const toggleSort = (key) => {
    setSortState((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  };
  const sortIcon = (key) => {
    if (sortState.key !== key)
      return <ArrowUpDown size={14} className="inline-block ml-1 opacity-60" />;
    return sortState.dir === "asc" ? (
      <ArrowUp size={14} className="inline-block ml-1" />
    ) : (
      <ArrowDown size={14} className="inline-block ml-1" />
    );
  };

  // ====== Derived table list with sorting ======
  const sortedYears = useMemo(() => {
    const list = Array.isArray(years) ? [...years] : [];
    const { key, dir } = sortState;
    if (!key) {
      // Default sort: year desc (most recent first)
      return list.sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
    }
    const mul = dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      if (key === "year") {
        return ((parseInt(a.year) || 0) - (parseInt(b.year) || 0)) * mul;
      }
      if (key === "budget") {
        return ((+a.budget || 0) - (+b.budget || 0)) * mul;
      }
      if (key === "status") {
        // put active before inactive in asc
        const av = a.status === "active" ? 1 : 0;
        const bv = b.status === "active" ? 1 : 0;
        return (av - bv) * mul;
      }
      return 0;
    });
  }, [years, sortState]);

  // ====== Handlers (keep behavior semantics) ======
  const handleAddNew = () => {
    setEditingYear(null);
    setYearForm({ year: "", budget: "", status: "active" });
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingYear(item);
    setYearForm({
      year: item.year ?? "",
      budget: item.budget ?? "",
      status: item.status ?? "active",
    });
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingYear(null);
    setYearForm({ year: "", budget: "", status: "active" });
    setShowForm(false);
  };

  const handleSave = () => {
    // Validate minimal fields
    if (!yearForm.year || !/^\d{4}$/.test(String(yearForm.year))) {
      Swal.fire("ข้อมูลไม่ครบ", "กรุณาระบุปีงบประมาณเป็นตัวเลข 4 หลัก (พ.ศ.)", "warning");
      return;
    }
    const yearData = {
      ...yearForm,
      // normalize numeric
      budget: parseFloat(yearForm.budget) || 0,
    };
    onSaveYear(yearData, editingYear);
    setEditingYear(null);
    setYearForm({ year: "", budget: "", status: "active" });
    setShowForm(false);
    Swal.fire("สำเร็จ", "บันทึกปีงบประมาณเรียบร้อย", "success");
  };

  const handleDelete = async (item) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: `ต้องการลบปีงบประมาณ พ.ศ. ${item?.year || ""} หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d33",
    });
    if (!result.isConfirmed) return;
    onDeleteYear(item);
    Swal.fire("สำเร็จ", "ลบปีงบประมาณเรียบร้อย", "success");
  };

  // ====== UI ======
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">จัดการปีงบประมาณ</h2>
          <p className="text-gray-600 mt-1">
            เพิ่ม/แก้ไข ปีงบประมาณและวงเงินรวม พร้อมสถานะการเปิดใช้งาน
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} />
          เพิ่มปีงบประมาณ
        </button>
      </div>

      <div className="overflow-x-auto">
        {sortedYears.length ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  <button
                    className="inline-flex items-center"
                    onClick={() => toggleSort("year")}
                  >
                    ปีงบประมาณ {sortIcon("year")}
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  <button
                    className="inline-flex items-center"
                    onClick={() => toggleSort("budget")}
                  >
                    วงเงินรวม {sortIcon("budget")}
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  <button
                    className="inline-flex items-center"
                    onClick={() => toggleSort("status")}
                  >
                    สถานะ {sortIcon("status")}
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedYears.map((item) => (
                <tr key={item.year}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    พ.ศ. {item.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {new Intl.NumberFormat("th-TH").format(item.budget || 0)} บาท
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <StatusBadge
                      status={item.status}
                      interactive
                      confirm
                      onChange={async (next) => {
                        await onSaveYear({ ...item, status: next ? "active" : "inactive" }, item);
                        Swal.fire("สำเร็จ", "เปลี่ยนสถานะเรียบร้อย", "success");
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg mr-1"
                      title="แก้ไข"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-lg"
                      title="ลบ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-16">
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

      {/* ===== Modal (เดิม) สำหรับเพิ่ม/แก้ไขปีงบประมาณ ===== */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {editingYear ? "แก้ไขปีงบประมาณ" : "เพิ่มปีงบประมาณ"}
              </h3>
              <button
                onClick={handleCancelEdit}
                className="p-2 rounded-md hover:bg-gray-100"
                title="ปิด"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ปีงบประมาณ (พ.ศ.)
                </label>
                <input
                  type="number"
                  placeholder="เช่น 2568"
                  value={yearForm.year}
                  onChange={(e) =>
                    setYearForm({ ...yearForm, year: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  วงเงินรวม (บาท)
                </label>
                <input
                  type="number"
                  placeholder="เช่น 1000000"
                  value={yearForm.budget}
                  onChange={(e) =>
                    setYearForm({ ...yearForm, budget: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  สถานะ
                </label>
                <select
                  value={yearForm.status}
                  onChange={(e) =>
                    setYearForm({ ...yearForm, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">เปิดใช้งาน</option>
                  <option value="inactive">ปิดใช้งาน</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Save size={16} />
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YearManagementTab;
