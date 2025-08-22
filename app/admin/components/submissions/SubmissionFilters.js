// app/admin/submissions/components/SubmissionFilters.js
'use client';

import { useState, useEffect } from 'react';
import { commonAPI } from '../../../lib/admin_submission_api';

export default function SubmissionFilters({ filters, onFilterChange, onSearch }) {
  const [years, setYears] = useState([]);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  
  // Fetch years for dropdown
  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    try {
      const response = await commonAPI.getYears();
      if (response.success) {
        setYears(response.years || []);
      }
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  // Handle filter change
  const handleChange = (field, value) => {
    onFilterChange({ [field]: value });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    onFilterChange({
      type: '',
      status: '',
      year_id: '',
      search: '',
      date_from: '',
      date_to: ''
    });
  };

  return (
    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">
              ค้นหา
            </label>
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
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm"
                placeholder="ค้นหาด้วยเลขที่คำร้อง, ชื่อผู้ยื่น, ชื่อโครงการ..."
              />
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            ค้นหา
          </button>
        </div>
      </form>

      {/* Filter Dropdowns */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {/* Submission Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            ประเภทคำร้อง
          </label>
          <select
            id="type"
            name="type"
            value={filters.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white"
          >
            <option value="">ทั้งหมด</option>
            <option value="fund_application">ใบสมัครทุนวิจัย</option>
            <option value="publication_reward">เงินรางวัลตีพิมพ์</option>
            <option value="conference_grant">ทุนประชุมวิชาการ</option>
            <option value="training_request">ขอทุนฝึกอบรม</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            สถานะ
          </label>
          <select
            id="status"
            name="status"
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white"
          >
            <option value="">ทั้งหมด</option>
            <option value="1">รอพิจารณา</option>
            <option value="2">อนุมัติ</option>
            <option value="3">ไม่อนุมัติ</option>
            <option value="4">ต้องการข้อมูลเพิ่มเติม</option>
          </select>
        </div>

        {/* Year */}
        <div>
          <label htmlFor="year_id" className="block text-sm font-medium text-gray-700">
            ปีงบประมาณ
          </label>
          <select
            id="year_id"
            name="year_id"
            value={filters.year_id}
            onChange={(e) => handleChange('year_id', e.target.value)}
            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white"
          >
            <option value="">ทั้งหมด</option>
            {years.map((year) => (
              <option key={year.year_id} value={year.year_id}>
                {year.year}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label htmlFor="date_from" className="block text-sm font-medium text-gray-700">
            วันที่เริ่มต้น
          </label>
          <input
            type="date"
            id="date_from"
            name="date_from"
            value={filters.date_from}
            onChange={(e) => handleChange('date_from', e.target.value)}
            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white"
          />
        </div>

        {/* Date To */}
        <div>
          <label htmlFor="date_to" className="block text-sm font-medium text-gray-700">
            วันที่สิ้นสุด
          </label>
          <input
            type="date"
            id="date_to"
            name="date_to"
            value={filters.date_to}
            onChange={(e) => handleChange('date_to', e.target.value)}
            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white"
          />
        </div>

        {/* Clear Filters Button */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleClearFilters}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
            </svg>
            ล้างตัวกรอง
          </button>
        </div>
      </div>

      {/* Active Filters Display */}
      {(filters.type || filters.status || filters.year_id || filters.search || filters.date_from || filters.date_to) && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm text-gray-500">ตัวกรองที่ใช้:</span>
          
          {filters.search && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              ค้นหา: {filters.search}
              <button
                type="button"
                onClick={() => { setSearchTerm(''); onSearch(''); }}
                className="ml-1 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.type && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              ประเภท: {filters.type === 'fund_application' ? 'ใบสมัครทุนวิจัย' : 
                       filters.type === 'publication_reward' ? 'เงินรางวัลตีพิมพ์' :
                       filters.type === 'conference_grant' ? 'ทุนประชุมวิชาการ' : 
                       'ขอทุนฝึกอบรม'}
              <button
                type="button"
                onClick={() => handleChange('type', '')}
                className="ml-1 text-blue-400 hover:text-blue-600"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.status && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              สถานะ: {filters.status === '1' ? 'รอพิจารณา' : 
                      filters.status === '2' ? 'อนุมัติ' :
                      filters.status === '3' ? 'ไม่อนุมัติ' : 
                      'ต้องการข้อมูลเพิ่มเติม'}
              <button
                type="button"
                onClick={() => handleChange('status', '')}
                className="ml-1 text-green-400 hover:text-green-600"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}