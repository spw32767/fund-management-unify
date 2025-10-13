"use client";

import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { Save, RefreshCw, Calendar as CalendarIcon, Clock, Settings as SettingsIcon } from "lucide-react";
import systemConfigAPI from "@/app/lib/system_config_api";
import apiClient from "@/app/lib/api";
import SettingsSectionCard from "@/app/admin/components/settings/common/SettingsSectionCard";

/** ไทย: แปลงวันที่ ISO เป็นรูปแบบไทยอ่านง่าย (ปี พ.ศ., เดือนแบบคำ, เวลา HH:mm) */
function formatThaiFull(dtStr) {
  if (!dtStr) return "-";
  try {
    const d = new Date(dtStr);
    const fmt = new Intl.DateTimeFormat("th-TH-u-nu-latn", {
      timeZone: "Asia/Bangkok",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return fmt.format(d);
  } catch {
    return dtStr;
  }
}

function toLocalInput(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  } catch {
    return "";
  }
}

const toISOOrNull = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

// ====== helper: ดึง users จาก response ได้หลายรูปแบบ ======
const extractUsers = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.users)) return res.users;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.list)) return res.list;
  if (res.result && Array.isArray(res.result.items)) return res.result.items;
  return [];
};

const norm = (x) => String(x ?? "").trim().toLowerCase();

/** รวมคีย์ role ทั้งหมดจาก user (รองรับหลายโครงสร้าง) */
function collectRoleKeys(user) {
  const keys = [];
  if (user?.role_id != null) keys.push(norm(user.role_id));
  if (user?.role != null) keys.push(norm(user.role));
  if (user?.user_role != null) keys.push(norm(user.user_role));
  if (user?.position != null) keys.push(norm(user.position));
  if (Array.isArray(user?.roles)) {
    for (const r of user.roles) {
      if (r == null) continue;
      if (typeof r === "string") keys.push(norm(r));
      else {
        if (r?.id != null) keys.push(norm(r.id));
        if (r?.role_id != null) keys.push(norm(r.role_id));
        if (r?.name != null) keys.push(norm(r.name));
        if (r?.code != null) keys.push(norm(r.code));
        if (r?.title != null) keys.push(norm(r.title));
      }
    }
  }
  return Array.from(new Set(keys.filter(Boolean)));
}

/** synonyms เพื่อจับ role แบบ dynamic */
function expandRoleSynonyms(key) {
  const k = norm(key);
  const out = new Set([k]);
  // teacher
  if (k.includes("teacher") || k.includes("lecturer") || k.includes("อาจาร")) {
    out.add("1");
    out.add("teacher");
  }
  // dept_head
  if (k.includes("dept_head") || k.includes("department_head") || k.includes("หัวหน้าสาขา") || (k.includes("dept") && k.includes("head"))) {
    out.add("4");
    out.add("dept_head");
  }
  // ถ้าเป็นตัวเลขให้คงไว้
  if (/^\d+$/.test(k)) out.add(k);
  return out;
}

function isEligibleUserDynamic(user, allowedKeys) {
  if (!allowedKeys || !allowedKeys.length) return true; // ไม่ฟิลเตอร์
  const userKeys = collectRoleKeys(user);
  if (!userKeys.length) return false;

  const allowAll = new Set();
  for (const a of allowedKeys) for (const v of expandRoleSynonyms(a)) allowAll.add(v);
  // เติมชื่อที่พบบ่อยจากตัวเลข
  if (allowAll.has("1")) ["teacher", "lecturer", "อาจารย์"].forEach((x) => allowAll.add(x));
  if (allowAll.has("4")) ["dept_head", "department_head", "หัวหน้าสาขา"].forEach((x) => allowAll.add(x));

  for (const uk of userKeys) {
    if (allowAll.has(uk)) return true;
    for (const ak of allowAll) {
      if (!ak) continue;
      if (uk.includes(ak) || ak.includes(uk)) return true;
    }
  }
  return false;
}

const FALLBACK_ROLE_PATTERNS = ["teacher", "อาจารย์", "dept_head", "หัวหน้าสาขา"];

// ====== Dedupe helpers ======
function formatUserName(u) {
  const fullByUserCols = [u?.user_fname, u?.user_lname].filter(Boolean).join(" ").trim();
  const fullByGeneric = [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim();

  return (
    (u?.display_name && String(u.display_name).trim()) ||
    (u?.full_name && String(u.full_name).trim()) ||
    (fullByUserCols && fullByUserCols) ||
    (fullByGeneric && fullByGeneric) ||
    (u?.name && String(u.name).trim()) ||
    (u?.username && String(u.username).trim()) ||
    ""
  );
}

const labelKeyForUser = (u) => {
  const id = u?.user_id ?? u?.id;
  const label = formatUserName(u) || u?.email || `ผู้ใช้ #${id}`;
  return String(label).trim().toLowerCase();
};

// เลือก user ที่ "label" ดี/สมบูรณ์กว่า ระหว่างสองตัว (ใช้เมื่อซ้ำ id)
const chooseBetterUser = (a, b) => {
  const labelOf = (x) => (formatUserName(x) || x?.email || "").trim();
  const score = (x) => {
    let s = 0;
    if (x?.display_name) s += 4;
    if (x?.full_name) s += 3;
    if (x?.user_fname || x?.user_lname) s += 2;
    if (x?.first_name || x?.last_name) s += 2;
    if (x?.name) s += 1;
    if (x?.username) s += 0.5;
    s += Math.min(2, labelOf(x).length / 10);
    return s;
  };
  return score(b) > score(a) ? b : a;
};

// ลบซ้ำโดย "ผูกกับ id/email" แต่ถ้าซ้ำ id ให้เลือกตัวที่ชื่อดีกว่า
const dedupeUsers = (arr = []) => {
  const map = new Map(); // key -> user
  for (const u of arr) {
    const id = u?.user_id ?? u?.id;
    const key =
      id != null
        ? `id:${Number(id)}`
        : u?.email
        ? `email:${String(u.email).toLowerCase()}`
        : `label:${labelKeyForUser(u)}`;
    if (!map.has(key)) map.set(key, u);
    else map.set(key, chooseBetterUser(map.get(key), u));
  }
  return Array.from(map.values());
};

// ลบซ้ำตามชื่อที่แสดง (ถ้าชื่อซ้ำหลาย id ให้เลือกตัวที่ "อยู่ใน preferredIds" ก่อน)
const dedupeUsersByLabel = (arr = [], preferredIds = []) => {
  const pref = new Set((preferredIds || []).map((x) => String(x)));
  const seen = new Map(); // key: labelKey -> user
  for (const u of arr) {
    const key = labelKeyForUser(u);
    if (!seen.has(key)) {
      seen.set(key, u);
      continue;
    }
    const cur = seen.get(key);
    const curId = cur?.user_id ?? cur?.id;
    const newId = u?.user_id ?? u?.id;
    const keepNew = pref.has(String(newId)) && !pref.has(String(curId));
    if (keepNew) seen.set(key, u);
  }
  return Array.from(seen.values());
};

// ====== utilities อื่น ๆ ======
const slotByKey = {
  main_annoucement: "main", // คงการสะกดเดิมตาม schema
  reward_announcement: "reward",
  activity_support_announcement: "activity_support",
  conference_announcement: "conference",
  service_announcement: "service",
};
const slotWindowKeys = (slot) => ({ start: `${slot}_start_date`, end: `${slot}_end_date` });
const slotLabel = (slot) => {
  switch (slot) {
    case "main":
      return "หลักเกณฑ์";
    case "reward":
      return "ทุนอุดหนุนกิจกรรม";
    case "activity_support":
      return "ทุนส่งเสริมวิจัย";
    case "conference":
      return "ประชุมวิชาการ";
    case "service":
      return "บริการวิชาการ";
    default:
      return slot;
  }
};

function isValidLocalRange(startStr, endStr) {
  if (!startStr || !endStr) return false;
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
  return s.getTime() <= e.getTime();
}

/** อ่าน config roles แบบ dynamic: API -> ENV -> null */
async function getEligibleRoleKeysDynamic() {
  try {
    const res = await apiClient.get("/system-config/dept-head/eligible-roles");
    const arr = Array.isArray(res) ? res : res?.data ?? res?.items ?? [];
    const keys = (arr || []).map((x) => norm(x)).filter(Boolean);
    if (keys.length) return keys;
  } catch {
    // ignore
  }
  if (typeof process !== "undefined" && process?.env?.NEXT_PUBLIC_DEPT_HEAD_ELIGIBLE_ROLES) {
    const envKeys = String(process.env.NEXT_PUBLIC_DEPT_HEAD_ELIGIBLE_ROLES)
      .split(/[,;|]/)
      .map((s) => norm(s))
      .filter(Boolean);
    if (envKeys.length) return envKeys;
  }
  return null;
}

/** ให้แน่ใจว่า id ที่ใช้อยู่ปรากฏในลิสต์เสมอ */
function ensureIncludeIds(list, ids = []) {
  const have = new Set(list.map((u) => String(u?.user_id ?? u?.id)));
  ids.forEach((id) => {
    if (!id && id !== 0) return;
    const key = String(id);
    if (!have.has(key)) {
      list.push({ id, user_id: id, display_name: `ผู้ใช้ #${id}` });
      have.add(key);
    }
  });
  return list;
}

export default function SystemConfigSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSlot, setSavingSlot] = useState(null);

  const [form, setForm] = useState({
    current_year: "",
    start_date: "",
    end_date: "",
    main_annoucement: "",
    reward_announcement: "",
    activity_support_announcement: "",
    conference_announcement: "",
    service_announcement: "",
    main_start_date: "",
    main_end_date: "",
    reward_start_date: "",
    reward_end_date: "",
    activity_support_start_date: "",
    activity_support_end_date: "",
    conference_start_date: "",
    conference_end_date: "",
    service_start_date: "",
    service_end_date: "",
  });

  const [windowInfo, setWindowInfo] = useState(null);
  const [annList, setAnnList] = useState([]);

  // --- ผู้ใช้ ---
  const [allUsers, setAllUsers] = useState([]); // ผู้ใช้ทั้งหมด (สำหรับ userMap/ประวัติ)
  const [users, setUsers] = useState([]); // ผู้ใช้ที่ผ่านการกรองสำหรับ dropdown
  const [eligibleRoleKeys, setEligibleRoleKeys] = useState(null); // dynamic keys

  // --- หัวหน้าสาขา ---
  const [currentHead, setCurrentHead] = useState(null);
  const [headHistory, setHeadHistory] = useState([]);
  const [headLoading, setHeadLoading] = useState(false);
  const [headSaving, setHeadSaving] = useState(false);

  const [deptHeadForm, setDeptHeadForm] = useState({
    head_user_id: "",
    start_date: "",
    end_date: "",
    note: "",
  });

  // --- ประวัติประกาศราย slot ---
  const [annHistoryLoading, setAnnHistoryLoading] = useState(false);
  const [annHistory, setAnnHistory] = useState({
    main: [],
    reward: [],
    activity_support: [],
    conference: [],
    service: [],
  });

  const toast = (icon, title) =>
    Swal.fire({
      toast: true,
      position: "top-end",
      timer: 2400,
      showConfirmButton: false,
      icon,
      title,
    });

  const hasValidWindow = () => {
    const s = form.start_date ? new Date(form.start_date) : null;
    const e = form.end_date ? new Date(form.end_date) : null;
    if (!s || !e) return false;
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
    return s.getTime() <= e.getTime();
  };

  // ====== โหลดประกาศ ======
  async function loadAnnouncements() {
    try {
      const data = await systemConfigAPI.listAnnouncements();
      const items = Array.isArray(data) ? data : data?.data ?? data?.items ?? [];
      setAnnList(Array.isArray(items) ? items : []);
    } catch (e) {
      setAnnList([]);
    }
  }

  // ====== โหลด config ปีงบประมาณ/ช่วงเวลา ======
  async function loadConfig() {
    const raw = await systemConfigAPI.getAdmin();
    const normalized = systemConfigAPI.normalizeWindow(raw);

    setForm((f) => ({
      ...f,
      current_year: normalized.current_year ?? "",
      start_date: normalized.start_date ? toLocalInput(normalized.start_date) : "",
      end_date: normalized.end_date ? toLocalInput(normalized.end_date) : "",
      main_annoucement: normalized.main_annoucement ?? "",
      reward_announcement: normalized.reward_announcement ?? "",
      activity_support_announcement: normalized.activity_support_announcement ?? "",
      conference_announcement: normalized.conference_announcement ?? "",
      service_announcement: normalized.service_announcement ?? "",

      main_start_date: normalized.main_start_date ? toLocalInput(normalized.main_start_date) : "",
      main_end_date: normalized.main_end_date ? toLocalInput(normalized.main_end_date) : "",
      reward_start_date: normalized.reward_start_date ? toLocalInput(normalized.reward_start_date) : "",
      reward_end_date: normalized.reward_end_date ? toLocalInput(normalized.reward_end_date) : "",
      activity_support_start_date: normalized.activity_support_start_date
        ? toLocalInput(normalized.activity_support_start_date)
        : "",
      activity_support_end_date: normalized.activity_support_end_date
        ? toLocalInput(normalized.activity_support_end_date)
        : "",
      conference_start_date: normalized.conference_start_date ? toLocalInput(normalized.conference_start_date) : "",
      conference_end_date: normalized.conference_end_date ? toLocalInput(normalized.conference_end_date) : "",
      service_start_date: normalized.service_start_date ? toLocalInput(normalized.service_start_date) : "",
      service_end_date: normalized.service_end_date ? toLocalInput(normalized.service_end_date) : "",
    }));

    const win = await systemConfigAPI.getWindow();
    setWindowInfo(win);
  }

  /** map allowed keys -> candidate numeric role ids (ถ้าเดาได้) */
  function inferRoleIdsFromKeys(keys = []) {
    const out = new Set();
    for (const k of keys) {
      const s = norm(k);
      if (/^\d+$/.test(s)) out.add(s);
      else if (s.includes("teacher") || s.includes("lecturer") || s.includes("อาจาร")) out.add("1");
      else if (s.includes("dept_head") || s.includes("หัวหน้าสาขา") || (s.includes("dept") && s.includes("head"))) out.add("4");
    }
    return Array.from(out);
  }

  // ====== โหลดผู้ใช้ทั้งหมด แล้วค่อยกรองสำหรับ dropdown ======
  async function loadAllUsersAndFilter() {
    // 0) อ่าน allowed role keys แบบ dynamic
    const keys = await getEligibleRoleKeysDynamic();
    setEligibleRoleKeys(keys); // อาจเป็น null ได้

    let list = [];

    // 1) พยายามดึง "ทั้งหมด" จาก endpoint ที่รองรับ (อย่างน้อย /admin/users)
    //    ใส่พารามิเตอร์เผื่อระบบรองรับ: limit/offset/all
    try {
      const res = await apiClient.get("/admin/users", { limit: 10000, all: 1 });
      list = extractUsers(res);
    } catch {
      // fallback: /admin/users (ไม่ใส่พารามิเตอร์)
      try {
        const res = await apiClient.get("/admin/users");
        list = extractUsers(res);
      } catch {
        // fallback สุดท้าย: /users
        try {
          const res = await apiClient.get("/users");
          list = extractUsers(res);
        } catch {
          list = [];
        }
      }
    }

    // 2) dedupe ทั้งหมด แล้วเก็บใน allUsers
    let all = dedupeUsers(list);
    all = dedupeUsersByLabel(all); // ป้องกันชื่อซ้ำต่าง id
    setAllUsers(all);

    // 3) คำนวณ users ที่จะใช้ใน dropdown ตาม role keys (ถ้าไม่มี keys → ไม่ฟิลเตอร์)
    let filtered = all;
    if (keys && keys.length) {
      const tmp = all.filter((u) => isEligibleUserDynamic(u, keys));
      filtered = tmp.length ? tmp : all; // กัน dropdown ว่าง
    }
    setUsers(filtered);
  }

  // เมื่อต้องการคำนวณ users ใหม่จาก allUsers + keys
  function recomputeUsersFiltered(nextAll, keys) {
    let filtered = nextAll;
    if (keys && keys.length) {
      const tmp = nextAll.filter((u) => isEligibleUserDynamic(u, keys));
      filtered = tmp.length ? tmp : nextAll;
    }
    return filtered;
  }

  // ดึงข้อมูลผู้ใช้แบบระบุ ids เพื่ออัปเดตชื่อให้ตรงกับ DB ปัจจุบัน (ถ้า BE รองรับ)
  async function hydrateUsersByIds(ids = []) {
    const uniq = Array.from(new Set((ids || []).filter(Boolean).map((x) => String(x))));
    if (!uniq.length) return;

    let fetched = [];
    try {
      const res = await apiClient.get("/admin/users", { ids: uniq.join(",") });
      fetched = extractUsers(res);
    } catch {
      fetched = [];
    }
    if (!Array.isArray(fetched) || !fetched.length) return;

    // merge -> อัปเดต allUsers ก่อน แล้ว recalc users ที่กรอง
    setAllUsers((prevAll) => {
      const merged = [...prevAll];
      const idxById = new Map(merged.map((u, i) => [String(u?.user_id ?? u?.id), i]));
      for (const u of fetched) {
        const id = String(u?.user_id ?? u?.id ?? "");
        if (!id) continue;
        if (idxById.has(id)) {
          const i = idxById.get(id);
          merged[i] = chooseBetterUser(merged[i], u);
        } else {
          merged.push(u);
        }
      }
      const dedupedAll = dedupeUsersByLabel(dedupeUsers(merged), uniq);
      // คำนวณ users ที่กรองใหม่จาก dedupedAll + keys ปัจจุบัน
      setUsers(recomputeUsersFiltered(dedupedAll, eligibleRoleKeys));
      return dedupedAll;
    });
  }

  // ====== โหลดหัวหน้าสาขาปัจจุบัน & ประวัติ ======
  async function loadCurrentHead() {
    const data = await systemConfigAPI.getCurrentDeptHead();
    setCurrentHead(data);
    setDeptHeadForm((f) => ({
      ...f,
      head_user_id: data?.head_user_id ?? "",
      start_date: toLocalInput(new Date().toISOString()),
      end_date: "",
    }));
  }

  async function loadHeadHistory() {
    const res = await systemConfigAPI.listDeptHeadHistory({ limit: 20 });
    const items = Array.isArray(res) ? res : res?.items ?? res?.data ?? [];
    setHeadHistory(Array.isArray(items) ? items : []);
  }

  // ====== โหลดประวัติประกาศราย slot ======
  async function loadAnnouncementHistory() {
    setAnnHistoryLoading(true);
    const slots = ["main", "reward", "activity_support", "conference", "service"];
    const next = { main: [], reward: [], activity_support: [], conference: [], service: [] };
    try {
      for (const s of slots) {
        try {
          const res = await systemConfigAPI.listAnnouncementHistory(s, { limit: 50 });
          const items = Array.isArray(res) ? res : res?.items ?? res?.data ?? [];
          next[s] = Array.isArray(items) ? items : [];
        } catch {
          next[s] = [];
        }
      }
      setAnnHistory(next);
    } finally {
      setAnnHistoryLoading(false);
    }
  }

  // โหลดทั้งหมดครั้งแรก
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadAnnouncements(), loadConfig()]);
        await loadAllUsersAndFilter(); // <-- โหลดผู้ใช้ทั้งหมดก่อน
        setHeadLoading(true);
        await Promise.all([loadCurrentHead(), loadHeadHistory()]);
        await loadAnnouncementHistory();
      } catch (e) {
        toast("error", e.message || "เกิดข้อผิดพลาดในการโหลด");
      } finally {
        setHeadLoading(false);
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ensure รวม id ที่เกี่ยวข้อง (ปัจจุบัน/ประวัติ) เข้า allUsers เสมอ แล้ว recalc users
  useEffect(() => {
    setAllUsers((prevAll) => {
      const ids = [];
      if (currentHead?.head_user_id != null) ids.push(currentHead.head_user_id);
      for (const h of headHistory || []) {
        if (h?.head_user_id != null) ids.push(h.head_user_id);
        if (h?.changed_by != null) ids.push(h.changed_by);
      }
      const merged = ensureIncludeIds([...prevAll], ids);
      const dedupedAll = dedupeUsersByLabel(dedupeUsers(merged), ids);
      setUsers(recomputeUsersFiltered(dedupedAll, eligibleRoleKeys)); // คำนวณ dropdown ใหม่
      return dedupedAll;
    });
  }, [currentHead, headHistory, eligibleRoleKeys]);

  // หลังโหลด currentHead + headHistory แล้ว ให้ hydrate ชื่อด้วย ids ที่ปรากฏ (ถ้า BE รองรับ ids=)
  useEffect(() => {
    const ids = [];
    if (currentHead?.head_user_id != null) ids.push(currentHead.head_user_id);
    for (const h of headHistory || []) {
      if (h?.head_user_id != null) ids.push(h.head_user_id);
      if (h?.changed_by != null) ids.push(h.changed_by);
    }
    hydrateUsersByIds(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHead, headHistory]);

  // userMap ใช้จาก allUsers (ครบทุกคนเพื่อแสดงในประวัติ/หัวหน้าปัจจุบัน)
  const userMap = useMemo(() => {
    const m = new Map();
    for (const u of allUsers || []) {
      const id = u?.user_id ?? u?.id;
      if (!id) continue;
      const name = formatUserName(u) || u?.email || `ผู้ใช้ #${id}`;
      m.set(Number(id), name);
    }
    return m;
  }, [allUsers]);

  const userDisplay = (id) => {
    if (!id && id !== 0) return "-";
    return userMap.get(Number(id)) || `ผู้ใช้ #${id}`;
  };

  // dropdown: ตัดหัวหน้าปัจจุบันออก
  const selectableUsers = React.useMemo(() => {
    const curId = currentHead?.head_user_id;
    if (curId == null) return users;
    const cur = String(curId);
    return (users || []).filter((u) => String(u?.user_id ?? u?.id) !== cur);
  }, [users, currentHead]);

  const annTitleById = (id) => {
    if (!id) return null;
    const a = (annList || []).find((x) => String(x.announcement_id ?? x.id) === String(id));
    return a?.title ?? a?.name ?? `ประกาศ #${id}`;
  };

  const selectedAnnTitles = useMemo(() => {
    const ids = [
      form.main_annoucement,
      form.reward_announcement,
      form.activity_support_announcement,
      form.conference_announcement,
      form.service_announcement,
    ].filter(Boolean);

    const titles = ids.map(annTitleById).filter(Boolean);
    return Array.from(new Set(titles));
  }, [form, annList]);

  // รวมประวัติประกาศของทุก slot
  const annHistoryMerged = useMemo(() => {
    const all = []
      .concat(
        (annHistory.main || []).map((x) => ({ ...x, slot_code: "main" })),
        (annHistory.reward || []).map((x) => ({ ...x, slot_code: "reward" })),
        (annHistory.activity_support || []).map((x) => ({ ...x, slot_code: "activity_support" })),
        (annHistory.conference || []).map((x) => ({ ...x, slot_code: "conference" })),
        (annHistory.service || []).map((x) => ({ ...x, slot_code: "service" }))
      )
      .filter(Boolean);

    return all.sort((a, b) => {
      const ta = Date.parse(a.changed_at || a.start_date || 0);
      const tb = Date.parse(b.changed_at || b.start_date || 0);
      return isNaN(tb) - isNaN(ta) || tb - ta;
    });
  }, [annHistory]);

  // ====== บันทึกปีงบประมาณ & ช่วงเวลา (global window) ======
  const handleSave = async () => {
    if (!String(form.current_year || "").trim()) {
      toast("warning", "กรุณาระบุปีงบประมาณปัจจุบัน");
      return;
    }
    if (form.start_date && form.end_date && new Date(form.start_date) > new Date(form.end_date)) {
      toast("warning", "วันเปิดต้องไม่เกินวันปิด");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        current_year: String(form.current_year).trim(),
        start_date: toISOOrNull(form.start_date),
        end_date: toISOOrNull(form.end_date),
      };
      await systemConfigAPI.updateWindow(payload);
      toast("success", "บันทึกปีงบประมาณ & ช่วงเวลา สำเร็จ");
      await loadConfig();
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  // ====== บันทึกประกาศรายช่อง ======
  const handleSaveAnnouncement = async (valueKey) => {
    const slot = slotByKey[valueKey];
    if (!slot) {
      toast("error", "ไม่พบช่องประกาศที่ต้องการบันทึก");
      return;
    }

    const id = form[valueKey] ? Number(form[valueKey]) : null;
    const { start, end } = slotWindowKeys(slot);
    const startStr = form[start] || "";
    const endStr = form[end] || "";

    if (id != null) {
      if (!isValidLocalRange(startStr, endStr)) {
        toast("warning", "กรุณาระบุวัน-เวลาเริ่มและสิ้นสุดของประกาศ (และวันเริ่มต้องไม่เกินวันสิ้นสุด)");
        return;
      }
    }

    setSavingSlot(valueKey);
    try {
      const payload = {
        announcement_id: id,
        start_date: id != null ? toISOOrNull(startStr) : null,
        end_date: id != null ? toISOOrNull(endStr) : null,
      };
      await systemConfigAPI.setAnnouncement(slot, payload);
      toast("success", "บันทึกประกาศสำเร็จ");
      await Promise.all([loadConfig(), loadAnnouncementHistory()]);
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาดในการบันทึกประกาศ");
    } finally {
      setSavingSlot(null);
    }
  };

  // ====== บันทึก/เปลี่ยนหัวหน้าสาขา ======
  const handleAssignDeptHead = async () => {
    if (!deptHeadForm.head_user_id) {
      toast("warning", "กรุณาเลือกผู้ใช้");
      return;
    }
    if (!deptHeadForm.start_date || !deptHeadForm.end_date) {
      toast("warning", "กรุณาระบุวัน/เวลาเริ่มและสิ้นสุดของหัวหน้าสาขา");
      return;
    }
    if (!isValidLocalRange(deptHeadForm.start_date, deptHeadForm.end_date)) {
      toast("warning", "วัน/เวลาเริ่มต้องไม่เกินวัน/เวลาสิ้นสุด");
      return;
    }

    setHeadSaving(true);
    try {
      const payload = {
        head_user_id: Number(deptHeadForm.head_user_id),
        start_date: toISOOrNull(deptHeadForm.start_date),
        end_date: toISOOrNull(deptHeadForm.end_date),
      };
      if (deptHeadForm.note && String(deptHeadForm.note).trim()) {
        payload.note = String(deptHeadForm.note).trim();
      }
      await systemConfigAPI.assignDeptHead(payload);
      toast("success", "บันทึก/เปลี่ยนหัวหน้าสาขาสำเร็จ");
      await Promise.all([loadCurrentHead(), loadHeadHistory()]);
      // ensure id ที่เพิ่งเลือกอยู่ใน allUsers (เพื่อแสดงผลแม่นยำ)
      setAllUsers((prev) => {
        const merged = ensureIncludeIds([...prev], [Number(deptHeadForm.head_user_id)]);
        const dedupedAll = dedupeUsersByLabel(dedupeUsers(merged), [Number(deptHeadForm.head_user_id)]);
        setUsers(recomputeUsersFiltered(dedupedAll, eligibleRoleKeys));
        return dedupedAll;
      });
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setHeadSaving(false);
    }
  };

  // ====== UI: ตัวเลือกประกาศ + อินพุตช่วงเวลาเฉพาะช่อง ======
  const renderAnnSelect = (label, valueKey) => {
    const slot = slotByKey[valueKey];
    const { start, end } = slotWindowKeys(slot);
    const hasId = !!form[valueKey];
    const okWindow = isValidLocalRange(form[start], form[end]);
    const disabled = savingSlot === valueKey || (hasId && !okWindow);

    return (
      <div className="space-y-3 border rounded-xl p-3 md:p-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-800">{label}</label>
          <button
            onClick={() => handleSaveAnnouncement(valueKey)}
            disabled={disabled}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            title={
              hasId && !okWindow
                ? "ต้องตั้งวัน-เวลาเริ่มและสิ้นสุดของประกาศก่อนบันทึก"
                : "บันทึกประกาศช่องนี้"
            }
          >
            <Save size={16} />
            {savingSlot === valueKey ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>

        {/* Dropdown เต็มบรรทัด */}
        <select
          value={form[valueKey] ?? ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              [valueKey]: e.target.value,
            }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600 text-sm"
        >
          <option value="">— ไม่ระบุ —</option>
          {annList?.map?.((a) => {
            const id = a.announcement_id ?? a.id;
            const title = a.title ?? a.name ?? `ประกาศ #${id}`;
            return (
              <option key={id} value={id}>
                {title}
              </option>
            );
          })}
        </select>

        {/* Start + End ในแถวเดียว */}
        <div className="grid md:grid-cols-2 gap-2">
          <input
            type="datetime-local"
            value={form[start] ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, [start]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600 text-sm"
            placeholder="วัน/เวลาเริ่ม"
          />
          <input
            type="datetime-local"
            value={form[end] ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, [end]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600 text-sm"
            placeholder="วัน/เวลาสิ้นสุด"
          />
        </div>

        {hasId && !okWindow && (
          <p className="text-xs text-amber-600">
            ต้องระบุทั้งวัน/เวลาเริ่มและสิ้นสุด และวันเริ่มต้องไม่เกินวันสิ้นสุด
          </p>
        )}
      </div>
    );
  };

  const prettyWindowRange = (() => {
    const s = form.start_date && !Number.isNaN(new Date(form.start_date).getTime()) ? form.start_date : null;
    const e = form.end_date && !Number.isNaN(new Date(form.end_date).getTime()) ? form.end_date : null;
    if (!s && !e) return "ไม่กำหนดช่วงเวลา (เปิดตลอด)";
    if (s && e) return `ตั้งแต่ ${formatThaiFull(s)} ถึง ${formatThaiFull(e)}`;
    if (s && !e) return `ตั้งแต่ ${formatThaiFull(s)} ถึง ไม่มีกำหนด`;
    if (!s && e) return `ตั้งแต่ ไม่มีกำหนด ถึง ${formatThaiFull(e)}`;
    return "-";
  })();

  return (
    <SettingsSectionCard
      icon={SettingsIcon}
      iconBgClass="bg-slate-100"
      iconColorClass="text-slate-700"
      title="ตั้งค่าระบบ"
      description="กำหนดปีงบประมาณ ช่วงเวลาเปิด–ปิด และประกาศหลักเกณฑ์"
      actions={
        <button
          onClick={() => {
            setLoading(true);
            Promise.all([
              loadAnnouncements(),
              loadConfig(),
              loadAllUsersAndFilter(), // รีโหลดผู้ใช้ทั้งหมดแล้วค่อยกรอง
              loadCurrentHead(),
              loadHeadHistory(),
              loadAnnouncementHistory(),
            ]).finally(() => setLoading(false));
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          disabled={loading}
        >
          <RefreshCw size={16} />
          รีเฟรช
        </button>
      }
      contentClassName="space-y-6"
    >
        {/* Section 1: ปีงบประมาณ + Window */}
        <section className="space-y-4">
          <div className="rounded-lg border border-gray-300 p-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-base font-semibold text-gray-900 mb-0">ปีงบประมาณปัจจุบัน</label>
                <button
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save size={16} />
                  {saving ? "กำลังบันทึก..." : "บันทึก ปีงบประมาณ & ช่วงเวลา"}
                </button>
              </div>
              <input
                type="text"
                value={form.current_year}
                onChange={(e) => setForm((f) => ({ ...f, current_year: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                placeholder="เช่น 2568"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">วัน-เวลา เปิดรับคำร้อง</label>
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} className="text-gray-500" />
                  <input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">วัน-เวลา ปิดรับคำร้อง</label>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-500" />
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-700 mt-4">
              ช่วงเวลาที่ตั้งค่า: <span className="font-medium">{prettyWindowRange}</span>
            </div>

            <div className="mt-3 rounded-md bg-gray-50 p-3 text-xs text-gray-600">
              <div>
                สถานะโดยรวม:{" "}
                <span
                  className={
                    "px-2 py-0.5 rounded-full text-white " +
                    (windowInfo?.is_open_effective ? "bg-green-600" : "bg-gray-500")
                  }
                >
                  {windowInfo?.is_open_effective ? "เปิด (effective)" : "ปิด (effective)"}
                </span>
              </div>
              <div className="mt-1">เวลาระบบ: {windowInfo?.now ? formatThaiFull(windowInfo.now) : "-"}</div>
            </div>
          </div>
        </section>

        {/* Section 2: ประกาศที่ใช้งาน */}
        <section className="space-y-4">
          <div className="rounded-lg border border-gray-300 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-3">ประกาศที่ใช้งาน</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {renderAnnSelect("ประกาศหลักเกณฑ์การใช้จ่ายเงินกองทุน", "main_annoucement")}
              {renderAnnSelect("ประกาศขอใช้เงินกองทุนวิจัยฯ ทุนอุดหนุนกิจกรรม", "reward_announcement")}
              {renderAnnSelect("ประกาศขอใช้เงินกองทุนวิจัยฯ ทุนส่งเสริมวิจัย ", "activity_support_announcement")}
              {renderAnnSelect("ประกาศประชุมวิชาการ", "conference_announcement")}
              {renderAnnSelect("ประกาศบริการวิชาการ", "service_announcement")}
            </div>
          </div>
        </section>

        {/* Section 2.1: ประวัติประกาศ */}
        <section className="space-y-4">
          <div className="rounded-lg border border-gray-300 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">ประวัติการตั้งค่าประกาศ</h3>
              <button
                onClick={loadAnnouncementHistory}
                disabled={annHistoryLoading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                title="รีเฟรช"
              >
                <RefreshCw size={16} />
                {annHistoryLoading ? "กำลังโหลด..." : "รีเฟรช"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-3">ช่อง</th>
                    <th className="py-2 pr-3">ชื่อประกาศ</th>
                    <th className="py-2 pr-3">วันที่เริ่มใช้งาน</th>
                    <th className="py-2 pr-3">วันที่เสิ้นสุด</th>
                    <th className="py-2 pr-3">บันทึกโดย</th>
                    <th className="py-2">เมื่อ</th>
                  </tr>
                </thead>
                <tbody>
                  {annHistoryMerged.map((h, idx) => (
                    <tr key={h.assignment_id ?? `${h.slot_code}-${h.changed_at}-${idx}`} className="border-t border-gray-200">
                      <td className="py-2 pr-3">{slotLabel(h.slot_code)}</td>
                      <td className="py-2 pr-3">
                        {annTitleById(h.announcement_id) || (h.announcement_id ? `ประกาศ #${h.announcement_id}` : "—")}
                      </td>
                      <td className="py-2 pr-3">{h.start_date ? formatThaiFull(h.start_date) : "-"}</td>
                      <td className="py-2 pr-3">{h.end_date ? formatThaiFull(h.end_date) : "-"}</td>
                      <td className="py-2 pr-3">{userDisplay(h.changed_by)}</td>
                      <td className="py-2">{h.changed_at ? formatThaiFull(h.changed_at) : "-"}</td>
                    </tr>
                  ))}
                  {!annHistoryMerged.length && (
                    <tr>
                      <td className="py-3 text-gray-500" colSpan={6}>
                        — ไม่พบประวัติ —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              หมายเหตุ: แถวที่ประกาศเป็น “—” หมายถึงช่วงเวลาที่ไม่ได้กำหนดประกาศสำหรับช่องนั้น
            </p>
          </div>
        </section>

        {/* Section 3: หัวหน้าสาขา */}
        <section className="space-y-4">
          <div className="rounded-lg border border-gray-300 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-base font-semibold text-gray-900">ตั้งค่าหัวหน้าสาขา</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAssignDeptHead}
                  disabled={headSaving || !deptHeadForm.head_user_id}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  title="บันทึก/เปลี่ยนหัวหน้าสาขา"
                >
                  <Save size={16} />
                  {headSaving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-1 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">เลือกผู้ใช้ที่จะเป็นหัวหน้าสาขา</label>
                  <div className="text-xs text-gray-500">
                    ผู้ใช้ที่แสดง: {selectableUsers?.length || 0}
                  </div>
                </div>
                <select
                  value={deptHeadForm.head_user_id}
                  onChange={(e) => setDeptHeadForm((f) => ({ ...f, head_user_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                >
                  <option value="">— เลือกผู้ใช้ —</option>
                  {selectableUsers?.map?.((u) => {
                    const id = u?.user_id ?? u?.id;
                    const label = formatUserName(u) || u?.email || `ผู้ใช้ #${id}`;
                    return (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    );
                  })}
                </select>

                {/* เลือกวัน/เวลาเริ่ม–สิ้นสุด ของหัวหน้าสาขา */}
                <div className="grid md:grid-cols-2 gap-2 mt-3">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">วัน/เวลาเริ่ม</label>
                    <input
                      type="datetime-local"
                      value={deptHeadForm.start_date || ""}
                      onChange={(e) => setDeptHeadForm((f) => ({ ...f, start_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                      placeholder="เลือกวัน/เวลาเริ่ม"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">วัน/เวลาสิ้นสุด</label>
                    <input
                      type="datetime-local"
                      value={deptHeadForm.end_date || ""}
                      onChange={(e) => setDeptHeadForm((f) => ({ ...f, end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                      placeholder="เลือกวัน/เวลาสิ้นสุด"
                    />
                  </div>
                </div>

                {/* แจ้งเตือนกรณีช่วงเวลาไม่ถูกต้อง */}
                {deptHeadForm.start_date && deptHeadForm.end_date && new Date(deptHeadForm.start_date) > new Date(deptHeadForm.end_date) && (
                  <p className="text-xs text-amber-600 mt-1">
                    วัน/เวลาเริ่มต้องไม่เกินวัน/เวลาสิ้นสุด
                  </p>
                )}

              </div>
            </div>

            <div className="grid md:grid-cols-1 gap-4 mt-5">
              <div className="rounded-md bg-gray-50 p-3">
                <div className="text-sm font-medium text-gray-900 mb-1">หัวหน้าสาขาปัจจุบัน</div>
                <div className="text-sm text-gray-800">
                  ผู้ใช้: <span className="font-medium">{userDisplay(currentHead?.head_user_id)}</span>
                </div>
                <div className="text-xs text-gray-600">
                  เริ่มมีผล: {currentHead?.effective_from ? formatThaiFull(currentHead.effective_from) : "-"}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pr-3">ผู้ใช้</th>
                      <th className="py-2 pr-3">เริ่ม</th>
                      <th className="py-2 pr-3">สิ้นสุด</th>
                      <th className="py-2 pr-3">ปรับโดย</th>
                      <th className="py-2">เมื่อ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(headHistory || []).map((h) => (
                      <tr key={h.assignment_id} className="border-t border-gray-200">
                        <td className="py-2 pr-3">{userDisplay(h.head_user_id)}</td>
                        <td className="py-2 pr-3">{h.effective_from ? formatThaiFull(h.effective_from) : "-"}</td>
                        <td className="py-2 pr-3">{h.effective_to ? formatThaiFull(h.effective_to) : "-"}</td>
                        <td className="py-2 pr-3">{userDisplay(h.changed_by)}</td>
                        <td className="py-2">{h.changed_at ? formatThaiFull(h.changed_at) : "-"}</td>
                      </tr>
                    ))}
                    {!headHistory?.length && (
                      <tr>
                        <td className="py-3 text-gray-500" colSpan={5}>
                          — ไม่พบประวัติ —
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
    </SettingsSectionCard>
  );
}