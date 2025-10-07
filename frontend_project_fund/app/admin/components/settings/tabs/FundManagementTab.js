// components/FundManagementTab.js
import React from "react";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Copy,
} from "lucide-react";
import Swal from "sweetalert2";
import { targetRolesUtils } from "@/app/lib/target_roles_utils";
import StatusBadge from "@/app/admin/components/settings/common/StatusBadge";

const FundManagementTab = ({
  selectedYear,
  years = [],
  categories = [],
  searchTerm = "",
  expandedCategories = {},
  expandedSubcategories = {},
  onYearChange,
  onSearchChange,
  onToggleCategory,
  onToggleSubcategory,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onAddSubcategory,
  onEditSubcategory,
  onDeleteSubcategory,
  onAddBudget,
  onEditBudget,
  onDeleteBudget,
  onToggleCategoryStatus,
  onToggleSubcategoryStatus,
  onToggleBudgetStatus,
  onCopyToNewYear,
}) => {

  const [bulkMode, setBulkMode] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState({
    categories: [],
    subcategories: [],
    budgets: [],
  });

  const toggleBulkMode = () => {
    setBulkMode((v) => !v);
    if (bulkMode) {
      setSelectedItems({ categories: [], subcategories: [], budgets: [] });
    }
  };

  const handleItemSelect = (type, id, checked, item = null) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (type === "categories") {
        if (checked) {
          next.categories = [...prev.categories, id];
          const cat = categories.find((c) => c.category_id === id);
          if (cat?.subcategories?.length) {
            const subIds = cat.subcategories.map((s) => s.subcategory_id);
            const budgetIds = cat.subcategories.flatMap(
              (s) => s.budgets?.map((b) => b.subcategory_budget_id) || []
            );
            next.subcategories = [...new Set([...prev.subcategories, ...subIds])];
            next.budgets = [...new Set([...prev.budgets, ...budgetIds])];
          }
        } else {
          next.categories = prev.categories.filter((x) => x !== id);
          const cat = categories.find((c) => c.category_id === id);
          if (cat?.subcategories?.length) {
            const subIds = cat.subcategories.map((s) => s.subcategory_id);
            const budgetIds = cat.subcategories.flatMap(
              (s) => s.budgets?.map((b) => b.subcategory_budget_id) || []
            );
            next.subcategories = prev.subcategories.filter(
              (sid) => !subIds.includes(sid)
            );
            next.budgets = prev.budgets.filter((bid) => !budgetIds.includes(bid));
          }
        }
      } else if (type === "subcategories") {
        if (checked) {
          next.subcategories = [...prev.subcategories, id];
          if (item?.budgets?.length) {
            const bid = item.budgets.map((b) => b.subcategory_budget_id);
            next.budgets = [...new Set([...prev.budgets, ...bid])];
          }
        } else {
          next.subcategories = prev.subcategories.filter((x) => x !== id);
          if (item?.budgets?.length) {
            const bid = item.budgets.map((b) => b.subcategory_budget_id);
            next.budgets = prev.budgets.filter((x) => !bid.includes(x));
          }
          const parentCat = categories.find((c) =>
            c.subcategories?.some((s) => s.subcategory_id === id)
          );
          if (parentCat) {
            next.categories = prev.categories.filter(
              (cid) => cid !== parentCat.category_id
            );
          }
        }
      } else if (type === "budgets") {
        if (checked) {
          next.budgets = [...prev.budgets, id];
        } else {
          next.budgets = prev.budgets.filter((x) => x !== id);
          const parentSub = categories
            .flatMap((c) => c.subcategories || [])
            .find((s) => s.budgets?.some((b) => b.subcategory_budget_id === id));
          if (parentSub) {
            next.subcategories = prev.subcategories.filter(
              (sid) => sid !== parentSub.subcategory_id
            );
            const parentCat = categories.find((c) =>
              c.subcategories?.some((s) => s.subcategory_id === parentSub.subcategory_id)
            );
            if (parentCat) {
              next.categories = prev.categories.filter(
                (cid) => cid !== parentCat.category_id
              );
            }
          }
        }
      }
      return next;
    });
  };

  // ====== Confirm delete wrappers (SweetAlert2) ======
  const confirmDeleteCategory = async (category) => {
    const subCount = Array.isArray(category.subcategories) ? category.subcategories.length : 0;
    if (subCount > 0) {
      await Swal.fire({
        icon: "info",
        title: "ลบไม่ได้",
        text: `หมวดหมู่ "${category.category_name}" ยังมีทุนย่อยอยู่ ${subCount} รายการ\nกรุณาลบทุนย่อยทั้งหมดก่อน`,
        confirmButtonText: "ตกลง"
      });
      return;
    }

    const res = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: `ต้องการลบหมวดหมู่ "${category.category_name}" หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d33",
    });
    if (res.isConfirmed) onDeleteCategory(category);
  };

  const confirmDeleteSubcategory = async (subcategory, category) => {
    const budgetCount = Array.isArray(subcategory.budgets) ? subcategory.budgets.length : 0;
    if (budgetCount > 0) {
      await Swal.fire({
        icon: "info",
        title: "ลบไม่ได้",
        text: `ทุนย่อย "${subcategory.subcategory_name}" ยังมีงบประมาณอยู่ ${budgetCount} รายการ\nกรุณาลบงบประมาณทั้งหมดก่อน`,
        confirmButtonText: "ตกลง"
      });
      return;
    }

    const res = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: `ต้องการลบทุนย่อย "${subcategory.subcategory_name}" หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d33",
    });
    if (res.isConfirmed) onDeleteSubcategory(subcategory, category);
  };


  const confirmDeleteBudget = async (budget) => {
    const res = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: `ต้องการลบงบประมาณ "${budget.fund_description || `ระดับ${budget.level || "ทั่วไป"}`}" หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d33",
    });
    if (res.isConfirmed) onDeleteBudget(budget);
  };

  // ====== Copy to new year ======
  const handleCopyToNewYear = async () => {
    if (!selectedYear) {
      Swal.fire("ข้อมูลไม่ครบ", "กรุณาเลือกปีงบประมาณก่อน", "warning");
      return;
    }

    const { value: newYear } = await Swal.fire({
      title: "คัดลอกข้อมูลไปยังปีใหม่",
      input: "text",
      inputLabel: "ระบุปีปลายทาง (พ.ศ.)",
      inputPlaceholder: "เช่น 2569",
      showCancelButton: true,
      confirmButtonText: "คัดลอก",
      cancelButtonText: "ยกเลิก",
      inputValidator: (value) => {
        if (!value) return "กรุณาระบุปี";
        if (!/^\d{4}$/.test(value)) return "กรุณาระบุปีในรูปแบบ พ.ศ. 4 หลัก";
        if (parseInt(value) < 2500) return "ปีต้องมากกว่า 2500";
        // ตรวจสอบว่าปีนี้มีอยู่แล้วหรือไม่
        const existingYear = years.find(y => 
          (y.year === value) || (y.year_id && years.find(yr => yr.year === value))
        );
        if (existingYear) return "ปีนี้มีข้อมูลอยู่แล้ว";
      }
    });

    if (newYear && onCopyToNewYear) {
      onCopyToNewYear(selectedYear, newYear);
    }
  };

  // ====== Filter (เดิม) ======
  const filteredCategories = React.useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase();
    if (!term) return categories;
    const match = (txt) => String(txt || "").toLowerCase().includes(term);

    return categories
      .map((c) => {
        const sub = (c.subcategories || []).filter(
          (s) =>
            match(c.category_name) ||
            match(s.subcategory_name) ||
            (s.budgets || []).some(
              (b) =>
                match(b.fund_description) ||
                match(b.level) ||
                match(b.max_amount_per_grant)
            )
        );
        return { ...c, subcategories: sub };
      })
      .filter(
        (c) =>
          match(c.category_name) ||
          (c.subcategories && c.subcategories.length > 0)
      );
  }, [categories, searchTerm]);

  // ====== Get selected year value - รองรับทั้ง 2 แบบ ======
  const getSelectedYearValue = () => {
    if (!selectedYear) return "";
    // ถ้า selectedYear เป็น object ที่มี year_id
    if (selectedYear.year_id) return selectedYear.year_id;
    // ถ้า selectedYear เป็น string หรือ number
    return selectedYear;
  };

  const getSelectedYearDisplay = () => {
    if (!selectedYear) return "";
    // ถ้า selectedYear เป็น object ที่มี year
    if (selectedYear.year) return selectedYear.year;
    // ถ้าเป็น year_id ให้หา year จาก array
    const found = years.find(y => y.year_id === selectedYear);
    return found ? found.year : selectedYear;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      {/* Header ให้เหมือนอีก 2 หน้า */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">จัดการทุน</h2>
          <p className="text-gray-600 mt-1">
            เพิ่ม/แก้ไข หมวดหมู่ ทุนย่อย และงบประมาณสำหรับปีงบประมาณที่เลือก
          </p>
        </div>
        {years.length > 0 && selectedYear && onCopyToNewYear && (
          <button
            onClick={handleCopyToNewYear}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Copy size={16} />
            คัดลอกไปปีใหม่
          </button>
        )}
      </div>

      {/* Year Selector + Search + Add + Bulk */}
      <div className="mb-5 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">ปีงบประมาณ:</label>
        <select
          value={getSelectedYearValue()}
          onChange={(e) => {
            const selectedId = e.target.value;
            if (selectedId && onYearChange) {
              // ถ้า years เป็น array ของ objects ที่มี year_id
              if (years[0]?.year_id) {
                onYearChange(selectedId); // ส่ง year_id
              } else {
                // ถ้า years เป็น array ของ objects แบบอื่น
                const yearObj = years.find(y => y.year_id === selectedId || y.year === selectedId);
                onYearChange(yearObj || selectedId);
              }
            }
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {/* ลบ option "เลือกปี" ออก */}
          {years.map((year) => {
            // รองรับทั้ง format ที่มี year_id และ year
            const value = year.year_id || year.year || year;
            const display = year.year || year;
            return (
              <option key={value} value={value}>
                พ.ศ. {display}
              </option>
            );
          })}
        </select>

        {/* Search */}
        <div className="relative ml-auto">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="ค้นหาทุน..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-72"
          />
        </div>

        {categories.length > 0 && selectedYear && (
          <button
            onClick={toggleBulkMode}
            className={`px-3 py-2 rounded-lg border transition-colors ${
              bulkMode
                ? "bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200"
                : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {bulkMode ? "✓ เลือกหลายรายการ" : "เลือกหลายรายการ"}
          </button>
        )}

        <button
          onClick={onAddCategory}
          disabled={!selectedYear}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          เพิ่มหมวดหมู่
        </button>
      </div>

      {/* Empty state */}
      {!selectedYear ? (
        <div className="text-center py-16 border rounded-lg">
          <div className="text-4xl mb-2">📅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            เลือกปีงบประมาณ
          </h3>
          <p className="text-gray-500">
            กรุณาเลือกปีงบประมาณเพื่อจัดการข้อมูลทุน
          </p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <div className="text-4xl mb-2">📂</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            ยังไม่มีข้อมูลหมวดหมู่
          </h3>
          <p className="text-gray-500 mb-4">
            เริ่มต้นโดยการเพิ่มหมวดหมู่ใหม่สำหรับปี {getSelectedYearDisplay() || "-"}
          </p>
          <button
            onClick={onAddCategory}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            เพิ่มหมวดหมู่แรก
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map((category) => {
            const isCatExpanded = expandedCategories[category.category_id];

            return (
              <div
                key={category.category_id}
                className={`rounded-lg border border-gray-200 overflow-hidden ${
                  bulkMode &&
                  selectedItems.categories.includes(category.category_id)
                    ? "bg-blue-50"
                    : "bg-white"
                }`}
              >
                {/* Category Header */}
                <div className="p-4 bg-gray-50 flex justify-between items-center">
                  <div className="flex items-center gap-3 flex-1">
                    {bulkMode && (
                      <input
                        type="checkbox"
                        checked={selectedItems.categories.includes(
                          category.category_id
                        )}
                        onChange={(e) =>
                          handleItemSelect(
                            "categories",
                            category.category_id,
                            e.target.checked,
                            category
                          )
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}

                    <button
                      type="button"
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => onToggleCategory(category.category_id)}
                    >
                      {isCatExpanded ? (
                        <ChevronDown size={20} className="text-gray-500" />
                      ) : (
                        <ChevronRight size={20} className="text-gray-500" />
                      )}
                      <h3 className="font-semibold text-lg text-gray-900">
                        {category.category_name}
                      </h3>
                      <span className="text-sm text-gray-500">
                        ({category.subcategories?.length || 0} ทุนย่อย)
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                  <StatusBadge
                    status={category.status}
                    interactive
                    confirm
                    onChange={(next) => onToggleCategoryStatus?.(category, next)}
                  />
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEditCategory(category)}
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                        title="แก้ไขหมวดหมู่"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => confirmDeleteCategory(category)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="ลบหมวดหมู่"
                      >
                        <Trash2 size={14} />
                      </button>

                      <button
                        onClick={() => onAddSubcategory(category)}
                        className="text-green-700 hover:bg-green-50 p-2 rounded-lg transition-colors"
                        title="เพิ่มทุนย่อย"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subcategories */}
                {isCatExpanded && (
                  <div className="divide-y divide-gray-200">
                    {category.subcategories && category.subcategories.length > 0 ? (
                      category.subcategories.map((subcategory) => {
                        const isExpanded =
                          expandedSubcategories[subcategory.subcategory_id];

                        return (
                          <div
                            key={subcategory.subcategory_id}
                            className={`${
                              bulkMode &&
                              selectedItems.subcategories.includes(
                                subcategory.subcategory_id
                              )
                                ? "bg-blue-50"
                                : "bg-white"
                            }`}
                          >
                            {/* Subcategory Header */}
                            <div className="px-6 py-3 flex justify-between items-center">
                              <div className="flex items-center gap-3 flex-1">
                                {bulkMode && (
                                  <input
                                    type="checkbox"
                                    checked={selectedItems.subcategories.includes(
                                      subcategory.subcategory_id
                                    )}
                                    onChange={(e) =>
                                      handleItemSelect(
                                        "subcategories",
                                        subcategory.subcategory_id,
                                        e.target.checked,
                                        subcategory
                                      )
                                    }
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                )}

                                <button
                                  className="flex items-center gap-2 flex-1 text-left"
                                  onClick={() => onToggleSubcategory(subcategory.subcategory_id)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown size={18} className="text-gray-500" />
                                  ) : (
                                    <ChevronRight size={18} className="text-gray-500" />
                                  )}
                                  <h4 className="font-medium text-gray-900">
                                    {subcategory.subcategory_name}
                                  </h4>
                                  <span className="text-sm text-gray-500">
                                    ({subcategory.budgets?.length || 0} งบประมาณ)
                                  </span>
                                  <span className="text-xs text-gray-300">•</span>
                                  <span className="hidden md:inline-flex items-center gap-1">
                                    {(() => {
                                      const parsedRoles = targetRolesUtils.parseTargetRoles(subcategory.target_roles);

                                      // ถ้าไม่มี target_roles แสดง "-"
                                      if (!parsedRoles || parsedRoles.length === 0) {
                                        return "";
                                      }

                                      // แปลง roleId -> display name
                                      const roleNames = parsedRoles.map(
                                        (roleId) => targetRolesUtils.getRoleDisplayName(roleId) || `Role ${roleId}`
                                      );

                                      // fix สีเฉพาะบทบาท
                                      const colorMap = {
                                        "อาจารย์": "bg-blue-100 text-blue-800 border-blue-200",
                                        "เจ้าหน้าที่": "bg-yellow-100 text-yellow-800 border-yellow-200",
                                        "ผู้ดูแลระบบ": "bg-gray-100 text-gray-800 border-gray-200"
                                      };
                                      const fallback = "bg-gray-100 text-gray-700 border-gray-200";

                                      return roleNames.map((name) => (
                                        <span
                                          key={name}
                                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${colorMap[name] || fallback}`}
                                        >
                                          {name}
                                        </span>
                                      ));
                                    })()}
                                  </span>
                                </button>
                              </div>

                              <div className="flex items-center gap-4">
                                <StatusBadge
                                  status={subcategory.status}
                                  interactive
                                  confirm
                                  onChange={(next) => onToggleSubcategoryStatus?.(subcategory, category, next)}
                                />
                                  <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => onEditSubcategory(subcategory, category)}
                                    className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                    title="แก้ไขทุนย่อย"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => confirmDeleteSubcategory(subcategory, category)}
                                    className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                    title="ลบทุนย่อย"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                  {/* ปุ่มเพิ่มงบประมาณย้ายมาที่นี่ */}
                                  <button
                                    onClick={() => onAddBudget(subcategory, category)}
                                    className="text-green-700 hover:bg-green-50 p-2 rounded-lg transition-colors"
                                    title="เพิ่มงบประมาณ"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Budgets */}
                            {isExpanded && (
                              <div className="bg-gray-50">
                                <div className="divide-y divide-gray-200">
                                  {subcategory.budgets &&
                                  subcategory.budgets.length > 0 ? (
                                    subcategory.budgets.map((budget) => {
                                      const isSelected =
                                        selectedItems.budgets.includes(
                                          budget.subcategory_budget_id
                                        );
                                      return (
                                        <div
                                          key={budget.subcategory_budget_id}
                                          className={`px-6 py-4 ${
                                            bulkMode && isSelected
                                              ? "bg-blue-50"
                                              : "bg-white"
                                          }`}
                                        >
                                          <div className="flex justify-between items-start">
                                            <div className="flex items-start gap-3">
                                              {bulkMode && (
                                                <input
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  onChange={(e) =>
                                                    handleItemSelect(
                                                      "budgets",
                                                      budget.subcategory_budget_id,
                                                      e.target.checked,
                                                      budget
                                                    )
                                                  }
                                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                />
                                              )}
                                              <div className="space-y-1">
                                                <div className="font-medium text-gray-800">
                                                  {budget.fund_description ||
                                                    `ระดับ${budget.level || "ทั่วไป"}`}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                  วงเงินต่อทุน:{" "}
                                                  {Number(
                                                    budget.max_amount_per_grant ||
                                                      0
                                                  ).toLocaleString()}{" "}
                                                  บาท
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                  จำนวนทุน:{" "}
                                                  {budget.max_grants === null ||
                                                  budget.max_grants === 0 ? (
                                                    <span className="text-green-600 font-medium">
                                                      ไม่จำกัดทุน
                                                    </span>
                                                  ) : (
                                                    `${budget.remaining_grant || 0} / ${
                                                      budget.max_grants
                                                    }`
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                              <StatusBadge
                                                status={budget.status}
                                                interactive
                                                confirm
                                                onChange={(next) => onToggleBudgetStatus?.(budget, subcategory, category, next)}
                                              />
                                              <div className="flex gap-2">
                                                <button
                                                  onClick={() =>
                                                    onEditBudget(budget, subcategory)
                                                  }
                                                  className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                                  title="แก้ไขงบประมาณ"
                                                >
                                                  <Edit size={14} />
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    confirmDeleteBudget(budget)
                                                  }
                                                  className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                  title="ลบงบประมาณ"
                                                >
                                                  <Trash2 size={14} />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="px-6 py-6 text-sm text-gray-500">
                                      ยังไม่มีงบประมาณในทุนย่อยนี้
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-6 py-6 text-sm text-gray-500">
                        ยังไม่มีทุนย่อยในหมวดหมู่นี้
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FundManagementTab;