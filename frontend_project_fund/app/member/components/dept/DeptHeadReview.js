"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import DataTable from "../common/DataTable";
import StatusBadge from "../common/StatusBadge";
import { deptHeadAPI } from "../../../lib/member_api";
import { statusService } from "../../../lib/status_service";

const formatDate = (value) => {
  if (!value) {
    return "-";
  }
  try {
    return new Date(value).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (error) {
    return value;
  }
};

const STATUS_LABELS = {
  pending: "อยู่ระหว่างการพิจารณาจากหัวหน้าสาขา",
  recommended: "เห็นควรพิจารณาจากหัวหน้าสาขา",
  rejected: "ไม่เห็นควรพิจารณา",
};

export default function DeptHeadReview() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);
  const [actionComment, setActionComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const statusCacheRef = useRef(null);

  const resolveDeptStatuses = async () => {
    if (statusCacheRef.current) {
      return statusCacheRef.current;
    }

    const statuses = await statusService.fetchAll();
    const findByName = (label) =>
      statuses.find((status) => status?.status_name === label);

    const pending = findByName(STATUS_LABELS.pending);
    const recommended = findByName(STATUS_LABELS.recommended);
    const rejected = findByName(STATUS_LABELS.rejected);

    if (!pending) {
      throw new Error(`ไม่พบสถานะ "${STATUS_LABELS.pending}"`);
    }
    if (!recommended) {
      throw new Error(`ไม่พบสถานะ "${STATUS_LABELS.recommended}"`);
    }
    if (!rejected) {
      throw new Error(`ไม่พบสถานะ "${STATUS_LABELS.rejected}"`);
    }

    const toId = (status) => {
      if (!status) return undefined;
      const rawId = status.application_status_id ?? status.status_id ?? status.id;
      const numericId = Number(rawId);
      return Number.isFinite(numericId) ? numericId : undefined;
    };

    const info = {
      pending,
      recommended,
      rejected,
      pendingId: toId(pending),
      recommendedId: toId(recommended),
      rejectedId: toId(rejected),
    };

    if (!info.pendingId || !info.recommendedId || !info.rejectedId) {
      throw new Error("ไม่สามารถระบุรหัสสถานะหัวหน้าสาขาได้");
    }

    statusCacheRef.current = info;
    return info;
  };

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const statusInfo = await resolveDeptStatuses();
      const response = await deptHeadAPI.getPendingReviews({ status_id: statusInfo.pendingId });
      const rows = response?.submissions || response?.data || [];

      const normalized = rows
        .filter((item) => {
          const itemStatusId = Number(
            item.status_id ??
            item.status?.application_status_id ??
            item.status?.status_id ??
            item.status?.id
          );
          return Number.isFinite(itemStatusId)
            ? itemStatusId === statusInfo.pendingId
            : true;
        })
        .map((item) => ({
          id: item.submission_id || item.id,
          submission_number: item.submission_number || item.request_number || "-",
          category: item.category_name || item.category?.category_name || "-",
          subcategory: item.subcategory_name || item.subcategory?.subcategory_name || "-",
          applicant:
          item.applicant_name ||
          item.user?.full_name ||
          `${item.user?.user_fname || ""} ${item.user?.user_lname || ""}`.trim() ||
          "-",
        submitted_at: item.submitted_at || item.created_at,
        status:
          item.status?.status_name ||
          item.status_name ||
          item.status ||
          "รอพิจารณา",
        raw: item,
      }));

      setSubmissions(normalized);
    } catch (err) {
      console.error("Error loading dept head submissions:", err);
      setError(err?.message || "ไม่สามารถโหลดรายการคำร้องได้");
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const columns = useMemo(
    () => [
      {
        header: "เลขคำร้อง",
        accessor: "submission_number",
      },
      {
        header: "ประเภททุน",
        accessor: "category",
      },
      {
        header: "หมวด/ทุนย่อย",
        accessor: "subcategory",
      },
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
        accessor: "status",
        render: (value) => <StatusBadge status={value} />,
      },
      {
        header: "ดำเนินการ",
        accessor: "actions",
        render: (_, row) => (
          <div className="flex gap-2">
            <button
              onClick={() => openAction(row, "recommend")}
              className="px-3 py-1 text-sm rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              เห็นควร/ส่งต่อ Admin
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
    []
  );

  const openAction = (row, action) => {
    setActionTarget({ ...row, action });
    setActionComment("");
    setActionError(null);
  };

  const closeAction = () => {
    setActionTarget(null);
    setActionComment("");
    setActionError(null);
  };

  const confirmAction = async () => {
    if (!actionTarget) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const statusInfo = await resolveDeptStatuses();
      const basePayload = {
        comment: actionComment?.trim() ? actionComment.trim() : undefined,
        reviewed_at: new Date().toISOString(),
      };

      if (actionTarget.action === "recommend") {
        await deptHeadAPI.recommendSubmission(actionTarget.id, {
          ...basePayload,
          status_id: statusInfo.recommendedId,
        });
      } else {
        await deptHeadAPI.rejectSubmission(actionTarget.id, {
          ...basePayload,
          status_id: statusInfo.rejectedId,
        });
      }
      closeAction();
      await loadSubmissions();
    } catch (err) {
      console.error("Dept review action failed:", err);
      setActionError(err?.message || "ไม่สามารถดำเนินการได้");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <PageLayout
      title="พิจารณาคำร้อง (สาขา)"
      subtitle="ตรวจสอบและส่งต่อคำร้องไปยังผู้ดูแลระบบ"
      icon={ClipboardList}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/member" },
        { label: "พิจารณาคำร้อง (สาขา)" },
      ]}
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">รายการคำร้องที่รอตรวจสอบ</h3>
            <p className="text-sm text-gray-500 mt-1">
              เลือกดำเนินการเพื่อเห็นควรและส่งต่อ หรือปฏิเสธพร้อมระบุเหตุผล
            </p>
          </div>
          <button
            onClick={loadSubmissions}
            className="px-3 py-1 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            รีเฟรชรายการ
          </button>
        </div>
      </div>

      <Card collapsible={false}>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-600">
            <Loader2 className="animate-spin mr-2" />
            กำลังโหลดข้อมูล...
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-600">{error}</div>
        ) : (
          <DataTable
            columns={columns}
            data={submissions}
            emptyMessage="ไม่มีคำร้องที่รอพิจารณา"
          />
        )}
      </Card>

      {actionTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                {actionTarget.action === "recommend" ? "เห็นควร/ส่งต่อ Admin" : "ปฏิเสธคำร้อง"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                เลขคำร้อง {actionTarget.submission_number}
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ความคิดเห็นเพิ่มเติม
                </label>
                <textarea
                  value={actionComment}
                  onChange={(event) => setActionComment(event.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ระบุเหตุผลหรือข้อมูลเพิ่มเติม (ถ้ามี)"
                />
              </div>
              {actionError && (
                <div className="text-sm text-red-600">{actionError}</div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={closeAction}
                disabled={actionLoading}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmAction}
                disabled={actionLoading}
                className={`px-4 py-2 text-sm rounded-md text-white ${
                  actionTarget.action === "recommend"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-red-600 hover:bg-red-700"
                } disabled:opacity-60`}
              >
                {actionLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} />
                    กำลังบันทึก...
                  </span>
                ) : actionTarget.action === "recommend" ? (
                  "เห็นควร/ส่งต่อ"
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