// app/admin/submissions/components/SubmissionFilters.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import { adminAPI } from '../../../lib/admin_api';
import { useStatusMap } from '@/app/hooks/useStatusMap';

export default function SubmissionFilters({ filters, onFilterChange, onSearch, selectedYear = '' }) {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const { statuses, isLoading: statusLoading, getLabelById } = useStatusMap();

  const statusOptions = useMemo(() => {
    if (!Array.isArray(statuses)) return [];
    return statuses.filter((status) => {
      const name = (status?.status_name || status?.StatusName || '').trim();
      const code = String(status?.status_code || status?.StatusCode || '')
        .trim()
        .toLowerCase();
      if (!name && !code) return true;
      if (name === 'ร่าง') return false;
      if (code === 'draft') return false;
      return true;
    });
  }, [statuses]);

  // Fetch categories whenever year changes
  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      if (!selectedYear) {
        setCategories([]);
        setSubcategories([]);
        return;
      }

      try {
        const list = await fetchCategories(selectedYear);
        if (!cancelled) {
          setCategories(list);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading categories for year:', selectedYear, error);
          setCategories([]);
        }
      }
    };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  // ✅ Keep local input in sync when parent filters.search changes
  useEffect(() => {
    setSearchTerm(filters.search || '');
  }, [filters.search]);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (!selectedYear) {
      setSubcategories([]);
      return;
    }

    if (filters.category) {
      fetchSubcategories(filters.category);
    } else {
      setSubcategories([]);
    }
  }, [filters.category, selectedYear]);

  const toStringId = (value) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
  };

  const normalizeCategoryOption = (raw) => {
    if (!raw || typeof raw !== 'object') return null;

    const id =
      raw.category_id ??
      raw.id ??
      raw.CategoryID ??
      raw.CategoryId ??
      raw.categoryId ??
      raw.categoryID;

    const normalizedId = toStringId(id);
    if (!normalizedId) return null;

    const name =
      raw.category_name ??
      raw.name ??
      raw.CategoryName ??
      raw.label ??
      raw.Category ??
      '';

    return {
      ...raw,
      category_id: normalizedId,
      category_name: name || `หมวดทุน ${normalizedId}`,
    };
  };

  const normalizeSubcategoryOption = (raw) => {
    if (!raw || typeof raw !== 'object') return null;

    const id =
      raw.subcategory_id ??
      raw.id ??
      raw.SubcategoryID ??
      raw.SubcategoryId ??
      raw.subcategoryId ??
      raw.subcategoryID;

    const normalizedId = toStringId(id);
    if (!normalizedId) return null;

    const name =
      raw.subcategory_name ??
      raw.name ??
      raw.SubcategoryName ??
      raw.label ??
      raw.Subcategory ??
      '';

    return {
      ...raw,
      subcategory_id: normalizedId,
      subcategory_name: name || `ประเภททุน ${normalizedId}`,
    };
  };

  const dedupeOptions = (items, normalize, idKey) => {
    if (!Array.isArray(items)) return [];
    const seen = new Set();
    const result = [];

    items.forEach((raw) => {
      const normalized = normalize(raw);
      if (!normalized) return;

      const key = normalized[idKey];
      if (!key || seen.has(key)) return;

      seen.add(key);
      result.push(normalized);
    });

    return result;
  };

  const fetchCategories = async (yearId) => {
    try {
      // ใช้ adminAPI สำหรับ categories (admin endpoint)
      const response = await adminAPI.getCategories(yearId);

      if (response && Array.isArray(response)) {
        return dedupeOptions(response, normalizeCategoryOption, 'category_id');
      }

      if (response && response.categories) {
        return dedupeOptions(response.categories, normalizeCategoryOption, 'category_id');
      } else {
        // เรียกข้อมูลจากตาราง fund_categories
        console.warn('Using categories from database structure');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }

    return [];
  };

  const fetchSubcategories = async (categoryId) => {
    try {
      // ใช้ adminAPI สำหรับ subcategories (admin endpoint)
      const response = await adminAPI.getSubcategories(categoryId);
      
      if (response && Array.isArray(response)) {
        setSubcategories(dedupeOptions(response, normalizeSubcategoryOption, 'subcategory_id'));
      } else if (response && response.subcategories) {
        setSubcategories(dedupeOptions(response.subcategories, normalizeSubcategoryOption, 'subcategory_id'));
      } else {

      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  // Handle search submit (still supported for Enter key)
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
            disabled={!selectedYear}
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
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
            disabled={statusLoading && statusOptions.length === 0}
          >
            <option value="">ทั้งหมด</option>
            {statusOptions.map((status) => (
                <option
                  key={status.application_status_id}
                  value={status.application_status_id}
                >
                  {status.status_name}
                </option>
              ))}
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
                // ✅ Live search on each keystroke
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchTerm(val);
                  onSearch(val);
                }}
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
                สถานะ: {getLabelById(filters.status) || filters.status}
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