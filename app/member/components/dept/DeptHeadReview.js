"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { deptHeadAPI } from "@/app/lib/member_api";
import PageLayout from "@/app/member/components/common/PageLayout";
import StatusBadge from "@/app/member/components/common/StatusBadge";
import DeptPublicationSubmissionDetails from "@/app/member/components/dept/DeptPublicationSubmissionDetails";
import { Loader2 } from "lucide-react";
import { useStatusMap } from "@/app/hooks/useStatusMap";

// Simple TH date (BE +543). ป้องกัน null/invalid => "-"
function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d)) return "-";
  const thYear = d.getFullYear() + 543;
  const th = d.toLocaleDateString("th-TH", { day: "numeric", month: "long" });
  return `${th} ${thYear}`;
}

/**
 * DeptHeadReview
 * - แสดงรายการที่อยู่สถานะ "อยู่ระหว่างการพิจารณาจากหัวหน้าสาขา"
 * - กดดูรายละเอียดจะสลับไปหน้า DeptPublicationSubmissionDetails ภายในคอมโพเนนต์เดียว
 * - เห็นควร / ไม่เห็นควร ได้จาก modal ดำเนินการ (ส่ง payload { decision, comment? })
 */
export default function DeptHeadReview() {
  // ----- toggle list <-> details -----
  const [selectedId, setSelectedId] = useState(null);
  const handleView = useCallback((id) => setSelectedId(id), []);
  const handleBack = useCallback(() => setSelectedId(null), []);

  // ----- load list -----
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  // ----- action modal -----
  const [actionTarget, setActionTarget] = useState(null); // { id, submission_number, action }
  const [actionComment, setActionComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // for label rendering
  const { getLabelById } = useStatusMap();

  const normalizeRow = useCallback((item) => {
    const statusIdRaw =
      item?.status_id ??
      item?.status?.application_status_id ??
      item?.status?.status_id ??
      item?.status?.id;
    const statusId = Number(statusIdRaw);
    const normalizedStatusId = Number.isFinite(statusId) ? statusId : undefined;

    const fallbackName = `${item?.user?.user_fname || ""} ${item?.user?.user_lname || ""}`.trim();
    const applicantName =
      item?.applicant_name ||
      item?.user?.full_name ||
      (fallbackName !== "" ? fallbackName : null);

    return {
      id: item?.submission_id || item?.id,
      submission_number: item?.submission_number || item?.request_number || "-",
      category: item?.category_name || item?.category?.category_name || "-",
      subcategory: item?.subcategory_name || item?.subcategory?.subcategory_name || "-",
      applicant: applicantName || "-",
      submitted_at: item?.submitted_at || item?.created_at,
      statusId: normalizedStatusId,
      statusLabel: item?.status?.status_name || item?.status_name || item?.status || "",
      raw: item,
    };
  }, []);

  const loadSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // ให้ backend กรองตามคีย์ "pending" เอง (ไม่ต้องส่ง status_id)
      const params = { status: "pending" };
      const response = await deptHeadAPI.getPendingReviews(params);

      const rows = response?.submissions || response?.data || [];
      const normalized = rows.map(normalizeRow);

      // ถ้าต้องการกรองซ้ำฝั่ง FE ให้ทำที่นี่ (ส่วนใหญ่ไม่จำเป็น)
      setSubmissions(normalized);
    } catch (err) {
      console.error("Error loading dept head submissions:", err);
      setError(err?.message || "ไม่สามารถโหลดรายการคำร้องได้");
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [normalizeRow]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // ----- action modal -----
  const openAction = useCallback((row, action) => {
    setActionTarget({ ...row, action }); // action = "approve" | "reject"
    setActionComment("");
    setActionError(null);
  }, []);

  const closeAction = useCallback(() => {
    setActionTarget(null);
    setActionComment("");
    setActionError(null);
  }, []);

  const confirmAction = useCallback(async () => {
    if (!actionTarget) return;

    const isApprove = actionTarget.action === "approve";
    const payload = { decision: isApprove ? "approve" : "reject" };
    const comment = actionComment.trim();
    if (comment) payload.comment = comment;

    setActionLoading(true);
    setActionError(null);

    try {
      await deptHeadAPI.submitDecision(actionTarget.id, payload);
      closeAction();
      await loadSubmissions();
    } catch (err) {
      console.error("Dept review action failed:", err);
      setActionError(err?.message || "ไม่สามารถดำเนินการได้");
    } finally {
      setActionLoading(false);
    }
  }, [actionTarget, actionComment, closeAction, loadSubmissions]);

  // ----- table -----
  const columns = useMemo(
    () => [
      { header: "เลขคำร้อง", accessor: "submission_number" },
      { header: "ประเภททุน", accessor: "category" },
      { header: "หมวด/ทุนย่อย", accessor: "subcategory" },
      {
        header: "ผู้ยื่นคำร้อง",
        accessor: "applicant",
      },
      {
        header: "วันที่ยื่น",
        accessor: "submitted_at",
        render: (value) => <span className="text-gray-600">{formatDate(value)}</span>,
      },
      {
        header: "สถานะ",
        accessor: "statusId",
        render: (value, row) => (
          <StatusBadge statusId={value} fallbackLabel={getLabelById?.(value) || row.statusLabel || "อยู่ระหว่างการพิจารณา"} />
        ),
      },
      {
        header: "ดำเนินการ",
        accessor: "actions",
        render: (_, row) => (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleView(row.id)}
              className="px-3 py-1 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
              title="ดูรายละเอียด"
            >
              ดูรายละเอียด
            </button>
            <button
              onClick={() => openAction(row, "approve")}
              className="px-3 py-1 text-sm rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              อนุมัติ (เห็นควร)
            </button>
            <button
              onClick={() => openAction(row, "reject")}
              className="px-3 py-1 text-sm rounded-md border border-red-200 text-red-600 hover:bg-red-50"
            >
              ปฏิเสธ
            </button>
          </div>
        ),
      },
    ],
    [getLabelById, handleView, openAction]
  );

  // ====== RENDER ======
  if (selectedId) {
    return (
      <PageLayout title="รายละเอียดคำร้อง (หัวหน้าสาขา)">
        <DeptPublicationSubmissionDetails submissionId={selectedId} onBack={handleBack} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="พิจารณาคำร้อง (หัวหน้าสาขา)">
      {/* error block */}
      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {/* table */}
      <div className="overflow-x-auto rounded-lg border border-gray-300">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.accessor}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
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
            ) : submissions.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  ไม่พบรายการที่อยู่ระหว่างการพิจารณา
                </td>
              </tr>
            ) : (
              submissions.map((row) => (
                <tr key={row.id}>
                  {columns.map((col) => {
                    const value = row[col.accessor];
                    return (
                      <td key={col.accessor} className="px-4 py-3 text-sm text-gray-800">
                        {col.render ? col.render(value, row) : value ?? "-"}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* action modal */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {actionTarget.action === "approve" ? "ยืนยันการเห็นควร" : "ยืนยันการปฏิเสธ"}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                เลขคำร้อง: {actionTarget.submission_number}
              </p>
            </div>

            <div className="space-y-4 px-6 py-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">ความคิดเห็นเพิ่มเติม</label>
                <textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ระบุเหตุผลหรือข้อมูลเพิ่มเติม (ถ้ามี)"
                />
              </div>
              {actionError && <div className="text-sm text-red-600">{actionError}</div>}
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                onClick={closeAction}
                disabled={actionLoading}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmAction}
                disabled={actionLoading}
                className={`rounded-md px-4 py-2 text-sm text-white ${
                  actionTarget.action === "approve" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"
                } disabled:opacity-60`}
              >
                {actionLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} />
                    กำลังบันทึก...
                  </span>
                ) : actionTarget.action === "approve" ? (
                  "อนุมัติ"
                ) : (
                  "ปฏิเสธ"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
