// components/YearManagementTab.js
import React, { useMemo, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  PlusCircle
} from "lucide-react";
import Swal from "sweetalert2";
import StatusBadge from "@/app/admin/components/settings/StatusBadge";
import SettingsSectionCard from "@/app/admin/components/settings/common/SettingsSectionCard";
import SettingsModal from "@/app/admin/components/settings/common/SettingsModal";

const YearManagementTab = ({ years = [], onSaveYear /*, onDeleteYear */ }) => {
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

  /*
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

    try {
      await onDeleteYear(item);
    } catch (error) {
      if (error?.handled) {
        return;
      }
      console.error("Failed to delete year:", error);
      const message = error?.message || "เกิดข้อผิดพลาดในการลบปีงบประมาณ";
      Swal.fire("เกิดข้อผิดพลาด", message, "error");
    }
  };
  */

  // ====== UI ======
  return (
    <>
      <SettingsSectionCard
        icon={Calendar}
        iconBgClass="bg-orange-100"
        iconColorClass="text-orange-600"
        title="จัดการปีงบประมาณ"
        description="เพิ่ม/แก้ไข ปีงบประมาณและวงเงินรวม พร้อมสถานะการเปิดใช้งาน"
        actions={
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <PlusCircle size={16} />
            เพิ่มปีงบประมาณ
          </button>
        }
        contentClassName="space-y-6"
      >
        <div className="overflow-x-auto border border-gray-300 rounded-lg">
          {sortedYears.length ? (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  <button
                    className="inline-flex items-center gap-1 hover:text-blue-600"
                    onClick={() => toggleSort("year")}
                  >
                    ปีงบประมาณ {sortIcon("year")}
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">
                  <button
                    className="inline-flex items-center gap-1 justify-end hover:text-blue-600"
                    onClick={() => toggleSort("budget")}
                  >
                    วงเงินรวม {sortIcon("budget")}
                  </button>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">
                  <button
                    className="inline-flex items-center gap-1 justify-center hover:text-blue-600"
                    onClick={() => toggleSort("status")}
                  >
                    สถานะ {sortIcon("status")}
                  </button>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">จัดการ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {sortedYears.map((item) => (
                <tr key={item.year}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    พ.ศ. {item.year}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    {new Intl.NumberFormat("th-TH").format(item.budget || 0)} บาท
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
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
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                    <button
                      onClick={() => handleEdit(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                      title="แก้ไข"
                    >
                      <Edit size={16} /> แก้ไข
                    </button>
                    {/**
                     * ระบบลบปีงบประมาณถูกปิดใช้งานชั่วคราว
                     * <button
                     *   onClick={() => handleDelete(item)}
                     *   className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                     *   title="ลบ"
                     * >
                     *   <Trash2 size={16} /> ลบ
                     * </button>
                     */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="bg-white text-center py-16 rounded-lg">
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
      </SettingsSectionCard>

      <SettingsModal
        open={showForm}
        onClose={handleCancelEdit}
        size="md"
        bodyClassName="max-h-[70vh] overflow-y-auto px-6 py-6"
        headerContent={
          <div className="flex items-center gap-3 text-gray-700">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Calendar size={18} />
            </span>
            <div>
              <p className="text-base font-semibold text-gray-900">
                {editingYear ? "แก้ไขปีงบประมาณ" : "เพิ่มปีงบประมาณ"}
              </p>
              <p className="text-sm text-gray-500">กำหนดปีงบประมาณ วงเงินรวม และสถานะการใช้งาน</p>
            </div>
          </div>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">ปีงบประมาณ (พ.ศ.)</label>
            <input
              type="number"
              placeholder="เช่น 2568"
              value={yearForm.year}
              onChange={(e) => setYearForm({ ...yearForm, year: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">วงเงินรวม (บาท)</label>
            <input
              type="number"
              placeholder="เช่น 1000000"
              value={yearForm.budget}
              onChange={(e) => setYearForm({ ...yearForm, budget: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              min="0"
              step="1000"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">สถานะ</label>
            <select
              value={yearForm.status}
              onChange={(e) => setYearForm({ ...yearForm, status: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="active">เปิดใช้งาน</option>
              <option value="inactive">ปิดใช้งาน</option>
            </select>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Save size={16} />
              บันทึก
            </button>
          </div>
        </form>
      </SettingsModal>
    </>
  );
};

export default YearManagementTab;