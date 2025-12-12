// FundSettingsContent.js
import React, { useState, useEffect } from "react";
import { Settings, CalendarRange, DollarSign, PencilLine, FileText, FileStack, ListChecks, BellRing, AlertTriangle } from "lucide-react";
import Swal from 'sweetalert2';

// Import separated components
import PageLayout from "@/app/admin/components/common/PageLayout";
import StatusBadge from "@/app/admin/components/settings/StatusBadge";
import YearManagementTab from "@/app/admin/components/settings/years_config/YearManagementTab";
import FundManagementTab from "@/app/admin/components/settings/funds_config/FundManagementTab";
import RewardConfigManager from "@/app/admin/components/settings/reward_config/RewardConfigManager";
import EndOfContractManager from "@/app/admin/components/settings/end_of_contract_config/EndOfContractManager";
import SystemConfigSettings from "@/app/admin/components/settings/system_config/SystemConfigSettings";
import AnnouncementManager from "@/app/admin/components/settings/announcement_config/AnnouncementManager";
import DocumentTypeManager from "@/app/admin/components/settings/document_config/DocumentTypeManager";
import InstallmentManagementTab from "@/app/admin/components/settings/installment_config/InstallmentManagementTab";
import NotificationTemplateManager from "@/app/admin/components/settings/notification_templates/NotificationTemplateManager";
import ProjectTypesManager from "@/app/admin/components/settings/project_config/ProjectTypesManager";
import BudgetPlansManager from "@/app/admin/components/settings/project_config/BudgetPlansManager";

// Import modals
import CategoryModal from "@/app/admin/components/settings/funds_config/CategoryModal";
import SubcategoryModal from "@/app/admin/components/settings/funds_config/SubcategoryModal";
import BudgetModal from "@/app/admin/components/settings/funds_config/BudgetModal";
import DeleteConfirmDialog from "@/app/admin/components/settings/funds_config/DeleteConfirmDialog";

// Import real API
import { adminAPI } from "@/app/lib/admin_api";
import systemConfigAPI from "@/app/lib/system_config_api";
import { adminInstallmentAPI } from "@/app/lib/admin_installment_api";

const TAB_ITEMS = [
  { id: "funds", label: "จัดการทุนและปีงบประมาณ", icon: DollarSign },
  { id: "reward-config", label: "จัดการเงินรางวัล", icon: Settings },
  { id: "installments", label: "ตั้งค่าวันตัดรอบการพิจารณา", icon: CalendarRange },
  { id: "document-types", label: "ตั้งค่าเอกสารทุนแนบ", icon: FileStack },
  { id: "reward-terms", label: "ข้อตกลงเงินรางวัล", icon: ListChecks },
  { id: "system", label: "ตั้งค่าระบบ", icon: PencilLine },
  { id: "announcements", label: "ประกาศ", icon: FileText },
  { id: "notification-templates", label: "การแจ้งเตือน", icon: BellRing },
];

// SweetAlert2 configuration
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

export default function FundSettingsContent({ onNavigate }) {
  // State Management
  const [activeTab, setActiveTab] = useState("funds");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Years Management
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [currentYearValue, setCurrentYearValue] = useState(null); 
  
  // Categories Management
  const [categories, setCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false); 
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSubcategories, setExpandedSubcategories] = useState({});
  
  // Search and Filter
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal States
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Edit States
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState(null);
  const [selectedSubcategoryForBudget, setSelectedSubcategoryForBudget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [globalAlerts, setGlobalAlerts] = useState([]);
  const [alertChecking, setAlertChecking] = useState(false);

  // เพิ่ม useEffect สำหรับตรวจสอบการเชื่อมต่อ
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const status = await adminAPI.checkServerConnection();
      setConnectionStatus(status.status);
      if (status.status === 'disconnected') {
        showError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      showError('เกิดข้อผิดพลาดในการตรวจสอบการเชื่อมต่อ');
    }
  };

  // SweetAlert2 helper functions
  const showSuccess = (message) => {
    Toast.fire({
      icon: 'success',
      title: message
    });
  };

  const showError = (message) => {
    Toast.fire({
      icon: 'error',
      title: message
    });
  };

  const showWarning = (message) => {
    Toast.fire({
      icon: 'warning',
      title: message
    });
  };

  const showConfirm = async (title, text, confirmButtonText = 'ยืนยัน') => {
    const result = await Swal.fire({
      title: title,
      text: text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: confirmButtonText,
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true
    });
    return result.isConfirmed;
  };

  // Load initial data
  useEffect(() => {
    loadYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      loadCategories();
    }
    // เพิ่ม categoriesLoaded ใน dependency array เพื่อให้สอดคล้องกับ logic ใน FundSettingsContent2.js
  }, [selectedYear]);

  useEffect(() => {
    checkCurrentYearAlerts();
  }, [currentYearValue, years, categories, selectedYear]);

  // ==================== DATA LOADING FUNCTIONS ====================
  
  const loadYears = async ({ preserveSelection = false } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const [yearData, currentYearRes] = await Promise.all([
        adminAPI.getYears(),
        systemConfigAPI
          .getCurrentYear()
          .catch((err) => {
            console.warn('ไม่สามารถอ่านปีปัจจุบันจาก system_config:', err);
            return null;
          }),
      ]);

      const normalizedYears = Array.isArray(yearData)
        ? [...yearData].sort((a, b) => {
            const aYear = Number(a?.year ?? 0);
            const bYear = Number(b?.year ?? 0);
            return bYear - aYear;
          })
        : [];

      setYears(normalizedYears);

      const findMatchingYear = (value) => {
        if (value === undefined || value === null) {
          return null;
        }
        return (
          normalizedYears.find((year) => {
            const idMatch =
              year.year_id !== undefined && year.year_id !== null && String(year.year_id) === String(value);
            const yearMatch =
              year.year !== undefined && year.year !== null && String(year.year) === String(value);
            return idMatch || yearMatch;
          }) || null
        );
      };

      let nextSelected = null;

      if (preserveSelection && selectedYear) {
        const candidateValues = [selectedYear.year_id, selectedYear.year].filter(
          (value) => value !== undefined && value !== null
        );
        for (const candidate of candidateValues) {
          nextSelected = findMatchingYear(candidate);
          if (nextSelected) break;
        }
      }

      const systemYearValue =
        currentYearRes?.current_year ?? currentYearRes?.data?.current_year ?? null;

      if (systemYearValue !== undefined) {
        setCurrentYearValue(systemYearValue ?? null);
      } else {
        setCurrentYearValue(new Date().getFullYear() + 543);
      }

      if (!nextSelected && systemYearValue !== null) {
        nextSelected = findMatchingYear(systemYearValue);
      }

      if (!nextSelected && normalizedYears.length > 0) {
        nextSelected = normalizedYears[0];
      }

      if (nextSelected) {
        setSelectedYear(nextSelected);
      } else if (normalizedYears.length === 0 || !preserveSelection) {
        setSelectedYear(null);
      }
    } catch (error) {
      console.error("Error loading years:", error);
      setError("ไม่สามารถโหลดข้อมูลปีงบประมาณได้");
      showError("ไม่สามารถโหลดข้อมูลปีงบประมาณได้");
    } finally {
      setLoading(false);
    }
  };

  const resolveOrder = (entity, fallback) => {
    if (!entity || typeof entity !== 'object') return fallback;

    const orderKeys = [
      'display_order',
      'sort_order',
      'order',
      'order_no',
      'order_index',
      'category_number',
      'subcategory_number',
      'sequence',
    ];

    for (const key of orderKeys) {
      const value = entity[key];
      if (value !== undefined && value !== null && value !== '') {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
          return numeric;
        }
      }
    }

    return fallback;
  };

  const findYearByValue = (value) => {
    if (value === null || value === undefined) return null;
    const normalizedValue = String(value);
    return (
      years.find((year) => {
        if (!year) return false;
        if (year.year !== undefined && year.year !== null && String(year.year) === normalizedValue) {
          return true;
        }
        if (year.year_id !== undefined && year.year_id !== null && String(year.year_id) === normalizedValue) {
          return true;
        }
        return false;
      }) || null
    );
  };

  const hasFundData = (fundCategories = []) => {
    if (!Array.isArray(fundCategories) || fundCategories.length === 0) return false;
    const hasSubcategory = fundCategories.some(
      (category) => Array.isArray(category.subcategories) && category.subcategories.length > 0
    );
    return hasSubcategory || fundCategories.length > 0;
  };

  const loadCategories = async ({ silent = false } = {}) => {
    if (!selectedYear) return;

    if (!silent) {
      setLoading(true);
    }
    // เพิ่ม categoriesLoaded ใน finally เพื่อให้สอดคล้องกับ logic ใน FundSettingsContent2.js
    setCategoriesLoaded(false); 
    setError(null);
    try {
      const data = await adminAPI.getCategoriesWithDetails(selectedYear.year_id);
      const sortedCategories = [...data].sort((a, b) => {
        const orderA = resolveOrder(a, a.category_id || 0);
        const orderB = resolveOrder(b, b.category_id || 0);
        return orderA - orderB;
      });

      const normalizeBudgetRecords = (...rawSources) => {
        if (!rawSources || rawSources.length === 0) return [];

        const results = [];
        const seenIds = new Set();
        const seenBudgetObjects = typeof WeakSet === 'function' ? new WeakSet() : null;
        const seenContainers = typeof WeakSet === 'function' ? new WeakSet() : null;

        const addBudget = (budget, fallbackScope) => {
          if (!budget || typeof budget !== 'object') return;

          if (seenBudgetObjects) {
            if (seenBudgetObjects.has(budget)) return;
            seenBudgetObjects.add(budget);
          }

          const resolvedScope = String(budget.record_scope || fallbackScope || '').toLowerCase();
          const budgetId =
            budget.subcategory_budget_id ??
            budget.budget_id ??
            `${resolvedScope || 'unknown'}-${
              budget.level || budget.fund_description || budget.max_amount_per_grant || results.length
            }`;

          if (seenIds.has(budgetId)) return;

          seenIds.add(budgetId);
          results.push({
            ...budget,
            record_scope: resolvedScope,
          });
        };

        const isBudgetRecord = (value) => {
          if (!value || typeof value !== 'object') return false;
          const keys = [
            'subcategory_budget_id',
            'budget_id',
            'max_amount_per_grant',
            'max_amount_per_year',
            'max_grants',
            'fund_description',
            'allocated_amount',
            'remaining_budget',
            'record_scope',
          ];
          return keys.some((key) => value[key] !== undefined && value[key] !== null);
        };

        const processSource = (source, fallbackScope) => {
          if (source === null || source === undefined) return;

          if (Array.isArray(source)) {
            source.forEach((item) => processSource(item, fallbackScope));
            return;
          }

          if (typeof source !== 'object') return;

          if (isBudgetRecord(source)) {
            addBudget(source, fallbackScope);
            return;
          }

          if (seenContainers) {
            if (seenContainers.has(source)) return;
            seenContainers.add(source);
          }

          const scopedCandidates = [
            ['overall', 'overall'],
            ['overall_budget', 'overall'],
            ['overallBudget', 'overall'],
            ['overall_rule', 'overall'],
            ['overallRule', 'overall'],
          ];
          scopedCandidates.forEach(([key, scope]) => {
            if (source[key] !== undefined) {
              processSource(source[key], scope);
            }
          });

          const ruleCandidates = [
            'rules',
            'rule_budgets',
            'ruleBudgets',
            'rulesBudget',
            'ruleBudget',
            'budget_rules',
          ];
          ruleCandidates.forEach((key) => {
            if (source[key] !== undefined) {
              processSource(source[key], 'rule');
            }
          });

          const genericCollections = [
            'budgets',
            'budget_list',
            'budgetList',
            'rawBudgetSource',
            'raw_budget_source',
            'budget_records',
            'budgetRecords',
            'budget_items',
            'budgetItems',
            'records',
            'items',
            'data',
            'list',
            'entries',
          ];
          genericCollections.forEach((key) => {
            if (source[key] !== undefined) {
              processSource(source[key], fallbackScope);
            }
          });

          Object.values(source).forEach((value) => {
            if (value === source) return;
            processSource(value, fallbackScope);
          });
        };

        rawSources.forEach((source) => processSource(source));

        return results;
      };

      const normalized = sortedCategories.map((category, categoryIndex) => {
        const categoryNumber = categoryIndex + 1;

        const sortedSubcategories = [...(category.subcategories || [])]
          .sort((a, b) => {
            const orderA = resolveOrder(a, a.subcategory_id || 0);
            const orderB = resolveOrder(b, b.subcategory_id || 0);
            return orderA - orderB;
          })
          .map((subcategory, subIndex) => {
            const displayNumber = `${categoryNumber}.${subIndex + 1}`;

            const budgets = normalizeBudgetRecords(
              subcategory.budgets,
              subcategory.rawBudgetSource,
              subcategory.raw_budget_source,
              subcategory.budget_records,
              subcategory.budgetRecords
            )
              .map((budget) => ({
                ...budget,
                record_scope: String(budget.record_scope || '').toLowerCase(),
              }))
              .sort((a, b) => {
                if (a.record_scope === b.record_scope) {
                  const orderA = resolveOrder(a, a.subcategory_budget_id || 0);
                  const orderB = resolveOrder(b, b.subcategory_budget_id || 0);
                  return orderA - orderB;
                }
                if (a.record_scope === 'overall') return -1;
                if (b.record_scope === 'overall') return 1;
                const orderA = resolveOrder(a, a.subcategory_budget_id || 0);
                const orderB = resolveOrder(b, b.subcategory_budget_id || 0);
                return orderA - orderB;
              })
              .map((budget, budgetIndex) => ({
                ...budget,
                order_index: `${displayNumber}.${budgetIndex + 1}`,
              }));

            return {
              ...subcategory,
              order_index: displayNumber,
              display_number: displayNumber,
              budgets,
            };
          });

        return {
          ...category,
          order_index: `${categoryNumber}`,
          display_number: `${categoryNumber}`,
          subcategories: sortedSubcategories,
        };
      });
      setCategories(normalized);
    } catch (error) {
      console.error("Error loading categories:", error);
      setError("ไม่สามารถโหลดข้อมูลหมวดหมู่ได้");
      showError("ไม่สามารถโหลดข้อมูลหมวดหมู่ได้");
    } finally {
      setCategoriesLoaded(true); 
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const checkCurrentYearAlerts = async () => {
    if (!currentYearValue) {
      setGlobalAlerts([]);
      return;
    }

    const currentYear = findYearByValue(currentYearValue);
    const targetYearId = currentYear?.year_id ?? null;
    const targetYearLabel = currentYear?.year ?? currentYearValue;

    if (!targetYearLabel) {
      setGlobalAlerts([]);
      return;
    }

    setAlertChecking(true);

    const isViewingCurrentYear = selectedYear && (
      (selectedYear.year !== undefined && selectedYear.year !== null && String(selectedYear.year) === String(targetYearLabel)) ||
      (selectedYear.year_id !== undefined && selectedYear.year_id !== null && targetYearId !== null && String(selectedYear.year_id) === String(targetYearId))
    );

    const fundPromise = (async () => {
      if (!targetYearId) return false;

      if (isViewingCurrentYear) {
        return hasFundData(categories);
      }

      try {
        const data = await adminAPI.getCategoriesWithDetails(targetYearId);
        return hasFundData(data);
      } catch (err) {
        console.warn('ไม่สามารถตรวจสอบข้อมูลทุนของปีปัจจุบัน:', err);
        return false;
      }
    })();

    const installmentPromise = (async () => {
      if (!targetYearId) return false;
      try {
        const { items } = await adminInstallmentAPI.list({ yearId: targetYearId, limit: 1, offset: 0 });
        return Array.isArray(items) && items.length > 0;
      } catch (err) {
        console.warn('ไม่สามารถตรวจสอบรอบการพิจารณาของปีปัจจุบัน:', err);
        return false;
      }
    })();

    const rewardRatesPromise = (async () => {
      try {
        const response = await adminAPI.getPublicationRewardRates(targetYearLabel);
        const ratesData = response?.rates ?? response?.data ?? [];
        return Array.isArray(ratesData) && ratesData.length > 0;
      } catch (err) {
        console.warn('ไม่สามารถตรวจสอบอัตราเงินรางวัลของปีปัจจุบัน:', err);
        return false;
      }
    })();

    const rewardConfigsPromise = (async () => {
      try {
        const response = await adminAPI.getRewardConfigs(targetYearLabel);
        const configsPayload = response?.data ?? response?.configs ?? [];
        const configsArray = Array.isArray(configsPayload)
          ? configsPayload
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : [];

        const filteredConfigs = configsArray.filter((config) => {
          const configYear =
            config?.year != null
              ? String(config.year)
              : config?.year_id != null
                ? String(config.year_id)
                : null;
          return configYear === String(targetYearLabel);
        });

        return filteredConfigs.length > 0;
      } catch (err) {
        console.warn('ไม่สามารถตรวจสอบวงเงินค่าธรรมเนียมของปีปัจจุบัน:', err);
        return false;
      }
    })();

    try {
      const [hasFunds, hasInstallments, hasRewardRates, hasRewardConfigs] = await Promise.all([
        fundPromise,
        installmentPromise,
        rewardRatesPromise,
        rewardConfigsPromise,
      ]);

      const warnings = [];

      if (!hasFunds) {
        warnings.push(`ตอนนี้ยังไม่มีข้อมูลทุนในปีงบประมาณ ${targetYearLabel}`);
      }
      if (!hasInstallments) {
        warnings.push(`ตอนนี้ยังไม่มีการตั้งค่าวันตัดรอบการพิจารณาของทุนในปีงบประมาณ ${targetYearLabel}`);
      }
      if (!hasRewardRates) {
        warnings.push(`ตอนนี้ยังไม่มีอัตราเงินรางวัล (Reward Rates) สำหรับปีงบประมาณ ${targetYearLabel}`);
      }
      if (!hasRewardConfigs) {
        warnings.push(`ตอนนี้ยังไม่มีวงเงินค่าธรรมเนียม (Fee Limits) สำหรับปีงบประมาณ ${targetYearLabel}`);
      }

      setGlobalAlerts(warnings);
    } catch (err) {
      console.error('ไม่สามารถตรวจสอบการแจ้งเตือนภาพรวมของปีปัจจุบัน:', err);
    } finally {
      setAlertChecking(false);
    }
  };

  // ==================== UI HELPER FUNCTIONS ====================

  // Toggle functions
  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const toggleSubcategory = (subcategoryId) => {
    setExpandedSubcategories(prev => ({
      ...prev,
      [subcategoryId]: !prev[subcategoryId]
    }));
  };

  // ==================== YEAR MANAGEMENT HANDLERS ====================
  
  const handleSaveYear = async (yearData, editingYear) => {
    setLoading(true);
    try {
      // Validate data
      adminAPI.validateYearData(yearData);
      
      if (editingYear) {
        // Update existing year
        await adminAPI.updateYear(editingYear.year_id, yearData);
        setYears(prev => prev.map(y => 
          y.year_id === editingYear.year_id 
            ? { ...y, ...yearData, update_at: new Date().toISOString() }
            : y
        ));
      } else {
        // Create new year
        const response = await adminAPI.createYear(yearData);
        if (response.year) {
          setYears(prev => [...prev, response.year]);
        }
      }
      
      showSuccess(editingYear ? "อัปเดตปีงบประมาณเรียบร้อยแล้ว" : "สร้างปีงบประมาณใหม่เรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error saving year:", error);
      showError(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== CATEGORY MANAGEMENT HANDLERS ====================
  
  const handleAddCategory = () => {
    if (!selectedYear) {
      showWarning("กรุณาเลือกปีงบประมาณก่อน");
      return;
    }
    setEditingCategory(null);
    setCategoryModalOpen(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryModalOpen(true);
  };

  const handleDeleteCategory = async (category) => {
    setLoading(true);
    try {
      const response = await adminAPI.deleteCategory(category.category_id);
      setCategories(prev => prev.filter(c => c.category_id !== category.category_id));

      const deletedSubs = response?.deleted_subcategories ?? 0;
      const deletedBudgets = response?.deleted_budgets ?? 0;
      let message = "ลบหมวดหมู่เรียบร้อยแล้ว";
      if (deletedSubs > 0 || deletedBudgets > 0) {
        message = `${message} (ลบทุนย่อย ${deletedSubs.toLocaleString()} รายการ และเงื่อนไข ${deletedBudgets.toLocaleString()} รายการ)`;
      }
      showSuccess(message);
    } catch (error) {
      console.error("Error deleting category:", error);
      showError(`เกิดข้อผิดพลาดในการลบ: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  const handleCategorySave = async (categoryData) => {
    setLoading(true);
    try {
      // ตรวจสอบให้แน่ใจว่ามี selectedYear
      if (!selectedYear) {
        showError("กรุณาเลือกปีงบประมาณก่อน");
        return;
      }

      // ตรวจสอบให้แน่ใจว่ามี year_id ในข้อมูล
      const dataWithYear = { 
        ...categoryData, 
        year_id: selectedYear.year_id 
      };
            
      // Validate data
      adminAPI.validateCategoryData(dataWithYear);
      
      if (editingCategory) {
        // Update existing category
        await adminAPI.updateCategory(editingCategory.category_id, dataWithYear);
        setCategories(prev => prev.map(cat => 
          cat.category_id === editingCategory.category_id 
            ? { ...cat, ...categoryData, update_at: new Date().toISOString() }
            : cat
        ));
      } else {
        // Add new category
        const response = await adminAPI.createCategory(dataWithYear);
        
        if (response.category) {
          setCategories(prev => [...prev, { 
            ...response.category, 
            subcategories: [] 
          }]);
        }
      }
      
      setCategoryModalOpen(false);
      setEditingCategory(null);
      showSuccess(editingCategory ? "อัปเดตหมวดหมู่เรียบร้อยแล้ว" : "สร้างหมวดหมู่ใหม่เรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error saving category:", error);
      showError(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCategoryStatus = async (category, nextActive, selectedYearObj) => {
    const newStatus = nextActive ? "active" : "disable"; // << สำคัญ: ไม่ใช่ "inactive"
    const payload = {
      category_name: category.category_name,
      status: newStatus,
      year_id: selectedYearObj?.year_id ?? category.year_id, // กันพลาด
    };

    try {
      await adminAPI.updateCategory(category.category_id, payload);
      setCategories(prev => prev.map(c =>
        c.category_id === category.category_id ? { ...c, status: newStatus } : c
      ));
      showSuccess("เปลี่ยนสถานะหมวดหมู่เรียบร้อย");
    } catch (e) {
      console.error(e);
      showError("เปลี่ยนสถานะหมวดหมู่ไม่สำเร็จ");
    }
  };

  // ==================== SUBCATEGORY MANAGEMENT HANDLERS ====================
  
  const handleAddSubcategory = (category) => {
    setEditingSubcategory(null);
    setSelectedCategoryForSub(category);
    setSubcategoryModalOpen(true);
  };

  const handleEditSubcategory = (subcategory, category) => {
    setEditingSubcategory(subcategory);
    setSelectedCategoryForSub(category);
    setSubcategoryModalOpen(true);
  };

  const handleDeleteSubcategory = async (subcategory) => {
    setLoading(true);
    try {
      const response = await adminAPI.deleteSubcategory(subcategory.subcategory_id);
      setCategories(prev => prev.map(cat => ({
        ...cat,
        subcategories: cat.subcategories.filter(sub => sub.subcategory_id !== subcategory.subcategory_id)
      })));

      const deletedBudgets = response?.deleted_budgets ?? 0;
      const baseMessage = "ลบทุนย่อยเรียบร้อยแล้ว";
      const message = deletedBudgets > 0
        ? `${baseMessage} (ลบเงื่อนไข ${deletedBudgets.toLocaleString()} รายการด้วย)`
        : baseMessage;
      showSuccess(message);
    } catch (error) {
      console.error("Error deleting subcategory:", error);
      showError(`เกิดข้อผิดพลาดในการลบ: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  const handleSubcategorySave = async ({ subcategory, overallPolicy }) => {
    setLoading(true);
    try {
      const categoryId = selectedCategoryForSub?.category_id;
      if (!categoryId) {
        throw new Error('ไม่พบหมวดหมู่ที่ต้องการบันทึก');
      }

      const normalizedSubcategory = {
        subcategory_name: (subcategory?.subcategory_name || '').trim(),
        fund_condition: subcategory?.fund_condition || '',
        target_roles: Array.isArray(subcategory?.target_roles)
          ? subcategory.target_roles.map((role) => role?.toString?.() ?? '').filter(Boolean)
          : [],
        status: subcategory?.status || 'active',
      };

      if (!normalizedSubcategory.subcategory_name) {
        throw new Error('กรุณากรอกชื่อทุนย่อย');
      }

      let activeSubcategoryId = editingSubcategory?.subcategory_id || null;
      const existingOverallBudget = editingSubcategory?.budgets?.find(
        (budget) => String(budget.record_scope || '').toLowerCase() === 'overall'
      );

      if (editingSubcategory) {
        await adminAPI.updateSubcategory(editingSubcategory.subcategory_id, normalizedSubcategory);
      } else {
        const createData = {
          category_id: categoryId,
          ...normalizedSubcategory,
        };

        const response = await adminAPI.createSubcategory(createData);
        activeSubcategoryId = response?.subcategory?.subcategory_id || null;

        if (!activeSubcategoryId) {
          throw new Error('ไม่สามารถสร้างทุนย่อยใหม่ได้');
        }
      }

      const toFloat = (value) => {
        if (value === '' || value === null || value === undefined) return null;
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
      };

      const toInt = (value) => {
        if (value === '' || value === null || value === undefined) return null;
        const parsed = parseInt(value, 10);
        return Number.isNaN(parsed) ? null : parsed;
      };

      if (overallPolicy && activeSubcategoryId) {
        const payload = {
          record_scope: 'overall',
          allocated_amount: toFloat(overallPolicy.allocated_amount) ?? null,
          max_amount_per_year: toFloat(overallPolicy.max_amount_per_year),
          max_grants: toInt(overallPolicy.max_grants),
          max_amount_per_grant: toFloat(overallPolicy.max_amount_per_grant),
          status: overallPolicy.status || 'active',
        };

        if (overallPolicy.fund_description) {
          payload.fund_description = overallPolicy.fund_description;
        }

        if (overallPolicy.comment) {
          payload.comment = overallPolicy.comment;
        }

        const validationData = {
          ...payload,
          subcategory_id: activeSubcategoryId,
        };

        adminAPI.validateBudgetData(validationData);

        if (overallPolicy.subcategory_budget_id) {
          await adminAPI.updateBudget(overallPolicy.subcategory_budget_id, payload);
        } else {
          await adminAPI.createBudget({
            ...payload,
            subcategory_id: activeSubcategoryId,
          });
        }
      } else if (!overallPolicy && existingOverallBudget) {
        await adminAPI.deleteBudget(existingOverallBudget.subcategory_budget_id);
      }

      await loadCategories(); 

      setSubcategoryModalOpen(false);
      setEditingSubcategory(null);
      setSelectedCategoryForSub(null);

      if (editingSubcategory) {
        showSuccess('อัปเดตทุนย่อยเรียบร้อยแล้ว');
      } else {
        showSuccess('สร้างทุนย่อยเรียบร้อยแล้ว');
      }

    } catch (error) {
      console.error("Error saving subcategory:", error);
      showError(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubcategoryStatus = async (subcategory, category, nextActive) => {
    const newStatus = nextActive ? "active" : "disable"; // << สำคัญ: ไม่ใช่ "inactive"

    // อ้างอิง SubcategoryModal: ใช้ budget ตัวแรกช่วยหา allocated_amount/remaining_budget
    const firstBudget = subcategory.budgets?.[0] || {};
    const payload = {
      subcategory_name: subcategory.subcategory_name ?? "",
      fund_condition: subcategory.fund_condition ?? "",
      target_roles: Array.isArray(subcategory.target_roles) ? subcategory.target_roles : [],
      allocated_amount: Number(firstBudget.allocated_amount || 0), // modal บังคับส่งตัวนี้
      // ไม่ส่ง remaining_budget เพราะ backend คำนวณเอง
      status: newStatus,
    };

    try {
      await adminAPI.updateSubcategory(subcategory.subcategory_id, payload);
      setCategories(prev => prev.map(c => {
        if (c.category_id !== category.category_id) return c;
        return {
          ...c,
          subcategories: c.subcategories.map(s =>
            s.subcategory_id === subcategory.subcategory_id
              ? { ...s, status: newStatus }
              : s
          ),
        };
      }));
      showSuccess("เปลี่ยนสถานะทุนย่อยเรียบร้อย");
    } catch (e) {
      console.error(e);
      showError("เปลี่ยนสถานะทุนย่อยไม่สำเร็จ");
    }
  };

// ==================== BUDGET MANAGEMENT HANDLERS ====================
  
  const handleAddBudget = (subcategory, category) => {
    setEditingBudget(null);
    setSelectedSubcategoryForBudget(subcategory);
    setSelectedCategoryForSub(category);
    setBudgetModalOpen(true);
  };

  const handleEditBudget = (budget, subcategory) => {
    setEditingBudget(budget);
    setSelectedSubcategoryForBudget(subcategory);
    setBudgetModalOpen(true);
  };

  const handleDeleteBudget = async (budget) => {
    const confirmed = await showConfirm(
      'ยืนยันการลบ',
      'ต้องการลบเงื่อนไขงบประมาณนี้หรือไม่?',
      'ลบ'
    );
    
    if (!confirmed) return;

    setLoading(true);
    try {
      await adminAPI.deleteBudget(budget.subcategory_budget_id);
      setCategories(prev => prev.map(cat => ({
        ...cat,
        subcategories: cat.subcategories.map(sub => ({
          ...sub,
          budgets: sub.budgets.filter(b => b.subcategory_budget_id !== budget.subcategory_budget_id)
        }))
      })));
      showSuccess("ลบเงื่อนไขงบประมาณเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error deleting budget:", error);
      showError(`เกิดข้อผิดพลาดในการลบ: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetSave = async (budgetFormValues) => {
    if (!selectedSubcategoryForBudget) {
      showError('ไม่พบทุนย่อยที่ต้องการบันทึก');
      return;
    }

    const toFloat = (value) => {
      if (value === '' || value === null || value === undefined) return null;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const toInt = (value) => {
      if (value === '' || value === null || value === undefined) return null;
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const scope = (budgetFormValues.record_scope || 'rule').toLowerCase();

    const payload = {
      record_scope: scope,
    };

    if (budgetFormValues.status) {
      payload.status = budgetFormValues.status;
    }

    if (budgetFormValues.fund_description) {
      payload.fund_description = budgetFormValues.fund_description;
    }

    if (budgetFormValues.comment) {
      payload.comment = budgetFormValues.comment;
    }

    if (scope === 'overall') {
      const allocated = toFloat(budgetFormValues.allocated_amount);
      payload.allocated_amount = allocated ?? null;
      payload.max_amount_per_year = toFloat(budgetFormValues.max_amount_per_year);
      payload.max_grants = toInt(budgetFormValues.max_grants);
      payload.max_amount_per_grant = toFloat(budgetFormValues.max_amount_per_grant);
    } else {
      payload.allocated_amount = null;
      payload.max_amount_per_year = null;
      payload.max_grants = null;
      payload.max_amount_per_grant = toFloat(budgetFormValues.max_amount_per_grant);
      if (budgetFormValues.level) {
        payload.level = budgetFormValues.level;
      }
    }

    const validationData = {
      ...payload,
      subcategory_id: selectedSubcategoryForBudget.subcategory_id,
    };

    setLoading(true);
    try {
      adminAPI.validateBudgetData(validationData);

      if (editingBudget) {
        await adminAPI.updateBudget(editingBudget.subcategory_budget_id, payload);
      } else {
        await adminAPI.createBudget({
          ...payload,
          subcategory_id: selectedSubcategoryForBudget.subcategory_id,
        });
      }

      await loadCategories();

      setBudgetModalOpen(false);
      setEditingBudget(null);
      setSelectedSubcategoryForBudget(null);
      setSelectedCategoryForSub(null);
      showSuccess(editingBudget ? "อัปเดตเงื่อนไขงบประมาณเรียบร้อยแล้ว" : "สร้างเงื่อนไขงบประมาณใหม่เรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error saving budget:", error);
      const message = error?.message || 'เกิดข้อผิดพลาดในการบันทึกงบประมาณ';
      showError(`เกิดข้อผิดพลาด: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBudgetStatus = async (budget, subcategory, category, nextActive) => {
    // nextActive: boolean -> เราอัปเดต state เองแบบ optimistic
    const newStatus = nextActive ? "active" : "disable";

    try {
      await adminAPI.toggleBudgetStatus(budget.subcategory_budget_id);

      // อัปเดต state ฝั่ง UI
      setCategories(prev => prev.map(c => {
        if (c.category_id !== category.category_id) return c;
        return {
          ...c,
          subcategories: c.subcategories.map(s => {
            if (s.subcategory_id !== subcategory.subcategory_id) return s;
            return {
              ...s,
              budgets: s.budgets.map(b =>
                b.subcategory_budget_id === budget.subcategory_budget_id
                  ? { ...b, status: newStatus }
                  : b
              ),
            };
          }),
        };
      }));

      showSuccess("เปลี่ยนสถานะงบประมาณเรียบร้อย");
    } catch (e) {
      console.error(e);
      showError("เปลี่ยนสถานะงบประมาณไม่สำเร็จ");
    }
  };


  const handleCopyToNewYear = async (currentYear, destination) => {
    const sourceYearId = currentYear?.year_id || currentYear;
    if (!sourceYearId || !destination) {
      showError('ข้อมูลปีไม่ครบถ้วน ไม่สามารถคัดลอกได้');
      return;
    }

    let mode = 'new';
    let targetYearValue = '';
    let targetYearId = null;

    if (typeof destination === 'object' && destination !== null) {
      mode = destination.mode || destination.type || 'new';
      if (mode === 'existing') {
        targetYearId =
          destination.yearId ??
          destination.targetYearId ??
          destination.year_id ??
          (destination.value !== undefined ? destination.value : null);
        targetYearValue =
          destination.year ??
          destination.display ??
          destination.yearValue ??
          destination.targetYear ??
          '';
      } else {
        targetYearValue =
          destination.year ??
          destination.targetYear ??
          destination.value ??
          destination ??
          '';
      }
    } else {
      targetYearValue = destination;
    }

    const normalizedTargetYearId =
      targetYearId !== null && targetYearId !== undefined ? `${targetYearId}`.trim() : null;

    if (mode === 'existing' && (!normalizedTargetYearId || normalizedTargetYearId === '')) {
      showError('ไม่พบปีปลายทางที่ต้องการคัดลอก');
      return;
    }

    if (mode !== 'existing' && (!targetYearValue || `${targetYearValue}`.trim() === '')) {
      showError('กรุณาระบุปีปลายทาง');
      return;
    }

    const copyOptions = {};
    if (mode === 'existing') {
      if (normalizedTargetYearId) {
        const numericTargetId = Number(normalizedTargetYearId);
        copyOptions.targetYearId = Number.isFinite(numericTargetId)
          ? numericTargetId
          : normalizedTargetYearId;
      } else {
        copyOptions.targetYearId = targetYearId;
      }
    } else if (targetYearValue) {
      copyOptions.targetYear = `${targetYearValue}`.trim();
    }

    if (mode === 'existing' && copyOptions.targetYearId) {
      const normalizeName = (value) =>
        String(value ?? "")
          .normalize("NFC")
          .trim()
          .replace(/\s+/g, " ")
          .toLowerCase();

      const escapeHtml = (value) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

      try {
        const targetCategories = await adminAPI.getCategoriesWithDetails(copyOptions.targetYearId);

        const targetCategoryNames = new Map();
        const targetSubcategoryKeys = new Map();

        (Array.isArray(targetCategories) ? targetCategories : []).forEach((category) => {
          const normalizedCategoryName = normalizeName(category?.category_name);
          if (normalizedCategoryName) {
            targetCategoryNames.set(normalizedCategoryName, category?.category_name ?? "");
          }

          (Array.isArray(category?.subcategories) ? category.subcategories : []).forEach((subcategory) => {
            const normalizedSubcategoryName = normalizeName(subcategory?.subcategory_name);
            if (!normalizedSubcategoryName || !normalizedCategoryName) {
              return;
            }
            const key = `${normalizedCategoryName}::${normalizedSubcategoryName}`;
            targetSubcategoryKeys.set(key, {
              categoryName: category?.category_name ?? "",
              subcategoryName: subcategory?.subcategory_name ?? "",
            });
          });
        });

        const duplicateCategoryNames = new Set();
        const duplicateSubcategories = new Map();

        (Array.isArray(categories) ? categories : []).forEach((category) => {
          const normalizedCategoryName = normalizeName(category?.category_name);

          if (normalizedCategoryName && targetCategoryNames.has(normalizedCategoryName)) {
            duplicateCategoryNames.add(category?.category_name ?? targetCategoryNames.get(normalizedCategoryName));
          }

          (Array.isArray(category?.subcategories) ? category.subcategories : []).forEach((subcategory) => {
            const normalizedSubcategoryName = normalizeName(subcategory?.subcategory_name);
            if (!normalizedCategoryName || !normalizedSubcategoryName) {
              return;
            }

            const key = `${normalizedCategoryName}::${normalizedSubcategoryName}`;
            if (targetSubcategoryKeys.has(key)) {
              const existing = duplicateSubcategories.get(key);
              if (!existing) {
                duplicateSubcategories.set(key, {
                  categoryName: category?.category_name ?? targetSubcategoryKeys.get(key)?.categoryName ?? "",
                  subcategoryName:
                    subcategory?.subcategory_name ?? targetSubcategoryKeys.get(key)?.subcategoryName ?? "",
                });
              }
            }
          });
        });

        if (duplicateCategoryNames.size > 0 || duplicateSubcategories.size > 0) {
          const listItems = [];

          if (duplicateCategoryNames.size > 0) {
            const categoriesHtml = Array.from(duplicateCategoryNames)
              .map((name) => `"${escapeHtml(name)}"`)
              .join(", ");
            listItems.push(`<li><strong>หมวดหมู่</strong>: ${categoriesHtml}</li>`);
          }

          if (duplicateSubcategories.size > 0) {
            const subItems = Array.from(duplicateSubcategories.values())
              .map(
                ({ categoryName, subcategoryName }) =>
                  `<li>ทุนย่อย "${escapeHtml(subcategoryName)}" (หมวด "${escapeHtml(categoryName)}")</li>`
              )
              .join("");

            listItems.push(
              `<li><strong>ทุนย่อย</strong><ul class="list-disc list-inside ml-4">${subItems}</ul></li>`
            );
          }

          const duplicatesHtml = `
            พบชื่อซ้ำในปีปลายทางที่เลือก ไม่สามารถคัดลอกได้
            <div class="text-left mt-3">
              <ul class="list-disc list-inside text-sm text-gray-700">
                ${listItems.join("")}
              </ul>
            </div>
            <p class="mt-3 text-sm text-gray-600">กรุณาจัดการชื่อที่ซ้ำในปีปลายทางก่อนทำการคัดลอกอีกครั้ง</p>
          `;

          await Swal.fire({
            icon: 'warning',
            title: 'ไม่สามารถคัดลอกได้',
            html: duplicatesHtml,
            confirmButtonText: 'ตกลง',
          });
          return;
        }
      } catch (error) {
        console.error('Error validating destination year:', error);
        showError('ไม่สามารถตรวจสอบข้อมูลปีปลายทางได้');
        return;
      }
    }

    setLoading(true);
    try {
      const response = await adminAPI.copyFundStructure(sourceYearId, copyOptions);

      const refreshedYears = await adminAPI.getYears();
      const normalizedYears = Array.isArray(refreshedYears)
        ? [...refreshedYears].sort((a, b) => {
            const aYear = Number(a?.year ?? 0);
            const bYear = Number(b?.year ?? 0);
            return bYear - aYear;
          })
        : [];

      setYears(normalizedYears);

      let targetYearObj = null;
      if (mode === 'existing' && normalizedTargetYearId) {
        targetYearObj = normalizedYears.find(
          (year) => year.year_id !== undefined && year.year_id !== null && `${year.year_id}` === normalizedTargetYearId
        );
      }

      if (!targetYearObj && targetYearValue) {
        targetYearObj = normalizedYears.find(
          (year) =>
            year.year !== undefined && year.year !== null && `${year.year}` === `${`${targetYearValue}`.trim()}`
        );
      }

      if (!targetYearObj && response?.target_year_id) {
        targetYearObj = normalizedYears.find(
          (year) => year.year_id !== undefined && year.year_id !== null && `${year.year_id}` === `${response.target_year_id}`
        );
      }

      if (!targetYearObj && response?.target_year_value) {
        targetYearObj = normalizedYears.find(
          (year) => year.year !== undefined && year.year !== null && `${year.year}` === `${response.target_year_value}`
        );
      }

      if (targetYearObj) {
        setSelectedYear(targetYearObj);
      }

      const trimmedTargetYearValue = targetYearValue && `${targetYearValue}`.trim();
      const targetLabel =
        targetYearObj?.year ??
        response?.target_year_value ??
        trimmedTargetYearValue ??
        normalizedTargetYearId ??
        (response?.target_year_id ? `${response.target_year_id}` : null) ??
        'ปลายทางที่เลือก';

      const successText =
        mode === 'existing'
          ? `คัดลอกข้อมูลไปยังปี ${targetLabel} (เพิ่มในปีที่มีอยู่) เรียบร้อยแล้ว`
          : `คัดลอกข้อมูลไปยังปี ${targetLabel} เรียบร้อยแล้ว`;

      showSuccess(successText);
    } catch (error) {
      console.error('Error copying fund structure:', error);
      const message = error?.message || 'ไม่สามารถคัดลอกข้อมูลได้';
      showError(message);
    } finally {
      setLoading(false);
    }
  };


  // ==================== OTHER HANDLERS ====================

  const handleYearChange = (yearValue) => {
    if (!yearValue) {
      setSelectedYear(null);
      setCategories([]);
      setExpandedCategories({});
      setExpandedSubcategories({});
      return;
    }

    const match = years.find((year) => {
      const idMatch =
        year.year_id !== undefined && year.year_id !== null && String(year.year_id) === String(yearValue);
      const yearMatch =
        year.year !== undefined && year.year !== null && String(year.year) === String(yearValue);
      return idMatch || yearMatch;
    });

    if (match) {
      setSelectedYear(match);
    } else {
      setSelectedYear(null);
      setCategories([]);
    }

    // Reset expanded states when changing year
    setExpandedCategories({});
    setExpandedSubcategories({});
  };

  const handleSearchChange = (term) => {
    setSearchTerm(term);
  };

  const handleRefresh = async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    try {
      if (!selectedYear) {
        await loadYears({ preserveSelection: true });
      } else {
        await loadCategories({ silent: true });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // ==================== ERROR BOUNDARY ====================
  
  if (error) {
    return (
      <PageLayout
        title="ตั้งค่าทุน"
        subtitle="จัดการหมวดหมู่ ประเภทย่อย และงบประมาณของทุน"
        icon={Settings}
        breadcrumbs={[
          { label: "หน้าแรก", href: "/admin" },
          { label: "ตั้งค่าทุน" }
        ]}
      >
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center py-12">
            <div className="mb-4">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <Settings size={40} className="text-red-500" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">เกิดข้อผิดพลาด</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                loadYears();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  // ==================== MAIN RENDER ====================

  const fundManagementTabProps = {
    selectedYear,
    years,
    categories,
    searchTerm,
    expandedCategories,
    expandedSubcategories,
    onYearChange: handleYearChange,
    onSearchChange: handleSearchChange,
    onToggleCategory: toggleCategory,
    onToggleSubcategory: toggleSubcategory,
    onAddCategory: handleAddCategory,
    onEditCategory: handleEditCategory,
    onDeleteCategory: handleDeleteCategory,
    onAddSubcategory: handleAddSubcategory,
    onEditSubcategory: handleEditSubcategory,
    onDeleteSubcategory: handleDeleteSubcategory,
    onAddBudget: handleAddBudget,
    onEditBudget: handleEditBudget,
    onDeleteBudget: handleDeleteBudget,
    onToggleCategoryStatus: (category, next) =>
      handleToggleCategoryStatus(category, next, selectedYear),
    onToggleSubcategoryStatus: handleToggleSubcategoryStatus,
    onToggleBudgetStatus: handleToggleBudgetStatus,
    onCopyToNewYear: handleCopyToNewYear,
    onRefresh: handleRefresh,
    isRefreshing,
  };

  const renderActiveContent = () => {
    switch (activeTab) {
      case "funds":
        return (
          <div className="space-y-6">
            <YearManagementTab
              years={years}
              selectedYear={selectedYear}
              // ใช้ currentYearValue ที่เปลี่ยนชื่อแล้ว
              systemCurrentYear={currentYearValue} 
              onSelectYear={(year) =>
                handleYearChange(year?.year_id ?? year?.year ?? null)
              }
              onSaveYear={handleSaveYear}
            />
            <FundManagementTab {...fundManagementTabProps} />
          </div>
        );
      case "project-types":
        return <ProjectTypesManager />;
      case "project-plans":
        return <BudgetPlansManager />;
      case "installments":
        return <InstallmentManagementTab years={years} />;
      case "reward-config":
        return <RewardConfigManager />;
      case "reward-terms":
        return <EndOfContractManager />;
      case "notification-templates":
        return <NotificationTemplateManager />;
      case "system":
        return <SystemConfigSettings />;
      case "announcements":
        return <AnnouncementManager />;
      case "document-types":
        return <DocumentTypeManager />;
      default:
        return null;
    }
  };

  return (
    <PageLayout
      title="ตั้งค่าทุน"
      subtitle="จัดการหมวดหมู่ ประเภทย่อย และงบประมาณของทุน"
      icon={Settings}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/admin" },
        { label: "ตั้งค่าทุน" }
      ]}
      loading={loading}
    >
      {alertChecking ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          กำลังตรวจสอบข้อมูลปีงบประมาณ {currentYearValue || ''}...
        </div>
      ) : null}

      {globalAlerts.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div className="space-y-2">
              <p className="font-semibold text-amber-900">
                การแจ้งเตือนข้อมูลปีงบประมาณ {currentYearValue || ''}
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
                {globalAlerts.map((message, index) => (
                  <li key={`${message}-${index}`}>{message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="flex flex-wrap">
          {TAB_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon size={20} />
                {label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {renderActiveContent()}

      {/* Modals */}
      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleCategorySave}
        editingCategory={editingCategory}
        selectedYear={selectedYear} // เพิ่ม prop นี้
      />

      <SubcategoryModal
        isOpen={subcategoryModalOpen}
        onClose={() => {
          setSubcategoryModalOpen(false);
          setEditingSubcategory(null);
          setSelectedCategoryForSub(null);
        }}
        onSave={handleSubcategorySave}
        editingSubcategory={editingSubcategory}
        selectedCategory={selectedCategoryForSub}
      />

      <BudgetModal
        isOpen={budgetModalOpen}
        onClose={() => {
          setBudgetModalOpen(false);
          setEditingBudget(null);
          setSelectedSubcategoryForBudget(null);
          setSelectedCategoryForSub(null);
        }}
        onSave={handleBudgetSave}
        editingBudget={editingBudget}
        selectedSubcategory={selectedSubcategoryForBudget}
      />
    </PageLayout>
  );
}