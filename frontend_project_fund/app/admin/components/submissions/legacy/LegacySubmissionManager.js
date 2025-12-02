"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  UserPlus
} from "lucide-react";
import PageLayout from "../../common/PageLayout";
import LoadingSpinner from "../../common/LoadingSpinner";
import { useStatusMap } from "@/app/hooks/useStatusMap";
import { toast } from "react-hot-toast";
import legacySubmissionAPI from "@/app/admin/lib/legacy_submission_api";
import { adminSubmissionAPI, commonAPI } from "@/app/lib/admin_submission_api";
import { usersAPI } from "@/app/lib/api";

const SUBMISSION_TYPE_OPTIONS = [
  { value: "fund_application", label: "คำขอทุนวิจัย" },
  { value: "publication_reward", label: "ทุนผลงานตีพิมพ์" },
  { value: "conference_grant", label: "ทุนประชุม/นำเสนอ" },
  { value: "training_request", label: "คำขอฝึกอบรม" },
];

const PARTICIPANT_ROLE_OPTIONS = [
  { value: "owner", label: "เจ้าของคำร้อง" },
  { value: "coauthor", label: "ผู้ร่วม (Co-author)" },
  { value: "advisor", label: "ที่ปรึกษา" },
  { value: "team_member", label: "ทีมโครงการ" },
  { value: "coordinator", label: "ผู้ประสานงาน" },
];

const DEFAULT_PAGE_SIZE = 50;

const pad = (value) => String(value).padStart(2, "0");

const createEmptyForm = () => ({
  submission_type: "fund_application",
  submission_number: "",
  user_id: "",
  year_id: "",
  status_id: "",
  category_id: "",
  subcategory_id: "",
  subcategory_budget_id: "",
  submitted_at: "",
  installment_number_at_submit: "",
  admin_approved_by: "",
  admin_approved_at: "",
  head_approved_by: "",
  head_approved_at: "",
  head_rejected_by: "",
  head_rejected_at: "",
  head_rejection_reason: "",
  head_comment: "",
  head_signature: "",
  admin_rejected_by: "",
  admin_rejected_at: "",
  admin_rejection_reason: "",
  admin_comment: "",
  reviewed_at: "",
  created_at: "",
  updated_at: "",
  deleted_at: "",
});

const normalizeUser = (user) => {
  if (!user) return null;
  const id = Number(user.user_id ?? user.UserID ?? user.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const first = user.user_fname ?? user.fname ?? "";
  const last = user.user_lname ?? user.lname ?? "";
  const email = user.email ?? user.Email ?? "";
  const name = user.name ?? user.Name ?? [first, last].filter(Boolean).join(" ").trim();
  return {
    user_id: id,
    user_fname: first,
    user_lname: last,
    email,
    name: name || email || `UID ${id}`,
  };
};

const displayUserName = (user, cache) => {
  if (!user && !cache) return "-";
  const normalized = normalizeUser(user) || normalizeUser(cache);
  if (!normalized) return "-";
  const { user_fname, user_lname, name, email } = normalized;
  const combined = [user_fname, user_lname].filter(Boolean).join(" ").trim();
  return combined || name || email || `UID ${normalized.user_id}`;
};

const formatDateTimeInput = (value) => {
  if (!value) return "";
  const raw = typeof value === "string" ? value.trim() : String(value).trim();
  if (!raw) return "";
  const normalized = raw.replace(" ", "T");
  const date = new Date(normalized);
  if (!Number.isNaN(date.getTime())) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  const parts = normalized.split("T");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return `${parts[0]}T${parts[1].slice(0, 5)}`;
  }
  return "";
};

const formatDateDisplay = (value) => {
  if (!value) return "-";
  const raw = typeof value === "string" ? value.trim() : String(value).trim();
  if (!raw) return "-";
  const normalized = raw.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return raw;
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatCurrency = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(value));
};

const extractFileNameFromPath = (value) => {
  if (!value) return "";
  const normalized = String(value).replace(/\\+/g, "/");
  const segments = normalized.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
};

const inferFolderTypeFromPath = (value) => {
  if (!value) return "";
  const normalized = String(value).toLowerCase();
  if (normalized.includes("/temp/") || normalized.includes("\\temp\\")) {
    return "temp";
  }
  if (
    normalized.includes("/submissions/") ||
    normalized.includes("\\submissions\\") ||
    normalized.includes("/submission/") ||
    normalized.includes("\\submission\\")
  ) {
    return "submission";
  }
  if (normalized.includes("/users/") || normalized.includes("\\users\\")) {
    return "user";
  }
  return "";
};

const extractErrorMessage = (error) =>
  error?.response?.data?.error || error?.message || "เกิดข้อผิดพลาด";

const buildSubmissionPayload = (form, documents, participants) => {
  const clear = new Set();
  const submission = {
    submission_type: form.submission_type || "fund_application",
    user_id: Number(form.user_id),
    year_id: Number(form.year_id),
    status_id: Number(form.status_id),
  };

  if (!Number.isFinite(submission.user_id) || submission.user_id <= 0) {
    throw new Error("กรุณาระบุผู้ยื่นคำร้อง (User ID)");
  }
  if (!Number.isFinite(submission.year_id) || submission.year_id <= 0) {
    throw new Error("กรุณาเลือกปีงบประมาณ");
  }
  if (!Number.isFinite(submission.status_id) || submission.status_id <= 0) {
    throw new Error("กรุณาเลือกสถานะคำร้อง");
  }

  if (form.submission_number && form.submission_number.trim()) {
    submission.submission_number = form.submission_number.trim();
  }

  const applyOptionalInt = (field, value) => {
    if (value === "" || value === null || value === undefined) {
      submission[field] = null;
      clear.add(field);
      return;
    }
    const num = Number(value);
    if (!Number.isFinite(num)) {
      throw new Error(`ค่า ${field} ต้องเป็นตัวเลข`);
    }
    submission[field] = Math.trunc(num);
  };

  const applyOptionalString = (field, value) => {
    if (value === null || value === undefined) {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      submission[field] = null;
      clear.add(field);
    } else {
      submission[field] = trimmed;
    }
  };

  const applyOptionalDate = (field, value) => {
    if (!value) {
      submission[field] = null;
      clear.add(field);
      return;
    }
    submission[field] = value;
  };

  applyOptionalInt("category_id", form.category_id);
  applyOptionalInt("subcategory_id", form.subcategory_id);
  applyOptionalInt("subcategory_budget_id", form.subcategory_budget_id);
  applyOptionalDate("submitted_at", form.submitted_at);
  applyOptionalInt("installment_number_at_submit", form.installment_number_at_submit);
  applyOptionalInt("admin_approved_by", form.admin_approved_by);
  applyOptionalDate("admin_approved_at", form.admin_approved_at);
  applyOptionalInt("head_approved_by", form.head_approved_by);
  applyOptionalDate("head_approved_at", form.head_approved_at);
  applyOptionalInt("head_rejected_by", form.head_rejected_by);
  applyOptionalDate("head_rejected_at", form.head_rejected_at);
  applyOptionalInt("admin_rejected_by", form.admin_rejected_by);
  applyOptionalDate("admin_rejected_at", form.admin_rejected_at);
  applyOptionalDate("reviewed_at", form.reviewed_at);
  applyOptionalDate("deleted_at", form.deleted_at);
  applyOptionalString("head_rejection_reason", form.head_rejection_reason);
  applyOptionalString("head_comment", form.head_comment);
  applyOptionalString("head_signature", form.head_signature);
  applyOptionalString("admin_rejection_reason", form.admin_rejection_reason);
  applyOptionalString("admin_comment", form.admin_comment);

  if (form.created_at) {
    submission.created_at = form.created_at;
  }
  if (form.updated_at) {
    submission.updated_at = form.updated_at;
  }

  const toNullableString = (value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed ? trimmed : null;
  };

  const toNullableNumber = (value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const documentPayload = (documents || []).map((doc, index) => {
    const docTypeId = Number(doc.document_type_id);
    if (!Number.isFinite(docTypeId) || docTypeId <= 0) {
      throw new Error(`กรุณากรอกประเภทเอกสารให้ถูกต้อง (เอกสารที่ ${index + 1})`);
    }

    const rawFileId = doc.file_id != null ? String(doc.file_id).trim() : "";
    const storedPathCandidate = toNullableString(doc.stored_path);
    const hasExistingFileId = rawFileId !== "";

    if (!hasExistingFileId && !storedPathCandidate) {
      throw new Error(`กรุณาระบุตำแหน่งไฟล์หรือรหัสไฟล์สำหรับรายการเอกสารที่ ${index + 1}`);
    }

    let fileId = null;
    if (hasExistingFileId) {
      fileId = Number(rawFileId);
      if (!Number.isFinite(fileId) || fileId <= 0) {
        throw new Error(`กรุณากรอกรหัสไฟล์ให้ถูกต้อง (เอกสารที่ ${index + 1})`);
      }
    }

    const payload = {
      document_id: doc.document_id ?? undefined,
      document_type_id: docTypeId,
      file_id: fileId,
      description: toNullableString(doc.description),
      display_order: toNullableNumber(doc.display_order) ?? index + 1,
      is_required: Boolean(doc.is_required),
      is_verified: Boolean(doc.is_verified),
      verified_by: toNullableNumber(doc.verified_by),
      verified_at: toNullableString(doc.verified_at),
      external_funding_id: toNullableNumber(doc.external_funding_id),
      created_at: toNullableString(doc.created_at),
    };

    if (Number.isNaN(payload.display_order)) {
      payload.display_order = index + 1;
    }

    if (payload.verified_by != null && Number.isNaN(payload.verified_by)) {
      throw new Error(`กรุณากรอกข้อมูลผู้ตรวจสอบเอกสารให้ถูกต้อง (เอกสารที่ ${index + 1})`);
    }
    if (payload.external_funding_id != null && Number.isNaN(payload.external_funding_id)) {
      payload.external_funding_id = null;
    }

    const storedPath = storedPathCandidate;
    if (storedPath) {
      payload.stored_path = storedPath;
    }

    const originalName = toNullableString(doc.original_name);
    if (originalName) {
      payload.original_name = originalName;
    }

    if (!hasExistingFileId) {
      const derivedName = originalName || toNullableString(doc.file_name) || extractFileNameFromPath(storedPath);
      if (!derivedName) {
        throw new Error(`กรุณากรอกชื่อไฟล์สำหรับรายการเอกสารที่ ${index + 1}`);
      }

      let uploadedBy = toNullableNumber(doc.uploaded_by);
      if (uploadedBy == null) {
        uploadedBy = submission.user_id;
      }
      if (!Number.isFinite(uploadedBy) || uploadedBy <= 0) {
        throw new Error(`กรุณากรอกผู้เพิ่มไฟล์ให้ถูกต้อง (เอกสารที่ ${index + 1})`);
      }

      const fileSize = toNullableNumber(doc.file_size);
      if (fileSize != null && !Number.isFinite(fileSize)) {
        throw new Error(`กรุณากรอกขนาดไฟล์ให้ถูกต้อง (เอกสารที่ ${index + 1})`);
      }

      const mimeType = toNullableString(doc.mime_type);
      const uploadedAt = toNullableString(doc.uploaded_at);
      const folderType = toNullableString(doc.folder_type) || inferFolderTypeFromPath(storedPath);
      const metadata = toNullableString(doc.metadata);
      const fileName = toNullableString(doc.file_name) || derivedName;

      payload.new_file = {
        original_name: derivedName,
        stored_path: storedPath,
        file_name: fileName,
        mime_type: mimeType,
        file_size: fileSize,
        uploaded_by: uploadedBy,
        uploaded_at: uploadedAt,
        folder_type: folderType || null,
        metadata,
        is_public: Boolean(doc.is_public),
      };
    }

    return payload;
  });

  const participantPayload = (participants || [])
    .filter((participant) => participant.user_id && String(participant.user_id).trim())
    .map((participant, index) => {
      const userId = Number(participant.user_id);
      if (!Number.isFinite(userId) || userId <= 0) {
        throw new Error(`กรุณากรอกข้อมูลผู้มีส่วนร่วมให้ถูกต้อง (รายการที่ ${index + 1})`);
      }
      const displayOrder = participant.display_order ? Number(participant.display_order) : index + 1;
      if (Number.isNaN(displayOrder)) {
        throw new Error(`กรุณากรอกลำดับการแสดงผลให้ถูกต้อง (รายการที่ ${index + 1})`);
      }

      const payload = {
        user_id: userId,
        role: participant.role || "coauthor",
        is_primary: Boolean(participant.is_primary),
        display_order: displayOrder,
        created_at: participant.created_at || null,
      };

      if (participant.id) {
        payload.id = participant.id;
      }
      return payload;
    });

  return {
    submission,
    documents: documentPayload,
    users: participantPayload,
    clear_fields: Array.from(clear),
  };
};

export default function LegacySubmissionManager() {
  const { statuses, isLoading: statusLoading, getLabelById } = useStatusMap();
  const [metaLoading, setMetaLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: DEFAULT_PAGE_SIZE,
    total_pages: 1,
    total_count: 0,
    has_next: false,
    has_prev: false,
  });
  const [filters, setFilters] = useState({
    year_id: "",
    submission_type: "",
    status_id: "",
    category_id: "",
    search: "",
  });
  const [years, setYears] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [budgetsBySubcategory, setBudgetsBySubcategory] = useState({});
  const [documentTypes, setDocumentTypes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState(() => createEmptyForm());
  const [documents, setDocuments] = useState([]);
  const [documentLoading, setDocumentLoading] = useState({});
  const [participants, setParticipants] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [userCache, setUserCache] = useState({});

  const statusOptions = useMemo(() => (Array.isArray(statuses) ? statuses : []), [statuses]);

  const filteredSubcategories = useMemo(() => {
    if (!form.category_id) return subcategories;
    return subcategories.filter((sub) => String(sub.category_id) === String(form.category_id));
  }, [subcategories, form.category_id]);

  const availableBudgets = useMemo(() => {
    if (!form.subcategory_id) return [];
    return budgetsBySubcategory[form.subcategory_id] || [];
  }, [budgetsBySubcategory, form.subcategory_id]);

  const cacheUsersFromRecord = useCallback((record) => {
    if (!record) return;
    const updates = {};
    if (record.submission?.user) {
      const normalized = normalizeUser(record.submission.user);
      if (normalized) updates[normalized.user_id] = normalized;
    }
    (record.submission_users || []).forEach((entry) => {
      if (entry.user) {
        const normalized = normalizeUser(entry.user);
        if (normalized) updates[normalized.user_id] = normalized;
      }
    });
    (record.documents || []).forEach((doc) => {
      if (doc.verifier) {
        const normalized = normalizeUser(doc.verifier);
        if (normalized) updates[normalized.user_id] = normalized;
      }
    });
    if (Object.keys(updates).length) {
      setUserCache((prev) => ({ ...prev, ...updates }));
    }
  }, []);

  const fetchMetadata = useCallback(async () => {
    setMetaLoading(true);
    try {
      const [yearRes, categoryRes, subcategoryRes, docTypeRes] = await Promise.all([
        commonAPI.getYears(),
        commonAPI.getCategories(),
        commonAPI.getSubcategories(),
        adminSubmissionAPI.getDocumentTypes(),
      ]);

      const yearsData = yearRes?.years ?? yearRes?.data?.years ?? [];
      const categoryData = categoryRes?.categories ?? categoryRes?.data?.categories ?? [];
      const subcategoryData = subcategoryRes?.subcategories ?? subcategoryRes?.data?.subcategories ?? [];
      const docTypeData = docTypeRes?.document_types ?? docTypeRes?.data?.document_types ?? docTypeRes?.data ?? [];

      setYears(Array.isArray(yearsData) ? yearsData : []);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
      setSubcategories(Array.isArray(subcategoryData) ? subcategoryData : []);
      setDocumentTypes(Array.isArray(docTypeData) ? docTypeData : []);
    } catch (error) {
      console.error("Failed to load metadata", error);
      toast.error(extractErrorMessage(error));
    } finally {
      setMetaLoading(false);
    }
  }, []);

  const loadBudgetsForSubcategory = useCallback(async (subcategoryId) => {
    if (!subcategoryId || budgetsBySubcategory[subcategoryId]) return;
    try {
      const response = await commonAPI.getBudgets({ subcategory_id: subcategoryId, record_scope: "all" });
      const list = response?.budgets ?? response?.data?.budgets ?? [];
      setBudgetsBySubcategory((prev) => ({ ...prev, [subcategoryId]: Array.isArray(list) ? list : [] }));
    } catch (error) {
      console.warn("Failed to load budgets", error);
      toast.error("ไม่สามารถโหลดงบประมาณที่เกี่ยวข้องได้");
    }
  }, [budgetsBySubcategory]);

  const fetchUsersByIds = useCallback(async (ids) => {
    const unique = Array.from(
      new Set(
        ids
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0 && !userCache[id])
      )
    );
    if (!unique.length) return;
    try {
      const response = await adminSubmissionAPI.getUsersByIds(unique);
      const users = response?.users ?? response?.data?.users ?? [];
      if (Array.isArray(users) && users.length) {
        const updates = {};
        users.forEach((user) => {
          const normalized = normalizeUser(user);
          if (normalized) updates[normalized.user_id] = normalized;
        });
        if (Object.keys(updates).length) {
          setUserCache((prev) => ({ ...prev, ...updates }));
        }
      }
    } catch (error) {
      console.warn("Failed to fetch user details", error);
    }
  }, [userCache]);

  const convertSubmissionToForm = useCallback((submission = {}) => ({
    submission_type: submission.submission_type || "fund_application",
    submission_number: submission.submission_number || "",
    user_id: submission.user_id != null ? String(submission.user_id) : "",
    year_id: submission.year_id != null ? String(submission.year_id) : "",
    status_id: submission.status_id != null ? String(submission.status_id) : "",
    category_id: submission.category_id != null ? String(submission.category_id) : "",
    subcategory_id: submission.subcategory_id != null ? String(submission.subcategory_id) : "",
    subcategory_budget_id: submission.subcategory_budget_id != null ? String(submission.subcategory_budget_id) : "",
    submitted_at: formatDateTimeInput(submission.submitted_at),
    installment_number_at_submit: submission.installment_number_at_submit != null ? String(submission.installment_number_at_submit) : "",
    admin_approved_by: submission.admin_approved_by != null ? String(submission.admin_approved_by) : "",
    admin_approved_at: formatDateTimeInput(submission.admin_approved_at),
    head_approved_by: submission.head_approved_by != null ? String(submission.head_approved_by) : "",
    head_approved_at: formatDateTimeInput(submission.head_approved_at),
    head_rejected_by: submission.head_rejected_by != null ? String(submission.head_rejected_by) : "",
    head_rejected_at: formatDateTimeInput(submission.head_rejected_at),
    head_rejection_reason: submission.head_rejection_reason || "",
    head_comment: submission.head_comment || "",
    head_signature: submission.head_signature || "",
    admin_rejected_by: submission.admin_rejected_by != null ? String(submission.admin_rejected_by) : "",
    admin_rejected_at: formatDateTimeInput(submission.admin_rejected_at),
    admin_rejection_reason: submission.admin_rejection_reason || "",
    admin_comment: submission.admin_comment || "",
    reviewed_at: formatDateTimeInput(submission.reviewed_at),
    created_at: formatDateTimeInput(submission.created_at),
    updated_at: formatDateTimeInput(submission.updated_at),
    deleted_at: formatDateTimeInput(submission.deleted_at),
  }), []);

  const convertDocuments = useCallback((docs = []) =>
    docs.map((doc) => ({
      document_id: doc.document_id ?? null,
      file_id: doc.file_id != null ? String(doc.file_id) : "",
      document_type_id: doc.document_type_id != null ? String(doc.document_type_id) : "",
      document_type_name: doc.document_type?.document_type_name || doc.document_type_name || "",
      stored_path: doc.file?.stored_path || doc.stored_path || "",
      original_name: doc.original_name || "",
      file_name: doc.file?.file_name || doc.file?.original_name || doc.file_name || doc.original_name || "",
      description: doc.description || "",
      display_order: doc.display_order != null ? String(doc.display_order) : "",
      is_required: Boolean(doc.is_required),
      is_verified: Boolean(doc.is_verified),
      verified_by: doc.verified_by != null ? String(doc.verified_by) : "",
      verified_at: formatDateTimeInput(doc.verified_at),
      created_at: formatDateTimeInput(doc.created_at),
      external_funding_id: doc.external_funding_id != null ? String(doc.external_funding_id) : "",
      mime_type: doc.file?.mime_type || doc.mime_type || "",
      file_size:
        doc.file?.file_size != null
          ? String(doc.file.file_size)
          : doc.file_size != null
          ? String(doc.file_size)
          : "",
      uploaded_by:
        doc.file?.uploaded_by != null
          ? String(doc.file.uploaded_by)
          : doc.uploaded_by != null
          ? String(doc.uploaded_by)
          : "",
      uploaded_at: formatDateTimeInput(doc.file?.uploaded_at || doc.uploaded_at),
      folder_type:
        doc.file?.folder_type ||
        doc.folder_type ||
        inferFolderTypeFromPath(doc.file?.stored_path || doc.stored_path || ""),
      metadata: doc.file?.metadata || doc.metadata || "",
      is_public: doc.file ? Boolean(doc.file.is_public) : Boolean(doc.is_public),
      file: doc.file || null,
      verifier: doc.verifier || null,
    })), []);

  const convertParticipants = useCallback((rows = []) =>
    rows.map((row) => ({
      id: row.id ?? null,
      user_id: row.user_id != null ? String(row.user_id) : "",
      role: row.role || "coauthor",
      is_primary: Boolean(row.is_primary),
      display_order: row.display_order != null ? String(row.display_order) : "",
      created_at: formatDateTimeInput(row.created_at),
      user: row.user || null,
    })), []);

  const fetchList = useCallback(
    async (page = 1, preserveSelection = false) => {
      setListLoading(true);
      try {
        const params = { page, limit: DEFAULT_PAGE_SIZE };
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== "" && value !== null && value !== undefined) {
            params[key] = value;
          }
        });

        const response = await legacySubmissionAPI.list(params);
        const list = response?.items ?? response?.data ?? [];
        const paginationData = response?.pagination ?? {};

        const normalizedList = Array.isArray(list) ? list : [];
        setItems(normalizedList);
        const currentPage = paginationData.current_page ?? page;
        const perPage = paginationData.per_page ?? DEFAULT_PAGE_SIZE;
        const totalPages = paginationData.total_pages ?? 1;
        const totalCount = paginationData.total_count ?? normalizedList.length;
        const hasNext = paginationData.has_next ?? currentPage < totalPages;
        const hasPrev = paginationData.has_prev ?? currentPage > 1;

        setPagination({
          current_page: currentPage,
          per_page: perPage,
          total_pages: totalPages,
          total_count: totalCount,
          has_next: hasNext,
          has_prev: hasPrev,
        });

        if (!preserveSelection) {
          const firstId = normalizedList?.[0]?.submission?.submission_id;
          if (firstId) {
            setSelectedId(firstId);
            setIsCreating(false);
          } else if (!isCreating) {
            setSelectedId(null);
          }
        }
      } catch (error) {
        console.error("Failed to load submissions", error);
        toast.error(extractErrorMessage(error));
      } finally {
        setListLoading(false);
      }
    },
    [filters, isCreating]
  );

  const fetchDetail = useCallback(
    async (id) => {
      if (!id) return;
      setDetailLoading(true);
      try {
        const response = await legacySubmissionAPI.get(id);
        const record = response?.item ?? response;
        if (!record?.submission) {
          toast.error("ไม่พบข้อมูลคำร้อง");
          return;
        }
        cacheUsersFromRecord(record);
        setForm(convertSubmissionToForm(record.submission));
        setDocuments(convertDocuments(record.documents || []));
        setDocumentLoading({});
        setParticipants(convertParticipants(record.submission_users || []));
      } catch (error) {
        console.error("Failed to load submission detail", error);
        toast.error(extractErrorMessage(error));
      } finally {
        setDetailLoading(false);
      }
    },
    [cacheUsersFromRecord, convertSubmissionToForm, convertDocuments, convertParticipants]
  );

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    if (!metaLoading) {
      fetchList(1, false);
    }
  }, [metaLoading, fetchList]);

  useEffect(() => {
    if (!isCreating && selectedId) {
      fetchDetail(selectedId);
    }
  }, [selectedId, isCreating, fetchDetail]);

  useEffect(() => {
    if (form.subcategory_id) {
      loadBudgetsForSubcategory(form.subcategory_id);
    }
  }, [form.subcategory_id, loadBudgetsForSubcategory]);

  useEffect(() => {
    const ids = [];
    if (form.user_id) {
      ids.push(form.user_id);
    }
    participants.forEach((participant) => {
      if (participant.user_id) {
        ids.push(participant.user_id);
      }
    });
    documents.forEach((doc) => {
      if (doc.verified_by) {
        ids.push(doc.verified_by);
      }
    });
    if (ids.length) {
      fetchUsersByIds(ids);
    }
  }, [form.user_id, participants, documents, fetchUsersByIds]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    fetchList(1, false);
  };

  const handleResetFilters = () => {
    setFilters({ year_id: "", submission_type: "", status_id: "", category_id: "", search: "" });
    fetchList(1, false);
  };

  const handlePageChange = (nextPage) => {
    if (!nextPage) return;
    const target = Number(nextPage);
    if (!Number.isFinite(target)) return;
    const totalPages = Math.max(pagination.total_pages || 1, 1);
    if (target < 1 || target > totalPages) return;
    fetchList(target, false);
  };

  const handleSelectItem = (id) => {
    if (!id) return;
    setSelectedId(id);
    setIsCreating(false);
  };

  const pageStart = pagination.total_count === 0 ? 0 : (pagination.current_page - 1) * pagination.per_page + 1;
  const pageEnd =
    pagination.total_count === 0 ? 0 : pageStart + Math.max(items.length - 1, 0);
  const pageEndDisplay = pagination.total_count === 0 ? 0 : Math.min(pagination.total_count, pageEnd);

  const startCreateNew = () => {
    setIsCreating(true);
    setSelectedId(null);
    setForm(createEmptyForm());
    setDocuments([]);
    setDocumentLoading({});
    setParticipants([]);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "category_id") {
        updated.subcategory_id = "";
        updated.subcategory_budget_id = "";
      }
      if (field === "subcategory_id") {
        updated.subcategory_id = value;
        updated.subcategory_budget_id = "";
      }
      return updated;
    });
  };

  const handleDocumentChange = (index, field, value) => {
    setDocuments((prev) =>
      prev.map((doc, idx) => {
        if (idx !== index) {
          return doc;
        }
        const updated = { ...doc, [field]: value };
        if (field === "file_id") {
          updated.file = null;
          if (String(value ?? "").trim() === "") {
            updated.stored_path = "";
          }
        }
        return updated;
      })
    );
    if (field === "file_id") {
      setDocumentLoading((prev) => {
        if (!prev || !prev[index]) {
          return prev;
        }
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  };

  const handleDocumentToggle = (index, field) => {
    setDocuments((prev) =>
      prev.map((doc, idx) => (idx === index ? { ...doc, [field]: !doc[field] } : doc))
    );
  };

  const addDocument = () => {
    setDocuments((prev) => [
      ...prev,
      {
        document_id: null,
        file_id: "",
        document_type_id: "",
        document_type_name: "",
        stored_path: "",
        original_name: "",
        file_name: "",
        description: "",
        display_order: String(prev.length + 1),
        is_required: false,
        is_verified: false,
        verified_by: "",
        verified_at: "",
        created_at: "",
        external_funding_id: "",
        mime_type: "",
        file_size: "",
        uploaded_by: "",
        uploaded_at: "",
        folder_type: "submission",
        metadata: "",
        is_public: false,
        file: null,
        verifier: null,
      },
    ]);
  };

  const removeDocument = (index) => {
    setDocuments((prev) => prev.filter((_, idx) => idx !== index));
    setDocumentLoading((prev) => {
      if (!prev || Object.keys(prev).length === 0) {
        return prev;
      }
      const next = {};
      Object.keys(prev).forEach((key) => {
        const numeric = Number(key);
        if (Number.isNaN(numeric)) {
          return;
        }
        if (numeric < index && prev[key]) {
          next[numeric] = true;
        } else if (numeric > index && prev[key]) {
          next[numeric - 1] = true;
        }
      });
      return next;
    });
  };

  const handleFetchFileMetadata = async (index) => {
    if (documentLoading[index]) {
      return;
    }
    const target = documents[index];
    if (!target) {
      return;
    }
    const fileId = Number(target.file_id);
    if (!Number.isFinite(fileId) || fileId <= 0) {
      toast.error("กรุณาระบุรหัสไฟล์ให้ถูกต้องก่อน");
      return;
    }

    setDocumentLoading((prev) => ({ ...prev, [index]: true }));
    try {
      const response = await adminSubmissionAPI.getFileUpload(fileId);
      const file = response?.file ?? null;
      if (!file) {
        toast.error("ไม่พบข้อมูลไฟล์ตามรหัสที่ระบุ");
        setDocuments((prev) =>
          prev.map((doc, idx) => (idx === index ? { ...doc, file: null } : doc))
        );
        return;
      }

      setDocuments((prev) =>
        prev.map((doc, idx) => {
          if (idx !== index) {
            return doc;
          }
          const existingPath = typeof doc.stored_path === "string" ? doc.stored_path.trim() : "";
          const resolvedPath = existingPath || file.stored_path || "";
          const fallbackName = file.original_name || file.file_name || extractFileNameFromPath(resolvedPath);
          return {
            ...doc,
            file,
            stored_path: resolvedPath,
            original_name: doc.original_name || file.original_name || fallbackName || doc.original_name,
            file_name: doc.file_name || file.file_name || file.original_name || fallbackName || "",
            mime_type: doc.mime_type || file.mime_type || "",
            file_size:
              doc.file_size ||
              (file.file_size != null ? String(file.file_size) : ""),
            uploaded_by:
              doc.uploaded_by ||
              (file.uploaded_by != null ? String(file.uploaded_by) : ""),
            uploaded_at: doc.uploaded_at || formatDateTimeInput(file.uploaded_at),
            folder_type:
              doc.folder_type ||
              file.folder_type ||
              inferFolderTypeFromPath(resolvedPath),
            metadata: doc.metadata || file.metadata || "",
            is_public: typeof file.is_public === "boolean" ? file.is_public : doc.is_public,
          };
        })
      );
      toast.success("โหลดข้อมูลไฟล์สำเร็จ");
    } catch (error) {
      console.error("Failed to fetch file info", error);
      toast.error(extractErrorMessage(error));
    } finally {
      setDocumentLoading((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  };

  const handleParticipantChange = (index, field, value) => {
    setParticipants((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const toggleParticipantPrimary = (index) => {
    setParticipants((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, is_primary: !item.is_primary } : item))
    );
  };

  const addParticipant = () => {
    setParticipants((prev) => [
      ...prev,
      {
        id: null,
        user_id: "",
        role: "coauthor",
        is_primary: false,
        display_order: String(prev.length + 1),
        created_at: "",
        user: null,
      },
    ]);
  };

  const removeParticipant = (index) => {
    setParticipants((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUserSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      toast.error("กรุณากรอกคำค้นหา");
      return;
    }
    setSearching(true);
    try {
      const response = await usersAPI.search(query);
      const hits = response?.data ?? response?.users ?? [];
      setSearchResults(Array.isArray(hits) ? hits : []);
      if (!hits || hits.length === 0) {
        toast.error("ไม่พบผู้ใช้ที่ตรงคำค้น");
      }
    } catch (error) {
      console.error("User search failed", error);
      toast.error(extractErrorMessage(error));
    } finally {
      setSearching(false);
    }
  };

  const handleAssignApplicant = (user) => {
    const normalized = normalizeUser(user);
    if (!normalized) {
      toast.error("ไม่สามารถเลือกผู้ใช้นี้ได้");
      return;
    }
    setForm((prev) => ({ ...prev, user_id: String(normalized.user_id) }));
    setUserCache((prev) => ({ ...prev, [normalized.user_id]: normalized }));
    toast.success("ตั้งค่าผู้ยื่นคำร้องแล้ว");
  };

  const handleAddParticipantFromSearch = (user) => {
    const normalized = normalizeUser(user);
    if (!normalized) {
      toast.error("ไม่สามารถเพิ่มผู้ใช้นี้ได้");
      return;
    }
    if (participants.some((participant) => Number(participant.user_id) === normalized.user_id)) {
      toast.error("ผู้ใช้นี้อยู่ในรายชื่อแล้ว");
      return;
    }
    setParticipants((prev) => [
      ...prev,
      {
        id: null,
        user_id: String(normalized.user_id),
        role: "coauthor",
        is_primary: false,
        display_order: String(prev.length + 1),
        created_at: "",
        user: {
          user_id: normalized.user_id,
          user_fname: normalized.user_fname,
          user_lname: normalized.user_lname,
          email: normalized.email,
        },
      },
    ]);
    setUserCache((prev) => ({ ...prev, [normalized.user_id]: normalized }));
    toast.success("เพิ่มผู้มีส่วนร่วมแล้ว");
  };

  const clearSearchResults = () => {
    setSearchResults([]);
  };

  const handleSave = async () => {
    try {
      const payload = buildSubmissionPayload(form, documents, participants);
      setSaving(true);
      if (isCreating) {
        const response = await legacySubmissionAPI.create(payload);
        const record = response?.item ?? response;
        toast.success("สร้างคำร้องสำเร็จ");
        cacheUsersFromRecord(record);
        setIsCreating(false);
        const newId = record?.submission?.submission_id;
        if (newId) {
          setSelectedId(newId);
          setForm(convertSubmissionToForm(record.submission));
          setDocuments(convertDocuments(record.documents || []));
          setParticipants(convertParticipants(record.submission_users || []));
        }
        await fetchList(1, true);
      } else if (selectedId) {
        const response = await legacySubmissionAPI.update(selectedId, payload);
        const record = response?.item ?? response;
        toast.success("บันทึกข้อมูลคำร้องแล้ว");
        cacheUsersFromRecord(record);
        setForm(convertSubmissionToForm(record.submission));
        setDocuments(convertDocuments(record.documents || []));
        setParticipants(convertParticipants(record.submission_users || []));
        await fetchList(pagination.current_page || 1, true);
      }
    } catch (error) {
      console.error("Failed to save submission", error);
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm("ต้องการลบคำร้องนี้หรือไม่?")) return;
    setDeleting(true);
    try {
      await legacySubmissionAPI.remove(selectedId);
      toast.success("ลบคำร้องเรียบร้อย");
      setSelectedId(null);
      setIsCreating(false);
      setForm(createEmptyForm());
      setDocuments([]);
      setParticipants([]);
      await fetchList(1, false);
    } catch (error) {
      console.error("Failed to delete submission", error);
      toast.error(extractErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const applicantInfo = useMemo(() => {
    const id = Number(form.user_id);
    if (!Number.isFinite(id) || id <= 0) return null;
    return userCache[id];
  }, [form.user_id, userCache]);

  const typeLabel = useCallback(
    (value) => SUBMISSION_TYPE_OPTIONS.find((option) => option.value === value)?.label || value || "-",
    []
  );

  const renderDocumentTypeOptions = useMemo(
    () =>
      documentTypes.map((type, index) => (
        <option
          key={`${type.document_type_id ?? type.id ?? "document-type"}-${index}`}
          value={type.document_type_id ?? type.id}
        >
          {type.document_type_name || type.name || `ประเภทเอกสาร ${type.document_type_id ?? type.id}`}
        </option>
      )),
    [documentTypes]
  );

  return (
    <PageLayout
      title="ระบบจัดการคำร้อง (ข้อมูลเก่า)"
      subtitle="บันทึกคำร้องย้อนหลังพร้อมตรวจสอบข้อมูลจากตารางที่เกี่ยวข้อง"
      icon={FileSpreadsheet}
      loading={metaLoading || statusLoading}
    >
      <div className="space-y-6">
        <section className="bg-white border rounded-lg shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">รายการคำร้อง</h2>
              <p className="text-xs text-gray-500">กรองคำร้องและเลือกเพื่อดูรายละเอียด</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchList(pagination.current_page || 1, true)}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                <RefreshCcw className="h-4 w-4" /> รีเฟรช
              </button>
              <button
                type="button"
                onClick={startCreateNew}
                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> สร้างใหม่
              </button>
            </div>
          </div>

          <div className="px-4 py-4 border-b border-gray-100">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-gray-600">ปีงบประมาณ</label>
                <select
                  value={filters.year_id}
                  onChange={(e) => handleFilterChange("year_id", e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="">ทั้งหมด</option>
                  {years.map((year, index) => (
                    <option key={`${year.year_id ?? year.id ?? "year"}-${index}`} value={year.year_id ?? year.id}>
                      {year.year ?? year.name ?? year.year_id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">ประเภทคำร้อง</label>
                <select
                  value={filters.submission_type}
                  onChange={(e) => handleFilterChange("submission_type", e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="">ทั้งหมด</option>
                  {SUBMISSION_TYPE_OPTIONS.map((option, index) => (
                    <option key={`${option.value}-${index}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">สถานะคำร้อง</label>
                <select
                  value={filters.status_id}
                  onChange={(e) => handleFilterChange("status_id", e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="">ทั้งหมด</option>
                  {statusOptions.map((status, index) => (
                    <option key={`${status.application_status_id}-${index}`} value={status.application_status_id}>
                      {status.status_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">หมวดทุน</label>
                <select
                  value={filters.category_id}
                  onChange={(e) => handleFilterChange("category_id", e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="">ทั้งหมด</option>
                  {categories.map((category, index) => (
                    <option key={`${category.category_id}-${index}`} value={category.category_id}>
                      {category.category_name || `หมวด ${category.category_id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <label className="text-xs font-medium text-gray-600">ค้นหาเลขคำร้อง</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  placeholder="กรอกเลขที่คำร้อง"
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleApplyFilters}
                className="inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <Search className="h-4 w-4" /> ค้นหา
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center justify-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100">
            <div className="max-h-[60vh] overflow-y-auto">
              {listLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="large" />
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                ไม่พบคำร้องตามเงื่อนไขที่เลือก
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-600">
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">เลขคำร้อง</th>
                    <th className="px-4 py-2">ประเภท</th>
                    <th className="px-4 py-2">วารสาร/แหล่งตีพิมพ์ (Journal)</th>
                    <th className="px-4 py-2">ผู้ยื่น</th>
                    <th className="px-4 py-2">สถานะ</th>
                    <th className="px-4 py-2">หมวด / ประเภทย่อย</th>
                    <th className="px-4 py-2">สร้างเมื่อ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((record, index) => {
                    const submission = record.submission || {};
                    const id = submission.submission_id;
                    const applicantName =
                      typeof submission.applicant_name === "string"
                        ? submission.applicant_name.trim()
                        : "";
                    const applicant =
                      applicantName || displayUserName(submission.user, userCache[submission.user_id]);
                    const statusLabelValue = getLabelById(submission.status_id) || "-";
                    const categoryName = submission.category?.category_name || submission.category_name || "-";
                    const subcategoryName = submission.subcategory?.subcategory_name || submission.subcategory_name || "-";
                    const createdAt = formatDateDisplay(submission.created_at);
                    const journalName =
                      submission.publication_reward_journal_name ??
                      (submission.submission_type === "publication_reward"
                        ? submission.publication_reward_detail?.paper_title
                        : submission.submission_type === "fund_application"
                        ? submission.fund_application_detail?.project_title
                        : null) ??
                      "-";
                    const isActive = !isCreating && selectedId === id;

                    return (
                      <tr
                        key={id ? `${id}-${index}` : `row-${index}`}
                        onClick={() => handleSelectItem(id)}
                        className={`cursor-pointer ${isActive ? "bg-blue-50" : "hover:bg-gray-50"}`}
                      >
                        <td className="px-4 py-2 text-gray-600">{id}</td>
                        <td className="px-4 py-2 font-medium text-gray-800">{submission.submission_number || "-"}</td>
                        <td className="px-4 py-2 text-gray-600">{typeLabel(submission.submission_type)}</td>
                        <td className="px-4 py-2 text-gray-600">{journalName || "-"}</td>
                        <td className="px-4 py-2 text-gray-600">{applicant}</td>
                        <td className="px-4 py-2 text-gray-600">{statusLabelValue}</td>
                        <td className="px-4 py-2 text-gray-600">
                          <div>{categoryName}</div>
                          <div className="text-xs text-gray-500">{subcategoryName}</div>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{createdAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            </div>
            {!listLoading && pagination.total_count > 0 && (
              <div className="flex flex-col gap-2 border-t border-gray-100 px-4 py-3 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  แสดง {pageStart}-{pageEndDisplay} จาก {pagination.total_count} รายการ
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={!pagination.has_prev}
                    className="inline-flex items-center rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ก่อนหน้า
                  </button>
                  <span>
                    หน้า {pagination.current_page} / {pagination.total_pages || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={!pagination.has_next}
                    className="inline-flex items-center rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white border rounded-lg shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">
                {isCreating ? "สร้างคำร้องใหม่" : selectedId ? `รายละเอียดคำร้อง #${selectedId}` : "เลือกรายการเพื่อดูรายละเอียด"}
              </h2>
              {!isCreating && selectedId && (
                <p className="text-xs text-gray-500">อัปเดตล่าสุด: {form.updated_at ? formatDateDisplay(form.updated_at) : "-"}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isCreating && selectedId && (
                <button
                  type="button"
                  onClick={() => fetchDetail(selectedId)}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                >
                  <RefreshCcw className="h-4 w-4" /> โหลดซ้ำ
                </button>
              )}
              {!isCreating && selectedId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" /> ลบคำร้อง
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> {isCreating ? "บันทึกคำร้อง" : "บันทึกการแก้ไข"}
              </button>
            </div>
          </div>

          <div className="p-4 lg:p-6">
            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <LoadingSpinner size="large" />
              </div>
            ) : isCreating || selectedId ? (
              <div className="space-y-8">
                <section>
                  <h3 className="text-sm font-semibold text-gray-700">ข้อมูลคำร้อง</h3>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600">ประเภทคำร้อง</label>
                      <select
                        value={form.submission_type}
                        onChange={(e) => handleFormChange("submission_type", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        {SUBMISSION_TYPE_OPTIONS.map((option, index) => (
                          <option key={`${option.value}-${index}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">เลขที่คำร้อง</label>
                      <input
                        type="text"
                        value={form.submission_number}
                        onChange={(e) => handleFormChange("submission_number", e.target.value)}
                        placeholder="ปล่อยว่างเพื่อให้ระบบสร้างให้อัตโนมัติ"
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">ผู้ยื่นคำร้อง (User ID)</label>
                      <input
                        type="number"
                        value={form.user_id}
                        onChange={(e) => handleFormChange("user_id", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      {applicantInfo && (
                        <p className="mt-1 text-xs text-gray-500">
                          {displayUserName(applicantInfo)}
                          {applicantInfo.email ? ` • ${applicantInfo.email}` : ""}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">ปีงบประมาณ</label>
                      <select
                        value={form.year_id}
                        onChange={(e) => handleFormChange("year_id", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">เลือกปีงบประมาณ</option>
                        {years.map((year, index) => (
                          <option key={`${year.year_id ?? year.id ?? "year"}-${index}`} value={year.year_id ?? year.id}>
                            {year.year ?? year.name ?? year.year_id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">สถานะคำร้อง</label>
                      <select
                        value={form.status_id}
                        onChange={(e) => handleFormChange("status_id", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">เลือกสถานะ</option>
                        {statusOptions.map((status, index) => (
                          <option key={`${status.application_status_id}-${index}`} value={status.application_status_id}>
                            {status.status_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">หมวดทุน</label>
                      <select
                        value={form.category_id}
                        onChange={(e) => handleFormChange("category_id", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">เลือกหมวดทุน</option>
                        {categories.map((category, index) => (
                          <option key={`${category.category_id}-${index}`} value={category.category_id}>
                            {category.category_name || `หมวด ${category.category_id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">ประเภทย่อยของทุน</label>
                      <select
                        value={form.subcategory_id}
                        onChange={(e) => handleFormChange("subcategory_id", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">เลือกประเภทย่อย</option>
                        {filteredSubcategories.map((sub, index) => (
                          <option key={`${sub.subcategory_id}-${index}`} value={sub.subcategory_id}>
                            {sub.subcategory_name || `ประเภทย่อย ${sub.subcategory_id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">งบประมาณย่อย</label>
                      <select
                        value={form.subcategory_budget_id}
                        onChange={(e) => handleFormChange("subcategory_budget_id", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">เลือกงบประมาณ</option>
                        {availableBudgets.map((budget, index) => (
                          <option key={`${budget.subcategory_budget_id}-${index}`} value={budget.subcategory_budget_id}>
                            {`${budget.level || ""} ${formatCurrency(budget.allocated_amount)}`.trim()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-gray-700">สถานะการอนุมัติ</h3>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600">ผู้ยืนยันฝ่ายผู้ดูแล</label>
                      <input
                        type="number"
                        value={form.admin_approved_by}
                        onChange={(e) => handleFormChange("admin_approved_by", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">วันที่ฝ่ายผู้ดูแลอนุมัติ</label>
                      <input
                        type="datetime-local"
                        value={form.admin_approved_at}
                        onChange={(e) => handleFormChange("admin_approved_at", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">ผู้ยืนยันหัวหน้าสาขา</label>
                      <input
                        type="number"
                        value={form.head_approved_by}
                        onChange={(e) => handleFormChange("head_approved_by", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">วันที่หัวหน้าสาขาอนุมัติ</label>
                      <input
                        type="datetime-local"
                        value={form.head_approved_at}
                        onChange={(e) => handleFormChange("head_approved_at", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">ผู้ไม่เห็นควร (หัวหน้าสาขา)</label>
                      <input
                        type="number"
                        value={form.head_rejected_by}
                        onChange={(e) => handleFormChange("head_rejected_by", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">วันที่ไม่เห็นควร</label>
                      <input
                        type="datetime-local"
                        value={form.head_rejected_at}
                        onChange={(e) => handleFormChange("head_rejected_at", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">ผู้ไม่อนุมัติ (ผู้ดูแล)</label>
                      <input
                        type="number"
                        value={form.admin_rejected_by}
                        onChange={(e) => handleFormChange("admin_rejected_by", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">วันที่ผู้ดูแลไม่อนุมัติ</label>
                      <input
                        type="datetime-local"
                        value={form.admin_rejected_at}
                        onChange={(e) => handleFormChange("admin_rejected_at", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">ผู้ไม่เห็นควร (ระบบ)</label>
                      <input
                        type="number"
                        value=""
                        disabled
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">วันที่ไม่เห็นควร (ระบบ)</label>
                      <input
                        type="datetime-local"
                        value=""
                        disabled
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">วันที่ส่งคำร้อง</label>
                      <input
                        type="datetime-local"
                        value={form.submitted_at}
                        onChange={(e) => handleFormChange("submitted_at", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">ลำดับงวด (ขณะส่ง)</label>
                      <input
                        type="number"
                        value={form.installment_number_at_submit}
                        onChange={(e) => handleFormChange("installment_number_at_submit", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">วันที่ตรวจสอบ</label>
                      <input
                        type="datetime-local"
                        value={form.reviewed_at}
                        onChange={(e) => handleFormChange("reviewed_at", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600">เหตุผลที่หัวหน้าสาขาไม่เห็นควร</label>
                      <textarea
                        rows={2}
                        value={form.head_rejection_reason}
                        onChange={(e) => handleFormChange("head_rejection_reason", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium text-gray-600">ความคิดเห็นหัวหน้าสาขา</label>
                        <textarea
                          rows={2}
                          value={form.head_comment}
                          onChange={(e) => handleFormChange("head_comment", e.target.value)}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">ลายเซ็นหัวหน้าสาขา</label>
                        <textarea
                          rows={2}
                          value={form.head_signature}
                          onChange={(e) => handleFormChange("head_signature", e.target.value)}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">เหตุผลที่ผู้ดูแลไม่อนุมัติ</label>
                      <textarea
                        rows={2}
                        value={form.admin_rejection_reason}
                        onChange={(e) => handleFormChange("admin_rejection_reason", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600">หมายเหตุฝ่ายผู้ดูแล</label>
                      <textarea
                        rows={2}
                        value={form.admin_comment}
                        onChange={(e) => handleFormChange("admin_comment", e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </section>

                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">เอกสารแนบ</h3>
                    <button
                      type="button"
                      onClick={addDocument}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <Plus className="h-4 w-4" /> เพิ่มเอกสาร
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {documents.length === 0 ? (
                      <p className="text-sm text-gray-500">ยังไม่มีเอกสารแนบ</p>
                    ) : (
                      documents.map((doc, index) => (
                        <div key={index} className="rounded-md border border-gray-200 bg-gray-50 p-4">
                          <div className="flex items-start justify-between">
                            <div className="text-sm font-semibold text-gray-700">เอกสารลำดับที่ {index + 1}</div>
                            <button
                              type="button"
                              onClick={() => removeDocument(index)}
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" /> ลบ
                            </button>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="text-xs font-medium text-gray-600">ประเภทเอกสาร</label>
                              <select
                                value={doc.document_type_id}
                                onChange={(e) => handleDocumentChange(index, "document_type_id", e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                              >
                                <option value="">เลือกประเภทเอกสาร</option>
                                {renderDocumentTypeOptions}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600">รหัสไฟล์ (file_id)</label>
                              <div className="mt-1 flex items-center gap-2">
                                <input
                                  type="number"
                                  value={doc.file_id}
                                  onChange={(e) => handleDocumentChange(index, "file_id", e.target.value)}
                                  className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleFetchFileMetadata(index)}
                                  disabled={Boolean(documentLoading[index])}
                                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  {documentLoading[index] ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "ตรวจสอบ"
                                  )}
                                </button>
                              </div>
                              <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                                {doc.file ? (
                                  <>
                                    <div>ชื่อไฟล์: {doc.file.original_name || "-"}</div>
                                    <div>Path จากระบบ: {doc.file.stored_path || "-"}</div>
                                  </>
                                ) : null}
                                {!doc.file && doc.stored_path ? (
                                  <div>Path ปัจจุบัน: {doc.stored_path}</div>
                                ) : null}
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-xs font-medium text-gray-600">ตำแหน่งไฟล์ (stored_path)</label>
                              <input
                                type="text"
                                value={doc.stored_path}
                                onChange={(e) => handleDocumentChange(index, "stored_path", e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                placeholder="เช่น ./uploads/users/123/submissions/456/document.pdf"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                ระบุ path ให้ตรงกับไฟล์ที่จัดเก็บบนเซิร์ฟเวอร์ หากปล่อยว่างจะใช้งาน path เดิมจากฐานข้อมูล
                              </p>
                            </div>
                            <div className="md:col-span-2 grid gap-3 md:grid-cols-3">
                              <div>
                                <label className="text-xs font-medium text-gray-600">ชื่อไฟล์ในระบบ (file_name)</label>
                                <input
                                  type="text"
                                  value={doc.file_name}
                                  onChange={(e) => handleDocumentChange(index, "file_name", e.target.value)}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                  placeholder="เช่น document.pdf"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">ชนิดไฟล์ (mime_type)</label>
                                <input
                                  type="text"
                                  value={doc.mime_type}
                                  onChange={(e) => handleDocumentChange(index, "mime_type", e.target.value)}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                  placeholder="application/pdf"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">ขนาดไฟล์ (ไบต์)</label>
                                <input
                                  type="number"
                                  value={doc.file_size}
                                  onChange={(e) => handleDocumentChange(index, "file_size", e.target.value)}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                  min="0"
                                />
                              </div>
                            </div>
                            <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                              <div>
                                <label className="text-xs font-medium text-gray-600">ผู้เพิ่มไฟล์ (uploaded_by)</label>
                                <input
                                  type="number"
                                  value={doc.uploaded_by}
                                  onChange={(e) => handleDocumentChange(index, "uploaded_by", e.target.value)}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                  min="1"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">วันที่เพิ่มไฟล์ (uploaded_at)</label>
                                <input
                                  type="datetime-local"
                                  value={doc.uploaded_at}
                                  onChange={(e) => handleDocumentChange(index, "uploaded_at", e.target.value)}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                />
                              </div>
                            </div>
                            <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                              <div>
                                <label className="text-xs font-medium text-gray-600">ประเภทโฟลเดอร์ (folder_type)</label>
                                <input
                                  type="text"
                                  value={doc.folder_type}
                                  onChange={(e) => handleDocumentChange(index, "folder_type", e.target.value)}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                  placeholder="เช่น submission หรือ temp"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Metadata (ถ้ามี)</label>
                                <input
                                  type="text"
                                  value={doc.metadata}
                                  onChange={(e) => handleDocumentChange(index, "metadata", e.target.value)}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={Boolean(doc.is_public)}
                                  onChange={() => handleDocumentToggle(index, "is_public")}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                เปิดให้เข้าถึงสาธารณะ (is_public)
                              </label>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600">ชื่อไฟล์ที่ต้องการแสดง</label>
                              <input
                                type="text"
                                value={doc.original_name}
                                onChange={(e) => handleDocumentChange(index, "original_name", e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600">ลำดับการแสดงผล</label>
                              <input
                                type="number"
                                value={doc.display_order}
                                onChange={(e) => handleDocumentChange(index, "display_order", e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-4">
                              <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={doc.is_required}
                                  onChange={() => handleDocumentToggle(index, "is_required")}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                จำเป็นต้องมี
                              </label>
                              <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={doc.is_verified}
                                  onChange={() => handleDocumentToggle(index, "is_verified")}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                ตรวจสอบแล้ว
                              </label>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600">ผู้ตรวจสอบ</label>
                              <input
                                type="number"
                                value={doc.verified_by}
                                onChange={(e) => handleDocumentChange(index, "verified_by", e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                              />
                              {doc.verifier && (
                                <p className="mt-1 text-xs text-gray-500">{displayUserName(doc.verifier, userCache[doc.verified_by])}</p>
                              )}
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600">วันที่ตรวจสอบ</label>
                              <input
                                type="datetime-local"
                                value={doc.verified_at}
                                onChange={(e) => handleDocumentChange(index, "verified_at", e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600">รหัสแหล่งเงิน (external)</label>
                              <input
                                type="number"
                                value={doc.external_funding_id}
                                onChange={(e) => handleDocumentChange(index, "external_funding_id", e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600">วันที่แนบ</label>
                              <input
                                type="datetime-local"
                                value={doc.created_at}
                                onChange={(e) => handleDocumentChange(index, "created_at", e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-xs font-medium text-gray-600">คำอธิบาย</label>
                              <textarea
                                rows={2}
                                value={doc.description}
                                onChange={(e) => handleDocumentChange(index, "description", e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">ผู้มีส่วนร่วม</h3>
                    <button
                      type="button"
                      onClick={addParticipant}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <UserPlus className="h-4 w-4" /> เพิ่มผู้มีส่วนร่วม
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {participants.length === 0 ? (
                      <p className="text-sm text-gray-500">ยังไม่มีผู้มีส่วนร่วม</p>
                    ) : (
                      participants.map((participant, index) => {
                        const cache = userCache[Number(participant.user_id)];
                        return (
                          <div key={index} className="rounded-md border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-start justify-between">
                              <div className="text-sm font-semibold text-gray-700">ผู้มีส่วนร่วมลำดับที่ {index + 1}</div>
                              <button
                                type="button"
                                onClick={() => removeParticipant(index)}
                                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" /> ลบ
                              </button>
                            </div>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <div>
                                <label className="text-xs font-medium text-gray-600">รหัสผู้ใช้</label>
                                <input
                                  type="number"
                                  value={participant.user_id}
                                  onChange={(e) => handleParticipantChange(index, "user_id", e.target.value)}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                />
                                {cache && (
                                  <p className="mt-1 text-xs text-gray-500">{displayUserName(cache)}</p>
                                )}
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">บทบาท</label>
                                <select
                                  value={participant.role}
                                  onChange={(e) => handleParticipantChange(index, "role", e.target.value)}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                >
                                  {PARTICIPANT_ROLE_OPTIONS.map((option, index) => (
                                    <option key={`${option.value}-${index}`} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-center gap-3">
                                <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                                  <input
                                    type="checkbox"
                                    checked={participant.is_primary}
                                    onChange={() => toggleParticipantPrimary(index)}
                                    className="h-4 w-4 rounded border-gray-300"
                                  />
                                  ผู้รับผิดชอบหลัก
                                </label>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">ลำดับการแสดงผล</label>
                                <input
                                  type="number"
                                  value={participant.display_order}
                                  onChange={(e) => handleParticipantChange(index, "display_order", e.target.value)}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">วันที่เพิ่ม</label>
                                <input
                                  type="datetime-local"
                                  value={participant.created_at}
                                  onChange={(e) => handleParticipantChange(index, "created_at", e.target.value)}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-gray-700">ค้นหาผู้ใช้</h3>
                  <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ชื่อหรืออีเมลผู้ใช้"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleUserSearch}
                        disabled={searching}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        <Search className="h-4 w-4" /> {searching ? "กำลังค้นหา..." : "ค้นหา"}
                      </button>
                      <button
                        type="button"
                        onClick={clearSearchResults}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                      >
                        ล้างผลลัพธ์
                      </button>
                    </div>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {searchResults.map((user, index) => (
                        <div
                          key={`${user.UserID ?? user.user_id ?? "user"}-${index}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-700">{user.Name || user.name || `ผู้ใช้ ${user.UserID ?? user.user_id}`}</div>
                            <div className="text-xs text-gray-500">{user.Email || user.email || "ไม่มีอีเมล"}</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleAssignApplicant(user)}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                            >
                              ตั้งเป็นผู้ยื่น
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddParticipantFromSearch(user)}
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                            >
                              เพิ่มในผู้มีส่วนร่วม
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <div className="py-16 text-center text-sm text-gray-500">
                เลือกคำร้องจากรายการด้านบนเพื่อดูรายละเอียด หรือกด "สร้างใหม่" เพื่อเพิ่มข้อมูลย้อนหลัง
              </div>
            )}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}