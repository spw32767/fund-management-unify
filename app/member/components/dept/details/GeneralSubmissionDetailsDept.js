'use client';

import React, { useEffect, useState } from 'react';
import PageLayout from '../../common/PageLayout';
import Card from '../../common/Card';
import StatusBadge from '../../common/StatusBadge';
import { deptHeadAPI } from '@/app/lib/dept_head_api';
import { useRouter, useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

export default function GeneralSubmissionDetailsDept({ submissionId: propId }) {
  const router = useRouter();
  const params = useSearchParams();
  const submissionId = propId || params.get('id');

  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await deptHeadAPI.getSubmissionDetails(submissionId);
        if (!mounted) return;
        setPayload(res);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [submissionId]);

  const submission = payload?.submission || {};
  const statusCode = String(submission?.status?.status_code ?? submission?.status_code ?? '');
  const approvableByDeptHead = statusCode === '5';

  const onRecommend = async () => {
    const { value: comment = '' } = await Swal.fire({
      title: 'ส่งต่อให้ผู้ดูแลระบบ (Admin)?',
      input: 'textarea',
      inputPlaceholder: 'หมายเหตุ (ถ้ามี)',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    });
    const body = comment?.trim() ? { comment: comment.trim() } : {};
    await deptHeadAPI.recommendSubmission(submissionId, body);
    await Swal.fire({ icon: 'success', title: 'ส่งต่อแล้ว', timer: 1200, showConfirmButton: false });
    router.back();
  };

  const onReject = async () => {
    const { value: reason } = await Swal.fire({
      title: 'ไม่เห็นควรพิจารณา',
      input: 'textarea',
      inputValidator: (v) => (!v?.trim() ? 'กรุณาระบุเหตุผล' : undefined),
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    });
    if (!reason) return;
    await deptHeadAPI.rejectSubmission(submissionId, { rejection_reason: String(reason).trim() });
    await Swal.fire({ icon: 'success', title: 'บันทึกแล้ว', timer: 1200, showConfirmButton: false });
    router.back();
  };

  return (
    <PageLayout title={`รายละเอียดคำร้องทั่วไป (#${submission?.submission_number || submissionId || '-'})`} backHref="/member/dept">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="สถานะคำร้อง">
          <div className="flex justify-between">
            <span>สถานะ</span>
            <StatusBadge
              status={submission?.status?.status_name || (statusCode ? `สถานะ ${statusCode}` : 'ไม่ทราบสถานะ')}
            />
          </div>
        </Card>

        <Card title="การพิจารณาของหัวหน้าสาขา">
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              เมื่อ “เห็นควรพิจารณา” ระบบจะเปลี่ยนสถานะเป็น “อยู่ระหว่างการพิจารณา (0)” เพื่อส่งต่อให้ Admin
            </div>

            <div className="flex gap-2">
              <button
                onClick={onRecommend}
                disabled={!approvableByDeptHead || loading}
                className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
              >
                เห็นควรพิจารณา
              </button>

              <button
                onClick={onReject}
                disabled={!approvableByDeptHead || loading}
                className="px-4 py-2 rounded-md bg-red-600 text-white disabled:opacity-50"
              >
                ไม่เห็นควรพิจารณา
              </button>
            </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
