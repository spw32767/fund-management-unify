"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import PageLayout from "@/app/member/components/common/PageLayout";
import StatusBadge from "@/app/member/components/common/StatusBadge";
import DeptPublicationSubmissionDetails from "@/app/member/components/dept/DeptPublicationSubmissionDetails";
import { deptHeadAPI } from "@/app/lib/member_api";
import { useStatusMap } from "@/app/hooks/useStatusMap";

const REVIEW_STATUS = "DEPTHEAD_REVIEWING";
const PAGE_SIZE = 10;

function formatThaiDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const formatted = date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return formatted;
}

function getApplicantName(item) {
  const user = item?.user || item?.User || {};
  const fallback = [user.user_fname, user.user_lname].filter(Boolean).join(" ");
  return (
    item?.applicant_name ||
    user.full_name ||
    user.fullname ||
    fallback ||
    "-"
  ).trim();
}

export default function DeptHeadReview() {
  const [selectedId, setSelectedId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    per_page: PAGE_SIZE,
    has_next: false,
    has_prev: false,
  });

  const { getLabelById } = useStatusMap();

  const loadSubmissions = useCallback(async (targetPage = 1) => {
    const pageParam = Math.max(1, targetPage);
    try {
      setLoading(true);
      setError(null);

      const response = await deptHeadAPI.listSubmissions({
        status: REVIEW_STATUS,
        page: pageParam,
        limit: PAGE_SIZE,
      });

      const items = response?.submissions || response?.data || [];
      const pager = response?.pagination || {};

      setSubmissions(items);
      setPagination({
        current_page: pager.current_page || pageParam,
        total_pages: pager.total_pages || Math.max(1, Math.ceil((pager.total_count || items.length) / (pager.per_page || PAGE_SIZE))),
        total_count: pager.total_count ?? items.length,
        per_page: pager.per_page || PAGE_SIZE,
        has_next: pager.has_next ?? (pageParam < (pager.total_pages || 1)),
        has_prev: pager.has_prev ?? (pageParam > 1),
      });
      setPage(pager.current_page || pageParam);
    } catch (err) {
      console.error("Error loading dept head submissions:", err);
      setSubmissions([]);
      setError(err?.message || "ไม่สามารถโหลดรายการคำร้องได้");
      setPagination((prev) => ({
        ...prev,
        current_page: pageParam,
        total_pages: 1,
        total_count: 0,
        has_next: false,
        has_prev: pageParam > 1,
      }));
      setPage(pageParam);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubmissions(1);
  }, [loadSubmissions]);

  const columns = useMemo(
    () => [
      { header: "เลขคำร้อง", accessor: "submission_number" },
      { header: "ประเภททุน", accessor: "category" },
      { header: "หมวด/ทุนย่อย", accessor: "subcategory" },
      { header: "ผู้ยื่นคำร้อง", accessor: "applicant" },
      { header: "วันที่ยื่น", accessor: "submitted_at" },
      { header: "สถานะ", accessor: "status" },
      { header: "ดำเนินการ", accessor: "actions" },
    ],
    []
  );

  const rows = useMemo(() => {
    return (Array.isArray(submissions) ? submissions : []).map((item) => {
      const statusIdRaw =
        item?.status_id ??
        item?.status?.application_status_id ??
        item?.status?.status_id ??
        item?.Status?.ApplicationStatusID;
      const statusId = Number.isFinite(Number(statusIdRaw)) ? Number(statusIdRaw) : undefined;

      return {
        id: item?.submission_id || item?.SubmissionID,
        submission_number: item?.submission_number || item?.SubmissionNumber || "-",
        category:
          item?.category?.category_name ||
          item?.Category?.CategoryName ||
          item?.category_name ||
          "-",
        subcategory:
          item?.subcategory?.subcategory_name ||
          item?.Subcategory?.SubcategoryName ||
          item?.subcategory_name ||
          "-",
        applicant: getApplicantName(item),
        submitted_at: item?.submitted_at || item?.SubmittedAt || item?.created_at || item?.CreatedAt,
        statusId,
        statusLabel:
          item?.status?.status_name ||
          item?.Status?.StatusName ||
          item?.status_name ||
          "",
      };
    });
  }, [submissions]);

  const handleDecisionComplete = useCallback(() => {
    setSelectedId(null);
    loadSubmissions(page);
  }, [loadSubmissions, page]);

  const handleBack = useCallback(() => {
    setSelectedId(null);
    loadSubmissions(page);
  }, [loadSubmissions, page]);

  if (selectedId) {
    return (
      <DeptPublicationSubmissionDetails
        submissionId={selectedId}
        onBack={handleBack}
        onDecisionComplete={handleDecisionComplete}
      />
    );
  }

  return (
    <PageLayout title="พิจารณาคำร้อง (หัวหน้าสาขา)">
      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-300">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.accessor}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} />
                    กำลังโหลดรายการ...
                  </span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  ไม่พบรายการที่อยู่ระหว่างการพิจารณา
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id || row.submission_number}>
                  <td className="px-4 py-3 text-sm text-gray-800">{row.submission_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{row.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{row.subcategory}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{row.applicant}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{formatThaiDate(row.submitted_at)}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    <StatusBadge
                      statusId={row.statusId}
                      fallbackLabel={getLabelById?.(row.statusId) || row.statusLabel || "อยู่ระหว่างการพิจารณา"}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    <button
                      onClick={() => setSelectedId(row.id)}
                      className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
        <span>พบทั้งหมด {pagination.total_count} รายการ</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadSubmissions(page - 1)}
            disabled={loading || !pagination.has_prev}
            className="rounded-md border border-gray-300 px-3 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60 hover:bg-gray-50"
          >
            ก่อนหน้า
          </button>
          <span>
            หน้า {pagination.current_page} / {pagination.total_pages || 1}
          </span>
          <button
            onClick={() => loadSubmissions(page + 1)}
            disabled={loading || !pagination.has_next}
            className="rounded-md border border-gray-300 px-3 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60 hover:bg-gray-50"
          >
            ถัดไป
          </button>
        </div>
      </div>
    </PageLayout>
  );
}

