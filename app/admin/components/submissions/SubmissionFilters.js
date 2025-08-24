// app/admin/submissions/components/SubmissionFilters.js
'use client';

import { useState, useEffect } from 'react';
import { commonAPI } from '../../../lib/admin_submission_api';
import { adminAPI } from '../../../lib/admin_api';

export default function SubmissionFilters({ filters, onFilterChange, onSearch }) {
  const [years, setYears] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  
  // Fetch initial data
  useEffect(() => {
    fetchYears();
    fetchCategories();
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (filters.category) {
      fetchSubcategories(filters.category);
    } else {
      setSubcategories([]);
    }
  }, [filters.category]);

  const fetchYears = async () => {
    try {
      const response = await adminAPI.getYears();
      console.log('Years response:', response);
      
      if (response && Array.isArray(response)) {
        setYears(response);
      } else if (response && response.years) {
        setYears(response.years);
      }
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      // ใช้ adminAPI สำหรับ categories (admin endpoint)
      const response = await adminAPI.getCategories();
      console.log('Categories response:', response);
      
      if (response && Array.isArray(response)) {
        setCategories(response);
      } else if (response && response.categories) {
        setCategories(response.categories);
      } else {
        // เรียกข้อมูลจากตาราง fund_categories
        console.log('Using categories from database structure');
        setCategories([
          { category_id: 1, category_name: 'ทุนส่งเสริมการวิจัย' },
          { category_id: 2, category_name: 'ทุนอุดหนุนกิจกรรม' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback ตาม database structure
      setCategories([
        { category_id: 1, category_name: 'ทุนส่งเสริมการวิจัย' },
        { category_id: 2, category_name: 'ทุนอุดหนุนกิจกรรม' }
      ]);
    }
  };

  const fetchSubcategories = async (categoryId) => {
    try {
      // ใช้ adminAPI สำหรับ subcategories (admin endpoint)
      const response = await adminAPI.getSubcategories(categoryId);
      console.log('Subcategories response:', response);
      
      if (response && Array.isArray(response)) {
        setSubcategories(response);
      } else if (response && response.subcategories) {
        setSubcategories(response.subcategories);
      } else {
        // ข้อมูลจากตาราง fund_subcategories
        const mockSubcategories = {
          1: [ // ทุนส่งเสริมการวิจัย
            { subcategory_id: 1, subcategory_name: '1.1 ทุนสนับสนุนผู้เชี่ยวชาญต่างประเทศ' },
            { subcategory_id: 2, subcategory_name: '1.2 ทุนวิจัยสถาบัน' },
            { subcategory_id: 3, subcategory_name: '1.3 ทุนวิจัยเพื่อพัฒนางานประจำ' },
            { subcategory_id: 4, subcategory_name: '1.4 ทุนวิจัยในชั้นเรียน' },
            { subcategory_id: 5, subcategory_name: 'ทุนสนับสนุนงานวิจัย นวัตกรรมและสิ่งประดิษฐ์เพื่อการเรียนการสอน' },
            { subcategory_id: 6, subcategory_name: '1.5 ทุนวิจัยความเป็นเลิศ' },
            { subcategory_id: 7, subcategory_name: '1.10 ทุนพัฒนากลุ่มวิจัยบูรณาการ' },
            { subcategory_id: 8, subcategory_name: 'ทุนนักวิจัยอาวุโส' },
            { subcategory_id: 9, subcategory_name: '1.7 ทุนพัฒนาศูนย์วิจัย' },
            { subcategory_id: 10, subcategory_name: 'ทุนฝึกอบรมนักวิจัยหลังปริญญาเอก' },
            { subcategory_id: 11, subcategory_name: '1.6 ทุนนวัตกรรมความเป็นเลิศ' },
            { subcategory_id: 12, subcategory_name: '1.9 ทุนสนับสนุนการได้รับทุนวิจัยภายนอก' }
          ],
          2: [ // ทุนอุดหนุนกิจกรรม
            { subcategory_id: 13, subcategory_name: 'ทุนทำวิจัยในต่างประเทศ' },
            { subcategory_id: 14, subcategory_name: 'เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัย (ผู้แต่งชื่อแรก)' },
            { subcategory_id: 15, subcategory_name: 'เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัย (ผู้ประพันธ์บรรณกิจ)' }
          ]
        };
        
        setSubcategories(mockSubcategories[categoryId] || []);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      // Fallback data from database
      const mockSubcategories = {
        1: [ // ทุนส่งเสริมการวิจัย
          { subcategory_id: 1, subcategory_name: '1.1 ทุนสนับสนุนผู้เชี่ยวชาญต่างประเทศ' },
          { subcategory_id: 2, subcategory_name: '1.2 ทุนวิจัยสถาบัน' },
          { subcategory_id: 3, subcategory_name: '1.3 ทุนวิจัยเพื่อพัฒนางานประจำ' },
          { subcategory_id: 4, subcategory_name: '1.4 ทุนวิจัยในชั้นเรียน' },
          { subcategory_id: 5, subcategory_name: 'ทุนสนับสนุนงานวิจัย นวัตกรรมและสิ่งประดิษฐ์เพื่อการเรียนการสอน' },
          { subcategory_id: 6, subcategory_name: '1.5 ทุนวิจัยความเป็นเลิศ' },
          { subcategory_id: 7, subcategory_name: '1.10 ทุนพัฒนากลุ่มวิจัยบูรณาการ' },
          { subcategory_id: 8, subcategory_name: 'ทุนนักวิจัยอาวุโส' },
          { subcategory_id: 9, subcategory_name: '1.7 ทุนพัฒนาศูนย์วิจัย' },
          { subcategory_id: 10, subcategory_name: 'ทุนฝึกอบรมนักวิจัยหลังปริญญาเอก' },
          { subcategory_id: 11, subcategory_name: '1.6 ทุนนวัตกรรมความเป็นเลิศ' },
          { subcategory_id: 12, subcategory_name: '1.9 ทุนสนับสนุนการได้รับทุนวิจัยภายนอก' }
        ],
        2: [ // ทุนอุดหนุนกิจกรรม
          { subcategory_id: 13, subcategory_name: 'ทุนทำวิจัยในต่างประเทศ' },
          { subcategory_id: 14, subcategory_name: 'เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัย (ผู้แต่งชื่อแรก)' },
          { subcategory_id: 15, subcategory_name: 'เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัย (ผู้ประพันธ์บรรณกิจ)' }
        ]
      };
      
      setSubcategories(mockSubcategories[categoryId] || []);
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
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white"
          >
            <option value="">ทั้งหมด</option>
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
            disabled={!filters.category}
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">ทั้งหมด</option>
            {subcategories.map((subcategory) => (
              <option key={subcategory.subcategory_id} value={subcategory.subcategory_id}>
                {subcategory.subcategory_name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            สถานะ
          </label>
          <select
            id="status"
            name="status"
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white"
          >
            <option value="">ทั้งหมด</option>
            {/* สถานะตามตาราง application_status */}
            <option value="1">รอพิจารณา</option>
            <option value="2">อนุมัติ</option>
            <option value="3">ปฏิเสธ</option>
            <option value="4">ต้องการข้อมูลเพิ่มเติม</option>
            <option value="5">ร่าง</option>
          </select>
        </div>

        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            ค้นหา
          </label>
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                name="search"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="เลขที่คำร้อง, ชื่อเรื่อง, ผู้ยื่น..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
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
                หมวด: {categories.find(c => c.category_id.toString() === filters.category)?.category_name || filters.category}
                <button
                  type="button"
                  onClick={() => handleChange('category', '')}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}

            {filters.subcategory && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
                ประเภท: {subcategories.find(s => s.subcategory_id.toString() === filters.subcategory)?.subcategory_name || filters.subcategory}
                <button
                  type="button"
                  onClick={() => handleChange('subcategory', '')}
                  className="ml-2 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            )}
            
            {filters.status && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                สถานะ: {filters.status === '1' ? 'รอพิจารณา' : 
                        filters.status === '2' ? 'อนุมัติ' :
                        filters.status === '3' ? 'ปฏิเสธ' :
                        filters.status === '4' ? 'ต้องการข้อมูลเพิ่มเติม' :
                        filters.status === '5' ? 'ร่าง' : filters.status}
                <button
                  type="button"
                  onClick={() => handleChange('status', '')}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            )}

            {filters.search && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">
                ค้นหา: "{filters.search}"
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); onSearch(''); }}
                  className="ml-2 text-gray-600 hover:text-gray-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}