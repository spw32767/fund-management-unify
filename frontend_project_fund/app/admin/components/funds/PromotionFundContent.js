// app/teacher/components/funds/PromotionFundContent.js - ทุนอุดหนุนกิจกรรม (Enhanced UI)
"use client";

import { useState, useEffect, useRef } from "react";
import { TrendingUp, ExternalLink, FileText, Search, Filter, ChevronDown, Eye, Download, X, Info } from "lucide-react";
import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import { teacherAPI } from '../../../lib/teacher_api';
import { targetRolesUtils } from '../../../lib/target_roles_utils';

export default function PromotionFundContent({ onNavigate }) {
  const [selectedYear, setSelectedYear] = useState("2566");
  const [fundCategories, setFundCategories] = useState([]);
  const [filteredFunds, setFilteredFunds] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal state for fund condition
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState({ title: '', content: '' });
  const modalRef = useRef(null); // Create a ref for the modal container

  useEffect(() => {
    if (showConditionModal && modalRef.current) {
      modalRef.current.focus(); // Focus the modal when it opens
    }
  }, [showConditionModal]); // Run when showConditionModal changes

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      loadFundData(selectedYear);
    }
  }, [selectedYear]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, fundCategories]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [roleInfo, yearsData] = await Promise.all([
        targetRolesUtils.getCurrentUserRole(),
        loadAvailableYears()
      ]);

      setUserRole(roleInfo);
      setYears(yearsData);
      await loadFundData(selectedYear);
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableYears = async () => {
    try {
      setYearsLoading(true);
      const response = await fetch('/api/years');
      const data = await response.json();
      
      if (data.success) {
        const yearsData = data.years || data.data || [];
        const validYears = yearsData.filter(year => 
          year && year.year_id && year.year
        );
        return validYears;
      } else {
        throw new Error(data.error || 'Failed to load years');
      }
    } catch (err) {
      console.error('Error loading years:', err);
      return [];
    } finally {
      setYearsLoading(false);
    }
  };

  const loadFundData = async (year) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await teacherAPI.getVisibleFundsStructure(year);
      console.log('Full API Response:', response);
      
      if (!response.categories || !Array.isArray(response.categories)) {
        console.error('No categories found or invalid format');
        setFundCategories([]);
        return;
      }
      
      // กรองเฉพาะทุนอุดหนุนกิจกรรม (จากตาราง fund_categories)
      const promotionFunds = response.categories.filter(category => {
        const categoryName = category.category_name?.toLowerCase() || '';
        // ตามข้อมูลในฐานข้อมูล category_id = 2 คือ 'ทุนอุดหนุนกิจกรรม'
        return categoryName.includes('อุดหนุน') || 
               categoryName.includes('กิจกรรม') ||
               categoryName.includes('ส่งเสริม') ||
               categoryName.includes('promotion') ||
               categoryName.includes('activity') ||
               category.category_id === 2;
      });
      
      console.log('Promotion funds found:', promotionFunds);
      setFundCategories(promotionFunds);
      
    } catch (err) {
      console.error('Error loading fund data:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลทุน');
      setFundCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...fundCategories];

    // Search filter
    if (searchTerm) {
      filtered = filtered.map(category => ({
        ...category,
        subcategories: category.subcategories?.filter(sub => {
          // ตรวจสอบทั้ง subcategorie_name และ subcategory_name
          const subName = sub.subcategorie_name || sub.subcategory_name || '';
          const condition = sub.fund_condition || '';
          return subName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 condition.toLowerCase().includes(searchTerm.toLowerCase());
        }) || []
      })).filter(category => category.subcategories && category.subcategories.length > 0);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.map(category => ({
        ...category,
        subcategories: category.subcategories?.filter(sub => {
          const isAvailable = sub.remaining_budget > 0 && 
                            (sub.remaining_grant === null || sub.remaining_grant === undefined || sub.remaining_grant > 0);
          return statusFilter === "available" ? isAvailable : !isAvailable;
        }) || []
      })).filter(category => category.subcategories && category.subcategories.length > 0);
    }

    setFilteredFunds(filtered);
  };

  const refetch = () => {
    loadFundData(selectedYear);
  };

  const handleViewForm = (subcategory) => {
    // ตรวจสอบว่ามีหน้าฟอร์มออนไลน์หรือไม่
    // ถ้าไม่มีข้อมูล has_online_form ให้ default เป็น false (ดาวน์โหลดฟอร์ม)
    const hasOnlineForm = subcategory.has_online_form === true;
    
    if (hasOnlineForm) {
      // ตรวจสอบว่ามี URL ฟอร์มออนไลน์ภายนอกหรือไม่
      if (subcategory.online_form_url) {
        // เปิดลิงก์ฟอร์มออนไลน์ภายนอกในแท็บใหม่
        window.open(subcategory.online_form_url, '_blank');
      } else if (onNavigate) {
        // นำทางไปหน้าฟอร์มออนไลน์ภายในระบบ
        onNavigate('application-form', subcategory);
      }
    } else {
      // แสดงลิงก์ดาวน์โหลดไฟล์ DOC
      const docUrl = subcategory.form_document_url || '/documents/promotion-fund-form.docx';
      window.open(docUrl, '_blank');
    }
  };

  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return 'ไม่ระบุ';
    return new Intl.NumberFormat('th-TH').format(amount) + ' บาท';
  };

  const showCondition = (fundName, condition) => {
    setSelectedCondition({ title: fundName, content: condition });
    setShowConditionModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center text-red-600">
          <p>เกิดข้อผิดพลาด: {error}</p>
          <button 
            onClick={refetch}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  // Helper function to render a single fund row
  const renderFundRow = (fund, category, isAvailable) => {
    // ตรวจสอบทั้ง subcategorie_name และ subcategory_name
    const fundName = fund.subcategorie_name || fund.subcategory_name || 'ไม่ระบุชื่อทุน';
    const fundId = fund.subcategorie_id || fund.subcategory_id;
    const hasOnlineForm = fund.has_online_form === true;
    const maxAmountPerGrant = fund.max_amount_per_grant || fund.allocated_amount;
    
    return (
      <tr key={fundId} className={!isAvailable ? 'bg-gray-50' : ''}>
        <td className="px-6 py-4 line-clamp-5">
          <div className="text-sm font-medium text-gray-900">
            {fundName}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900">
            {fund.fund_condition ? (
              <div 
                onClick={() => showCondition(fundName, fund.fund_condition)}
                className="line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors duration-200"
                title="คลิกเพื่ออ่านเงื่อนไขทั้งหมด"
              >
                {fund.fund_condition}
              </div>
            ) : (
              <span className="text-gray-400">ไม่ระบุเงื่อนไข</span>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-900">
              งบประมาณ: {formatAmount(fund.allocated_amount)}
            </div>
            <div className="text-xs text-gray-600">
              คงเหลือ: {formatAmount(fund.remaining_budget)}
            </div>
            <div className="text-xs text-gray-600">
              จำนวน: {fund.remaining_grant === null ? 'ไม่จำกัด' : `${fund.remaining_grant || 0}/${fund.max_grants === null ? 'ไม่จำกัด' : fund.max_grants} ทุน`}
            </div>
            {maxAmountPerGrant && (
              <div className="text-xs text-green-600 font-medium">
                สูงสุด/ทุน: {formatAmount(maxAmountPerGrant)}
              </div>
            )}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          {isAvailable ? (
            <button
              onClick={() => handleViewForm(fund)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                hasOnlineForm
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {hasOnlineForm ? (
                <>
                  <Eye size={16} />
                  ยื่นขอออนไลน์
                </>
              ) : (
                <>
                  <Download size={16} />
                  ดาวน์โหลดฟอร์ม
                </>
              )}
            </button>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              ไม่เปิดรับสมัคร
            </span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <PageLayout
      title="ทุนอุดหนุนกิจกรรม"
      subtitle="รายการทุนอุดหนุนกิจกรรมที่เปิดรับสมัคร"
      icon={TrendingUp}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/teacher" },
        { label: "ทุนอุดหนุนกิจกรรม" }
      ]}
    >
      {/* Control Bar */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">ปีงบประมาณ:</label>
            <select 
              className="px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={yearsLoading}
            >
              {yearsLoading ? (
                <option>กำลังโหลด...</option>
              ) : (
                years.map((year) => (
                  <option key={year.year_id} value={year.year}>
                    {year.year}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="ค้นหาทุน..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter size={16} />
              ตัวกรอง
              <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ:</label>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="available">เปิดรับสมัคร</option>
                  <option value="full">เต็มแล้ว</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Funds Table */}
      {filteredFunds.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-500">
            <TrendingUp size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">ไม่พบทุนอุดหนุนกิจกรรม</p>
            <p className="text-sm">
              {fundCategories.length === 0 
                ? "ไม่มีทุนอุดหนุนกิจกรรมในปีงบประมาณนี้" 
                : "ลองปรับตัวกรองใหม่"}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    ชื่อทุน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                    เงื่อนไขทุน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    งบประมาณ / จำนวนทุน
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    แบบฟอร์มขอทุน
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFunds.map((category) => {
                  // ถ้ามี subcategories ให้แสดงแต่ละรายการ
                  if (category.subcategories && category.subcategories.length > 0) {
                    return category.subcategories.map((fund) => {
                      const isAvailable = fund.remaining_budget > 0 && 
                                        (fund.remaining_grant === null || fund.remaining_grant === undefined || fund.remaining_grant > 0);
                      return renderFundRow(fund, category, isAvailable);
                    });
                  } else {
                    // ถ้าไม่มี subcategories แสดงแถวว่างพร้อมข้อความ
                    return (
                      <tr key={category.category_id}>
                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                          ไม่มีทุนย่อยในหมวด {category.category_name}
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Condition Modal */}
      {showConditionModal && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center min-h-screen px-4"
          ref={modalRef} // Add ref to the outer div
          tabIndex={-1} // Make the div focusable
          onKeyDown={(e) => e.key === 'Escape' && setShowConditionModal(false)}
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-500 opacity-75 transition-opacity duration-300 ease-in-out"
            onClick={() => setShowConditionModal(false)}
            aria-hidden="true"
          ></div>

          {/* Modal panel */}
          <div 
            className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all duration-300 ease-in-out max-w-lg w-full sm:my-8"
            role="dialog"
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
          >
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  เงื่อนไขทุน: {selectedCondition.title}
                </h3>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500"
                  onClick={() => setShowConditionModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-700 whitespace-pre-wrap" id="modal-description">
                  {selectedCondition.content}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => setShowConditionModal(false)}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}