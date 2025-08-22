// app/admin/submissions/components/ApprovalModal.js
'use client';

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { adminSubmissionAPI } from '../../../lib/admin_submission_api';
import { toast } from 'react-hot-toast';

export default function ApprovalModal({ isOpen, onClose, submission, action, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    approved_amount: '',
    approval_comment: '',
    rejection_reason: '',
    revision_request: ''
  });

  // Get modal title
  const getModalTitle = () => {
    switch (action) {
      case 'approve':
        return 'อนุมัติคำร้อง';
      case 'reject':
        return 'ปฏิเสธคำร้อง';
      case 'revision':
        return 'ขอข้อมูลเพิ่มเติม';
      default:
        return '';
    }
  };

  // Get action button text
  const getActionButtonText = () => {
    switch (action) {
      case 'approve':
        return 'อนุมัติ';
      case 'reject':
        return 'ปฏิเสธ';
      case 'revision':
        return 'ส่งคำขอ';
      default:
        return '';
    }
  };

  // Get action button style
  const getActionButtonStyle = () => {
    switch (action) {
      case 'approve':
        return 'bg-green-600 hover:bg-green-700';
      case 'reject':
        return 'bg-red-600 hover:bg-red-700';
      case 'revision':
        return 'bg-orange-600 hover:bg-orange-700';
      default:
        return 'bg-indigo-600 hover:bg-indigo-700';
    }
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (action === 'approve' && !formData.approved_amount) {
      toast.error('กรุณาระบุจำนวนเงินที่อนุมัติ');
      return;
    }
    if (action === 'reject' && !formData.rejection_reason) {
      toast.error('กรุณาระบุเหตุผลในการปฏิเสธ');
      return;
    }
    if (action === 'revision' && !formData.revision_request) {
      toast.error('กรุณาระบุข้อมูลที่ต้องการเพิ่มเติม');
      return;
    }

    setLoading(true);
    
    try {
      let response;
      
      switch (action) {
        case 'approve':
          response = await adminSubmissionAPI.approveSubmission(submission.submission_id, {
            approved_amount: parseFloat(formData.approved_amount),
            approval_comment: formData.approval_comment
          });
          break;
          
        case 'reject':
          response = await adminSubmissionAPI.rejectSubmission(submission.submission_id, {
            rejection_reason: formData.rejection_reason
          });
          break;
          
        case 'revision':
          response = await adminSubmissionAPI.requestRevision(submission.submission_id, {
            revision_request: formData.revision_request
          });
          break;
      }
      
      if (response.success) {
        toast.success(response.message || 'ดำเนินการสำเร็จ');
        onSuccess();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  // Get requested amount for display
  const getRequestedAmount = () => {
    if (submission.submission_type === 'fund_application' && submission.fund_application_detail) {
      return submission.fund_application_detail.requested_amount || 0;
    }
    if (submission.submission_type === 'publication_reward' && submission.publication_reward_detail) {
      // ตรวจสอบ field ที่ถูกต้อง
      return submission.publication_reward_detail.reward_amount || 
             submission.publication_reward_detail.publication_reward || 
             submission.publication_reward_detail.total_amount || 0;
    }
    return 0;
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <form onSubmit={handleSubmit}>
                  <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                        <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                          {getModalTitle()}
                        </Dialog.Title>
                        
                        {/* Submission Info */}
                        <div className="mt-4 bg-gray-50 rounded-lg p-4">
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">เลขที่คำร้อง: {submission.submission_number}</p>
                            <p className="text-gray-600 mt-1">
                              ผู้ยื่น: {submission.user?.user_fname} {submission.user?.user_lname}
                            </p>
                            {submission.submission_type === 'fund_application' && submission.fund_application_detail && (
                              <p className="text-gray-600 mt-1">
                                โครงการ: {submission.fund_application_detail.project_title}
                              </p>
                            )}
                            {submission.submission_type === 'publication_reward' && submission.publication_reward_detail && (
                              <p className="text-gray-600 mt-1">
                                บทความ: {submission.publication_reward_detail.paper_title}
                              </p>
                            )}
                            <p className="text-gray-600 mt-1">
                              จำนวนเงินที่ขอ: <span className="font-medium">{getRequestedAmount().toLocaleString()} บาท</span>
                            </p>
                          </div>
                        </div>

                        {/* Form Fields */}
                        <div className="mt-4">
                          {action === 'approve' && (
                            <>
                              <div className="mb-4">
                                <label htmlFor="approved_amount" className="block text-sm font-medium text-gray-700">
                                  จำนวนเงินที่อนุมัติ (บาท) <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  id="approved_amount"
                                  name="approved_amount"
                                  step="0.01"
                                  value={formData.approved_amount}
                                  onChange={(e) => setFormData({ ...formData, approved_amount: e.target.value })}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                  placeholder={getRequestedAmount().toString()}
                                  required
                                />
                              </div>
                              <div>
                                <label htmlFor="approval_comment" className="block text-sm font-medium text-gray-700">
                                  หมายเหตุ (ถ้ามี)
                                </label>
                                <textarea
                                  id="approval_comment"
                                  name="approval_comment"
                                  rows={3}
                                  value={formData.approval_comment}
                                  onChange={(e) => setFormData({ ...formData, approval_comment: e.target.value })}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                  placeholder="ระบุหมายเหตุเพิ่มเติม..."
                                />
                              </div>
                            </>
                          )}

                          {action === 'reject' && (
                            <div>
                              <label htmlFor="rejection_reason" className="block text-sm font-medium text-gray-700">
                                เหตุผลในการปฏิเสธ <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                id="rejection_reason"
                                name="rejection_reason"
                                rows={4}
                                value={formData.rejection_reason}
                                onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                placeholder="ระบุเหตุผลในการปฏิเสธ..."
                                required
                              />
                            </div>
                          )}

                          {action === 'revision' && (
                            <div>
                              <label htmlFor="revision_request" className="block text-sm font-medium text-gray-700">
                                ข้อมูลที่ต้องการเพิ่มเติม <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                id="revision_request"
                                name="revision_request"
                                rows={4}
                                value={formData.revision_request}
                                onChange={(e) => setFormData({ ...formData, revision_request: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                placeholder="ระบุข้อมูลที่ต้องการให้ผู้ยื่นคำร้องเพิ่มเติม..."
                                required
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto ${getActionButtonStyle()} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {loading ? 'กำลังดำเนินการ...' : getActionButtonText()}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={loading}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}