import React from "react";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
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

const formatAllocatedAmount = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return formatCurrency(value);
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
  const normalized = Array.isArray(budgets) ? budgets : [];
  const overall = normalized.find(
    (budget) => normalizeScope(budget.record_scope) === "overall"
  );
  const rules = normalized
    .filter((budget) => normalizeScope(budget.record_scope) !== "overall")
    .sort((a, b) => resolveBudgetOrder(a) - resolveBudgetOrder(b));
  return { overall, rules };
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
  onRefresh,
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
    if (!Array.isArray(categories) || categories.length === 0) {
      return false;
    }

    const hasSubcategory = categories.some(
      (category) => Array.isArray(category.subcategories) && category.subcategories.length > 0
    );

    return hasSubcategory || categories.length > 0;
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
    return null;
  }, [selectedYear, hasFundData]);

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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onRefresh?.()}
            disabled={!onRefresh}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              onRefresh
                ? "border-gray-300 text-gray-700 hover:bg-gray-100"
                : "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-100"
            }`}
          >
            <RefreshCw size={16} />
            รีเฟรช
          </button>
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
        <div className="flex items-center gap-3 ml-auto">
          <div className="relative">
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
          {filteredCategories.map((category) => {
            const categoryExpanded = expandedCategories?.[category.category_id];
            const subcategories = category.subcategories || [];

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
                  <div className="flex flex-wrap gap-2 items-center justify-end ml-auto">
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
                    {subcategories.map((subcategory) => {
                      const subExpanded = expandedSubcategories?.[subcategory.subcategory_id];
                      const { overall, rules } = categorizeBudgets(subcategory.budgets);
                      const targetRoleLabel = describeTargetRoles(subcategory.target_roles);
                      const normalizedTargetRoles = targetRoleLabel || "ทุกบทบาท";
                      const overallSummaryText = overall
                        ? `วงเงินรวมต่อปี: ${formatCurrency(overall.max_amount_per_year)} | จำนวนครั้งรวม: ${formatGrantCount(
                            overall.max_grants
                          )}`
                        : "ยังไม่กำหนดวงเงินรวม";
                      const overallSecondarySummary = overall
                        ? [
                            `วงเงินต่อครั้งค่าเริ่มต้น: ${
                              overall.max_amount_per_grant
                                ? formatCurrency(overall.max_amount_per_grant)
                                : "ไม่กำหนด"
                            }`,
                            overall.allocated_amount !== undefined &&
                            overall.allocated_amount !== null &&
                            overall.allocated_amount !== ""
                              ? `งบประมาณที่จัดสรร: ${formatAllocatedAmount(overall.allocated_amount)}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" | ")
                        : null;
                      const summaryLines = [
                        subcategory.fund_condition?.trim() || "ไม่มีเงื่อนไขเพิ่มเติม",
                        `กลุ่มเป้าหมาย: ${normalizedTargetRoles}`,
                        overallSummaryText,
                        overallSecondarySummary,
                        `มี ${rules.length.toLocaleString()} ระดับ`,
                      ].filter(Boolean);

                      return (
                        <div key={subcategory.subcategory_id} className="border border-gray-200 rounded-lg">
                          <div className="flex flex-wrap gap-3 items-center px-4 py-3">
                            <button
                              type="button"
                              className="flex items-center gap-3 text-left"
                              onClick={() => onToggleSubcategory?.(subcategory.subcategory_id)}
                            >
                              {subExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              <div>
                                <p className="font-medium text-gray-900">{subcategory.subcategory_name}</p>
                              </div>
                            </button>
                            <div className="flex flex-wrap gap-2 items-center justify-end ml-auto">
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
                                  <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
                                    <p className="text-sm font-semibold text-gray-900 mb-2">รายละเอียดทุน</p>
                                    <div className="space-y-1">
                                      {summaryLines.map((line, index) => (
                                        <p
                                          key={`${subcategory.subcategory_id}-summary-${index}`}
                                          className="text-sm text-gray-700"
                                        >
                                          {line}
                                        </p>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-semibold text-gray-700">กฎย่อยของทุนย่อย</h4>
                                    <button
                                      type="button"
                                      onClick={() => onAddBudget?.(subcategory, category)}
                                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                                    >
                                      <Plus size={14} /> เพิ่มกฎย่อย
                                    </button>
                                  </div>

                                  <div className="space-y-3">
                                    {rules.length > 0 ? (
                                      rules.map((rule, ruleIndex) => {
                                        const normalizedDescription = (rule.fund_description || "").trim();
                                        const normalizedLevel = (rule.level || "").trim();
                                        const fallbackIdentifier = rule.subcategory_budget_id
                                          ? `กฎย่อย #${rule.subcategory_budget_id}`
                                          : rule.order_index
                                          ? `กฎย่อย #${rule.order_index}`
                                          : `กฎย่อย #${ruleIndex + 1}`;
                                        const ruleTitle = normalizedDescription || normalizedLevel || fallbackIdentifier;
                                        const showLevelSubtitle = Boolean(
                                          normalizedLevel && normalizedLevel !== ruleTitle
                                        );
                                        const ruleKey =
                                          rule.subcategory_budget_id ??
                                          rule.order_index ??
                                          `${subcategory.subcategory_id}-rule-${ruleIndex}`;

                                        return (
                                          <div key={ruleKey} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex flex-wrap gap-3 items-start">
                                              <div className="flex-1 min-w-[220px]">
                                                <div className="flex items-start gap-2 text-gray-700">
                                                  <Layers size={16} className="mt-1" />
                                                  <div>
                                                    <p className="font-semibold text-gray-900">{ruleTitle}</p>
                                                    {showLevelSubtitle && (
                                                      <p className="text-xs text-gray-500 mt-0.5">กลุ่ม/ระดับ: {normalizedLevel}</p>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm text-gray-700">
                                                  <div>
                                                    <p className="text-xs text-gray-500">วงเงินต่อครั้ง</p>
                                                    <p className="font-medium">{formatCurrency(rule.max_amount_per_grant)}</p>
                                                  </div>
                                                  <div>
                                                    <p className="text-xs text-gray-500">จำนวนครั้งสูงสุด</p>
                                                    <p className="font-medium">{formatGrantCount(rule.max_grants)}</p>
                                                  </div>
                                                </div>
                                                {rule.max_amount_per_year !== null && rule.max_amount_per_year !== undefined && (
                                                  <p className="mt-2 text-sm text-gray-600">
                                                    <span className="font-medium text-gray-700">วงเงินต่อปี:</span>{' '}
                                                    {formatCurrency(rule.max_amount_per_year)}
                                                  </p>
                                                )}
                                                {rule.comment && (
                                                  <p className="mt-2 text-sm text-gray-600">
                                                    <span className="font-medium text-gray-700">หมายเหตุ:</span> {rule.comment}
                                                  </p>
                                                )}
                                              </div>
                                              <div className="flex flex-col gap-2 items-end ml-auto">
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
                                        );
                                      })
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