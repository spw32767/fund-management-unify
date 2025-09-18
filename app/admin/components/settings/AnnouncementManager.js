"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  RefreshCw
} from "lucide-react";
import Swal from "sweetalert2";

import { adminAnnouncementAPI } from "@/app/lib/admin_announcement_api";

/** ===== Helpers reused across settings pages ===== */
function getAuthHeader() {
  try {
    const keys = ["access_token", "token", "auth_token", "Authorization"];
    for (const k of keys) {
      const v = typeof window !== "undefined" ? window.localStorage.getItem(k) : null;
      if (v) return /^Bearer\s+/i.test(v) ? v : `Bearer ${v}`;
    }
    if (typeof document !== "undefined") {
      const m = document.cookie.match(/(?:^|;\s*)(access_token|token|auth_token)=([^;]+)/i);
      if (m) return `Bearer ${decodeURIComponent(m[2])}`;
    }
  } catch {}
  return null;
}

function toISOOrNull(v) {
  if (!v) return null;
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch { return null; }
}

function fmtBytes(n) {
  const num = +n || 0;
  if (num >= 1<<20) return (num / (1<<20)).toFixed(2) + " MB";
  if (num >= 1<<10) return (num / (1<<10)).toFixed(2) + " KB";
  return num + " B";
}

function formatThaiDateTime(isoOrNull) {
  if (!isoOrNull) return "-";
  try {
    const d = new Date(isoOrNull);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch { return "-"; }
}

const TYPE_OPTIONS = [
  { value: "general", label: "ทั่วไป" },
  { value: "research_fund", label: "ทุนวิจัย" },
  { value: "promotion_fund", label: "ทุนส่งเสริม" },
  { value: "fund_application", label: "รับสมัครทุน/แบบฟอร์ม" },
];
const STATUS_OPTIONS = [
  { value: "active", label: "เผยแพร่" },
  { value: "inactive", label: "ปิดเผยแพร่" },
];
const PRIORITY_OPTIONS = [
  { value: "normal", label: "ปกติ" },
  { value: "high", label: "สูง" },
  { value: "urgent", label: "ด่วน" },
];

const BASE = "/api/announcements";

/** ===== Main Component ===== */
export default function AnnouncementManager() {
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [years, setYears] = useState([]);
  const [filters, setFilters] = useState({
    q: "",
    type: "",
    status: "",
    year_id: "",
    sort: "display_order:asc,published_at:desc",
    page: 1,
    limit: 20,
  });
  const [total, setTotal] = useState(0);

  // Modals state
  const [editOpen, setEditOpen] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [editing, setEditing] = useState(null); // record
  const [form, setForm] = useState(blankForm());
  const [fileObj, setFileObj] = useState(null);

  const debounceRef = useRef(null);

  useEffect(() => {
    loadYears();
  }, []);

  useEffect(() => {
    loadAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.limit, filters.sort, filters.type, filters.status, filters.year_id]);

  function blankForm() {
    return {
      title: "",
      description: "",
      announcement_type: "",
      announcement_reference_number: "",
      priority: "normal",
      display_order: "",
      status: "active",
      published_at: "",
      expired_at: "",
      year_id: "",
    };
  }

  async function loadYears() {
    try {
      const auth = getAuthHeader();
      const res = await fetch("/api/years", { headers: { ...(auth ? { Authorization: auth } : {}) }});
      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        const ys = list.map(y => ({ year_id: y.year_id ?? y.id ?? y.yearId ?? y.year, year: String(y.year ?? y.name ?? y.value ?? y.year_id) }));
        setYears(ys);
      }
    } catch {}
  }

  async function loadAnnouncements() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.type) params.set("type", filters.type);
      if (filters.status) params.set("status", filters.status);
      if (filters.year_id) params.set("year_id", filters.year_id);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));
      if (filters.sort) params.set("sort", filters.sort);

      const data = await adminAnnouncementAPI.list(Object.fromEntries(params));
      setAnnouncements(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
      setTotal(+data?.total || 0);
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  }

  function toast(icon, title) {
    Swal.fire({ icon, title, timer: 1600, showConfirmButton: false });
  }
  async function confirm(text) {
    const r = await Swal.fire({
      icon: "question",
      title: "ยืนยันการทำรายการ",
      text,
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });
    return r.isConfirmed;
  }

  function openCreate() {
    setEditing(null);
    setForm(blankForm());
    setEditOpen(true);
  }
  function openEdit(row) {
    setEditing(row);
    setForm({
      title: row.title || "",
      description: row.description || "",
      announcement_type: row.announcement_type || "",
      announcement_reference_number: row.announcement_reference_number || "",
      priority: row.priority || "normal",
      display_order: row.display_order ?? "",
      status: row.status || "active",
      published_at: row.published_at ? row.published_at.substring(0,16) : "",
      expired_at: row.expired_at ? row.expired_at.substring(0,16) : "",
      year_id: row.year_id ?? "",
    });
    setEditOpen(true);
  }
  function openReplaceFile(row) {
    setEditing(row);
    setFileObj(null);
    setFileOpen(true);
  }

  async function handleSaveMeta(e) {
    e?.preventDefault?.();
    if (!String(form.title).trim()) {
      toast("warning", "กรุณากรอกหัวข้อประกาศ");
      return;
    }
    if (!editing && !fileObj) {
      toast("warning", "กรุณาแนบไฟล์ PDF");
      return;
    }
    if (form.published_at && form.expired_at && new Date(form.published_at) > new Date(form.expired_at)) {
      toast("warning", "วันเผยแพร่ต้องไม่เกินวันหมดอายุ");
      return;
    }

    try {
      if (!editing) {
        // CREATE (multipart)
        await adminAnnouncementAPI.create({
          title: String(form.title || "").trim(),
          description: form.description || undefined,
          announcement_type: form.announcement_type || undefined,
          announcement_reference_number: form.announcement_reference_number || undefined,
          priority: form.priority || "normal",
          display_order: form.display_order === "" ? undefined : String(form.display_order),
          status: form.status || "active",
          published_at: form.published_at ? new Date(form.published_at).toISOString() : undefined,
          expired_at: form.expired_at ? new Date(form.expired_at).toISOString() : undefined,
          year_id: form.year_id || undefined,
          file: fileObj, // สำคัญ
        });
        toast("success", "สร้างประกาศสำเร็จ");
      } else {
        // UPDATE (JSON)
        const payload = {
          title: String(form.title || "").trim(),
          description: form.description || null,
          announcement_type: form.announcement_type || null,
          announcement_reference_number: form.announcement_reference_number || null,
          priority: form.priority || "normal",
          display_order: form.display_order === "" ? null : +form.display_order,
          status: form.status || "active",
          published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
          expired_at: form.expired_at ? new Date(form.expired_at).toISOString() : null,
          year_id: form.year_id || null,
        };
        await adminAnnouncementAPI.update((editing.announcement_id || editing.id), payload);
        toast("success", "บันทึกข้อมูลสำเร็จ");
      }

      setEditOpen(false);
      await loadAnnouncements();
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาด");
    }
  }


  async function handleReplaceFile(e) {
    e?.preventDefault?.();
    if (!fileObj) {
      toast("warning", "กรุณาเลือกไฟล์ PDF");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("file", fileObj);
      const id = editing?.announcement_id || editing?.id;
      const auth = getAuthHeader();
      await adminAnnouncementAPI.replaceFile(id, fileObj);
      toast("success", "แทนที่ไฟล์สำเร็จ");
      setFileOpen(false);
      await loadAnnouncements();
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาด");
    }
  }

  async function handleDelete(row) {
    const ok = await confirm(`ต้องการลบประกาศ “${row.title}” ใช่หรือไม่?`);
    if (!ok) return;
    try {
      const id = row.announcement_id || row.id;
      const auth = getAuthHeader();
      await adminAnnouncementAPI.remove(id);
      toast("success", "ลบประกาศสำเร็จ");
      await loadAnnouncements();
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาด");
    }
  }

  function onSearchChange(v) {
    setFilters((f) => ({ ...f, page: 1, q: v }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadAnnouncements();
    }, 400);
  }

  function toggleSort(key) {
    const parts = (filters.sort || "").split(",").filter(Boolean);
    const map = new Map(parts.map(p => {
      const [k, d] = p.split(":");
      return [k, d || "asc"];
    }));
    const cur = map.get(key) || "asc";
    const next = cur === "asc" ? "desc" : "asc";
    map.set(key, next);
    const order = ["display_order","published_at","priority"];
    const out = order.filter(k => map.has(k))
      .map(k => `${k}:${map.get(k)}`).join(",");
    setFilters(f => ({ ...f, sort: out || `${key}:${next}` }));
  }

  const sorted = useMemo(() => announcements, [announcements]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">จัดการประกาศ/ไฟล์ (Announcements)</h2>
          <p className="text-sm text-gray-500">อัปโหลดไฟล์ PDF และกำหนดข้อมูลประกาศเพื่อเผยแพร่ให้ผู้ใช้งาน</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAnnouncements()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
            title="โหลดข้อมูลใหม่"
          >
            <RefreshCw size={16} />
            รีเฟรช
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            เพิ่มประกาศ
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
        <div className="md:col-span-2">
          <input
            type="text"
            placeholder="ค้นหา (หัวข้อ/รายละเอียด/เลขอ้างอิง)"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.q}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 border rounded-lg"
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, page: 1, type: e.target.value }))}
        >
          <option value="">ทุกประเภท</option>
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          className="px-3 py-2 border rounded-lg"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, page: 1, status: e.target.value }))}
        >
          <option value="">ทุกสถานะ</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          className="px-3 py-2 border rounded-lg"
          value={filters.year_id}
          onChange={(e) => setFilters((f) => ({ ...f, page: 1, year_id: e.target.value }))}
        >
          <option value="">ทุกปี</option>
          {years.map(y => <option key={y.year_id ?? y.year} value={y.year_id ?? y.year}>{y.year}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th label="ลำดับแสดง" sortKey="display_order" onSort={toggleSort} sortStr={filters.sort} />
              <th className="px-3 py-2 text-left font-medium text-gray-600">หัวข้อ</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">ประเภท</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">ปี</th>
              <Th label="เผยแพร่" sortKey="published_at" onSort={toggleSort} sortStr={filters.sort} />
              <th className="px-3 py-2 text-left font-medium text-gray-600">หมดอายุ</th>
              <Th label="ความสำคัญ" sortKey="priority" onSort={toggleSort} sortStr={filters.sort} />
              <th className="px-3 py-2 text-left font-medium text-gray-600">สถานะ</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">ไฟล์</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-gray-500">
                  กำลังโหลด...
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-gray-500">
                  ไม่พบข้อมูล
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={row.announcement_id || row.id}>
                  <td className="px-3 py-2">{row.display_order ?? "-"}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.title}</div>
                    {row.announcement_reference_number && (
                      <div className="text-xs text-gray-500">เลขอ้างอิง: {row.announcement_reference_number}</div>
                    )}
                    {row.description && (
                      <div className="text-xs text-gray-500 line-clamp-1">{row.description}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">{TYPE_OPTIONS.find(o=>o.value===row.announcement_type)?.label || "-"}</td>
                  <td className="px-3 py-2">{row.year_id ?? "-"}</td>
                  <td className="px-3 py-2">{formatThaiDateTime(row.published_at)}</td>
                  <td className="px-3 py-2">{formatThaiDateTime(row.expired_at)}</td>
                  <td className="px-3 py-2">
                    {row.priority === "urgent" ? "ด่วน" : row.priority === "high" ? "สูง" : "ปกติ"}
                  </td>
                  <td className="px-3 py-2">
                    {row.status === "active" ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">เผยแพร่</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">ปิด</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.file_path ? (
                      <a
                        href={row.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <FileText size={14} />
                        เปิดไฟล์
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                    {row.file_size ? <div className="text-xs text-gray-400">{fmtBytes(row.file_size)}</div> : null}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-gray-50"
                        title="แก้ไขข้อมูล"
                      >
                        <Edit size={14} />
                        แก้ไข
                      </button>
                      <button
                        onClick={() => openReplaceFile(row)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-gray-50"
                        title="แทนที่ไฟล์"
                      >
                        <Upload size={14} />
                        ไฟล์
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-red-50 text-red-600"
                        title="ลบ"
                      >
                        <Trash2 size={14} />
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-500">
          แสดง {sorted.length} รายการ {total ? `จากทั้งหมด ${total}` : ""}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filters.limit}
            onChange={(e) => setFilters((f) => ({ ...f, page: 1, limit: +e.target.value }))}
            className="px-2 py-1 border rounded"
          >
            {[10,20,50,100].map(n => <option key={n} value={n}>{n}/หน้า</option>)}
          </select>
          <button
            disabled={filters.page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            ก่อนหน้า
          </button>
          <div className="px-2 text-sm">หน้า {filters.page}</div>
          <button
            disabled={sorted.length < filters.limit}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            ถัดไป
          </button>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <FileText size={18} />
                <h3 className="font-semibold">{editing ? "แก้ไขประกาศ" : "เพิ่มประกาศ"}</h3>
              </div>
              <button onClick={() => setEditOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMeta} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">หัวข้อประกาศ *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">รายละเอียด</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">ประเภท</label>
                <select
                  value={form.announcement_type}
                  onChange={(e) => setForm((f) => ({ ...f, announcement_type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">-</option>
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">เลขอ้างอิงประกาศ</label>
                <input
                  type="text"
                  value={form.announcement_reference_number}
                  onChange={(e) => setForm((f) => ({ ...f, announcement_reference_number: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">ความสำคัญ</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">ลำดับแสดง</label>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ตัวเลขเรียงลำดับในหน้า"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">สถานะ</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">ปี</label>
                <select
                  value={form.year_id}
                  onChange={(e) => setForm((f) => ({ ...f, year_id: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">-</option>
                  {years.map(y => <option key={y.year_id ?? y.year} value={y.year_id ?? y.year}>{y.year}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">วันเวลาเผยแพร่</label>
                <input
                  type="datetime-local"
                  value={form.published_at}
                  onChange={(e) => setForm((f) => ({ ...f, published_at: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">วันเวลาหมดอายุ</label>
                <input
                  type="datetime-local"
                  value={form.expired_at}
                  onChange={(e) => setForm((f) => ({ ...f, expired_at: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {!editing && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">ไฟล์ PDF *</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFileObj(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required
                  />
                </div>
              )}

              <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Save size={16} />
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replace File Modal */}
      {fileOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Upload size={18} />
                <h3 className="font-semibold">แทนที่ไฟล์: {editing?.title}</h3>
              </div>
              <button onClick={() => setFileOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReplaceFile} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">เลือกไฟล์ PDF ใหม่ *</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFileObj(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFileOpen(false)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Upload size={16} />
                  อัปโหลด
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/** ===== Small components ===== */
function Th({ label, sortKey, sortStr, onSort }) {
  const dir = useMemo(() => {
    const map = new Map((sortStr || "").split(",").filter(Boolean).map(p => {
      const [k, d] = p.split(":");
      return [k, d || "asc"];
    }));
    return map.get(sortKey);
  }, [sortStr, sortKey]);

  return (
    <th className="px-3 py-2 text-left font-medium text-gray-600 select-none">
      <button
        type="button"
        onClick={() => onSort?.(sortKey)}
        className="inline-flex items-center gap-1 hover:text-gray-900"
      >
        {label}
        {dir === "asc" ? <ArrowUp size={14} /> : dir === "desc" ? <ArrowDown size={14} /> : <ArrowUpDown size={14} />}
      </button>
    </th>
  );
}
