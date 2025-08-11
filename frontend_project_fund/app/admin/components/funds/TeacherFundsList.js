// app/teacher/components/funds/TeacherFundsList.js
'use client';

import React, { useState, useEffect } from 'react';
import { teacherAPI, targetRolesUtils } from '@/lib/teacher_api';

const TeacherFundsList = () => {
  const [fundsData, setFundsData] = useState({ categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState('2568');
  const [userRole, setUserRole] = useState(null);

  // Load user role and funds data
  useEffect(() => {
    loadUserRoleAndFunds();
  }, [selectedYear]);

  const loadUserRoleAndFunds = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user role
      const roleInfo = await teacherAPI.getCurrentUserRole();
      setUserRole(roleInfo);

      // Get funds visible to teacher
      const funds = await teacherAPI.getVisibleFundsStructure(selectedYear);
      setFundsData(funds);

    } catch (err) {
      console.error('Error loading funds:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลทุน');
    } finally {
      setLoading(false);
    }
  };

  // Handle year selection change
  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">กำลังโหลดข้อมูลทุน...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600 mr-3">⚠️</div>
          <div>
            <h3 className="text-red-800 font-medium">เกิดข้อผิดพลาด</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button 
          onClick={loadUserRoleAndFunds}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            ทุนที่สามารถยื่นขอได้
          </h1>
          {userRole && (
            <div className="text-sm text-gray-600">
              บทบาท: <span className="font-medium text-blue-600">
                {userRole.is_teacher ? 'อาจารย์' : 
                 userRole.is_staff ? 'เจ้าหน้าที่' : 
                 userRole.is_admin ? 'ผู้ดูแลระบบ' : 'ไม่ระบุ'}
              </span>
            </div>
          )}
        </div>

        {/* Year Selector */}
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700">ปีงงบประมาณ:</label>
          <select 
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="2568">2568</option>
            <option value="2567">2567</option>
            <option value="2566">2566</option>
          </select>
        </div>
      </div>

      {/* Funds Categories */}
      {fundsData.categories.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-yellow-600 text-lg mb-2">📋</div>
          <h3 className="text-yellow-800 font-medium mb-1">ไม่มีทุนที่สามารถยื่นขอได้</h3>
          <p className="text-yellow-600 text-sm">
            ไม่พบทุนที่เปิดให้บทบาทของคุณสามารถยื่นขอได้ในปี {selectedYear}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {fundsData.categories.map((category) => (
            <CategoryCard 
              key={category.category_id} 
              category={category} 
              userRole={userRole}
            />
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          <strong>หมายเหตุ:</strong> ระบบจะแสดงเฉพาะทุนที่เปิดให้บทบาทของคุณสามารถยื่นขอได้เท่านั้น 
          หากต้องการดูทุนประเภทอื่น โปรดติดต่อผู้ดูแลระบบ
        </p>
      </div>
    </div>
  );
};

// Category Card Component
const CategoryCard = ({ category, userRole }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Category Header */}
      <div 
        className="bg-gray-50 px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {category.category_name}
          </h2>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">
              {category.subcategories?.length || 0} ทุนย่อย
            </span>
            <svg 
              className={`w-5 h-5 text-gray-500 transform transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Subcategories */}
      {isExpanded && (
        <div className="divide-y divide-gray-100">
          {category.subcategories?.map((subcategory) => (
            <SubcategoryCard 
              key={subcategory.subcategorie_id} 
              subcategory={subcategory}
              userRole={userRole}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Subcategory Card Component
const SubcategoryCard = ({ subcategory, userRole }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Parse target_roles for display
  const targetRoles = targetRolesUtils.parseTargetRoles(subcategory.target_roles);
  const roleDisplay = targetRolesUtils.formatTargetRolesForDisplay(targetRoles);

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {subcategory.subcategorie_name}
          </h3>
          
          {/* Fund Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
            <div>
              <span className="text-gray-500">งงบที่จัดสรร:</span>
              <div className="font-medium text-green-600">
                {subcategory.allocated_amount?.toLocaleString() || 'ไม่ระบุ'} บาท
              </div>
            </div>
            <div>
              <span className="text-gray-500">งงบคงเหลือ:</span>
              <div className="font-medium text-blue-600">
                {subcategory.remaining_budget?.toLocaleString() || 'ไม่ระบุ'} บาท
              </div>
            </div>
            <div>
              <span className="text-gray-500">สูงสุดต่อทุน:</span>
              <div className="font-medium">
                {subcategory.max_amount_per_grant?.toLocaleString() || 'ไม่จำกัด'} บาท
              </div>
            </div>
            <div>
              <span className="text-gray-500">ทุนคงเหลือ:</span>
              <div className="font-medium">
                {subcategory.remaining_grant !== null ? subcategory.remaining_grant : 'ไม่จำกัด'} ทุน
              </div>
            </div>
          </div>

          {/* Target Roles Info */}
          <div className="mb-3">
            <span className="text-gray-500 text-sm">เปิดให้ยื่นขอ:</span>
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {roleDisplay}
            </span>
          </div>

          {/* Fund Condition */}
          {subcategory.fund_condition && (
            <div className="mb-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {showDetails ? 'ซ่อนเงื่อนไข' : 'ดูเงื่อนไขการขอทุน'}
              </button>
              
              {showDetails && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {subcategory.fund_condition}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="ml-4">
          <button
            onClick={() => handleApplyForFund(subcategory)}
            disabled={subcategory.remaining_budget <= 0 || subcategory.remaining_grant === 0}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              subcategory.remaining_budget <= 0 || subcategory.remaining_grant === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {subcategory.remaining_budget <= 0 ? 'งบหมด' : 
             subcategory.remaining_grant === 0 ? 'ทุนหมด' : 'ยื่นขอทุน'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Handle apply for fund
const handleApplyForFund = (subcategory) => {
  // Navigate to application form or open modal
  console.log('Apply for fund:', subcategory);
  // This would typically use Next.js router to navigate to application form
  // router.push(`/teacher/applications/new?subcategory=${subcategory.subcategorie_id}`);
};

export default TeacherFundsList;