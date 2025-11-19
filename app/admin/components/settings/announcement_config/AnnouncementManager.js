"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Eye, Download, Bell, BookOpen, Plus, Edit, Trash2, Save, X, GripVertical, RefreshCw, PlusCircle } from "lucide-react";
import Swal from "sweetalert2";
import apiClient from "@/app/lib/api";
import { adminAnnouncementAPI, adminFundFormAPI } from "@/app/lib/admin_announcement_api";
import { motion, AnimatePresence } from "framer-motion";
import AnnouncementModal from "@/app/admin/components/settings/announcement_config/AnnouncementModal";
import FundFormModal from "@/app/admin/components/settings/announcement_config/FundFormModal";
import { adminAPI } from "@/app/lib/admin_api";
import SettingsSectionCard from "@/app/admin/components/settings/common/SettingsSectionCard";

/** ========= Helpers ========= */
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

function fmtBytes(n) {
  const num = +n || 0;
  if (num >= 1 << 20) return (num / (1 << 20)).toFixed(2) + " MB";
  if (num >= 1 << 10) return (num / (1 << 10)).toFixed(2) + " KB";
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
  } catch {
    return "-";
  }
}

function toISOOrNull(v) {
  if (!v) return null;
  try {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_FILE_EXTENSIONS = [".pdf", ".doc", ".docx"];
const FILE_TYPE_LABEL = "PDF, DOC หรือ DOCX";

function isAllowedUploadFile(file) {
  if (!file) return false;
  if (file.type && ALLOWED_FILE_TYPES.has(file.type)) return true;
  const name = typeof file.name === "string" ? file.name.toLowerCase() : "";
  return ALLOWED_FILE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function safeDecodeURIComponent(value) {
  if (typeof value !== "string") return "";
  try {
    return decodeURIComponent(value);
  } catch (error) {
    console.warn("[AnnouncementManager] Failed to decode file name", {
      value,
      error,
    });
    return value;
  }
}

function extractFileNameFromPath(path) {
  if (!path) return "";
  const segments = String(path).split(/[\\/]/);
  return segments.pop() || "";
}

function normalizeFileName(rawName, fallbackPath = "") {
  const primary = typeof rawName === "string" ? rawName.trim() : "";
  const candidate = primary || extractFileNameFromPath(fallbackPath) || "";
  const decoded = safeDecodeURIComponent(candidate);
  return decoded || candidate || "";
}

function getFileExtension(fileName) {
  if (typeof fileName !== "string") return "";
  const trimmed = fileName.trim();
  if (!trimmed) return "";
  const match = /\.([^.]+)$/.exec(trimmed);
  return match ? match[1].toLowerCase() : "";
}

function sanitizeDownloadFileName(fileName) {
  const normalized = typeof fileName === "string" ? fileName.trim() : "";
  const safeName = normalized.replace(/[\\/:*?"<>|]/g, "_");
  return safeName || "file";
}

function getAnnouncementId(row) {
  return row.announcement_id ?? row.id;
}

// ==== Helpers ฝั่งฟอร์ม ====
function getFormId(row) {
  return row.fund_form_id ?? row.form_id ?? row.id;
}

/** ทำแถวให้มีไฮไลต์เฉพาะตอน "ลากอยู่" และ "เมาส์อยู่เหนือ" */
function getFRowClass(row, fDraggingId, fOverId) {
  const id = getFormId(row);
  const isDragging = fDraggingId === id;
  const isOver = fOverId === id && !isDragging;
  return [
    isDragging ? "bg-green-50 ring-2 ring-green-300" : "",
    isOver ? "ring-2 ring-green-200" : "",
  ].join(" ").trim();
}

function sameOrder(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 16 },
    visible: {
      opacity: 1, scale: 1, y: 0,
      transition: { type: "spring", stiffness: 320, damping: 26 }
    },
    exit: { opacity: 0, scale: 0.95, y: 10 },
  };

  const TYPE_LABEL = {
    research_fund: "ทุนวิจัย",
    promotion_fund: "ทุนกิจกรรม",
    general: "ทั่วไป",
    fund_application: "รับสมัครทุน/แบบฟอร์ม",
  };
  const PRIORITY_LABEL = { normal: "ปกติ", high: "สูง", urgent: "ด่วน" };
  const FORM_TYPE_LABEL = {
    application: "แบบฟอร์มสมัคร",
    report: "แบบฟอร์มรายงาน",
    evaluation: "แบบฟอร์มประเมิน",
    guidelines: "แนวทางปฏิบัติ",
    other: "อื่นๆ",
  };
  const FUND_CATEGORY_LABEL = {
    research_fund: "ทุนวิจัย",
    promotion_fund: "ทุนกิจกรรม",
    both: "ทั้งสองประเภท",
  };

const pageMotionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" },
};

export default function AnnouncementManager() {
  /** ===== State: Announcements ===== */
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [aEditOpen, setAEditOpen] = useState(false);
  const [aFileOpen, setAFileOpen] = useState(false);
  const [aEditing, setAEditing] = useState(null);
  const [aForm, setAForm] = useState(blankAnnouncementForm());
  const [aFileObj, setAFileObj] = useState(null);
  const [aDraggingId, setADraggingId] = useState(null);
  const [aOrderDirty, setAOrderDirty] = useState(false);

  /** ===== State: Fund Forms ===== */
  const [loadingForms, setLoadingForms] = useState(true);
  const [fundForms, setFundForms] = useState([]);
  const [fEditOpen, setFEditOpen] = useState(false);
  const [fFileOpen, setFFileOpen] = useState(false);
  const [fEditing, setFEditing] = useState(null);
  const [fForm, setFForm] = useState(blankFundForm());
  const [fFileObj, setFFileObj] = useState(null);
  const [fDraggingId, setFDraggingId] = useState(null);
  const [fOverId, setFOverId] = useState(null);
  const [fOrderDirty, setFOrderDirty] = useState(false);
  const [fBaselineOrder, setFBaselineOrder] = useState([]);
  const [downloadingIds, setDownloadingIds] = useState(new Set());

  /** ===== State: Years ===== */
  const [years, setYears] = useState([]);
  const [loadingYears, setLoadingYears] = useState(false);

  const aSearchRef = useRef(null);
  const fSearchRef = useRef(null);
  const debounceA = useRef(null);
  const debounceF = useRef(null);

  const [aFilters, setAFilters] = useState({
    q: "",
    type: "",
    status: "",
    year_id: "",
    sort: "display_order:asc,published_at:desc",
    page: 1,
    limit: 100,
  });
  const [fFilters, setFFilters] = useState({
    q: "",
    form_type: "",
    fund_category: "",
    status: "",
    year_id: "",
    sort: "display_order:asc",
    page: 1,
    limit: 100,
  });

  useEffect(() => {
    loadAnnouncements();
    loadFundForms();
    loadYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const anyOpen = aEditOpen || aFileOpen || fEditOpen || fFileOpen;
    const prev = document.body.style.overflow;
    if (anyOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = prev; };
  }, [aEditOpen, aFileOpen, fEditOpen, fFileOpen]);

  /** ===== Loaders ===== */
  async function loadAnnouncements() {
    setLoadingAnnouncements(true);
    try {
      const data = await adminAnnouncementAPI.list(aFilters);
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setAnnouncements(list);
      setAOrderDirty(false);
    } catch (e) {
      toast("error", e.message || "โหลดประกาศไม่สำเร็จ");
    } finally {
      setLoadingAnnouncements(false);
    }
  }
  async function loadFundForms() {
    setLoadingForms(true);
    try {
    const data = await adminFundFormAPI.list(fFilters);
    const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    setFundForms(list);
    setFBaselineOrder(list.map((r) => getFormId(r)));  // <— เก็บ baseline
    setFOrderDirty(false);                             // <— รีเซ็ตปุ่มเป็นไม่ dirty
    } catch (e) {
      toast("error", e.message || "โหลดแบบฟอร์มไม่สำเร็จ");
    } finally {
      setLoadingForms(false);
    }
  }

  async function loadYears() {
    setLoadingYears(true);
    try {
      const response = await adminAPI.getYears();
      const list = Array.isArray(response?.years)
        ? response.years
        : Array.isArray(response)
        ? response
        : [];
      setYears(list.filter(Boolean));
    } catch (error) {
      console.error("[AnnouncementManager] Failed to load years", error);
      toast("error", "โหลดปีงบประมาณไม่สำเร็จ");
    } finally {
      setLoadingYears(false);
    }
  }

  /** ===== Handlers: Common ===== */
  function getApiBaseURL() {
    const raw =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
      apiClient.baseURL?.replace(/\/$/, "") ||
      "";
    return raw;
  }

  function extractFilePath(filePath) {
    if (!filePath) return "";
    if (typeof filePath === "string") {
      return filePath.trim();
    }
    if (Array.isArray(filePath)) {
      for (const item of filePath) {
        const value = extractFilePath(item);
        if (value) return value;
      }
      return "";
    }
    if (typeof filePath === "object") {
      const candidates = [
        filePath.file_path,
        filePath.path,
        filePath.url,
        filePath.href,
        filePath.fileUrl,
        filePath.location,
      ];
      for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
          return candidate.trim();
        }
      }
    }
    return "";
  }

  function getFileURL(filePath) {
    const rawPath = extractFilePath(filePath);
    if (!rawPath) return "";

    if (/^https?:\/\//i.test(rawPath)) {
      return rawPath;
    }

    const cleanedPath = rawPath
      .replace(/^\.\/?/, "")
      .replace(/\\/g, "/")
      .replace(/\/+/g, "/");

    const rawBase =
      process.env.NEXT_PUBLIC_FILE_BASE_URL?.replace(/\/$/, "") ||
      apiClient.baseURL?.replace(/\/$/, "") ||
      "";

    const baseWithoutApi = rawBase.replace(/\/?api\/v\d+.*/i, "");
    const base = baseWithoutApi || rawBase;
    if (!base) {
      return cleanedPath.startsWith("/") ? cleanedPath : `/${cleanedPath}`;
    }

    const normalizedPath = cleanedPath.startsWith("/")
      ? cleanedPath
      : `/${cleanedPath}`;

    try {
      return new URL(normalizedPath, `${base}/`).href;
    } catch (error) {
      console.error("[AnnouncementManager] Failed to resolve file URL", {
        filePath: rawPath,
        normalizedPath,
        base,
        error,
      });
      return `${base}${normalizedPath}`;
    }
  }

  function getFileAccessMeta(row, entity) {
    const filePath = extractFilePath(row?.file_path);
    const directURL = getFileURL(filePath);
    const base = getApiBaseURL();
    const id =
      entity === "announcement" ? getAnnouncementId(row) : getFormId(row);
    const apiSegment = entity === "announcement" ? "announcements" : "fund-forms";
    const encodedId =
      id == null || id === "" ? "" : encodeURIComponent(String(id));
    const viewEndpoint =
      base && encodedId ? `${base}/${apiSegment}/${encodedId}/view` : "";
    const downloadEndpoint =
      base && encodedId ? `${base}/${apiSegment}/${encodedId}/download` : "";
    const fallbackFileName = normalizeFileName(row?.file_name, filePath);
    const fileExtension = getFileExtension(fallbackFileName);

    return {
      filePath,
      directURL,
      viewEndpoint,
      downloadEndpoint,
      fallbackFileName,
      fileExtension,
      id,
      entity,
    };
  }

  async function fetchFileBlob(url, { requiresAuth = false } = {}) {
    if (!url) {
      throw new Error("URL is required");
    }

    const headers = new Headers();
    if (requiresAuth) {
      const token = typeof apiClient.getToken === "function" ? apiClient.getToken() : null;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch (readError) {
        console.warn("[AnnouncementManager] Failed to read error response", readError);
      }
      const message = [`Failed to fetch file: ${response.status}`, response.statusText]
        .filter(Boolean)
        .join(" ");
      const error = new Error(message);
      error.status = response.status;
      error.statusText = response.statusText;
      error.responseBody = errorBody;
      throw error;
    }

    return response.blob();
  }

  function openURLInNewTab(url) {
    if (!url) return;

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  async function handleViewFile(row, entity) {
    const meta = getFileAccessMeta(row, entity);

    const { viewEndpoint, fileExtension } = meta;
    const isPDF = fileExtension === "pdf";

    if (!isPDF) {
      console.info(
        "[AnnouncementManager] Non-PDF file requested for viewing, switching to download",
        {
          meta,
        }
      );
      await handleDownloadFile(row, entity);
      return;
    }

    if (!viewEndpoint) {
      console.warn(
        "[AnnouncementManager] Missing view endpoint for PDF file, switching to download",
        { meta }
      );
      await handleDownloadFile(row, entity);
      return;
    }

    try {
      const blob = await fetchFileBlob(viewEndpoint, {
        requiresAuth: true,
      });
      const objectURL = URL.createObjectURL(blob);
      openURLInNewTab(objectURL);
      setTimeout(() => URL.revokeObjectURL(objectURL), 60_000);
    } catch (error) {
      console.error("[AnnouncementManager] Failed to open file", {
        meta,
        error,
        errorMessage: error?.message,
        errorStack: error?.stack,
      });

      toast("error", "ไม่สามารถเปิดไฟล์ PDF ได้ กำลังดาวน์โหลดไฟล์แทน");
      await handleDownloadFile(row, entity);
    }
  }

  async function handleDownloadFile(row, entity) {
      const meta = getFileAccessMeta(row, entity);

      // 1. ตรวจสอบว่าไฟล์นี้กำลังถูกดาวน์โหลดอยู่หรือไม่
      if (downloadingIds.has(meta.id)) {
        return;
      }

      const { downloadEndpoint, directURL, fallbackFileName } = meta;
      const downloadFileName = sanitizeDownloadFileName(fallbackFileName);

      if (!downloadEndpoint) { // เราจะใช้ downloadEndpoint เป็นหลัก
        toast("error", "ไม่พบไฟล์สำหรับดาวน์โหลด");
        return;
      }

      try {
        // 2. เพิ่ม ID เข้าไปใน state เพื่อเริ่มสถานะ "กำลังดาวน์โหลด"
        setDownloadingIds(prev => new Set(prev).add(meta.id));

        const blob = await fetchFileBlob(downloadEndpoint, {
          requiresAuth: true,
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = downloadFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

      } catch (error) {
        console.error("[AnnouncementManager] Failed to download file", {
          meta,
          error,
          errorMessage: error?.message,
          errorStack: error?.stack,
        });
        toast("error", "ดาวน์โหลดไม่สำเร็จ");
      } finally {
          // 4. ไม่ว่าจะสำเร็จหรือล้มเหลว ให้เอา ID ออกจาก state เสมอ
          setDownloadingIds(prev => {
              const next = new Set(prev);
              next.delete(meta.id);
              return next;
          });
      }
  }
    /** ===== Forms (Announcement) ===== */
  function blankAnnouncementForm() {
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
  function openACreate() {
    setAEditing(null);
    setAForm(blankAnnouncementForm());
    setAFileObj(null);
    setAEditOpen(true);
  }
  function openAEdit(row) {
    setAEditing(row);
    setAForm({
      title: row.title || "",
      description: row.description || "",
      announcement_type: row.announcement_type || "",
      announcement_reference_number: row.announcement_reference_number || "",
      priority: row.priority || "normal",
      display_order: row.display_order ?? "",
      status: row.status || "active",
      published_at: row.published_at ? row.published_at.substring(0, 16) : "",
      expired_at: row.expired_at ? row.expired_at.substring(0, 16) : "",
      year_id: row.year_id ?? "",
    });
    setAEditOpen(true);
  }
  function openAReplaceFile(row) {
    setAEditing(row);
    setAFileObj(null);
    setAFileOpen(true);
  }
  async function handleASave(e) {
    e?.preventDefault?.();
    if (!String(aForm.title).trim()) return toast("warning", "กรุณากรอกหัวข้อประกาศ");
    if (!aEditing && !aFileObj) return toast("warning", `กรุณาแนบไฟล์ ${FILE_TYPE_LABEL}`);
    if (!aEditing && aFileObj && !isAllowedUploadFile(aFileObj)) {
      return toast("warning", `ไฟล์ต้องเป็น ${FILE_TYPE_LABEL}`);
    }
    if (aEditing && aFileObj && !isAllowedUploadFile(aFileObj)) {
      return toast("warning", `ไฟล์ต้องเป็น ${FILE_TYPE_LABEL}`);
    }
    if (aForm.published_at && aForm.expired_at && new Date(aForm.published_at) > new Date(aForm.expired_at)) {
      return toast("warning", "วันเผยแพร่ต้องไม่เกินวันหมดอายุ");
    }
    try {
      if (!aEditing) {
        await adminAnnouncementAPI.create({
          title: String(aForm.title || "").trim(),
          description: aForm.description || undefined,
          announcement_type: aForm.announcement_type || undefined,
          announcement_reference_number: aForm.announcement_reference_number || undefined,
          priority: aForm.priority || "normal",
          display_order: aForm.display_order === "" ? undefined : String(aForm.display_order),
          status: aForm.status || "active",
          published_at: aForm.published_at ? new Date(aForm.published_at).toISOString() : undefined,
          expired_at: aForm.expired_at ? new Date(aForm.expired_at).toISOString() : undefined,
          year_id: aForm.year_id || undefined,
          file: aFileObj,
        });
        toast("success", "สร้างประกาศสำเร็จ");
      } else {
        const payload = {
          title: String(aForm.title || "").trim(),
          description: aForm.description || null,
          announcement_type: aForm.announcement_type || null,
          announcement_reference_number: aForm.announcement_reference_number || null,
          priority: aForm.priority || "normal",
          display_order: aForm.display_order === "" ? null : +aForm.display_order,
          status: aForm.status || "active",
          published_at: toISOOrNull(aForm.published_at),
          expired_at: toISOOrNull(aForm.expired_at),
          year_id: aForm.year_id || null,
        };
        const updateId = getAnnouncementId(aEditing);
        await adminAnnouncementAPI.update(updateId, payload);
        toast("success", "บันทึกข้อมูลสำเร็จ");
      }
      setAEditOpen(false);
      await loadAnnouncements();
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาด");
    }
  }
  async function handleAReplaceFile(e) {
    e?.preventDefault?.();
    if (!aFileObj) return toast("warning", `กรุณาเลือกไฟล์ ${FILE_TYPE_LABEL}`);
    if (!isAllowedUploadFile(aFileObj)) {
      return toast("warning", `ไฟล์ต้องเป็น ${FILE_TYPE_LABEL}`);
    }
    try {
      const id = aEditing ? getAnnouncementId(aEditing) : null;
      if (id == null) {
        return toast("error", "ไม่พบรหัสประกาศสำหรับแทนที่ไฟล์");
      }
      await adminAnnouncementAPI.replaceFile(id, aFileObj);
      toast("success", "แทนที่ไฟล์สำเร็จ");
      setAFileOpen(false);
      await loadAnnouncements();
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาด");
    }
  }
  async function handleADelete(row) {
    const ok = await confirm(`ต้องการลบประกาศ “${row.title}” ใช่หรือไม่?`);
    if (!ok) return;
    try {
      await adminAnnouncementAPI.remove(getAnnouncementId(row));
      toast("success", "ลบประกาศสำเร็จ");
      await loadAnnouncements();
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาด");
    }
  }

  /** ===== Forms (Fund Forms) ===== */
  function blankFundForm() {
    return {
      title: "",
      description: "",
      form_type: "",
      fund_category: "",
      display_order: "",
      status: "active",
      year_id: "",
    };
  }
  function openFCreate() {
    setFEditing(null);
    setFForm(blankFundForm());
    setFFileObj(null);
    setFEditOpen(true);
  }
  function openFEdit(row) {
    setFEditing(row);
    setFForm({
      title: row.title || "",
      description: row.description || "",
      form_type: row.form_type || "",
      fund_category: row.fund_category || "",
      display_order: row.display_order ?? "",
      status: row.status || "active",
      year_id: row.year_id ?? "",
    });
    setFEditOpen(true);
  }
  function openFReplaceFile(row) {
    setFEditing(row);
    setFFileObj(null);
    setFFileOpen(true);
  }
  async function handleFSave(e) {
    e?.preventDefault?.();
    if (!String(fForm.title).trim()) return toast("warning", "กรุณากรอกชื่อไฟล์/หัวข้อ");
    if (!fEditing && !fFileObj) return toast("warning", `กรุณาแนบไฟล์ ${FILE_TYPE_LABEL}`);
    if (!fEditing && fFileObj && !isAllowedUploadFile(fFileObj)) {
      return toast("warning", `ไฟล์ต้องเป็น ${FILE_TYPE_LABEL}`);
    }
    if (fEditing && fFileObj && !isAllowedUploadFile(fFileObj)) {
      return toast("warning", `ไฟล์ต้องเป็น ${FILE_TYPE_LABEL}`);
    }
    try {
      if (!fEditing) {
        await adminFundFormAPI.create({
          title: String(fForm.title || "").trim(),
          description: fForm.description || undefined,
          form_type: fForm.form_type || undefined,
          fund_category: fForm.fund_category || undefined,
          display_order: fForm.display_order === "" ? undefined : String(fForm.display_order),
          status: fForm.status || "active",
          year_id: fForm.year_id || undefined,
          file: fFileObj,
        });
        toast("success", "สร้างแบบฟอร์มสำเร็จ");
      } else {
        const payload = {
          title: String(fForm.title || "").trim(),
          description: fForm.description || null,
          form_type: fForm.form_type || null,
          fund_category: fForm.fund_category || null,
          display_order: fForm.display_order === "" ? null : +fForm.display_order,
          status: fForm.status || "active",
          year_id: fForm.year_id || null,
        };
        await adminFundFormAPI.update(getFormId(fEditing), payload);
        toast("success", "บันทึกข้อมูลสำเร็จ");
      }
      setFEditOpen(false);
      await loadFundForms();
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาด");
    }
  }
  async function handleFReplaceFile(e) {
    e?.preventDefault?.();
    if (!fFileObj) return toast("warning", `กรุณาเลือกไฟล์ ${FILE_TYPE_LABEL}`);
    if (!isAllowedUploadFile(fFileObj)) {
      return toast("warning", `ไฟล์ต้องเป็น ${FILE_TYPE_LABEL}`);
    }
    try {
      const id = getFormId(fEditing);
      await adminFundFormAPI.replaceFile(id, fFileObj);
      toast("success", "แทนที่ไฟล์สำเร็จ");
      setFFileOpen(false);
      await loadFundForms();
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาด");
    }
  }
  async function handleFDelete(row) {
    const ok = await confirm(`ต้องการลบแบบฟอร์ม “${row.title || row.file_name}” ใช่หรือไม่?`);
    if (!ok) return;
    try {
      await adminFundFormAPI.remove(getFormId(row));
      toast("success", "ลบแบบฟอร์มสำเร็จ");
      await loadFundForms();
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาด");
    }
  }

  /** ===== Drag & Drop (Announcements) ===== */
  function aDragStart(e, id) {
    setADraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  }
  function aDragOver(e, overId) {
    e.preventDefault();
    if (aDraggingId == null || aDraggingId === overId) return;
    setAnnouncements((prev) => {
    const idxFrom = prev.findIndex((r) => getAnnouncementId(r) === aDraggingId);
    const idxTo = prev.findIndex((r) => getAnnouncementId(r) === overId);
    if (idxFrom === -1 || idxTo === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(idxFrom, 1);
      next.splice(idxTo, 0, moved);
      return next;
    });
    setAOrderDirty(true);
  }
  function aDragEnd() {
    setADraggingId(null);
  }

  // ===== บันทึกลำดับ: ประกาศ =====
  async function aPersistOrder() {
    if (!aOrderDirty) return;
    try {
      // สร้าง payload เฉพาะรายการที่มี id
      const payloads = (announcements || [])
        .map((r, i) => ({ id: getAnnouncementId(r), display_order: i + 1 }))
        .filter((p) => p.id != null);

      if (payloads.length === 0) {
        toast("warning", "ไม่มีรายการสำหรับบันทึกลำดับ");
        return;
      }

      // อัปเดตทีละตัว (หรือจะ Promise.all ก็ได้)
      await Promise.all(
        payloads.map((p) =>
          adminAnnouncementAPI.update(p.id, { display_order: Number(p.display_order) })
        )
      );

      toast("success", "บันทึกลำดับประกาศแล้ว");
      setAOrderDirty(false);
      await loadAnnouncements();
    } catch (e) {
      console.error("[aPersistOrder] error:", e);
      toast("error", e?.message || "บันทึกลำดับไม่สำเร็จ");
    }
  }

  // ===== บันทึกลำดับ: แบบฟอร์ม =====
  async function fPersistOrder() {
    if (!fOrderDirty) return;
    try {
      const payloads = (fundForms || [])
        .map((r, i) => ({ id: getFormId(r), display_order: i + 1 }))
        .filter((p) => p.id != null);

      if (payloads.length === 0) {
        toast("warning", "ไม่มีรายการสำหรับบันทึกลำดับ");
        return;
      }

      await Promise.all(
        payloads.map((p) =>
          adminFundFormAPI.update(p.id, { display_order: Number(p.display_order) })
        )
      );

      toast("success", "บันทึกลำดับแบบฟอร์มแล้ว");
      setFOrderDirty(false);
      // อัปเดต baseline ให้สอดคล้องกับลำดับใหม่
      setFBaselineOrder(fundForms.map((r) => getFormId(r)));
      await loadFundForms();
    } catch (e) {
      console.error("[fPersistOrder] error:", e);
      // ช่วย debug ถ้ามี response จากเซิร์ฟเวอร์
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "บันทึกลำดับไม่สำเร็จ";
      toast("error", msg);
    }
  }


  /** ===== Drag & Drop (Fund Forms) — ไม่จำกัดกลุ่ม ===== */
  function fDragStart(e, row) {
    setFDraggingId(getFormId(row));
    e.dataTransfer.effectAllowed = "move";
  }

  function fDragOver(e, row) {
    e.preventDefault();
    const currentOverId = getFormId(row);
    setFOverId(currentOverId);

    if (fDraggingId == null || fDraggingId === currentOverId) return;

    setFundForms((prev) => {
      const idxFrom = prev.findIndex((r) => getFormId(r) === fDraggingId);
      const idxTo   = prev.findIndex((r) => getFormId(r) === currentOverId);
      if (idxFrom === -1 || idxTo === -1) return prev;

      const next = [...prev];
      const [moved] = next.splice(idxFrom, 1);
      next.splice(idxTo, 0, moved);
      return next;
    });

    setFOrderDirty(true);
  }

  function fDragEnd() {
    // เทียบลำดับปัจจุบันกับ baseline เพื่อกำหนดปุ่ม dirty
    const current = fundForms.map((r) => getFormId(r));
    setFOrderDirty(!sameOrder(fBaselineOrder, current));

    setFDraggingId(null);
    setFOverId(null);
  }


  /** บันทึกลำดับทั้งลิสต์ตามตำแหน่งที่เห็น */
  async function fPersistOrder() {
    if (!fOrderDirty) return;
    try {
      const payloads = fundForms.map((r, i) => ({
        id: getFormId(r),
        display_order: i + 1,
      }));
    for (const p of payloads) {
      await adminFundFormAPI.update(p.id, { display_order: p.display_order });
    }
    toast("success", "บันทึกลำดับแบบฟอร์มแล้ว");
    setFOrderDirty(false);
    setFBaselineOrder(fundForms.map((r) => getFormId(r))); // <— อัปเดต baseline เป็นลำดับล่าสุด
    await loadFundForms();  // (คงไว้ก็ได้ เพื่อรีเฟรชจากเซิร์ฟเวอร์)
    } catch (e) {
      toast("error", e.message || "บันทึกลำดับไม่สำเร็จ");
    }
  }


  /** ===== Render Helpers ===== */
  const A = useMemo(() => announcements, [announcements]);
  const F = useMemo(() => fundForms, [fundForms]);

  const normalizedYears = useMemo(() => {
    const toNumber = (value) => {
      if (value == null) return Number.NaN;
      if (typeof value === "number") return value;
      const numeric = parseInt(String(value).replace(/[^0-9]/g, ""), 10);
      return Number.isNaN(numeric) ? Number.NaN : numeric;
    };

    const processed = years
      .map((item) => {
        if (!item) return null;
        const id =
          item.year_id ??
          item.id ??
          (typeof item.year !== "undefined" ? item.year : null);
        if (id == null || id === "") return null;
        const labelSource =
          item.year ??
          item.year_label ??
          item.label ??
          item.name ??
          item.title ??
          item.year_text ??
          id;
        return {
          id: String(id),
          label: String(labelSource),
        };
      })
      .filter(Boolean);

    return processed.sort((a, b) => {
      const aLabelNum = toNumber(a.label);
      const bLabelNum = toNumber(b.label);
      if (!Number.isNaN(aLabelNum) && !Number.isNaN(bLabelNum) && aLabelNum !== bLabelNum) {
        return bLabelNum - aLabelNum;
      }

      const aIdNum = toNumber(a.id);
      const bIdNum = toNumber(b.id);
      if (!Number.isNaN(aIdNum) && !Number.isNaN(bIdNum) && aIdNum !== bIdNum) {
        return bIdNum - aIdNum;
      }

      return String(b.label).localeCompare(String(a.label), "th-TH");
    });
  }, [years]);

  const yearLabelMap = useMemo(() => {
    const map = new Map();
    for (const entry of normalizedYears) {
      map.set(entry.id, entry.label);
    }
    return map;
  }, [normalizedYears]);

  const yearOptions = useMemo(
    () =>
      normalizedYears.map((entry) => ({
        value: entry.id,
        label: entry.label ? `ปีงบประมาณ ${entry.label}` : entry.id,
      })),
    [normalizedYears]
  );

  const resolveYearLabel = (row) => {
    if (!row) return "-";
    const idCandidates = [
      row.year_id,
      row.year?.year_id,
      row.Year?.year_id,
    ];
    for (const candidate of idCandidates) {
      if (candidate == null || candidate === "") continue;
      const label = yearLabelMap.get(String(candidate));
      if (label) return label;
    }
    const fallback = [
      row.year,
      row.year_label,
      row.year_name,
      row.year_text,
      row.Year?.year,
    ];
    for (const candidate of fallback) {
      if (candidate == null || candidate === "") continue;
      return String(candidate);
    }
    return "-";
  };

  return (
    <>
      <motion.div className="space-y-8" {...pageMotionProps}>
        <SettingsSectionCard
          icon={Bell}
          iconBgClass="bg-blue-100"
          iconColorClass="text-blue-600"
          title="ประกาศ"
          description="จัดการประกาศ"
          actions={
            <>
              <button
                onClick={loadAnnouncements}
                className="inline-flex items-center gap-2 rounded-lg border border-green-200 px-4 py-2 text-sm font-medium text-green-600 transition hover:bg-green-50"
              >
                <RefreshCw size={16} /> รีเฟรช
              </button>
              <button
                onClick={aPersistOrder}
                disabled={!aOrderDirty}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
              >
                <Save size={16} /> บันทึกลำดับ
              </button>
              <button
                onClick={openACreate}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                <PlusCircle size={16} /> เพิ่มประกาศ
              </button>
            </>
          }
          contentClassName="space-y-6"
        >
          {loadingAnnouncements ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-600">กำลังโหลด...</span>
            </div>
          ) : A.length === 0 ? (
            <div className="text-center text-gray-500 py-10">ยังไม่มีประกาศ</div>
          ) : (
            <div className="overflow-x-auto border border-gray-300 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                  <th className="w-10 px-3 py-2 text-center text-gray-600">ลำดับ</th>
                  <th className="px-3 py-2 text-center text-gray-600">ชื่อไฟล์ / หัวข้อ</th>
                  <th className="px-3 py-2 text-center text-gray-600">หมวดหมู่กองทุน</th>
                  <th className="px-3 py-2 text-center text-gray-600">ปี</th>
                  <th className="px-3 py-2 text-center text-gray-600">เผยแพร่</th>
                  <th className="px-3 py-2 text-center text-gray-600">รายละเอียด</th>
                  <th className="px-3 py-2 text-center text-gray-600">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {A.map((row, idx) => {
                  const id = row.announcement_id || row.id;
                  return (
                    <tr
                      key={id}
                      draggable
                      onDragStart={(e) => aDragStart(e, id)}
                      onDragOver={(e) => aDragOver(e, id)}
                      onDragEnd={aDragEnd}
                      className={`${aDraggingId === id ? "bg-blue-50" : ""}`}
                    >
                      <td className="px-3 py-2 text-gray-500">
                        <div className="inline-flex items-center gap-1 cursor-grab" title="ลากเพื่อจัดลำดับ">
                          <GripVertical size={16} /> {idx + 1}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1 text-sm">
                          {row.file_path ? (
                            <button
                              onClick={() => handleViewFile(row, "announcement")}
                              className="text-blue-600 hover:underline text-left inline-flex max-w-[28ch]"
                              title={row.file_name || "เปิดไฟล์"}
                            >
                              <span className="truncate">{row.file_name || "เปิดไฟล์"}</span>
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                          <div
                            className="text-gray-500 truncate max-w-[36ch]"
                            title={row.title || "-"}
                          >
                            {row.title || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-700">
                        {TYPE_LABEL[row.announcement_type] || row.announcement_type || "-"}
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-700">{resolveYearLabel(row)}</td>
                      <td className="px-3 py-2">{formatThaiDateTime(row.published_at)}</td>
                      <td className="px-3 py-2">
                        <div
                          className="text-gray-500 line-clamp-2 max-w-[48ch] break-words"
                          title={row.description || "-"}
                        >
                          {row.description || "-"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                          <div className="flex flex-row justify-center gap-2 flex-nowrap [&>button]:whitespace-nowrap">
                              <button
                                  onClick={() => handleDownloadFile(row, "announcement")}
                                  disabled={downloadingIds.has(id)} // เพิ่มบรรทัดนี้
                                  className="inline-flex items-center gap-1 rounded-lg border border-green-200 px-3 py-1 text-xs font-medium text-green-600 transition hover:bg-green-50 disabled:opacity-50 disabled:cursor-wait" // เพิ่ม class
                                  title="ดาวน์โหลดไฟล์"
                              >
                                  <Download size={16} />
                                  {downloadingIds.has(id) ? "กำลังโหลด..." : "ดาวน์โหลด"}
                              </button>
                          <button
                            onClick={() => openAEdit(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                            title="แก้ไข"
                          >
                            <Edit size={16} /> แก้ไข
                          </button>
                          <button
                            onClick={() => handleADelete(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                            title="ลบ"
                          >
                            <Trash2 size={16} /> ลบ
                          </button>
                        </div>
                        {row.file_size ? (
                          <div className="text-xs text-gray-500 mt-1 text-right">
                            ขนาดไฟล์: {fmtBytes(row.file_size)}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SettingsSectionCard>

      <SettingsSectionCard
        icon={BookOpen}
        iconBgClass="bg-green-100"
        iconColorClass="text-green-600"
        title="แบบฟอร์มการขอทุน"
        description="จัดการแบบฟอร์ม"
        actions={
          <>
            <button
              onClick={loadFundForms}
              className="inline-flex items-center gap-2 rounded-lg border border-green-200 px-4 py-2 text-sm font-medium text-green-600 transition hover:bg-green-50"
            >
              <RefreshCw size={16} /> รีเฟรช
            </button>
            <button
              onClick={fPersistOrder}
              disabled={!fOrderDirty}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
            >
              <Save size={16} /> บันทึกลำดับ
            </button>
            <button
              onClick={openFCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              <PlusCircle size={16} /> เพิ่มแบบฟอร์ม
            </button>
          </>
        }
        contentClassName="space-y-6"
      >
        {loadingForms ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            <span className="ml-2 text-gray-600">กำลังโหลด...</span>
          </div>
        ) : F.length === 0 ? (
          <div className="text-center text-gray-500 py-10">ยังไม่มีแบบฟอร์ม</div>
        ) : (
          <div className="overflow-x-auto border border-gray-300 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10 px-3 py-2 text-center text-gray-600">ลำดับ</th>
                  <th className="px-3 py-2 text-center text-gray-600">ชื่อไฟล์ / หัวข้อ</th>
                  <th className="px-3 py-2 text-center text-gray-600">ประเภทฟอร์ม</th>
                  <th className="px-3 py-2 text-center text-gray-600">หมวดหมู่กองทุน</th>
                  <th className="px-3 py-2 text-center text-gray-600">ปี</th>
                  <th className="px-3 py-2 text-center text-gray-600">รายละเอียด</th>
                  <th className="px-3 py-2 text-center text-gray-600">การจดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {F.map((row, idx) => {
                  const id = getFormId(row);
                  return (
                    <tr
                      key={id}
                      draggable
                      onDragStart={(e) => fDragStart(e, row)}
                      onDragOver={(e) => fDragOver(e, row)}
                      onDragEnd={fDragEnd}
                      className={getFRowClass(row, fDraggingId, fOverId)}
                    >
                      <td className="px-3 py-2 text-gray-500">
                        <div className="inline-flex items-center gap-1 cursor-grab" title="ลากเพื่อจัดลำดับ">
                          <GripVertical size={16} /> {idx + 1}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1 text-sm">
                          {row.file_path ? (
                            <button
                              onClick={() => handleViewFile(row, "fundForm")}
                              className="text-blue-600 hover:underline text-left inline-flex max-w-[28ch]"
                              title={row.file_name || "เปิดไฟล์"}
                            >
                              <span className="truncate">{row.file_name || "เปิดไฟล์"}</span>
                            </button>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                          <div
                            className="text-gray-500 truncate max-w-[36ch]"
                            title={row.title || "-"}
                          >
                            {row.title || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-700">
                        {FORM_TYPE_LABEL[row.form_type] || row.form_type || "-"}
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-700">
                        {FUND_CATEGORY_LABEL[row.fund_category] || row.fund_category || "-"}
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-700">{resolveYearLabel(row)}</td>
                      <td className="px-3 py-2 align-center">
                        <div
                          className="text-gray-500 line-clamp-2 max-w-[48ch] break-words"
                          title={row.description || "-"}
                        >
                          {row.description || "-"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-row justify-end gap-2 flex-nowrap [&>button]:whitespace-nowrap">
                          <button
                              onClick={() => handleDownloadFile(row, "fundForm")}
                              disabled={downloadingIds.has(id)} // เพิ่มบรรทัดนี้
                              className="inline-flex items-center gap-1 rounded-lg border border-green-200 px-3 py-1 text-xs font-medium text-green-600 transition hover:bg-green-50 disabled:opacity-50 disabled:cursor-wait" // เพิ่ม class
                              title="ดาวน์โหลดไฟล์"
                          >
                              <Download size={16} />
                              {downloadingIds.has(id) ? "กำลังโหลด..." : "ดาวน์โหลด"} {/* เปลี่ยนข้อความ */}
                          </button>
                          <button
                            onClick={() => openFEdit(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                            title="แก้ไข"
                          >
                            <Edit size={16} /> แก้ไข
                          </button>
                          <button
                            onClick={() => handleFDelete(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                            title="ลบ"
                          >
                            <Trash2 size={16} /> ลบ
                          </button>
                        </div>
                        {row.file_size ? (
                          <div className="text-xs text-gray-500 mt-1 text-right">
                            ขนาดไฟล์: {fmtBytes(row.file_size)}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </SettingsSectionCard>
      </motion.div>
      {/* ประกาศ */}
      <AnnouncementModal
        open={aEditOpen}
        onClose={() => setAEditOpen(false)}
        data={aEditing}
        yearOptions={yearOptions}
        loadingYears={loadingYears}
        onSubmit={async (payload) => {
          try {
            const toRFC3339 = (v) => (v ? new Date(v).toISOString() : "");
            const priority = aEditing?.priority || "normal";
            const status = payload.status || aEditing?.status || "active";
            const normalizedYearId =
              payload.year_id !== undefined && payload.year_id !== null && payload.year_id !== ""
                ? Number(payload.year_id)
                : null;

            if (!aEditing) {
              // === CREATE (multipart) ===
              if (!payload.file) { toast("error", `กรุณาเลือกไฟล์ ${FILE_TYPE_LABEL}`); return; }
              if (!isAllowedUploadFile(payload.file)) {
                toast("error", `ไฟล์ต้องเป็น ${FILE_TYPE_LABEL}`);
                return;
              }
              const fd = new FormData();
              fd.append("title", (payload.title || "").trim());
              if (payload.description) fd.append("description", payload.description);
              fd.append("announcement_type", payload.announcement_type || "general");
              fd.append("priority", priority);
              fd.append("status", status);
              if (payload.announcement_reference_number) fd.append("announcement_reference_number", payload.announcement_reference_number);
              if (normalizedYearId != null && !Number.isNaN(normalizedYearId)) {
                fd.append("year_id", String(normalizedYearId));
              }
              if (payload.published_at) fd.append("published_at", toRFC3339(payload.published_at));
              if (payload.expired_at) fd.append("expired_at", toRFC3339(payload.expired_at));
              fd.append("file", payload.file);

              const resp = await adminAnnouncementAPI.create(fd);
              toast("success", "เพิ่มประกาศแล้ว");
            } else {
              // === UPDATE (PUT JSON) ===
              const meta = {
                title: (payload.title || "").trim(),
                description: payload.description || null,
                announcement_type: payload.announcement_type || "general",
                priority,
                status,
                announcement_reference_number: payload.announcement_reference_number || null,
                year_id: normalizedYearId,
                published_at: payload.published_at ? toRFC3339(payload.published_at) : null,
                expired_at: payload.expired_at ? toRFC3339(payload.expired_at) : null,
              };

              const targetId = getAnnouncementId(aEditing);
              const putResp = await adminAnnouncementAPI.update(targetId, meta);

              if (payload.file) {
                if (!isAllowedUploadFile(payload.file)) {
                  toast("error", `ไฟล์ต้องเป็น ${FILE_TYPE_LABEL}`);
                  return;
                }
                const rep = await adminAnnouncementAPI.replaceFile(targetId, payload.file);
              }

              toast("success", "บันทึกประกาศแล้ว");
            }

            // โหลดใหม่แล้วดูว่ามาไหม
            await loadAnnouncements();
            setAEditOpen(false);
          } catch (err) {
            console.error("[ANNOUNCEMENT SUBMIT ERROR]", err);
            toast("error", err?.message || "บันทึกไม่สำเร็จ");
          }
        }}
      />

      {/* แบบฟอร์มการขอทุน */}
      <FundFormModal
        open={fEditOpen}
        onClose={() => setFEditOpen(false)}
        data={fEditing}
        yearOptions={yearOptions}
        loadingYears={loadingYears}
        onSubmit={async (payload) => {
          const normalizedYearId =
            payload.year_id !== undefined && payload.year_id !== null && payload.year_id !== ""
              ? Number(payload.year_id)
              : null;
          if (fEditing) {
            if (payload.file && !isAllowedUploadFile(payload.file)) {
              toast("error", `ไฟล์ต้องเป็น ${FILE_TYPE_LABEL}`);
              return;
            }
            const meta = {
              title: (payload.title || "").trim(),
              description: payload.description || null,
              form_type: payload.form_type || "application",
              fund_category: payload.fund_category || "both",
              status: payload.status || "active",
              year_id: normalizedYearId,
            };
            await adminFundFormAPI.update(getFormId(fEditing), meta);
            toast("success", "บันทึกแบบฟอร์มแล้ว");
          } else {
            if (!payload.file) {
              toast("error", `กรุณาเลือกไฟล์ ${FILE_TYPE_LABEL}`);
              return;
            }
            if (!isAllowedUploadFile(payload.file)) {
              toast("error", `ไฟล์ต้องเป็น ${FILE_TYPE_LABEL}`);
              return;
            }
            const fd = new FormData();
            fd.append("title", (payload.title || "").trim());
            if (payload.description) fd.append("description", payload.description);
            if (payload.form_type) fd.append("form_type", payload.form_type);
            if (payload.fund_category) fd.append("fund_category", payload.fund_category);
            fd.append("status", payload.status || "active");
            if (normalizedYearId != null && !Number.isNaN(normalizedYearId)) {
              fd.append("year_id", String(normalizedYearId));
            }
            fd.append("file", payload.file);
            await adminFundFormAPI.create(fd); // หรือ adminFundFormAPI.create(payload) ถ้า helper รองรับ
            toast("success", "เพิ่มแบบฟอร์มแล้ว");
          }
          await loadFundForms();
        }}
        onReplaceFile={async (file) => {
          if (!isAllowedUploadFile(file)) {
            toast("error", `ไฟล์ต้องเป็น ${FILE_TYPE_LABEL}`);
            return;
          }
          await adminFundFormAPI.replaceFile(getFormId(fEditing), file);
          toast("success", "อัปเดตไฟล์แบบฟอร์มแล้ว");
          await loadFundForms();
        }}
      />
    </>
  );
}