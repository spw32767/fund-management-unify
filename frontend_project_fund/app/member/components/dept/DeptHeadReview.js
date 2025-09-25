"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2, RefreshCcw } from "lucide-react";
import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import DataTable from "../common/DataTable";
import StatusBadge from "../common/StatusBadge";
import { deptHeadSubmissionAPI } from "@/app/lib/dept_head_submission_api";
import { toast } from "react-hot-toast";

const formatDate = (value) => {
  if (!value) return "-";
  try {
    const date = new Date(value);
    return date.toLocaleString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return value;
  }
};

const extractSubmissionRows = (payload) => {
  if (!payload) return [];
  const rows = payload.submissions || payload.data || payload.items || [];
  return rows.map((item) => {
    const status = item.status || item.Status || null;
    const categoryName =
      item.category_name ||
      item.category?.category_name ||
      item.Category?.category_name ||
      "-";
    const subcategoryName =
      item.subcategory_name ||
      item.subcategory?.subcategory_name ||
      item.Subcategory?.subcategory_name ||
      "-";
    const applicant =
      item.applicant_name ||
      item.applicant ||
      item.user?.full_name ||
      `${item.user?.user_fname || ""} ${item.user?.user_lname || ""}`.trim() ||
      "-";

    return {
      id: item.submission_id || item.id,
      submission_number: item.submission_number || item.request_number || "-",
      submission_type: item.submission_type || item.type || "fund_application",
      status_id: item.status_id || status?.application_status_id,
      status,
      applicant,
      category: categoryName,
      subcategory: subcategoryName,
      submitted_at:
        item.submitted_at ||
        item.submission_date ||
        item.created_at ||
        item.SubmittedAt,
    };
  });
};

export default function DeptHeadReview() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await deptHeadSubmissionAPI.list({ status_code: "5" });
      setRows(extractSubmissionRows(response));
    } catch (err) {
      console.error("Failed to load dept head submissions", err);
      setError(err?.message || "ไม่สามารถโหลดรายการคำร้องได้");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadRows();
      toast.success("อัปเดตรายการล่าสุดแล้ว");
    } catch (err) {
      // loadRows already handles error state
    } finally {
      setRefreshing(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        header: "เลขคำร้อง",
        accessor: "submission_number",
        render: (value, row) => (
          <Link
            href={`/member/dept-review/${row.id}`}
            className="text-blue-600 hover:underline"
          >
            {value || "-"}
          </Link>
        ),
      },
      {
        header: "ประเภททุน",
        accessor: "category",
      },
      {
        header: "ทุนย่อย",
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
        accessor: "status_id",
        render: (value, row) => (
          <StatusBadge statusId={value} fallbackLabel={row.status?.status_name} />
        ),
      },
      {
        header: "รายละเอียด",
        accessor: "actions",
        render: (_, row) => (
          <button
            onClick={() => router.push(`/member/dept-review/${row.id}`)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50"
          >
            ดูรายละเอียด
          </button>
        ),
      },
    ],
    [router]
  );

  return (
    <PageLayout
      title="พิจารณาคำร้อง (หัวหน้าสาขา)"
      subtitle="ตรวจสอบคำร้องที่อยู่ระหว่างการพิจารณาของหัวหน้าสาขา"
      icon={ClipboardList}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/member" },
        { label: "พิจารณาคำร้อง (หัวหน้าสาขา)" },
      ]}
      actions={
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} /> รีเฟรช
        </button>
      }
    >
      <Card collapsible={false}>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="animate-spin mr-2" /> กำลังโหลดข้อมูล...
          </div>
        ) : error ? (
          <div className="text-center text-red-600 py-16">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            ไม่มีคำร้องที่รอพิจารณาในขณะนี้
          </div>
        ) : (
          <DataTable columns={columns} data={rows} emptyMessage="ไม่มีคำร้องที่รอพิจารณา" />
        )}
      </Card>
    </PageLayout>
  );
}
