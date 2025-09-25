'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  ClipboardList,
  Download,
  Eye,
  FileText,
  User,
  Users,
} from 'lucide-react';

import PageLayout from '../common/PageLayout';
import Card from '../common/Card';
import StatusBadge from '@/app/admin/components/common/StatusBadge';
import { toast } from 'react-hot-toast';
import apiClient from '@/app/lib/api';
import { deptHeadAPI } from '@/app/lib/member_api';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getUserFullName = (user) => {
  if (!user) return '-';
  const first =
    user.user_fname ||
    user.first_name ||
    user.full_name?.split(' ')[0] ||
    user.fullname?.split(' ')[0] ||
    user.name?.split(' ')[0] ||
    '';
  const last =
    user.user_lname ||
    user.last_name ||
    user.full_name?.split(' ').slice(1).join(' ') ||
    user.fullname?.split(' ').slice(1).join(' ') ||
    user.name?.split(' ').slice(1).join(' ') ||
    '';
  const combined = (user.full_name || user.fullname || `${first} ${last}`).trim();
  return combined || '-';
};

const getUserEmail = (user) => (user?.email ? user.email : '-');

const extractUserFromRow = (row) => row?.user || row?.User || null;

const resolveRoleLabel = (row) => {
  const role =
    row?.role ||
    row?.position ||
    row?.author_role ||
    row?.AuthorRole ||
    row?.author_type;
  if (!role) return '-';
  return String(role);
};

const InfoRow = ({ label, value, helper }) => (
  <div className="flex flex-col gap-1">
    <span className="text-sm font-medium text-gray-600">{label}</span>
    <span className="text-base text-gray-900">{value ?? '-'}</span>
    {helper ? <span className="text-xs text-gray-500">{helper}</span> : null}
  </div>
);

const AmountRow = ({ label, amount, helper }) => (
  <div className="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0">
    <div className="flex flex-col">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {helper ? <span className="text-xs text-gray-500">{helper}</span> : null}
    </div>
    <span className="font-mono text-sm text-gray-900">฿{formatCurrency(amount)}</span>
  </div>
);

export default function DeptPublicationSubmissionDetails({ submissionId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  useEffect(() => {
    if (!submissionId) return;
    let cancelled = false;

    const loadDetails = async () => {
      setLoading(true);
      try {
        const res = await deptHeadAPI.getSubmissionDetails(submissionId);
        const base = res?.submission ? { ...res.submission } : { ...res };

        if (!base.submission_id) {
          throw new Error('Invalid submission payload');
        }

        const submissionUsers = res?.submission_users || base.submission_users || [];
        const documentsPayload = res?.documents || base.documents || [];

        if (res?.details?.type === 'publication_reward' && res.details.data) {
          base.PublicationRewardDetail = res.details.data;
        }

        const applicant =
          res?.applicant ||
          res?.applicant_user ||
          base.applicant ||
          base.user ||
          base.User ||
          null;

        base.submission_users = submissionUsers;
        base.documents = documentsPayload;
        if (applicant) {
          base.applicant = applicant;
          base.user = applicant;
        }

        if (!cancelled) {
          setSubmission(base);
          setDocuments(documentsPayload);
        }
      } catch (error) {
        console.error('Failed to load submission details:', error);
        if (!cancelled) {
          toast.error('โหลดรายละเอียดคำร้องไม่สำเร็จ');
          setSubmission(null);
          setDocuments([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  useEffect(() => {
    if (!submission?.submission_id) return;
    let cancelled = false;

    const loadDocuments = async () => {
      try {
        setDocumentsLoading(true);
        const [docsRes, typesRes] = await Promise.all([
          deptHeadAPI.getSubmissionDocuments(submission.submission_id),
          deptHeadAPI.getDocumentTypes(),
        ]);

        const docsArray = Array.isArray(docsRes?.documents)
          ? docsRes.documents
          : Array.isArray(docsRes)
            ? docsRes
            : [];

        const fallbackDocs = submission.documents || submission.submission_documents || [];
        const effectiveDocs = docsArray.length ? docsArray : fallbackDocs;

        const typesArray = Array.isArray(typesRes?.document_types)
          ? typesRes.document_types
          : Array.isArray(typesRes)
            ? typesRes
            : [];

        const typeMap = typesArray.reduce((acc, item) => {
          const id = item.document_type_id ?? item.id;
          if (id != null) {
            acc[id] =
              item.document_type_name ||
              item.name ||
              item.code ||
              item.category ||
              'ไม่ระบุหมวด';
          }
          return acc;
        }, {});

        const normalised = effectiveDocs.map((doc, index) => {
          const file = doc.file || doc.File || {};
          const type = doc.document_type || doc.DocumentType || {};
          const documentTypeId =
            doc.document_type_id ??
            doc.DocumentTypeID ??
            type.document_type_id ??
            type.id ??
            null;

          const displayName =
            doc.document_type_name ||
            type.document_type_name ||
            typeMap[documentTypeId] ||
            'ไม่ระบุหมวด';

          const fileId = doc.file_id ?? file.file_id ?? doc.FileID ?? null;
          const originalName =
            doc.original_name ||
            doc.file_name ||
            file.original_name ||
            file.file_name ||
            `เอกสารที่ ${index + 1}`;

          return {
            document_id: doc.document_id ?? doc.DocumentID ?? index,
            document_type_id: documentTypeId,
            document_type_name: displayName,
            description: doc.description || '',
            display_order: doc.display_order ?? index,
            file_id: fileId,
            original_name: originalName,
            uploaded_at: file.uploaded_at || doc.created_at || doc.CreatedAt || null,
          };
        });

        if (!cancelled) {
          const sorted = [...normalised].sort((a, b) => {
            const orderA = a.display_order ?? 0;
            const orderB = b.display_order ?? 0;
            if (orderA === orderB) return a.document_id - b.document_id;
            return orderA - orderB;
          });
          setDocuments(sorted);
        }
      } catch (error) {
        console.error('Failed to load submission documents:', error);
        if (!cancelled) {
          toast.error('โหลดเอกสารแนบไม่สำเร็จ');
        }
      } finally {
        if (!cancelled) {
          setDocumentsLoading(false);
        }
      }
    };

    loadDocuments();
    return () => {
      cancelled = true;
    };
  }, [submission?.submission_id]);

  const applicant = useMemo(() => {
    if (!submission) return null;

    const explicit =
      submission.applicant ||
      submission.applicant_user ||
      submission.user ||
      submission.User;

    if (explicit) return explicit;

    const users = submission.submission_users || [];

    const flagged = users.find((row) => {
      const roleText = String(
        row.role ||
          row.position ||
          row.author_role ||
          row.AuthorRole ||
          row.author_type ||
          ''
      ).toLowerCase();

      return (
        row.is_applicant === true ||
        row.IsApplicant === true ||
        row.is_owner === true ||
        row.is_submitter === true ||
        roleText.includes('applicant') ||
        roleText.includes('ผู้ยื่น')
      );
    });

    if (flagged) return extractUserFromRow(flagged);

    const candidateIds = [
      submission.applicant_user_id,
      submission.applicant_id,
      submission.user_id,
    ].filter((id) => id != null);

    if (candidateIds.length) {
      const matched = users.find((row) => {
        const userRecord = extractUserFromRow(row);
        const uid =
          userRecord?.user_id ??
          userRecord?.id ??
          row.user_id ??
          row.UserID ??
          null;
        if (uid == null) return false;
        return candidateIds.some((candidate) => String(candidate) === String(uid));
      });
      if (matched) return extractUserFromRow(matched);
    }

    const sorted = [...users].sort(
      (a, b) => (a.display_order || 0) - (b.display_order || 0)
    );

    return extractUserFromRow(sorted[0]) || null;
  }, [submission]);

  const coAuthors = useMemo(() => {
    const rows = submission?.submission_users || [];
    if (!rows.length) return [];

    const applicantUser = applicant;
    const applicantId =
      applicantUser?.user_id ??
      applicantUser?.id ??
      applicantUser?.UserID ??
      submission?.applicant_user_id ??
      submission?.user_id ??
      null;

    return rows
      .filter((row) => {
        const roleText = String(
          row.role || row.position || row.author_role || row.AuthorRole || ''
        ).toLowerCase();

        if (
          row.is_applicant === true ||
          row.IsApplicant === true ||
          row.is_owner === true ||
          row.is_submitter === true ||
          roleText.includes('applicant') ||
          roleText.includes('ผู้ยื่น')
        ) {
          return false;
        }

        const record = extractUserFromRow(row);
        const uid =
          record?.user_id ??
          record?.id ??
          row.user_id ??
          row.UserID ??
          null;

        if (applicantId != null && uid != null && String(uid) === String(applicantId)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }, [submission, applicant]);

  const pubDetail = useMemo(() => {
    if (!submission) return null;
    return (
      submission.PublicationRewardDetail ||
      submission.publication_reward_detail ||
      submission.details?.data ||
      null
    );
  }, [submission]);

  const submittedAt =
    submission?.submitted_at ||
    submission?.SubmittedAt ||
    pubDetail?.submitted_at ||
    null;

  const approvedAt =
    submission?.approved_at ||
    submission?.ApprovedAt ||
    pubDetail?.approved_at ||
    null;

  const rewardRequested = Number(pubDetail?.reward_amount || 0);
  const revisionRequested = Number(pubDetail?.revision_fee || pubDetail?.editing_fee || 0);
  const publicationRequested = Number(pubDetail?.publication_fee || pubDetail?.page_charge || 0);
  const totalRequested = rewardRequested + revisionRequested + publicationRequested;

  const rewardApproved = Number(pubDetail?.reward_approve_amount || 0);
  const revisionApproved = Number(pubDetail?.revision_fee_approve_amount || 0);
  const publicationApproved = Number(pubDetail?.publication_fee_approve_amount || 0);
  const totalApproved = Number(pubDetail?.total_approve_amount || 0);

  const approvedHidden =
    submission?.status_id === 2 &&
    rewardApproved === 0 &&
    revisionApproved === 0 &&
    publicationApproved === 0 &&
    totalApproved === 0 &&
    totalRequested > 0;

  const handleView = async (fileId) => {
    if (!fileId) return;
    try {
      const token = apiClient.getToken();
      const url = `${apiClient.baseURL}/files/managed/${fileId}/download`;
      const resp = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error('File not found');
      const blob = await resp.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Failed to open document:', error);
      toast.error('ไม่สามารถเปิดเอกสารได้');
    }
  };

  const handleDownload = async (fileId, filename = 'document') => {
    if (!fileId) return;
    try {
      await apiClient.downloadFile(`/files/managed/${fileId}/download`, filename);
    } catch (error) {
      console.error('Failed to download document:', error);
      toast.error('ดาวน์โหลดเอกสารไม่สำเร็จ');
    }
  };

  if (loading) {
    return (
      <PageLayout
        title="รายละเอียดคำร้อง"
        subtitle="กำลังโหลดข้อมูล..."
        icon={FileText}
        actions={
          <button onClick={onBack} className="btn btn-secondary">
            <ArrowLeft size={20} />
            กลับ
          </button>
        }
      >
        <div className="flex justify-center py-12">
          <div className="text-center text-gray-600">กำลังโหลดข้อมูล...</div>
        </div>
      </PageLayout>
    );
  }

  if (!submission) {
    return (
      <PageLayout
        title="ไม่พบข้อมูลคำร้อง"
        subtitle="ไม่พบคำร้องที่ร้องขอ"
        icon={AlertCircle}
        actions={
          <button onClick={onBack} className="btn btn-secondary">
            <ArrowLeft size={20} />
            กลับ
          </button>
        }
      >
        <Card collapsible={false}>
          <div className="flex flex-col items-center gap-4 py-12 text-gray-600">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p>ไม่พบข้อมูลคำร้องที่ต้องการ</p>
          </div>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={`เงินรางวัลตีพิมพ์ #${submission.submission_number || submission.submission_id}`}
      subtitle="รายละเอียดคำร้องสำหรับหัวหน้าภาควิชา (อ่านอย่างเดียว)"
      icon={Award}
      actions={
        <button onClick={onBack} className="btn btn-secondary">
          <ArrowLeft size={20} />
          กลับ
        </button>
      }
      breadcrumbs={[
        { label: 'รายการคำร้อง', href: '#', onClick: onBack },
        { label: submission.submission_number || String(submission.submission_id) },
      ]}
    >
      <div className="grid gap-6">
        <Card
          collapsible={false}
          icon={FileText}
          title="สถานะคำร้อง"
          headerClassName="items-center"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                สถานะปัจจุบัน
                <StatusBadge
                  statusId={submission.status_id}
                  fallbackLabel={submission?.status?.status_name}
                />
              </div>
              <div className="text-sm text-gray-600">
                หมายเลขคำร้อง: {submission.submission_number || submission.submission_id}
              </div>
              <div className="text-sm text-gray-600">
                ประเภทคำร้อง: เงินรางวัลตีพิมพ์ (Publication Reward)
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
              <InfoRow label="วันที่ยื่นคำร้อง" value={formatDate(submittedAt)} />
              <InfoRow label="วันที่อนุมัติ" value={formatDate(approvedAt)} />
            </div>
          </div>
        </Card>

        <Card collapsible={false} icon={User} title="ข้อมูลผู้ยื่นคำร้อง">
          <div className="grid gap-4 md:grid-cols-2">
            <InfoRow label="ชื่อ-นามสกุล" value={getUserFullName(applicant)} />
            <InfoRow label="อีเมล" value={getUserEmail(applicant)} />
            <InfoRow
              label="รหัสผู้ใช้"
              value={applicant?.user_id || applicant?.id || '-' }
            />
            <InfoRow
              label="สถานะคำร้องของผู้ยื่น"
              value={submission?.status?.status_name || submission?.status?.name || '-'}
            />
          </div>
        </Card>

        <Card collapsible icon={Users} title="ผู้ร่วมวิจัย / Co-authors">
          {coAuthors.length === 0 ? (
            <p className="text-sm text-gray-600">ไม่พบรายชื่อผู้ร่วมคำร้อง</p>
          ) : (
            <div className="space-y-3">
              {coAuthors.map((row) => {
                const userRecord = extractUserFromRow(row);
                const name = getUserFullName(userRecord);
                const email = getUserEmail(userRecord);
                const roleLabel = resolveRoleLabel(row);
                return (
                  <div
                    key={`${row.id || row.user_id || name}`}
                    className="rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-gray-900">{name}</span>
                      <span className="text-sm text-gray-600">บทบาท: {roleLabel}</span>
                      {email && email !== '-' ? (
                        <span className="text-xs text-gray-500">{email}</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card collapsible icon={BookOpen} title="รายละเอียดการตีพิมพ์">
          {pubDetail ? (
            <div className="grid gap-4 md:grid-cols-2">
              <InfoRow label="ชื่อบทความ" value={pubDetail.paper_title} />
              <InfoRow label="ชื่อวารสาร" value={pubDetail.journal_name} />
              <InfoRow label="ประเภทสิ่งพิมพ์" value={pubDetail.publication_type} />
              <InfoRow label="Quartile" value={pubDetail.quartile} />
              <InfoRow label="DOI" value={pubDetail.doi} />
              <InfoRow label="URL" value={pubDetail.url} />
              <InfoRow label="ช่วงหน้า" value={pubDetail.page_numbers} />
              <InfoRow label="Volume / Issue" value={pubDetail.volume_issue} />
              <InfoRow
                label="วันที่ตีพิมพ์"
                value={formatDate(pubDetail.publication_date)}
              />
              <InfoRow
                label="จำนวนผู้แต่งทั้งหมด"
                value={pubDetail.author_count || '-'}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-600">ไม่พบรายละเอียดการตีพิมพ์</p>
          )}
        </Card>

        <Card collapsible icon={ClipboardList} title="สรุปเงินที่ขอสนับสนุน">
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700">จำนวนเงินที่ร้องขอ</h4>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <AmountRow label="เงินรางวัล" amount={rewardRequested} />
                <AmountRow label="ค่าปรับปรุงบทความ" amount={revisionRequested} />
                <AmountRow label="ค่าธรรมเนียมการตีพิมพ์" amount={publicationRequested} />
                <AmountRow label="รวม" amount={totalRequested} />
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700">จำนวนเงินที่ได้รับการอนุมัติ</h4>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <AmountRow label="เงินรางวัล" amount={rewardApproved} />
                <AmountRow label="ค่าปรับปรุงบทความ" amount={revisionApproved} />
                <AmountRow label="ค่าธรรมเนียมการตีพิมพ์" amount={publicationApproved} />
                <AmountRow label="รวม" amount={totalApproved} />
              </div>
              {approvedHidden ? (
                <p className="mt-2 text-xs text-orange-600">
                  จำนวนเงินที่อนุมัติถูกซ่อนสำหรับบทบาทหัวหน้าภาควิชา ข้อมูลนี้จะแสดงเฉพาะในหน้าผู้ดูแลระบบเท่านั้น
                </p>
              ) : null}
            </div>
          </div>
        </Card>

        <Card collapsible icon={FileText} title="เอกสารแนบ">
          {documentsLoading ? (
            <p className="text-sm text-gray-600">กำลังโหลดเอกสารแนบ...</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-gray-600">ไม่พบเอกสารแนบ</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={`${doc.document_id}-${doc.file_id}`}
                  className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{doc.document_type_name}</span>
                    <span className="text-sm text-gray-600">{doc.original_name}</span>
                    {doc.description ? (
                      <span className="text-xs text-gray-500">{doc.description}</span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm flex items-center gap-1"
                      onClick={() => handleView(doc.file_id)}
                    >
                      <Eye size={16} />
                      ดู
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm flex items-center gap-1"
                      onClick={() => handleDownload(doc.file_id, doc.original_name)}
                    >
                      <Download size={16} />
                      ดาวน์โหลด
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageLayout>
  );
}