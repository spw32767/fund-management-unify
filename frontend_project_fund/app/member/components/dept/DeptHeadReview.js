"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Eye, RefreshCcw } from "lucide-react";
import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import DataTable from "../common/DataTable";
import StatusBadge from "../common/StatusBadge";
import { deptHeadAPI } from "@/app/lib/dept_head_api";

// ใช้ lookups แบบเดียวกับ Admin
import defaultAdminApis, { commonAPI } from "@/app/lib/admin_submission_api";

// หน้ารายละเอียด (Dept เวอร์ชัน)
import PublicationSubmissionDetailsDept from "./details/PublicationSubmissionDetailsDept";
import GeneralSubmissionDetailsDept from "./details/GeneralSubmissionDetailsDept";

/** ---------------- Utils ---------------- **/
const formatDate = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
};

/** batch detail fetcher (with simple concurrency) */
async function fetchDetailsForRows(rows, { concurrency = 6 } = {}) {
  const ids = rows.map((r) => r.submission_id || r.id).filter(Boolean);
  const results = new Map();
  let idx = 0;
  async function worker() {
    while (idx < ids.length) {
      const my = ids[idx++];
      try {
        const detail = await deptHeadAPI.getSubmissionDetails(my);
        results.set(my, detail);
      } catch (e) {
        results.set(my, null);
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, ids.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/** --- bulk lookups (cached) จาก commonAPI.getCategories / getSubcategories --- */
const _catMap = new Map();
const _subMap = new Map();
let _lookupsLoaded = false;

async function ensureLookupsLoaded() {
  if (_lookupsLoaded) return;
  try {
    const [cats, subs] = await Promise.all([
      commonAPI.getCategories(),       // GET /api/v1/categories
      commonAPI.getSubcategories(),    // GET /api/v1/subcategories
    ]);
    const catList = cats?.categories || cats?.data || cats?.items || cats || [];
    const subList = subs?.subcategories || subs?.data || subs?.items || subs || [];

    for (const c of catList) {
      const id = c.category_id ?? c.id;
      const name = c.category_name ?? c.name ?? "-";
      if (id != null) _catMap.set(String(id), name);
    }
    for (const s of subList) {
      const id = s.subcategory_id ?? s.id;
      const name = s.subcategory_name ?? s.name ?? "-";
      if (id != null) _subMap.set(String(id), name);
    }
    _lookupsLoaded = true;
  } catch (e) {
    _lookupsLoaded = true;
  }
}

/** ตัดสินใจเลือกคอมโพเนนต์รายละเอียดตาม submission_type */
function pickDetailsComponentBySubmissionType(submissionType) {
  const t = String(submissionType || "").toLowerCase();
  if (t === "publication_reward") return "publication";
  if (t === "fund_application") return "general";
  // default -> general
  return "general";
}

/** สร้างตารางจาก list+details (เติมชื่อผู้ยื่น/ประเภท/ทุนย่อยแบบ dynamic) */
async function hydrateRows(listRows, detailMap) {
  await ensureLookupsLoaded();

  const out = await Promise.all((listRows || []).map(async (item) => {
    // ต้องประกาศ sub ก่อน แล้วค่อยคำนวณ id ที่เชื่อถือได้
    const tentativeId = item?.submission_id ?? item?.id;
    const detail = detailMap?.get(tentativeId);
    const sub = detail?.submission || item;
    const id =
      sub?.submission_id ??
      item?.submission_id ??
      sub?.id ??
      item?.id;

    // ผู้ยื่น: ดึงจาก submission_users (owner > applicant > รายการแรก) หาก sub.user ไม่มี
    const users = detail?.submission_users || [];
    const owner = users.find(u => u?.role === "owner" && u?.is_primary) || users.find(u => u?.role === "owner");
    const applicantRole = users.find(u => u?.role === "applicant");
    const anyUser = owner || applicantRole || users[0] || null;
    const userFromDetail = sub?.user || anyUser?.user || null;
    const applicantName =
      anyUser?.user?.full_name ||
      (userFromDetail ? `${userFromDetail.user_fname || ""} ${userFromDetail.user_lname || ""}`.trim() : null) ||
      item.applicant_name ||
      "-";

    // ประเภท/ทุนย่อย: ใช้ชื่อจาก lookups ที่โหลดมา (ถ้า detail มีชื่อก็ใช้ก่อน)
    const catId = String(sub?.category_id ?? item?.category_id ?? "");
    const subId = String(sub?.subcategory_id ?? item?.subcategory_id ?? "");
    const catName =
      detail?.details?.data?.category?.category_name ||
      item.category_name || item.category?.category_name ||
      (_catMap.get(catId) || "-");
    const subName =
      detail?.details?.data?.subcategory?.subcategory_name ||
      item.subcategory_name || item.subcategory?.subcategory_name ||
      (_subMap.get(subId) || "-");

    // สถานะ: ใช้ชื่อจาก backend; ถ้าไม่มีก็แสดง code เป็น fallback
    const code = String(
      sub?.status?.status_code ??
      sub?.status_code ??
      item?.status?.status_code ??
      item?.status_code ??
      ""
    ) || "";
    const statusLabel =
      sub?.status?.status_name ||
      item?.status?.status_name ||
      (code ? `สถานะ ${code}` : "ไม่ทราบสถานะ");

    const row = {
      id,
      submission_number: sub?.submission_number || item.submission_number || item.request_number || "-",
      category: catName,
      subcategory: subName,
      applicant: applicantName,
      submitted_at: sub?.submitted_at || item.submitted_at || item.created_at,
      status: statusLabel,
      status_code: code,
      submission_type: sub?.submission_type || item?.submission_type || "",
      raw: sub,
    };

    return row;
  }));

  return out;
}

/** ---------------- Component ---------------- **/
export default function DeptHeadReview() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // โหมด “ดูรายละเอียด”
  const [viewing, setViewing] = useState(null); // { id, submission_number, submission_type }

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      // ใช้ /submissions?status_code=5
      const listRes = await deptHeadAPI.getPendingReviews({ status_code: "5" });
      const listRows = listRes?.submissions || listRes?.data || [];

      const detailMap = await fetchDetailsForRows(listRows);
      const normalized = await hydrateRows(listRows, detailMap);

      const filtered = (normalized || []).filter((row) => {
        const label = (row?.status || '').trim();
        const code = String(row?.status_code || '')
          .trim()
          .toLowerCase();
        if (!label && !code) return true;
        if (label === 'ร่าง') return false;
        if (code === 'draft') return false;
        return true;
      });

      setRows(filtered);
    } catch (e) {
      setError(e?.message || "ไม่สามารถโหลดรายการคำร้องได้");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const columns = useMemo(
    () => [
      { header: "เลขคำร้อง", accessor: "submission_number" },
      { header: "ประเภททุน", accessor: "category" },
      {
        header: "หมวด/ทุนย่อย",
        accessor: "subcategory",
        // ตัดชื่อยาวด้วย … และโชว์เต็มใน title
        render: (value) => (
          <span
            className="block max-w-[18rem] md:max-w-[28rem] truncate"
            title={value || "-"}
          >
            {value || "-"}
          </span>
        ),
      },
      { header: "ผู้ยื่นคำร้อง", accessor: "applicant" },
      {
        header: "วันที่ยื่น",
        accessor: "submitted_at",
        render: (value) => (
          <span className="text-gray-600">{formatDate(value)}</span>
        ),
      },
      {
        header: "สถานะ",
        accessor: "status",
        render: (value, row) => (
          <StatusBadge status={value} statusCode={row.status_code} />
        ),
      },
      {
        header: "ดำเนินการ",
        accessor: "actions",
        render: (_, row) => (
          <button
            onClick={() => {
              const sid =
                row.raw?.submission_id ??
                row.raw?.SubmissionID ??
                row.id;
              setViewing({
                id: sid,
                submission_number: row.submission_number,
                submission_type: row.submission_type,
              });
            }}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
          >
            <Eye size={16} />
            ดูรายละเอียด
          </button>
        ),
      },
    ],
    []
  );

  // แสดงหน้า details ตาม submission_type
  const renderViewer = () => {
    if (!viewing) return null;

    // onBack: ปิด viewer และรีเฟรชรายการทันที
    const handleBack = () => {
      setViewing(null);
      load();
    };

    const which = pickDetailsComponentBySubmissionType(viewing.submission_type);
    if (which === "publication") {
      return (
        <PublicationSubmissionDetailsDept
          submissionId={viewing.id}
          onBack={handleBack}
        />
      );
    }
    return (
      <GeneralSubmissionDetailsDept
        submissionId={viewing.id}
        onBack={handleBack}
      />
    );
  };

  // ถ้าเปิดดูรายละเอียด ให้เรนเดอร์หน้า details แทนตาราง
  if (viewing) {
    return renderViewer();
  }

  return (
    <PageLayout
      title="พิจารณาคำร้องของหัวหน้าสาขา"
      subtitle="ตรวจสอบรายละเอียดคำร้องและบันทึกผลการพิจารณา"
      icon={ClipboardList}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/member" },
        { label: "พิจารณาคำร้องของหัวหน้าสาขา" },
      ]}
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              รายการคำร้องที่รอการตรวจสอบ
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="px-3 py-1 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <RefreshCcw size={16}/>
            </button>
          </div>
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
            data={rows}
            emptyMessage="ไม่มีคำร้องที่รอพิจารณา"
          />
        )}
      </Card>
    </PageLayout>
  );
}