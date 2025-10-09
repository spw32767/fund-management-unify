import React from "react";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Copy,
  ShieldCheck,
  Layers,
} from "lucide-react";
import Swal from "sweetalert2";
import { targetRolesUtils } from "@/app/lib/target_roles_utils";
import StatusBadge from "@/app/admin/components/settings/StatusBadge";

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "ไม่จำกัด";
  const number = Number(value);
  if (Number.isNaN(number)) return "-";
  return `${number.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} บาท`;
};

const formatGrantCount = (value) => {
  if (value === null || value === undefined || Number(value) === 0) {
    return "ไม่จำกัด";
  }
  if (Number.isNaN(Number(value))) {
    return "-";
  }
  return `${Number(value).toLocaleString()} ครั้ง`;
};

const getSelectedYearValue = (selectedYear) => {
  if (!selectedYear) return "";
  if (selectedYear.year_id) return selectedYear.year_id;
  if (selectedYear.year) return selectedYear.year;
  return selectedYear;
};

const getSelectedYearDisplay = (selectedYear, years = []) => {
  if (!selectedYear) return "";
  if (selectedYear.year) return selectedYear.year;
  if (selectedYear.year_id) {
    const match = years.find((y) => y.year_id === selectedYear.year_id);
    if (match?.year) {
      return match.year;
    }
  }
  return selectedYear;
};

const describeTargetRoles = (targetRoles) =>
  targetRolesUtils.formatTargetRolesForDisplay(targetRoles);

const normalizeScope = (scope) => String(scope || "").toLowerCase();

const ensureBudgetArray = (budgets) => {
  if (!budgets) return [];

  const results = [];
  const seenIds = new Set();
  const seenObjects = typeof WeakSet === 'function' ? new WeakSet() : null;

  const isBudgetLike = (candidate) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
    return (
      'subcategory_budget_id' in candidate ||
      'budget_id' in candidate ||
      'record_scope' in candidate ||
      'max_amount_per_grant' in candidate ||
      'max_amount_per_year' in candidate ||
      'max_grants' in candidate ||
      'fund_description' in candidate ||
      'level' in candidate
    );
  };

  const addBudget = (budget, fallbackScope) => {
    if (!budget || typeof budget !== 'object') return;

    if (seenObjects) {
      if (seenObjects.has(budget)) return;
      seenObjects.add(budget);
    }

    if (!isBudgetLike(budget)) {
      Object.values(budget).forEach((nested) => traverse(nested, fallbackScope));
      return;
    }

    const scope = normalizeScope(budget.record_scope || fallbackScope);
    const identifier =
      budget.subcategory_budget_id ??
      budget.budget_id ??
      `${scope}-${budget.level || budget.fund_description || results.length}`;

    if (seenIds.has(identifier)) return;
    seenIds.add(identifier);

    results.push({
      ...budget,
      record_scope: scope,
    });
  };

  const traverse = (value, fallbackScope) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => traverse(item, fallbackScope));
      return;
    }
    if (typeof value === 'object') {
      addBudget(value, fallbackScope);
    }
  };

  if (Array.isArray(budgets)) {
    budgets.forEach((budget) => addBudget(budget));
    return results;
  }

  Object.entries(budgets).forEach(([key, value]) => {
    if (!value) return;

    const lowerKey = String(key).toLowerCase();
    const fallbackScope = lowerKey.includes('overall')
      ? 'overall'
      : lowerKey.includes('rule')
      ? 'rule'
      : undefined;

    traverse(value, fallbackScope);
  });

  return results;
};

const resolveBudgetOrder = (budget = {}) => {
  const candidates = [
    budget.display_order,
    budget.sort_order,
    budget.sequence,
    budget.order,
    budget.order_index,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === "") continue;
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) return numeric;
  }

  return budget.subcategory_budget_id ?? 0;
};

const categorizeBudgets = (budgets = []) => {
  const normalized = ensureBudgetArray(budgets);
  const overall = normalized.find(
    (budget) => normalizeScope(budget.record_scope) === "overall"
  );
  const rules = normalized
    .filter((budget) => normalizeScope(budget.record_scope) !== "overall")
    .sort((a, b) => resolveBudgetOrder(a) - resolveBudgetOrder(b));
  return { overall, rules };
};

const getCategoryNumber = (category, index) => {
  const display = category?.display_number ?? category?.order_index;
  if (display) return display;
  const numeric = Number(category?.category_number);
  if (Number.isFinite(numeric)) return `${numeric}`;
  return `${index + 1}`;
};

const getSubcategoryNumber = (categoryNumber, subcategory, index) => {
  if (subcategory?.display_number) return subcategory.display_number;
  if (subcategory?.order_index) return subcategory.order_index;
  const numeric = Number(subcategory?.subcategory_number);
  if (Number.isFinite(numeric)) {
    return `${categoryNumber}.${numeric}`;
  }
  return `${categoryNumber}.${index + 1}`;
};

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
  const selectedYearDisplay = getSelectedYearDisplay(selectedYear, years);
  const selectedYearNumber = React.useMemo(() => {
    const parsed = Number(selectedYearDisplay);
    return Number.isFinite(parsed) ? parsed : null;
  }, [selectedYearDisplay]);

  const nextYear = React.useMemo(() => {
    if (!selectedYearNumber) return null;
    return selectedYearNumber + 1;
  }, [selectedYearNumber]);

  const hasFundData = React.useMemo(() => {
    return categories.some((category) =>
      (category.subcategories || []).some(
        (subcategory) => ensureBudgetArray(subcategory.budgets).length > 0
      )
    );
  }, [categories]);

  const existingYears = React.useMemo(() => {
    return years
      .map((year) => {
        const value = year?.year ?? year;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      })
      .filter((value) => value !== null);
  }, [years]);

  const copyDisabledReason = React.useMemo(() => {
    if (!selectedYear) return "กรุณาเลือกปีงบประมาณก่อน";
    if (!hasFundData) return "ปีที่เลือกยังไม่มีข้อมูลทุน";
    if (!nextYear) return "ไม่พบปีถัดไป";
    if (existingYears.includes(nextYear)) {
      return `มีปีงบประมาณ ${nextYear} อยู่แล้ว`;
    }
    return null;
  }, [selectedYear, hasFundData, nextYear, existingYears]);

  const handleCopyToNextYear = async () => {
    if (copyDisabledReason) {
      await Swal.fire({
        icon: "warning",
        title: "ไม่สามารถคัดลอกได้",
        text: copyDisabledReason,
      });
      return;
    }

    const defaultYear = nextYear?.toString() || "";
    const { value, isConfirmed } = await Swal.fire({
      title: "คัดลอกโครงสร้างทุน",
      html: `ต้องการคัดลอกข้อมูลจากปี <strong>${selectedYearDisplay}</strong> ไปยังปี <strong>${defaultYear}</strong> หรือไม่?`,
      input: "text",
      inputValue: defaultYear,
      inputLabel: "ระบุปีปลายทาง (พ.ศ.)",
      inputPlaceholder: "เช่น 2569",
      showCancelButton: true,
      confirmButtonText: "คัดลอก",
      cancelButtonText: "ยกเลิก",
      inputValidator: (value) => {
        if (!value) return "กรุณาระบุปีปลายทาง";
        if (!/^\d{4}$/.test(value)) return "กรุณาระบุปี พ.ศ. 4 หลัก";
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
          return "ปีปลายทางไม่ถูกต้อง";
        }
        if (numeric <= (selectedYearNumber || 0)) {
          return "ปีปลายทางต้องมากกว่าปีต้นทาง";
        }
        if (existingYears.includes(numeric)) {
          return "ปีนี้มีอยู่แล้วในระบบ";
        }
        return null;
      },
    });

    if (isConfirmed && value && onCopyToNewYear) {
      onCopyToNewYear(selectedYear, value);
    }
  };

  const filteredCategories = React.useMemo(() => {
    const keyword = (searchTerm || "").toLowerCase().trim();
    if (!keyword) return categories;

    return categories
      .map((category) => {
        const matchedCategory = category.category_name?.toLowerCase().includes(keyword);
        const filteredSubcategories = (category.subcategories || []).filter((sub) => {
          const baseMatch =
            sub.subcategory_name?.toLowerCase().includes(keyword) ||
            sub.fund_condition?.toLowerCase().includes(keyword);

          if (baseMatch) return true;

          return (sub.budgets || []).some((budget) => {
            const desc = budget.fund_description?.toLowerCase() || "";
            const level = budget.level?.toLowerCase() || "";
            const scope = String(budget.record_scope || "").toLowerCase();
            return (
              desc.includes(keyword) ||
              level.includes(keyword) ||
              scope.includes(keyword)
            );
          });
        });

        if (matchedCategory || filteredSubcategories.length > 0) {
          return {
            ...category,
            subcategories: filteredSubcategories,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [categories, searchTerm]);

  const confirmDeleteCategory = async (category) => {
    const subCount = Array.isArray(category.subcategories) ? category.subcategories.length : 0;
    if (subCount > 0) {
      await Swal.fire({
        icon: "info",
        title: "ลบหมวดหมู่ไม่ได้",
        text: [
          'หมวดหมู่ "',
          category.category_name || '-',
          '" ยังมีทุนย่อยอยู่ ',
          subCount,
          ' รายการ กรุณาลบทุนย่อยทั้งหมดก่อน'
        ].join(''),
      });
      return;
    }

    const res = await Swal.fire({
      title: "ยืนยันการลบหมวดหมู่?",
      text: [
        'ต้องการลบหมวดหมู่ "',
        category.category_name || '-',
        '" หรือไม่?'
      ].join(''),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d33",
    });

    if (res.isConfirmed && onDeleteCategory) {
      onDeleteCategory(category);
    }
  };

  const confirmDeleteSubcategory = async (subcategory, category) => {
    const budgetsCount = Array.isArray(subcategory.budgets) ? subcategory.budgets.length : 0;
    if (budgetsCount > 0) {
      await Swal.fire({
        icon: "info",
        title: "ลบทุนย่อยไม่ได้",
        text: [
          'ทุนย่อย "',
          subcategory.subcategory_name || '-',
          '" ยังมีนโยบายงบประมาณ ',
          budgetsCount,
          ' รายการ กรุณาลบงบประมาณทั้งหมดก่อน'
        ].join(''),
      });
      return;
    }

    const res = await Swal.fire({
      title: "ยืนยันการลบทุนย่อย?",
      text: [
        'ต้องการลบทุนย่อย "',
        subcategory.subcategory_name || '-',
        '" หรือไม่?'
      ].join(''),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d33",
    });

    if (res.isConfirmed && onDeleteSubcategory) {
      onDeleteSubcategory(subcategory, category);
    }
  };

  const confirmDeleteBudget = async (budget, subcategory) => {
    const scope = String(budget.record_scope || "").toLowerCase();
    const scopeName = scope === "overall" ? "นโยบายภาพรวม" : "กฎย่อย";
    const label =
      budget.fund_description ||
      budget.level ||
      (scope === "overall" ? "นโยบายภาพรวม" : `กฎย่อย #${budget.subcategory_budget_id}`);

    const res = await Swal.fire({
      title: "ยืนยันการลบนโยบายงบประมาณ?",
      html: `ต้องการลบ${scopeName} "<strong>${label}</strong>" หรือไม่?` +
        "<br/>การลบนี้ไม่สามารถย้อนกลับได้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d33",
    });

    if (res.isConfirmed && onDeleteBudget) {
      onDeleteBudget(budget, subcategory);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">จัดการทุน</h2>
          <p className="text-sm text-gray-600 mt-1">
            เพิ่ม/แก้ไข หมวดหมู่ ทุนย่อย และนโยบายงบประมาณตามโครงสร้างใหม่
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyToNextYear}
          disabled={Boolean(copyDisabledReason) || !onCopyToNewYear}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            copyDisabledReason || !onCopyToNewYear
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          <Copy size={16} />
          คัดลอกไปปีถัดไป
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">ปีงบประมาณ</label>
          <select
            value={getSelectedYearValue(selectedYear)}
            onChange={(event) => onYearChange?.(event.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {years.map((year) => {
              const value = year.year_id || year.year || year;
              const display = year.year || year;
              return (
                <option key={value} value={value}>
                  พ.ศ. {display}
                </option>
              );
            })}
          </select>
        </div>

        <div className="relative ml-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="ค้นหาหมวดหมู่หรือทุนย่อย"
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-72"
          />
        </div>

        <button
          type="button"
          onClick={onAddCategory}
          disabled={!selectedYear}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          เพิ่มหมวดหมู่
        </button>
      </div>

      {!selectedYear ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <div className="text-4xl mb-2">📅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">กรุณาเลือกปีงบประมาณ</h3>
          <p className="text-gray-600">เลือกปีงบประมาณเพื่อจัดการโครงสร้างทุน</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <div className="text-4xl mb-2">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบรายการที่ตรงกับการค้นหา</h3>
          <p className="text-gray-600">ลองเปลี่ยนคำค้นหาหรือเพิ่มหมวดหมู่ใหม่</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredCategories.map((category, categoryIndex) => {
            const categoryExpanded = expandedCategories?.[category.category_id];
            const subcategories = category.subcategories || [];
            const categoryNumber = getCategoryNumber(category, categoryIndex);

            return (
              <div key={category.category_id} className="border border-gray-200 rounded-xl">
                <div className="flex flex-wrap gap-3 items-center justify-between px-5 py-4 bg-gray-50 rounded-t-xl">
                  <button
                    type="button"
                    className="flex items-center gap-3 text-left"
                    onClick={() => onToggleCategory?.(category.category_id)}
                  >
                    {categoryExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <div>
                      <p className="text-base font-semibold text-gray-900">{category.category_name}</p>
                      <p className="text-sm text-gray-500">
                        {subcategories.length > 0
                          ? `${subcategories.length} ทุนย่อย`
                          : "ยังไม่มีทุนย่อย"}
                      </p>
                    </div>
                  </button>
                  <div className="flex flex-wrap gap-2 items-center">
                    <StatusBadge
                      status={category.status}
                      interactive
                      onChange={(next) => onToggleCategoryStatus?.(category, next)}
                      activeLabel="เปิดใช้งาน"
                      inactiveLabel="ปิดใช้งาน"
                    />
                    <button
                      type="button"
                      onClick={() => onEditCategory?.(category)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      <Edit size={16} className="inline mr-1" /> แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDeleteCategory(category)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} className="inline mr-1" /> ลบ
                    </button>
                  </div>
                </div>

                {categoryExpanded && (
                  <div className="px-5 py-4 space-y-4">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => onAddSubcategory?.(category)}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100"
                      >
                        <Plus size={14} /> เพิ่มทุนย่อย
                      </button>
                    </div>

                    {subcategories.length === 0 ? (
                      <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500">
                        ยังไม่มีทุนย่อยในหมวดหมู่นี้ คลิก "เพิ่มทุนย่อย" เพื่อสร้างทุนใหม่
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {subcategories.map((subcategory, subIndex) => {
                          const subExpanded = expandedSubcategories?.[subcategory.subcategory_id];
                          const { overall, rules } = categorizeBudgets(subcategory.budgets);
                          const targetRoleLabel = describeTargetRoles(subcategory.target_roles);
                          const subNumber = getSubcategoryNumber(categoryNumber, subcategory, subIndex);

                          return (
                            <div key={subcategory.subcategory_id} className="border border-gray-200 rounded-lg">
                              <div className="flex flex-wrap gap-3 items-center justify-between px-4 py-3">
                                <button
                                  type="button"
                                  className="flex items-start gap-3 text-left"
                                  onClick={() => onToggleSubcategory?.(subcategory.subcategory_id)}
                                >
                                  {subExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  <div className="flex items-start gap-3">
                                    <span className="text-blue-600 font-semibold text-sm mt-0.5 min-w-[2.5rem]">
                                      {subNumber}
                                    </span>
                                    <div>
                                      <p className="font-medium text-gray-900">{subcategory.subcategory_name}</p>
                                      <p className="text-xs text-gray-500">
                                        {subcategory.fund_condition || "ไม่มีเงื่อนไขเพิ่มเติม"}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        กลุ่มเป้าหมาย: {targetRoleLabel}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                                <div className="flex flex-wrap gap-2 items-center">
                                  <StatusBadge
                                    status={subcategory.status}
                                    interactive
                                    onChange={(next) => onToggleSubcategoryStatus?.(subcategory, category, next)}
                                    activeLabel="เปิดใช้งาน"
                                    inactiveLabel="ปิดใช้งาน"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => onEditSubcategory?.(subcategory, category)}
                                    className="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                                  >
                                    <Edit size={14} className="inline mr-1" /> แก้ไข
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => confirmDeleteSubcategory(subcategory, category)}
                                    className="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 size={14} className="inline mr-1" /> ลบ
                                  </button>
                                </div>
                              </div>

                              {subExpanded && (
                                <div className="px-4 pb-4 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-semibold text-gray-700">นโยบายงบประมาณ</h4>
                                    <button
                                      type="button"
                                      onClick={() => onAddBudget?.(subcategory, category)}
                                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                                    >
                                      <Plus size={14} /> เพิ่มนโยบาย
                                    </button>
                                  </div>

                                  <div className="space-y-3">
                                    {overall ? (
                                      <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                                        <div className="flex flex-wrap gap-3 items-start justify-between">
                                          <div>
                                            <div className="flex items-center gap-2 text-blue-700 font-semibold">
                                              <ShieldCheck size={18} /> นโยบายภาพรวม
                                            </div>
                                            <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm text-gray-700">
                                              <div>
                                                <p className="text-xs text-gray-500">วงเงินรวมต่อปี</p>
                                                <p className="font-medium">{formatCurrency(overall.max_amount_per_year)}</p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-gray-500">จำนวนครั้งรวมต่อปี</p>
                                                <p className="font-medium">{formatGrantCount(overall.max_grants)}</p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-gray-500">วงเงินต่อครั้ง (ค่าเริ่มต้น)</p>
                                                <p className="font-medium">
                                                  {overall.max_amount_per_grant
                                                    ? formatCurrency(overall.max_amount_per_grant)
                                                    : "ไม่กำหนด"}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-gray-500">งบประมาณที่จัดสรร</p>
                                                <p className="font-medium">
                                                  {overall.allocated_amount !== undefined && overall.allocated_amount !== null
                                                    ? formatCurrency(overall.allocated_amount)
                                                    : "-"}
                                                </p>
                                              </div>
                                            </div>
                                            {(overall.fund_description || overall.comment) && (
                                              <div className="mt-3 space-y-1 text-sm text-gray-600">
                                                {overall.fund_description && (
                                                  <p>
                                                    <span className="font-medium text-gray-700">คำอธิบาย:</span> {overall.fund_description}
                                                  </p>
                                                )}
                                                {overall.comment && (
                                                  <p>
                                                    <span className="font-medium text-gray-700">หมายเหตุ:</span> {overall.comment}
                                                  </p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex flex-col gap-2 items-end">
                                            <StatusBadge
                                              status={overall.status}
                                              interactive
                                              onChange={(next) =>
                                                onToggleBudgetStatus?.(overall, subcategory, category, next)
                                              }
                                              activeLabel="เปิดใช้งาน"
                                              inactiveLabel="ปิดใช้งาน"
                                            />
                                            <div className="flex gap-2">
                                              <button
                                                type="button"
                                                onClick={() => onEditBudget?.(overall, subcategory)}
                                                className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                                              >
                                                <Edit size={14} className="inline mr-1" /> แก้ไข
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => confirmDeleteBudget(overall, subcategory)}
                                                className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                              >
                                                <Trash2 size={14} className="inline mr-1" /> ลบ
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="border border-dashed border-blue-200 rounded-lg p-4 text-sm text-blue-700 bg-blue-50">
                                        ยังไม่มีนโยบายภาพรวม เพิ่มนโยบายเพื่อกำหนดวงเงินรวมของทุนย่อยนี้
                                      </div>
                                    )}

                                    {rules.length > 0 ? (
                                      rules.map((rule) => (
                                        <div key={rule.subcategory_budget_id} className="border border-gray-200 rounded-lg p-4">
                                          <div className="flex flex-wrap gap-3 items-start justify-between">
                                            <div>
                                              <div className="flex items-center gap-2 text-gray-700 font-semibold">
                                                <Layers size={16} /> กฎย่อยต่อครั้ง
                                              </div>
                                              <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm text-gray-700">
                                                <div>
                                                  <p className="text-xs text-gray-500">วงเงินต่อครั้ง</p>
                                                  <p className="font-medium">{formatCurrency(rule.max_amount_per_grant)}</p>
                                                </div>
                                                <div>
                                                  <p className="text-xs text-gray-500">กลุ่ม/ระดับ</p>
                                                  <p className="font-medium">{rule.level || "ไม่ระบุ"}</p>
                                                </div>
                                                <div>
                                                  <p className="text-xs text-gray-500">คำอธิบาย</p>
                                                  <p className="font-medium">{rule.fund_description || "-"}</p>
                                                </div>
                                              </div>
                                              {rule.comment && (
                                                <p className="mt-2 text-sm text-gray-600">
                                                  <span className="font-medium text-gray-700">หมายเหตุ:</span> {rule.comment}
                                                </p>
                                              )}
                                            </div>
                                            <div className="flex flex-col gap-2 items-end">
                                              <StatusBadge
                                                status={rule.status}
                                                interactive
                                                onChange={(next) =>
                                                  onToggleBudgetStatus?.(rule, subcategory, category, next)
                                                }
                                                activeLabel="เปิดใช้งาน"
                                                inactiveLabel="ปิดใช้งาน"
                                              />
                                              <div className="flex gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => onEditBudget?.(rule, subcategory)}
                                                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                                                >
                                                  <Edit size={14} className="inline mr-1" /> แก้ไข
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => confirmDeleteBudget(rule, subcategory)}
                                                  className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                                >
                                                  <Trash2 size={14} className="inline mr-1" /> ลบ
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="border border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-600">
                                        ยังไม่มีกฎย่อย สามารถเพิ่มกฎเพื่อกำหนดเพดานต่อครั้งเฉพาะเงื่อนไขได้
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
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