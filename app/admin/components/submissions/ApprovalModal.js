'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { adminSubmissionAPI } from '../../../lib/admin_submission_api';

export default function ApprovalModal({ submission, action, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    comment: '',
    approved_amount: submission?.PublicationRewardDetail?.total_amount || 0
  });

  const getModalConfig = () => {
    switch (action) {
      case 'approve':
        return {
          title: 'อนุมัติคำร้อง',
          icon: CheckCircle,
          iconColor: 'text-green-500',
          buttonColor: 'bg-green-600 hover:bg-green-700',
          buttonText: 'อนุมัติ'
        };
      case 'reject':
        return {
          title: 'ไม่อนุมัติคำร้อง',
          icon: XCircle,
          iconColor: 'text-red-500',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          buttonText: 'ไม่อนุมัติ'
        };
      case 'revision':
        return {
          title: 'ขอแก้ไขคำร้อง',
          icon: AlertCircle,
          iconColor: 'text-orange-500',
          buttonColor: 'bg-orange-600 hover:bg-orange-700',
          buttonText: 'ขอแก้ไข'
        };
      default:
        return {
          title: 'ดำเนินการ',
          icon: AlertCircle,
          iconColor: 'text-gray-500',
          buttonColor: 'bg-gray-600 hover:bg-gray-700',
          buttonText: 'ยืนยัน'
        };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      
      switch (action) {
        case 'approve':
          response = await adminSubmissionAPI.approveSubmission(submission.id, {
            comment: formData.comment,
            approved_amount: formData.approved_amount
          });
          break;
        case 'reject':
          response = await adminSubmissionAPI.rejectSubmission(submission.id, {
            comment: formData.comment
          });
          break;
        case 'revision':
          response = await adminSubmissionAPI.requestRevision(submission.id, {
            comment: formData.comment
          });
          break;
        default:
          throw new Error('Invalid action');
      }

      if (response.success) {
        onSuccess();
      } else {
        throw new Error(response.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error processing action:', error);
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const config = getModalConfig();
  const IconComponent = config.icon;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <IconComponent className={`h-6 w-6 ${config.iconColor} mr-2`} />
            <h3 className="text-lg font-medium text-gray-900">
              {config.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            คำร้องเลขที่: <span className="font-medium">{submission.submission_number || submission.id}</span>
          </p>
          {submission.title && (
            <p className="text-sm text-gray-600 mt-1">
              ชื่อเรื่อง: <span className="font-medium">{submission.title}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {action === 'approve' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                จำนวนเงินที่อนุมัติ (บาท)
              </label>
              <input
                type="number"
                value={formData.approved_amount}
                onChange={(e) => setFormData({ ...formData, approved_amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                min="0"
                required
              />
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ความเห็น {action === 'revision' ? '(บังคับ)' : '(ไม่บังคับ)'}
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="กรุณาระบุความเห็นเพิ่มเติม..."
              required={action === 'revision'}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={loading}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className={`px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white ${config.buttonColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={loading}
            >
              {loading ? 'กำลังดำเนินการ...' : config.buttonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}