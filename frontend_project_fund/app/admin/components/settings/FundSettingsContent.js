// FundSettingsContent.js - Updated Main Component with SweetAlert2
import React, { useState, useEffect } from "react";
import { Settings, Calendar, DollarSign, PencilLine, FileText } from "lucide-react";
import Swal from 'sweetalert2';

// Import separated components
import PageLayout from "@/app/admin/components/common/PageLayout";
import StatusBadge from "@/app/admin/components/settings/StatusBadge";
import YearManagementTab from "@/app/admin/components/settings/years_config/YearManagementTab";
import FundManagementTab from "@/app/admin/components/settings/funds_config/FundManagementTab";
import RewardConfigManager from "@/app/admin/components/settings/reward_config/RewardConfigManager";
import SystemConfigSettings from "@/app/admin/components/settings/system_config/SystemConfigSettings";
import AnnouncementManager from "@/app/admin/components/settings/announcement_config/AnnouncementManager";

// Import modals
import CategoryModal from "@/app/admin/components/settings/funds_config/CategoryModal";
import SubcategoryModal from "@/app/admin/components/settings/funds_config/SubcategoryModal";
import BudgetModal from "@/app/admin/components/settings/funds_config/BudgetModal";
import DeleteConfirmDialog from "@/app/admin/components/settings/funds_config/DeleteConfirmDialog";

// Import real API
import { adminAPI } from "@/app/lib/admin_api";

const TAB_ITEMS = [
  { id: "funds", label: "จัดการทุน", icon: DollarSign },
  { id: "years", label: "จัดการปีงบประมาณ", icon: Calendar },
  { id: "reward-config", label: "จัดการเงินรางวัล", icon: Settings },
  { id: "system", label: "ตั้งค่าระบบ", icon: PencilLine },
  { id: "announcements", label: "ประกาศ/ไฟล์", icon: FileText },
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
  
  // Categories Management
  const [categories, setCategories] = useState([]);
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
  }, [selectedYear]);

  // ==================== DATA LOADING FUNCTIONS ====================
  
  const loadYears = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminAPI.getYears();
      setYears(data);
      if (data.length > 0 && !selectedYear) {
        setSelectedYear(data[0]);
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

  const loadCategories = async () => {
    if (!selectedYear) return;

    setLoading(true);
    setError(null);
    try {
      const data = await adminAPI.getCategoriesWithDetails(selectedYear.year_id);
      const sortedCategories = [...data].sort((a, b) => {
        const orderA = resolveOrder(a, a.category_id || 0);
        const orderB = resolveOrder(b, b.category_id || 0);
        return orderA - orderB;
      });

      const normalizeBudgetRecords = (rawBudgets) => {
        if (!rawBudgets) return [];

        const results = [];
        const seenIds = new Set();
        const seenObjects = typeof WeakSet === 'function' ? new WeakSet() : null;

        const addBudget = (budget, fallbackScope) => {
          if (!budget || typeof budget !== 'object') return;

          if (seenObjects) {
            if (seenObjects.has(budget)) return;
            seenObjects.add(budget);
          }

          const budgetId = budget.subcategory_budget_id ?? budget.budget_id ?? `${fallbackScope || 'unknown'}-${
            budget.level || budget.fund_description || results.length
          }`;
          if (seenIds.has(budgetId)) return;

          seenIds.add(budgetId);
          results.push({
            ...budget,
            record_scope: String(budget.record_scope || fallbackScope || '').toLowerCase(),
          });
        };

        if (Array.isArray(rawBudgets)) {
          rawBudgets.forEach((budget) => addBudget(budget));
          return results;
        }

        const overallCandidates = [
          rawBudgets.overall,
          rawBudgets.overall_budget,
          rawBudgets.overallBudget,
        ];

        overallCandidates.forEach((budget) => addBudget(budget, 'overall'));

        const ruleCandidates = [
          rawBudgets.rules,
          rawBudgets.rule_budgets,
          rawBudgets.ruleBudgets,
        ];

        ruleCandidates.forEach((group) => {
          if (Array.isArray(group)) {
            group.forEach((budget) => addBudget(budget, 'rule'));
          }
        });

        if (results.length === 0) {
          Object.values(rawBudgets).forEach((value) => {
            if (Array.isArray(value)) {
              value.forEach((item) => addBudget(item));
            } else if (value && typeof value === 'object') {
              addBudget(value);
            }
          });
        }

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

            const budgets = normalizeBudgetRecords(subcategory.budgets)
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
      setLoading(false);
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

  const handleDeleteYear = async (year) => {
    const confirmed = await showConfirm(
      'ยืนยันการลบ',
      `คุณต้องการลบปีงบประมาณ ${year.year} ใช่หรือไม่?\n\nการลบปีงบประมาณจะลบข้อมูลทุนทั้งหมดในปีนั้น`,
      'ลบ'
    );
    
    if (!confirmed) return;

    setLoading(true);
    try {
      await adminAPI.deleteYear(year.year_id);
      setYears(prev => prev.filter(y => y.year_id !== year.year_id));
      if (selectedYear?.year_id === year.year_id) {
        setSelectedYear(null);
        setCategories([]);
      }
      showSuccess("ลบปีงบประมาณเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error deleting year:", error);
      showError(`เกิดข้อผิดพลาดในการลบ: ${error.message}`);
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
    // บล็อกลบถ้ามี subcategory อยู่
    const subCount = Array.isArray(category.subcategories) ? category.subcategories.length : 0;
    if (subCount > 0) {
      showWarning(
        `ลบไม่ได้: หมวดหมู่ "${category.category_name}" ยังมีทุนย่อยอยู่ ${subCount} รายการ\nกรุณาลบทุนย่อยทั้งหมดก่อน`
      );
      return;
    }

    const confirmed = await showConfirm(
      'ยืนยันการลบ',
      `คุณต้องการลบหมวดหมู่ "${category.category_name}" ใช่หรือไม่?`,
      'ลบ'
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await adminAPI.deleteCategory(category.category_id);
      setCategories(prev => prev.filter(c => c.category_id !== category.category_id));
      showSuccess("ลบหมวดหมู่เรียบร้อยแล้ว");
    } catch (error) {
      if (/Cannot delete category/i.test(error.message)) {
        showWarning('ลบไม่ได้: หมวดหมู่ยังมีทุนย่อยอยู่ กรุณาลบทุนย่อยทั้งหมดก่อน');
      } else {
        showError(`เกิดข้อผิดพลาดในการลบ: ${error.message}`);
      }
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
      
      console.log('Sending category data:', dataWithYear); // เพิ่ม log เพื่อตรวจสอบ
      
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
        console.log('Create category response:', response); // เพิ่ม log
        
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
    // บล็อกลบทันทีถ้ายังมี budget อยู่
    if (Array.isArray(subcategory.budgets) && subcategory.budgets.length > 0) {
      showWarning(
        `ลบไม่ได้: ทุนย่อย "${subcategory.subcategory_name}" ยังมีงบประมาณอยู่ ${subcategory.budgets.length} รายการ\nกรุณาลบงบประมาณทั้งหมดก่อน`
      );
      return;
    }

    const confirmed = await showConfirm(
      'ยืนยันการลบ',
      `คุณต้องการลบทุนย่อย "${subcategory.subcategory_name}" ใช่หรือไม่?`,
      'ลบ'
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await adminAPI.deleteSubcategory(subcategory.subcategory_id);
      setCategories(prev => prev.map(cat => ({
        ...cat,
        subcategories: cat.subcategories.filter(sub => sub.subcategory_id !== subcategory.subcategory_id)
      })));
      showSuccess("ลบทุนย่อยเรียบร้อยแล้ว");
    } catch (error) {
      // map error เฉพาะให้เป็นข้อความที่เข้าใจง่าย
      if (/Cannot delete subcategory/i.test(error.message)) {
        showWarning('ลบไม่ได้: ทุนย่อยนี้ยังมีงบประมาณอยู่ กรุณาลบงบประมาณทั้งหมดก่อน');
      } else {
        showError(`เกิดข้อผิดพลาดในการลบ: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };


  const handleSubcategorySave = async (subcategoryData) => {
    setLoading(true);
    try {
      // Validate data - ไม่ต้องบังคับ allocated_amount
      const dataWithCategory = { 
        ...subcategoryData, 
        category_id: selectedCategoryForSub.category_id 
      };
      
      // ไม่ต้อง validate allocated_amount
      if (!dataWithCategory.subcategory_name) {
        throw new Error('กรุณากรอกชื่อทุนย่อย');
      }
      
      if (editingSubcategory) {
        // Update existing subcategory - ไม่ส่ง allocated_amount
        const updateData = {
          subcategory_name: subcategoryData.subcategory_name,
          fund_condition: subcategoryData.fund_condition || '',
          target_roles: subcategoryData.target_roles || [],
          status: editingSubcategory.status || 'active'
        };
        
        await adminAPI.updateSubcategory(editingSubcategory.subcategory_id, updateData);
        
        // อัพเดท state
        setCategories(prev => prev.map(cat => {
          if (cat.category_id === selectedCategoryForSub.category_id) {
            return {
              ...cat,
              subcategories: cat.subcategories.map(sub => 
                sub.subcategory_id === editingSubcategory.subcategory_id
                  ? { ...sub, ...updateData, update_at: new Date().toISOString() }
                  : sub
              )
            };
          }
          return cat;
        }));
        
        showSuccess("อัปเดตทุนย่อยเรียบร้อยแล้ว");
        
      } else {
        // Add new subcategory - ไม่ส่ง allocated_amount
        const createData = {
          category_id: selectedCategoryForSub.category_id,
          subcategory_name: subcategoryData.subcategory_name,
          fund_condition: subcategoryData.fund_condition || '',
          target_roles: subcategoryData.target_roles || [],
          status: 'active'
        };
        
        const response = await adminAPI.createSubcategory(createData);
        
        if (response.subcategory) {
          const newSubcategory = {
            ...response.subcategory,
            target_roles: subcategoryData.target_roles || [],
            budgets: [] // เริ่มต้นด้วย budget ว่าง
          };
          
          setCategories(prev => prev.map(cat => 
            cat.category_id === selectedCategoryForSub.category_id
              ? { ...cat, subcategories: [...(cat.subcategories || []), newSubcategory] }
              : cat
          ));
          
          showSuccess("สร้างทุนย่อยเรียบร้อยแล้ว กรุณาเพิ่มงบประมาณเพื่อกำหนดจำนวนเงิน");
        }
      }
      
      setSubcategoryModalOpen(false);
      setEditingSubcategory(null);
      setSelectedCategoryForSub(null);
      
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
      `คุณต้องการลบงบประมาณ "${budget.fund_description || 'งบประมาณ ' + budget.allocated_amount?.toLocaleString() + ' บาท'}" ใช่หรือไม่?`,
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
      showSuccess("ลบงบประมาณเรียบร้อยแล้ว");
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
      payload.allocated_amount = allocated ?? 0;
      payload.max_amount_per_year = toFloat(budgetFormValues.max_amount_per_year);
      payload.max_grants = toInt(budgetFormValues.max_grants);
      payload.max_amount_per_grant = toFloat(budgetFormValues.max_amount_per_grant);
    } else {
      payload.allocated_amount = 0;
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
      showSuccess(editingBudget ? "อัปเดตนโยบายงบประมาณเรียบร้อยแล้ว" : "สร้างนโยบายงบประมาณใหม่เรียบร้อยแล้ว");
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


  const handleCopyToNewYear = async (currentYear, destinationYear) => {
    const sourceYearId = currentYear?.year_id || currentYear;
    if (!sourceYearId || !destinationYear) {
      showError('ข้อมูลปีไม่ครบถ้วน ไม่สามารถคัดลอกได้');
      return;
    }

    setLoading(true);
    try {
      const parsedBudget = Number(currentYear?.budget);
      await adminAPI.copyFundStructure(sourceYearId, destinationYear, {
        target_budget: Number.isFinite(parsedBudget) ? parsedBudget : 0,
      });

      const refreshedYears = await adminAPI.getYears();
      setYears(refreshedYears);

      const targetYearObj = refreshedYears.find(year => `${year.year}` === `${destinationYear}`);
      if (targetYearObj) {
        setSelectedYear(targetYearObj);
      }

      showSuccess(`คัดลอกข้อมูลไปยังปี ${destinationYear} เรียบร้อยแล้ว`);
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

  // Filter categories based on search term
  const normalizedSearch = (searchTerm || "").toLowerCase().trim();
  const filteredCategories = categories.filter((category) => {
    const categoryName = (category?.category_name || "").toLowerCase();
    const categoryMatch = normalizedSearch ? categoryName.includes(normalizedSearch) : true;

    if (!normalizedSearch) {
      return true;
    }

    const subcategories = Array.isArray(category?.subcategories) ? category.subcategories : [];

    const subcategoryMatch = subcategories.some((sub) => {
      const subName = (sub?.subcategory_name || "").toLowerCase();
      const condition = (sub?.fund_condition || "").toLowerCase();

      if (subName.includes(normalizedSearch) || condition.includes(normalizedSearch)) {
        return true;
      }

      const budgets = Array.isArray(sub?.budgets) ? sub.budgets : [];
      return budgets.some((budget) => {
        const description = (budget?.fund_description || "").toLowerCase();
        const level = (budget?.level || "").toLowerCase();
        const scope = String(budget?.record_scope || "").toLowerCase();
        return (
          description.includes(normalizedSearch) ||
          level.includes(normalizedSearch) ||
          scope.includes(normalizedSearch)
        );
      });
    });

    return categoryMatch || subcategoryMatch;
  });

  // ==================== ERROR BOUNDARY ====================
  
  if (error) {
    return (
      <PageLayout
        title="การจัดการทุน"
        subtitle="จัดการหมวดหมู่ ประเภทย่อย และงบประมาณของทุน"
        icon={Settings}
        breadcrumbs={[
          { label: "หน้าแรก", href: "/admin" },
          { label: "การจัดการทุน" }
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
    categories: filteredCategories,
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
  };

  const renderActiveContent = () => {
    switch (activeTab) {
      case "funds":
        return <FundManagementTab {...fundManagementTabProps} />;
      case "years":
        return (
          <YearManagementTab
            years={years}
            onSaveYear={handleSaveYear}
            onDeleteYear={handleDeleteYear}
          />
        );
      case "reward-config":
        return <RewardConfigManager />;
      case "system":
        return <SystemConfigSettings />;
      case "announcements":
        return <AnnouncementManager />;
      default:
        return null;
    }
  };

  return (
    <PageLayout
      title="การจัดการทุน"
      subtitle="จัดการหมวดหมู่ ประเภทย่อย และงบประมาณของทุน"
      icon={Settings}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/admin" },
        { label: "การจัดการทุน" }
      ]}
      loading={loading}
    >
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