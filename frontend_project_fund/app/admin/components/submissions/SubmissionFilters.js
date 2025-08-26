// app/admin/components/submissions/SubmissionFilters.js
'use client';

import { useState, useEffect } from 'react';
import { adminAPI } from '../../../lib/admin_api';

export default function SubmissionFilters({ filters, onFilterChange, onSearch }) {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [applicationStatuses, setApplicationStatuses] = useState([]);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [loading, setLoading] = useState({
    categories: false,
    subcategories: false,
    statuses: false
  });
  
  // Fetch initial data when component mounts
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (filters.category) {
      fetchSubcategories(filters.category);
    } else {
      setSubcategories([]);
    }
  }, [filters.category]);

  // Fetch all initial data
  const fetchInitialData = async () => {
    await Promise.all([
      fetchCategories(),
      fetchApplicationStatuses()
    ]);
  };

  // Fetch categories from database (Admin endpoint - no role filtering)
  const fetchCategories = async () => {
    setLoading(prev => ({ ...prev, categories: true }));
    try {
      const response = await adminAPI.getCategoriesForAdmin();
      console.log('Categories response (admin):', response);
      
      if (response && Array.isArray(response.categories)) {
        setCategories(response.categories);
      } else if (response && Array.isArray(response)) {
        setCategories(response);
      } else {
        console.warn('Unexpected categories response format:', response);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to empty array if API fails
      setCategories([]);
    } finally {
      setLoading(prev => ({ ...prev, categories: false }));
    }
  };

  // Fetch subcategories by category ID (Admin endpoint - no role filtering)
  const fetchSubcategories = async (categoryId) => {
    setLoading(prev => ({ ...prev, subcategories: true }));
    try {
      const response = await adminAPI.getSubcategoriesForAdmin(categoryId);
      console.log('Subcategories response (admin):', response);
      
      if (response && Array.isArray(response.subcategories)) {
        setSubcategories(response.subcategories);
      } else if (response && Array.isArray(response)) {
        setSubcategories(response);
      } else {
        console.warn('Unexpected subcategories response format:', response);
        setSubcategories([]);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      // Fallback to empty array if API fails
      setSubcategories([]);
    } finally {
      setLoading(prev => ({ ...prev, subcategories: false }));
    }
  };

  // Fetch application statuses from database
  const fetchApplicationStatuses = async () => {
    setLoading(prev => ({ ...prev, statuses: true }));
    try {
      const response = await adminAPI.getApplicationStatuses();
      console.log('Application statuses response:', response);
      
      if (response && Array.isArray(response.statuses)) {
        setApplicationStatuses(response.statuses);
      } else if (response && Array.isArray(response)) {
        setApplicationStatuses(response);
      } else {
        console.warn('Unexpected application statuses response format:', response);
        setApplicationStatuses([]);
      }
    } catch (error) {
      console.error('Error fetching application statuses:', error);
      // Fallback data from your database structure
      setApplicationStatuses([
        { application_status_id: 1, status_code: '0', status_name: 'รอพิจารณา' },
        { application_status_id: 2, status_code: '1', status_name: 'อนุมัติ' },
        { application_status_id: 3, status_code: '2', status_name: 'ปฏิเสธ' },
        { application_status_id: 4, status_code: '3', status_name: 'ต้องการข้อมูลเพิ่มเติม' },
        { application_status_id: 5, status_code: '4', status_name: 'ร่าง' }
      ]);
    } finally {
      setLoading(prev => ({ ...prev, statuses: false }));
    }
  };

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  // Handle filter change
  const handleChange = (field, value) => {
    // If changing category, reset subcategory
    if (field === 'category') {
      onFilterChange({ [field]: value, subcategory: '' });
    } else {
      onFilterChange({ [field]: value });
    }
  };

  // Get display name for selected values
  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.category_id.toString() === categoryId);
    return category?.category_name || categoryId;
  };

  const getSubcategoryName = (subcategoryId) => {
    const subcategory = subcategories.find(s => s.subcategory_id.toString() === subcategoryId);
    return subcategory?.subcategory_name || subcategoryId;
  };

  const getStatusName = (statusCode) => {
    const status = applicationStatuses.find(s => s.status_code === statusCode);
    return status?.status_name || statusCode;
  };

  return (
    <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50">
      {/* Main Filters Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
        {/* Category (หมวดทุน - ทุนหลัก) */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            หมวดทุน (ทุนหลัก)
          </label>
          <select
            id="category"
            name="category"
            value={filters.category || ''}
            onChange={(e) => handleChange('category', e.target.value)}
            disabled={loading.categories}
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">
              {loading.categories ? 'กำลังโหลด...' : 'ทั้งหมด'}
            </option>
            {categories.map((category) => (
              <option key={category.category_id} value={category.category_id}>
                {category.category_name}
              </option>
            ))}
          </select>
        </div>

        {/* Subcategory (ประเภททุน - ทุนย่อย) */}
        <div>
          <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-1">
            ประเภททุน (ทุนย่อย)
          </label>
          <select
            id="subcategory"
            name="subcategory"
            value={filters.subcategory || ''}
            onChange={(e) => handleChange('subcategory', e.target.value)}
            disabled={!filters.category || loading.subcategories}
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">
              {!filters.category 
                ? 'เลือกหมวดทุนก่อน' 
                : loading.subcategories 
                ? 'กำลังโหลด...' 
                : 'ทั้งหมด'
              }
            </option>
            {subcategories.map((subcategory) => (
              <option key={subcategory.subcategory_id} value={subcategory.subcategory_id}>
                {subcategory.subcategory_name}
              </option>
            ))}
          </select>
        </div>

        {/* Status (สถานะ) */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            สถานะ
          </label>
          <select
            id="status"
            name="status"
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            disabled={loading.statuses}
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">
              {loading.statuses ? 'กำลังโหลด...' : 'ทั้งหมด'}
            </option>
            {applicationStatuses.map((status) => (
              <option key={status.application_status_id} value={status.status_code}>
                {status.status_name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <form onSubmit={handleSearchSubmit} className="flex">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="ค้นหา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-3 pr-12 py-2 border border-gray-300 rounded-l-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <button
                type="submit"
                className="absolute right-0 top-0 h-full px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                🔍
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Active Filters Display */}
      {(filters.category || filters.subcategory || filters.status || filters.search) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-gray-700">ตัวกรองที่เลือก:</span>

            {filters.category && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                หมวด: {getCategoryName(filters.category)}
                <button
                  type="button"
                  onClick={() => handleChange('category', '')}
                  className="ml-2 text-blue-600 hover:text-blue-800 font-bold"
                >
                  ×
                </button>
              </span>
            )}

            {filters.subcategory && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
                ประเภท: {getSubcategoryName(filters.subcategory)}
                <button
                  type="button"
                  onClick={() => handleChange('subcategory', '')}
                  className="ml-2 text-purple-600 hover:text-purple-800 font-bold"
                >
                  ×
                </button>
              </span>
            )}
            
            {filters.status && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                สถานะ: {getStatusName(filters.status)}
                <button
                  type="button"
                  onClick={() => handleChange('status', '')}
                  className="ml-2 text-green-600 hover:text-green-800 font-bold"
                >
                  ×
                </button>
              </span>
            )}

            {filters.search && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                ค้นหา: "{filters.search}"
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    onSearch('');
                  }}
                  className="ml-2 text-yellow-600 hover:text-yellow-800 font-bold"
                >
                  ×
                </button>
              </span>
            )}

            {/* Clear All Filters Button */}
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                onFilterChange({
                  category: '',
                  subcategory: '',
                  status: '',
                  search: ''
                });
                onSearch('');
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline ml-2"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {(loading.categories || loading.subcategories || loading.statuses) && (
        <div className="mt-2 text-sm text-gray-500 text-center">
          <span className="inline-flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            กำลังโหลดข้อมูล...
          </span>
        </div>
      )}
    </div>
  );
}