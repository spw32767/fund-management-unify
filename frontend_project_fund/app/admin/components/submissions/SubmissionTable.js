'use client';

import { useState } from 'react';
import { Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SubmissionTable({
  submissions,
  loading,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onRefresh
}) {

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format currency helper
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '-';
    return `฿${Number(amount).toLocaleString()}`;
  };

  // Get status badge style
  const getStatusBadge = (statusId) => {
    switch (statusId) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 2:
        return 'bg-green-100 text-green-800 border-green-200';
      case 3:
        return 'bg-red-100 text-red-800 border-red-200';
      case 4:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get submission type badge style
  const getTypeBadge = (submissionType) => {
    switch (submissionType) {
      case 'publication_reward':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'fund_application':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'promotion_fund':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Handle sort
  const handleSort = (column) => {
    onSort(column);
  };

  // Get sort icon
  const getSortIcon = (column) => {
    if (sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-indigo-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-indigo-600" />
    );
  };

  // Handle action click
  const handleAction = (submission, action) => {
    setSelectedSubmission(submission);
    setModalAction(action);
    setShowApprovalModal(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowApprovalModal(false);
    setSelectedSubmission(null);
    setModalAction(null);
  };

  // Handle action success
  const handleActionSuccess = () => {
    handleModalClose();
    onRefresh();
    toast.success('ดำเนินการสำเร็จ');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <div className="ml-3 text-gray-600">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่พบข้อมูลคำร้อง</h3>
        <p className="mt-1 text-sm text-gray-500">ลองปรับเปลี่ยนตัวกรองการค้นหา หรือสร้างคำร้องใหม่</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('submission_number')}
              >
                <div className="flex items-center space-x-1">
                  <span>เลขที่คำร้อง</span>
                  {getSortIcon('submission_number')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('submission_type')}
              >
                <div className="flex items-center space-x-1">
                  <span>ประเภท</span>
                  {getSortIcon('submission_type')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                ชื่อเรื่อง/ผู้ยื่น
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status_id')}
              >
                <div className="flex items-center space-x-1">
                  <span>สถานะ</span>
                  {getSortIcon('status_id')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                จำนวนเงิน
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center space-x-1">
                  <span>วันที่สร้าง</span>
                  {getSortIcon('created_at')}
                </div>
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">จัดการ</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {submissions.map((submission) => (
              <tr key={submission.submission_id || submission.id} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {submission.submission_number || submission.id || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeBadge(submission.submission_type)}`}>
                    {submission.display_type || submission.submission_type || 'ไม่ระบุ'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="space-y-1">
                    <div className="font-medium truncate max-w-xs" title={submission.display_title}>
                      {submission.display_title || 'ไม่ระบุชื่อเรื่อง'}
                    </div>
                    <div className="text-sm text-gray-500">
                      โดย: {submission.display_author || 'ไม่ระบุผู้ยื่น'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(submission.status_id)}`}>
                    {submission.display_status || submission.status?.status_name || 'ไม่ทราบสถานะ'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {formatCurrency(submission.display_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(submission.display_date || submission.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end">
                    {/* View Button Only */}
                    <button
                      onClick={() => onView(submission.submission_id || submission.id)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      title="ดูรายละเอียด"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      ดูรายละเอียด
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}