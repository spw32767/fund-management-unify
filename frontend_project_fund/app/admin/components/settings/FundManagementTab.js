// components/FundManagementTab.js
import React from "react";
import { 
  Search, Plus, ChevronDown, ChevronRight, Edit, Trash2, DollarSign 
} from "lucide-react";
import { targetRolesUtils } from '../../../lib/target_roles_utils';

// StatusBadge Component
const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    status === 'active' 
      ? 'bg-green-100 text-green-800 border border-green-200' 
      : 'bg-red-100 text-red-800 border border-red-200'
  }`}>
    {status === 'active' ? (
      <>
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
        เปิดใช้งาน
      </>
    ) : (
      <>
        <div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-1"></div>
        ปิดใช้งาน
      </>
    )}
  </span>
);

const FundManagementTab = ({ 
  selectedYear,
  years,
  categories,
  searchTerm,
  expandedCategories,
  expandedSubcategories,
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
  onDeleteBudget
}) => {
  // State for bulk operations
  const [bulkMode, setBulkMode] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState({
    categories: [],
    subcategories: [],
    budgets: []
  });

  // Toggle bulk mode
  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    if (bulkMode) {
      // Clear selections when exiting bulk mode
      setSelectedItems({ categories: [], subcategories: [], budgets: [] });
    }
  };

  // Handle item selection with hierarchical logic
  const handleItemSelect = (type, id, checked, item = null) => {
    setSelectedItems(prev => {
      const newSelected = { ...prev };
      
      if (type === 'categories') {
        // Category selection
        if (checked) {
          newSelected.categories = [...prev.categories, id];
          // Auto-select all subcategories and budgets in this category
          const category = categories.find(c => c.category_id === id);
          if (category?.subcategories) {
            const subcategoryIds = category.subcategories.map(s => s.subcategory_id);
            const budgetIds = category.subcategories.flatMap(s => 
              s.budgets?.map(b => b.subcategory_budget_id) || []
            );
            newSelected.subcategories = [...new Set([...prev.subcategories, ...subcategoryIds])];
            newSelected.budgets = [...new Set([...prev.budgets, ...budgetIds])];
          }
        } else {
          newSelected.categories = prev.categories.filter(item => item !== id);
          // Auto-deselect all subcategories and budgets in this category
          const category = categories.find(c => c.category_id === id);
          if (category?.subcategories) {
            const subcategoryIds = category.subcategories.map(s => s.subcategory_id);
            const budgetIds = category.subcategories.flatMap(s => 
              s.budgets?.map(b => b.subcategory_budget_id) || []
            );
            newSelected.subcategories = prev.subcategories.filter(sid => !subcategoryIds.includes(sid));
            newSelected.budgets = prev.budgets.filter(bid => !budgetIds.includes(bid));
          }
        }
      } else if (type === 'subcategories') {
        // Subcategory selection
        if (checked) {
          newSelected.subcategories = [...prev.subcategories, id];
          // Auto-select all budgets in this subcategory
          if (item?.budgets) {
            const budgetIds = item.budgets.map(b => b.subcategory_budget_id);
            newSelected.budgets = [...new Set([...prev.budgets, ...budgetIds])];
          }
        } else {
          newSelected.subcategories = prev.subcategories.filter(item => item !== id);
          // Auto-deselect all budgets in this subcategory
          if (item?.budgets) {
            const budgetIds = item.budgets.map(b => b.subcategory_budget_id);
            newSelected.budgets = prev.budgets.filter(bid => !budgetIds.includes(bid));
          }
          // Also deselect parent category if it was selected
          const parentCategory = categories.find(c => 
            c.subcategories?.some(s => s.subcategory_id === id)
          );
          if (parentCategory) {
            newSelected.categories = prev.categories.filter(cid => cid !== parentCategory.category_id);
          }
        }
      } else if (type === 'budgets') {
        // Budget selection
        if (checked) {
          newSelected.budgets = [...prev.budgets, id];
        } else {
          newSelected.budgets = prev.budgets.filter(item => item !== id);
          // Also deselect parent subcategory and category if they were selected
          const parentSubcategory = categories.flatMap(c => c.subcategories || [])
            .find(s => s.budgets?.some(b => b.subcategory_budget_id === id));
          if (parentSubcategory) {
            newSelected.subcategories = prev.subcategories.filter(sid => sid !== parentSubcategory.subcategory_id);
            const parentCategory = categories.find(c => 
              c.subcategories?.some(s => s.subcategory_id === parentSubcategory.subcategory_id)
            );
            if (parentCategory) {
              newSelected.categories = prev.categories.filter(cid => cid !== parentCategory.category_id);
            }
          }
        }
      }
      
      return newSelected;
    });
  };

  // Select all items of a type
  const handleSelectAll = (type, items) => {
    const allIds = items.map(item => 
      type === 'subcategories' ? item.subcategory_id : item.subcategory_budget_id
    );
    setSelectedItems(prev => ({
      ...prev,
      [type]: prev[type].length === allIds.length ? [] : allIds
    }));
  };
  return (
    <div className="space-y-6">
      {/* Controls Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1">
            {/* Year Selector */}
            <select
              value={selectedYear?.year_id || ""}
              onChange={(e) => onYearChange(e.target.value)}
              className="text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {years.map(year => (
                <option className= "text-gray-600" key={year.year_id} value={year.year_id}>
                  ปีงบประมาณ {year.year}
                </option>
              ))}
            </select>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-600" size={20} />
              <input
                type="text"
                placeholder="ค้นหาทุน..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="text-gray-600 pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Add Category Button and Bulk Mode Toggle */}
          <div className="flex items-center gap-2">
            {(categories.length > 0 && selectedYear) && (
              <button
                onClick={toggleBulkMode}
                className={`px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                  bulkMode 
                    ? 'bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {bulkMode ? '✓' : '☐'} เลือกหลายรายการ
              </button>
            )}
            
            <button
              onClick={onAddCategory}
              disabled={!selectedYear}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <Plus size={16} />
              เพิ่มหมวดหมู่
            </button>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-lg shadow-sm">
        {/* Bulk Actions Panel */}
        {bulkMode && (selectedItems.categories.length > 0 || selectedItems.subcategories.length > 0 || selectedItems.budgets.length > 0) && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900">
                  เลือกแล้ว: {selectedItems.categories.length} หมวดหมู่, {selectedItems.subcategories.length} ทุนย่อย, {selectedItems.budgets.length} งบประมาณ
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Handle bulk status change
                    console.log('Bulk toggle status:', selectedItems);
                  }}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition-colors"
                >
                  เปลี่ยนสถานะ
                </button>
                <button
                  onClick={() => {
                    // Handle bulk delete
                    console.log('Bulk delete:', selectedItems);
                  }}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                >
                  ลบที่เลือก
                </button>
                <button
                  onClick={() => setSelectedItems({ categories: [], subcategories: [], budgets: [] })}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                >
                  ยกเลิกเลือก
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          {!selectedYear ? (
            <div className="text-center py-12">
              <div className="mb-4">
                <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                  <DollarSign size={40} className="text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">เลือกปีงบประมาณ</h3>
              <p className="text-gray-500">กรุณาเลือกปีงบประมาณเพื่อจัดการข้อมูลทุน</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4">
                <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                  <DollarSign size={40} className="text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีข้อมูลหมวดหมู่</h3>
              <p className="text-gray-500 mb-4">เริ่มต้นโดยการเพิ่มหมวดหมู่ใหม่สำหรับปี {selectedYear.year}</p>
              <button
                onClick={onAddCategory}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                เพิ่มหมวดหมู่แรก
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map(category => (
                <div key={category.category_id} className={`border border-gray-200 rounded-lg overflow-hidden ${bulkMode && selectedItems.categories.includes(category.category_id) ? 'bg-blue-50' : ''}`}>
                  {/* Category Header */}
                  <div className="p-4 bg-gray-50 flex justify-between items-center hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      {bulkMode && (
                        <input
                          type="checkbox"
                          checked={selectedItems.categories.includes(category.category_id)}
                          onChange={(e) => {
                            handleItemSelect('categories', category.category_id, e.target.checked, category);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      
                      <div 
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => onToggleCategory(category.category_id)}
                      >
                        {expandedCategories[category.category_id] ? 
                          <ChevronDown size={20} className="text-gray-500" /> : 
                          <ChevronRight size={20} className="text-gray-500" />
                        }
                        <h3 className="font-semibold text-lg text-gray-900">{category.category_name}</h3>
                        <span className="text-sm text-gray-500">
                          ({category.subcategories?.length || 0} ทุนย่อย)
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={category.status} />
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEditCategory(category)}
                          className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                          title="แก้ไขหมวดหมู่"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => onDeleteCategory(category)}
                          className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="ลบหมวดหมู่"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => onAddSubcategory(category)}
                          className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors"
                          title="เพิ่มทุนย่อย"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subcategories */}
                  {expandedCategories[category.category_id] && (
                    <div className="border-t border-gray-200">
                      {category.subcategories && category.subcategories.length > 0 ? (
                        category.subcategories.map(subcategory => (
                          <SubcategoryRow
                            key={subcategory.subcategory_id}
                            subcategory={subcategory}
                            isExpanded={expandedSubcategories[subcategory.subcategory_id]}
                            onToggle={() => onToggleSubcategory(subcategory.subcategory_id)}
                            onEdit={() => onEditSubcategory(subcategory, category)}
                            onDelete={() => onDeleteSubcategory(subcategory)}
                            onAddBudget={() => onAddBudget(subcategory, category)}
                            onEditBudget={onEditBudget}
                            onDeleteBudget={onDeleteBudget}
                            bulkMode={bulkMode}
                            selectedItems={selectedItems}
                            onItemSelect={handleItemSelect}
                            category={category}
                          />
                        ))
                      ) : (
                        <div className="p-4 pl-12 text-gray-500 text-center">
                          ยังไม่มีทุนย่อยในหมวดหมู่นี้
                          <button
                            onClick={() => onAddSubcategory(category)}
                            className="ml-2 text-blue-600 hover:text-blue-700 underline"
                          >
                            เพิ่มทุนย่อยแรก
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Subcategory Row Component
const SubcategoryRow = ({ 
  subcategory, 
  isExpanded, 
  onToggle, 
  onEdit, 
  onDelete, 
  onAddBudget,
  onEditBudget,
  onDeleteBudget,
  bulkMode,
  selectedItems,
  onItemSelect,
  category
}) => {
  const isSelected = selectedItems.subcategories.includes(subcategory.subcategory_id);

  return (
    <div className={`border-b border-gray-100 last:border-0 ${bulkMode && isSelected ? 'bg-blue-50' : ''}`}>
      {/* Subcategory Header */}
      <div className="p-4 pl-12 flex justify-between items-center hover:bg-blue-50/50 transition-colors">
        <div className="flex items-center gap-3 flex-1">
          {bulkMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                onItemSelect('subcategories', subcategory.subcategory_id, e.target.checked, subcategory);
              }}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          
          <div 
            className="flex items-center gap-3 cursor-pointer flex-1"
            onClick={onToggle}
          >
            {isExpanded ?
              <ChevronDown size={16} className="text-gray-500" /> : 
              <ChevronRight size={16} className="text-gray-500" />
            }
            <span className="font-medium text-gray-800">{subcategory.subcategory_name}</span>
            
            {/* Target Roles */}
            <div className="flex gap-2">
              {(() => {
                const targetRolesArray = targetRolesUtils.parseTargetRoles(subcategory.target_roles);
                
                // กรณีที่มีแค่ role "3" (Admin) = เฉพาะ Admin เห็น = ไม่แสดง badge
                if (!targetRolesArray || targetRolesArray.length === 0 || 
                    (targetRolesArray.length === 1 && targetRolesArray.includes("3"))) {
                  return null; // ไม่แสดง badge ใดๆ
                }
                
                // แสดง badge สำหรับ role อื่นๆ (ไม่รวม Admin)
                return (
                  <>
                    {targetRolesArray.includes("1") && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">อาจารย์</span>
                    )}
                    {targetRolesArray.includes("2") && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">เจ้าหน้าที่</span>
                    )}
                    
                    {/* ถ้าไม่มี role 1 หรือ 2 เลย และมีแค่ role 3 จะ return null ด้านบนแล้ว */}
                    {/* ถ้ามี role อื่นๆ นอกจาก 1,2,3 ให้แสดงเป็น "บทบาทอื่นๆ" */}
                    {targetRolesArray.some(role => !["1", "2", "3"].includes(role)) && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">บทบาทอื่นๆ</span>
                    )}
                  </>
                );
              })()}
            </div>
            
            {/* แสดงงบประมาณรวม - ใช้ค่าจาก budget ตัวแรก (เพราะทุกตัวใน subcategory เดียวกันมีค่าเท่ากัน) */}
            {subcategory.budgets && subcategory.budgets.length > 0 && (
              <div className="flex items-center gap-3 ml-auto mr-4 text-sm">
                <span className="text-gray-600">
                  งบประมาณทั้งหมด: <span className="font-medium text-green-600">
                    {parseFloat(subcategory.budgets[0].allocated_amount || 0).toLocaleString()} บาท
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={subcategory.status} />
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
              title="แก้ไขทุนย่อย"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={onDelete}
              className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
              title="ลบทุนย่อย"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={onAddBudget}
              className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors"
              title="เพิ่มงบประมาณ"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Budgets */}
      {isExpanded && subcategory.budgets && (
        <div className="bg-gray-50">
          {subcategory.budgets.length > 0 ? (
            subcategory.budgets.map(budget => (
              <BudgetRow
                key={budget.subcategory_budget_id}
                budget={budget}
                onEdit={() => onEditBudget(budget, subcategory)}
                onDelete={() => onDeleteBudget(budget)}
                bulkMode={bulkMode}
                selectedItems={selectedItems}
                onItemSelect={onItemSelect}
              />
            ))
          ) : (
            <div className="p-4 pl-20 text-gray-500 text-center">
              ยังไม่มีงบประมาณสำหรับทุนย่อยนี้
              <button
                onClick={onAddBudget}
                className="ml-2 text-blue-600 hover:text-blue-700 underline"
              >
                เพิ่มงบประมาณแรก
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Budget Row Component
const BudgetRow = ({ 
  budget, 
  onEdit, 
  onDelete, 
  bulkMode, 
  selectedItems, 
  onItemSelect 
}) => {
  const isSelected = selectedItems.budgets.includes(budget.subcategory_budget_id);

  return (
    <div className={`p-4 pl-20 border-t border-gray-200 first:border-0 ${bulkMode && isSelected ? 'bg-blue-50' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          {bulkMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onItemSelect('budgets', budget.subcategory_budget_id, e.target.checked, budget)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-green-600" />
              <span className="font-medium text-gray-800">
                {budget.fund_description || `ระดับ${budget.level || 'ทั่วไป'}`}
              </span>
            </div>
            <div className="text-sm text-gray-600 space-y-1 ml-6">
              <p>วงเงินต่อทุน: {budget.max_amount_per_grant?.toLocaleString()} บาท</p>
              <p>จำนวนทุน: {
                budget.max_grants === null || budget.max_grants === 0 ? (
                  <span className="text-green-600 font-medium">ไม่จำกัดทุน</span>
                ) : (
                  `${budget.remaining_grant || 0} / ${budget.max_grants}`
                )
              }</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <StatusBadge status={budget.status} />
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
              title="แก้ไขงบประมาณ"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={onDelete}
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
};

export default FundManagementTab;