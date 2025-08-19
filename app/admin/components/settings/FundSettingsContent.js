// FundSettingsContent.js - Updated Main Component with SweetAlert2
import React, { useState, useEffect } from "react";
import { Settings, Calendar, DollarSign } from "lucide-react";
import Swal from 'sweetalert2';

// Import separated components
import PageLayout from "../common/PageLayout";
import StatusBadge from "./StatusBadge";
import YearManagementTab from "./YearManagementTab";
import FundManagementTab from "./FundManagementTab";
import RewardConfigManager from "./RewardConfigManager";

// Import modals
import CategoryModal from "./CategoryModal";
import SubcategoryModal from "./SubcategoryModal";
import BudgetModal from "./BudgetModal";
import DeleteConfirmDialog from "./DeleteConfirmDialog";

// Import real API
import { adminAPI } from "../../../lib/admin_api";

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

  const loadCategories = async () => {
    if (!selectedYear) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await adminAPI.getCategoriesWithDetails(selectedYear.year_id);
      setCategories(data);
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

  const handleBudgetSave = async (budgetData) => {
    setLoading(true);
    try {
      // Validate data
      const dataWithSubcategory = { 
        ...budgetData, 
        subcategory_id: selectedSubcategoryForBudget.subcategory_id 
      };
      adminAPI.validateBudgetData(dataWithSubcategory);
      
      if (editingBudget) {
        // Update existing budget
        await adminAPI.updateBudget(editingBudget.subcategory_budget_id, budgetData);
        setCategories(prev => prev.map(cat => ({
          ...cat,
          subcategories: cat.subcategories.map(sub => {
            if (sub.subcategory_id === selectedSubcategoryForBudget.subcategory_id) {
              return {
                ...sub,
                budgets: sub.budgets.map(budget => 
                  budget.subcategory_budget_id === editingBudget.subcategory_budget_id
                    ? { 
                        ...budget, 
                        ...budgetData,
                        remaining_budget: budgetData.allocated_amount - (budget.used_amount || 0),
                        remaining_grant: budgetData.max_grants - (budget.max_grants - (budget.remaining_grant || 0)),
                        update_at: new Date().toISOString()
                      }
                    : budget
                )
              };
            }
            return sub;
          })
        })));
      } else {
        // Add new budget
        const response = await adminAPI.createBudget(dataWithSubcategory);
        console.log('Create budget response:', response); // Debug log

        // ตรวจสอบ response structure ให้ถูกต้อง
        const budgetId = response.subcategory_budget_id || response.data?.subcategory_budget_id;
        if (budgetId) {
          const newBudget = {
            subcategory_budget_id: budgetId,
            ...budgetData,
            remaining_budget: budgetData.allocated_amount,
            used_amount: 0,
            remaining_grant: budgetData.max_grants,
            create_at: new Date().toISOString(),
            update_at: new Date().toISOString()
          };
          setCategories(prev => prev.map(cat => ({
            ...cat,
            subcategories: cat.subcategories.map(sub => 
              sub.subcategory_id === selectedSubcategoryForBudget.subcategory_id
                ? { ...sub, budgets: [...(sub.budgets || []), newBudget] }
                : sub
            )
          })));
        }
      }
      
      setBudgetModalOpen(false);
      setEditingBudget(null);
      setSelectedSubcategoryForBudget(null);
      setSelectedCategoryForSub(null);
      showSuccess(editingBudget ? "อัปเดตงบประมาณเรียบร้อยแล้ว" : "สร้างงบประมาณใหม่เรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error saving budget:", error);
      showError(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBudgetStatus = async (budget, subcategory, category, nextActive) => {
    // nextActive: boolean -> เราอัปเดต state เองแบบ optimistic
    const newStatus = nextActive ? "active" : "inactive";

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


  // ==================== OTHER HANDLERS ====================
  
  const handleYearChange = (yearId) => {
    const year = years.find(y => y.year_id === parseInt(yearId));
    setSelectedYear(year);
    // Reset expanded states when changing year
    setExpandedCategories({});
    setExpandedSubcategories({});
  };

  const handleSearchChange = (term) => {
    setSearchTerm(term);
  };

  // Filter categories based on search term
  const filteredCategories = categories.filter(category => {
    const categoryMatch = category.category_name.toLowerCase().includes(searchTerm.toLowerCase());
    const subcategoryMatch = category.subcategories?.some(sub => 
      sub.subcategory_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.fund_condition?.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
        <div className="flex">
          <button
            onClick={() => setActiveTab("funds")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "funds"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <DollarSign size={20} />
              จัดการทุน
            </div>
          </button>
          <button
            onClick={() => setActiveTab("years")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "years"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar size={20} />
              จัดการปีงบประมาณ
            </div>
          </button>
          <button
            onClick={() => setActiveTab('reward-config')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'reward-config'
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings size={20} />
                จัดการเงินรางวัล
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "funds" && (
        <FundManagementTab
          selectedYear={selectedYear}
          years={years}
          categories={filteredCategories}
          searchTerm={searchTerm}
          expandedCategories={expandedCategories}
          expandedSubcategories={expandedSubcategories}
          onYearChange={handleYearChange}
          onSearchChange={handleSearchChange}
          onToggleCategory={toggleCategory}
          onToggleSubcategory={toggleSubcategory}
          onAddCategory={handleAddCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
          onAddSubcategory={handleAddSubcategory}
          onEditSubcategory={handleEditSubcategory}
          onDeleteSubcategory={handleDeleteSubcategory}
          onAddBudget={handleAddBudget}
          onEditBudget={handleEditBudget}
          onDeleteBudget={handleDeleteBudget}
          onToggleCategoryStatus={(category, next) =>
            handleToggleCategoryStatus(category, next, selectedYear)
          }
          onToggleSubcategoryStatus={handleToggleSubcategoryStatus}
          onToggleBudgetStatus={handleToggleBudgetStatus}
          />
      )}
      
      {activeTab === "years" && (
        <YearManagementTab
          years={years}
          onSaveYear={handleSaveYear}
          onDeleteYear={handleDeleteYear}
        />
      )}

      {activeTab === 'reward-config' && (
        <RewardConfigManager />
      )}

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