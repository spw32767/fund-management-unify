// app/admin/submissions/components/SubmissionTable.js
'use client';

import { useState } from 'react';
import { formatDate, formatCurrency } from '@/app/utils/format';
import ApprovalModal from './ApprovalModal';
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
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [modalAction, setModalAction] = useState(null); // 'approve', 'reject', 'revision'

  // Get status badge style
  const getStatusBadge = (statusId) => {
    switch (statusId) {
      case 1:
        return 'bg-yellow-100 text-yellow-800';
      case 2:
        return 'bg-green-100 text-green-800';
      case 3:
        return 'bg-red-100 text-red-800';
      case 4:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status text
  const getStatusText = (statusId) => {
    switch (statusId) {
      case 1:
        return 'รอพิจารณา';
      case 2:
        return 'อนุมัติ';
      case 3:
        return 'ไม่อนุมัติ';
      case 4:
        return 'ต้องการข้อมูลเพิ่มเติม';
      default:
        return 'ไม่ทราบ';
    }
  };

  // Get submission type text
  const getSubmissionTypeText = (type) => {
    switch (type) {
      case 'fund_application':
        return 'ใบสมัครทุนวิจัย';
      case 'publication_reward':
        return 'เงินรางวัลตีพิมพ์';
      case 'conference_grant':
        return 'ทุนประชุมวิชาการ';
      case 'training_request':
        return 'ขอทุนฝึกอบรม';
      default:
        return type;
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
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
      </svg>
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
        <p className="mt-1 text-sm text-gray-500">ลองปรับเปลี่ยนตัวกรองการค้นหา</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ผู้ยื่นคำร้อง
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                รายละเอียด
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ปีงบประมาณ
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
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('submitted_at')}
              >
                <div className="flex items-center space-x-1">
                  <span>วันที่ส่ง</span>
                  {getSortIcon('submitted_at')}
                </div>
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {submissions.map((submission) => (
              <tr key={submission.submission_id} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {submission.submission_number || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {getSubmissionTypeText(submission.submission_type)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>
                    <div className="font-medium">
                      {submission.user?.user_fname} {submission.user?.user_lname}
                    </div>
                    <div className="text-gray-500">{submission.user?.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {submission.submission_type === 'publication_reward' && submission.publication_reward_detail && (
                    <div>
                      <div className="font-medium">{submission.publication_reward_detail.paper_title}</div>
                      <div className="text-gray-500">{submission.publication_reward_detail.journal_name}</div>
                    </div>
                  )}
                  {submission.submission_type === 'fund_application' && submission.fund_application_detail && (
                    <div>
                      <div className="font-medium">{submission.fund_application_detail.project_title}</div>
                      <div className="text-gray-500">
                        ขอทุน: {formatCurrency(submission.fund_application_detail.requested_amount)}
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {submission.year?.year}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(submission.status_id)}`}>
                    {getStatusText(submission.status_id)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {submission.submitted_at ? formatDate(submission.submitted_at) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onView(submission.submission_id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      ดูรายละเอียด
                    </button>
                    
                    {submission.status_id === 4 && (
                      <>
                        <button
                          onClick={() => handleAction(submission, 'approve')}
                          className="text-green-600 hover:text-green-900"
                        >
                          อนุมัติ
                        </button>
                        <button
                          onClick={() => handleAction(submission, 'reject')}
                          className="text-red-600 hover:text-red-900"
                        >
                          ปฏิเสธ
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedSubmission && (
        <ApprovalModal
          isOpen={showApprovalModal}
          onClose={handleModalClose}
          submission={selectedSubmission}
          action={modalAction}
          onSuccess={handleActionSuccess}
        />
      )}
    </>
  );
}