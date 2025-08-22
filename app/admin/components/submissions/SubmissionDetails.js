// app/admin/components/submissions/SubmissionDetails.js
'use client';

import { useState, useEffect } from 'react';
import { adminSubmissionAPI } from '../../../lib/admin_submission_api';
import ApprovalModal from './ApprovalModal';
import { formatDate, formatCurrency, getStatusText, getStatusBadgeClass } from '../../../utils/format';
import { toast } from 'react-hot-toast';

export default function SubmissionDetails({ submissionId, onBack }) {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'users', 'documents', 'history'

  // Fetch submission details
  const fetchSubmissionDetails = async () => {
    setLoading(true);
    try {
      const response = await adminSubmissionAPI.getSubmissionDetails(submissionId);
      setSubmission(response.submission);
    } catch (error) {
      console.error('Error fetching submission details:', error);
      toast.error('ไม่สามารถดึงข้อมูลคำร้องได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissionDetails();
  }, [submissionId]);

  // Handle action
  const handleAction = (action) => {
    setModalAction(action);
    setShowApprovalModal(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowApprovalModal(false);
    setModalAction(null);
  };

  // Handle action success
  const handleActionSuccess = () => {
    handleModalClose();
    fetchSubmissionDetails(); // Refresh data
    toast.success('ดำเนินการสำเร็จ');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">ไม่พบข้อมูลคำร้อง</p>
        <button
          onClick={onBack}
          className="mt-4 text-indigo-600 hover:text-indigo-900"
        >
          กลับไปยังรายการ
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                คำร้องเลขที่ {submission.submission_number}
              </h2>
              <p className="text-sm text-gray-500">
                ยื่นเมื่อ {submission.submitted_at ? formatDate(submission.submitted_at) : 'ยังไม่ได้ส่ง'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(submission.status_id)}`}>
              {getStatusText(submission.status_id)}
            </span>
            
            {(submission.status_id === 1 || submission.status_id === 4) && (
              <>
                <button
                  onClick={() => handleAction('approve')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                  อนุมัติ
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                >
                  ปฏิเสธ
                </button>
                {submission.status_id === 1 && (
                  <button
                    onClick={() => handleAction('revision')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700"
                  >
                    ขอข้อมูลเพิ่ม
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              รายละเอียด
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ผู้ร่วมวิจัย ({submission.submission_users?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'documents'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              เอกสารแนบ ({submission.documents?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ประวัติ
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลทั่วไป</h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ประเภทคำร้อง</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {submission.submission_type === 'fund_application' ? 'ใบสมัครทุนวิจัย' :
                       submission.submission_type === 'publication_reward' ? 'เงินรางวัลตีพิมพ์' :
                       submission.submission_type}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ปีงบประมาณ</dt>
                    <dd className="mt-1 text-sm text-gray-900">{submission.year?.year}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ผู้ยื่นคำร้อง</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {submission.user?.user_fname} {submission.user?.user_lname}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">อีเมล</dt>
                    <dd className="mt-1 text-sm text-gray-900">{submission.user?.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">วันที่สร้าง</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(submission.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">อัพเดตล่าสุด</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(submission.updated_at)}</dd>
                  </div>
                </dl>
              </div>

              {/* Type-specific Details */}
              {submission.details && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {submission.details.type === 'publication_reward' ? 'รายละเอียดการตีพิมพ์' : 'รายละเอียดโครงการ'}
                  </h3>
                  
                  {submission.details.type === 'publication_reward' && submission.details.data && (
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">ชื่อบทความ</dt>
                        <dd className="mt-1 text-sm text-gray-900">{submission.details.data.paper_title}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">ชื่อวารสาร</dt>
                        <dd className="mt-1 text-sm text-gray-900">{submission.details.data.journal_name}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Quartile</dt>
                        <dd className="mt-1 text-sm text-gray-900">{submission.details.data.quartile || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">DOI</dt>
                        <dd className="mt-1 text-sm text-gray-900">{submission.details.data.doi || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">จำนวนเงินที่ขอ</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatCurrency(submission.details.data.reward_amount || 0)}
                        </dd>
                      </div>
                      {submission.details.data.approved_amount && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">จำนวนเงินที่อนุมัติ</dt>
                          <dd className="mt-1 text-sm font-semibold text-green-600">
                            {formatCurrency(submission.details.data.approved_amount)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}
                  
                  {submission.details.type === 'fund_application' && submission.details.data && (
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">ชื่อโครงการ</dt>
                        <dd className="mt-1 text-sm text-gray-900">{submission.details.data.project_title}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">รายละเอียดโครงการ</dt>
                        <dd className="mt-1 text-sm text-gray-900">{submission.details.data.project_description}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">จำนวนเงินที่ขอ</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatCurrency(submission.details.data.requested_amount || 0)}
                        </dd>
                      </div>
                      {submission.details.data.approved_amount && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">จำนวนเงินที่อนุมัติ</dt>
                          <dd className="mt-1 text-sm font-semibold text-green-600">
                            {formatCurrency(submission.details.data.approved_amount)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">ผู้ร่วมวิจัย/ผู้ร่วมโครงการ</h3>
              {submission.submission_users && submission.submission_users.length > 0 ? (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ชื่อ-นามสกุล
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          อีเมล
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          บทบาท
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ลำดับ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {submission.submission_users.map((su) => (
                        <tr key={su.user_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {su.user.user_fname} {su.user.user_lname}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {su.user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {su.role === 'owner' ? 'เจ้าของคำร้อง' :
                             su.role === 'coauthor' ? 'ผู้ร่วมวิจัย' :
                             su.role === 'advisor' ? 'ที่ปรึกษา' :
                             su.role}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {su.display_order}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">ไม่มีผู้ร่วมวิจัย</p>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">เอกสารแนบ</h3>
              {submission.documents && submission.documents.length > 0 ? (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ประเภทเอกสาร
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ชื่อไฟล์
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ขนาด
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          อัพโหลดเมื่อ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ดาวน์โหลด
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {submission.documents.map((doc) => (
                        <tr key={doc.document_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {doc.document_type?.type_name || 'อื่นๆ'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {doc.file?.original_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {doc.file?.file_size ? `${(doc.file.file_size / 1024 / 1024).toFixed(2)} MB` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(doc.uploaded_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <a
                              href={`/api/v1/files/managed/${doc.file_id}/download`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              ดาวน์โหลด
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">ไม่มีเอกสารแนบ</p>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">ประวัติการดำเนินการ</h3>
              <div className="flow-root">
                <ul className="-mb-8">
                  {/* Created */}
                  <li>
                    <div className="relative pb-8">
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              สร้างคำร้องโดย <span className="font-medium text-gray-900">
                                {submission.user?.user_fname} {submission.user?.user_lname}
                              </span>
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            {formatDate(submission.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>

                  {/* Submitted */}
                  {submission.submitted_at && (
                    <li>
                      <div className="relative pb-8">
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8.707 7.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L11 7.586 8.707 5.293z" />
                              </svg>
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">ส่งคำร้อง</p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {formatDate(submission.submitted_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )}

                  {/* Approved */}
                  {submission.approved_at && (
                    <li>
                      <div className="relative pb-8">
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                อนุมัติคำร้อง
                                {submission.details?.data?.approved_amount && (
                                  <span className="font-medium text-gray-900">
                                    {' '}จำนวน {formatCurrency(submission.details.data.approved_amount)}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {formatDate(submission.approved_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <ApprovalModal
          isOpen={showApprovalModal}
          onClose={handleModalClose}
          submission={submission}
          action={modalAction}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
}