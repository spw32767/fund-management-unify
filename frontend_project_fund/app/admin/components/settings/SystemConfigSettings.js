"use client";

import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { Save, RefreshCw, Calendar as CalendarIcon, Clock } from "lucide-react";
import systemConfigAPI from "../../../lib/system_config_api";
import apiClient from "../../../lib/api";

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

/** สำหรับ input[type=datetime-local] */
function toLocalInput(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  } catch {
    return "";
  }
}


const toISOOrNull = (s) => (s ? new Date(s).toISOString() : null);

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

// ====== helper: ตรวจว่าเป็นบทบาท “อาจารย์/เจ้าหน้าที่” แบบยืดหยุ่น ======
function isTeacherOrStaff(u) {
  const bag = [];
  if (u?.role_id != null) bag.push(String(u.role_id));
  if (u?.role) bag.push(String(u.role));
  if (u?.user_role) bag.push(String(u.user_role));
  if (u?.position) bag.push(String(u.position));
  if (Array.isArray(u?.roles)) {
    for (const r of u.roles) {
      if (typeof r === "string") bag.push(r);
      else if (r?.role_id != null) bag.push(String(r.role_id));
      else if (r?.id != null) bag.push(String(r.id));
      else if (r?.name) bag.push(String(r.name));
      else if (r?.code) bag.push(String(r.code));
    }
  }
  const norm = bag.map((x) => String(x).trim().toLowerCase());
  const matchId = norm.some((x) => x === "1" || x === "2");
  const matchName = norm.some((x) => ["teacher", "staff", "อาจารย์", "เจ้าหน้าที่"].includes(x));
  return matchId || matchName;
}

// เติมฟังก์ชันนี้
function formatUserName(u) {
  // เรียงลำดับความสำคัญ: display_name > full_name > user_fname+user_lname > first_name+last_name > name > username
  const fullByUserCols = [u?.user_fname, u?.user_lname].filter(Boolean).join(" ").trim();
  const fullByGeneric  = [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim();

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

export default function SystemConfigSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSlot, setSavingSlot] = useState(null);

  // ฟอร์มส่วนปีงบประมาณ & ช่วงเวลา + ประกาศ
  const [form, setForm] = useState({
    current_year: "",
    start_date: "",
    end_date: "",
    main_annoucement: "",
    reward_announcement: "",
    activity_support_announcement: "",
    conference_announcement: "",
    service_announcement: "",
  });

  const [windowInfo, setWindowInfo] = useState(null);
  const [annList, setAnnList] = useState([]);

  // --- หัวหน้าสาขา ---
  const [users, setUsers] = useState([]); // รายชื่อผู้ใช้สำหรับ select
  const [roleLock, setRoleLock] = useState(false); // ✅ ค่าเริ่มต้น: ไม่ล็อกบทบาท
  const [currentHead, setCurrentHead] = useState(null); // { head_user_id, effective_from }
  const [headHistory, setHeadHistory] = useState([]); // [{assignment_id,...}]
  const [headLoading, setHeadLoading] = useState(false);
  const [headSaving, setHeadSaving] = useState(false);
  const [deptHeadForm, setDeptHeadForm] = useState({
    head_user_id: "",
    effective_from: "",
    note: "",
  });

  const toast = (icon, title) =>
    Swal.fire({ toast: true, position: "top-end", timer: 2400, showConfirmButton: false, icon, title });

  const slotByKey = {
    main_annoucement: "main",
    reward_announcement: "reward",
    activity_support_announcement: "activity_support",
    conference_announcement: "conference",
    service_announcement: "service",
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
    }));

    const win = await systemConfigAPI.getWindow();
    setWindowInfo(win);
  }

  // ====== โหลดรายชื่อผู้ใช้ (ลองหลาย endpoint + กรองบทบาทแบบ dynamic) ======
  async function loadUsers(lock = roleLock) {
    let list = [];

    // 1) พยายามเรียก /admin/users พร้อมพารามิเตอร์ล็อกบทบาท (ถ้า lock=true)
    try {
      const params = lock ? { roles: "1,2" } : {};
      const res = await apiClient.get("/admin/users", params);
      list = extractUsers(res);
    } catch {
      // ignore
    }

    // 2) fallback: /admin/users (ไม่ส่ง params)
    if (!Array.isArray(list) || list.length === 0) {
      try {
        const res = await apiClient.get("/admin/users");
        list = extractUsers(res);
      } catch {
        // ignore
      }
    }

    // 3) fallback: /users (public)
    if (!Array.isArray(list) || list.length === 0) {
      try {
        const res = await apiClient.get("/users");
        list = extractUsers(res);
      } catch {
        // ignore
      }
    }

    // 4) ถ้าล็อก → กรองซ้ำที่ client เพื่อเหลือแค่อาจารย์/เจ้าหน้าที่
    if (lock && Array.isArray(list) && list.length) {
      const filtered = list.filter(isTeacherOrStaff);
      if (filtered.length) list = filtered;
    }

    setUsers(Array.isArray(list) ? list : []);
  }

  // ====== โหลดหัวหน้าสาขาปัจจุบัน & ประวัติ ======
  async function loadCurrentHead() {
    const data = await systemConfigAPI.getCurrentDeptHead();
    setCurrentHead(data);
    // default effective_from เป็นตอนนี้
    setDeptHeadForm((f) => ({
      ...f,
      head_user_id: data?.head_user_id ?? "",
      effective_from: toLocalInput(new Date().toISOString()),
    }));
  }

  async function loadHeadHistory() {
    const res = await systemConfigAPI.listDeptHeadHistory({ limit: 20 });
    const items = Array.isArray(res) ? res : res?.items ?? res?.data ?? [];
    setHeadHistory(Array.isArray(items) ? items : []);
  }

  // โหลดทั้งหมดครั้งแรก
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadAnnouncements(), loadConfig()]);
        await loadUsers(roleLock);
        setHeadLoading(true);
        await Promise.all([loadCurrentHead(), loadHeadHistory()]);
      } catch (e) {
        toast("error", e.message || "เกิดข้อผิดพลาดในการโหลด");
      } finally {
        setHeadLoading(false);
        setLoading(false);
      }
    })();
  }, []);

  // reload users เมื่อ toggle lock เปลี่ยน
  useEffect(() => {
    loadUsers(roleLock);
  }, [roleLock]);

  // ช่วย format ชื่อผู้ใช้จาก users[]
  const userMap = useMemo(() => {
    const m = new Map();
    for (const u of users || []) {
      const id = u?.user_id ?? u?.id;
      if (!id) continue;
      const name = formatUserName(u) || u?.email || `ผู้ใช้ #${id}`; // email กลายเป็น fallback สุดท้าย
      m.set(Number(id), name);
    }
    return m;
  }, [users]);

  const userDisplay = (id) => {
    if (!id) return "-";
    return userMap.get(Number(id)) || `ผู้ใช้ #${id}`;
  };

  // ====== บันทึกปีงบประมาณ & ช่วงเวลา ======
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
    setSavingSlot(valueKey);
    try {
      await systemConfigAPI.setAnnouncement(slot, id);
      toast("success", "บันทึกประกาศสำเร็จ");
      await loadConfig();
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
    setHeadSaving(true);
    try {
      const payload = {
        head_user_id: Number(deptHeadForm.head_user_id),
      };
      if (deptHeadForm.effective_from) {
        payload.effective_from = new Date(deptHeadForm.effective_from).toISOString();
      }
      if (deptHeadForm.note && String(deptHeadForm.note).trim()) {
        payload.note = String(deptHeadForm.note).trim();
      }
      await systemConfigAPI.assignDeptHead(payload);
      toast("success", "บันทึก/เปลี่ยนหัวหน้าสาขาสำเร็จ");
      await Promise.all([loadCurrentHead(), loadHeadHistory()]);
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setHeadSaving(false);
    }
  };

  const renderAnnSelect = (label, valueKey) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        <select
          value={form[valueKey] ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, [valueKey]: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600"
        >
          <option value="">— ไม่ระบุ —</option>
          {annList?.map?.((a) => (
            <option key={a.announcement_id ?? a.id} value={(a.announcement_id ?? a.id)}>
              {a.title ?? a.name ?? `ประกาศ #${a.announcement_id ?? a.id}`}
            </option>
          ))}
        </select>
        <button
          onClick={() => handleSaveAnnouncement(valueKey)}
          disabled={savingSlot === valueKey}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          title="บันทึกประกาศช่องนี้"
        >
          <Save size={16} />
          {savingSlot === valueKey ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>
    </div>
  );

  const prettyWindowRange = (() => {
    const s = form.start_date ? new Date(form.start_date).toISOString() : null;
    const e = form.end_date ? new Date(form.end_date).toISOString() : null;
    if (!s && !e) return "ไม่กำหนดช่วงเวลา (เปิดตลอด)";
    if (s && e) return `ตั้งแต่ ${formatThaiFull(s)} ถึง ${formatThaiFull(e)}`;
    if (s && !e) return `ตั้งแต่ ${formatThaiFull(s)} ถึง ไม่มีกำหนด`;
    if (!s && e) return `ตั้งแต่ ไม่มีกำหนด ถึง ${formatThaiFull(e)}`;
    return "-";
  })();

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 border-b border-gray-300">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">ตั้งค่าระบบ</h2>
          <p className="text-sm text-gray-600">กำหนดปีงบประมาณ ช่วงเวลาเปิด–ปิด และประกาศหลักเกณฑ์</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setLoading(true);
              Promise.all([
                loadAnnouncements(),
                loadConfig(),
                loadUsers(roleLock),
                loadCurrentHead(),
                loadHeadHistory(),
              ]).finally(() => setLoading(false));
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            <RefreshCw size={16} />
            รีเฟรช
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid md:grid-cols-2 gap-6 p-6">
        {/* Left: ปีงบประมาณ + Window */}
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
                    "px-2 py-0.5 rounded-full text-white " + (windowInfo?.is_open_effective ? "bg-green-600" : "bg-gray-500")
                  }
                >
                  {windowInfo?.is_open_effective ? "เปิด (effective)" : "ปิด (effective)"}
                </span>
              </div>
              <div className="mt-1">เวลาระบบ: {windowInfo?.now ? formatThaiFull(windowInfo.now) : "-"}</div>
            </div>
          </div>
        </section>

        {/* Right: ประกาศที่ใช้งาน (บันทึกแยก) */}
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

        {/* การตั้งค่าหัวหน้าสาขา */}
        <section className="space-y-4 md:col-span-2">
          <div className="rounded-lg border border-gray-300 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h3 className="text-base font-semibold text-gray-900">หัวหน้าสาขา</h3>

              {/* toggle ล็อกบทบาทแบบ dynamic (ค่าเริ่มต้น: ปิด) */}
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={roleLock}
                  onChange={(e) => setRoleLock(e.target.checked)}
                />
                <span>แสดงเฉพาะอาจารย์และเจ้าหน้าที่</span>
              </label>
            </div>

            {/* ฟอร์มเลือกผู้ใช้ + วันที่มีผล */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">เลือกผู้ใช้</label>
                  <div className="text-xs text-gray-500">ผู้ใช้ที่แสดง: {users?.length || 0} ราย</div>
                </div>
                <select
                  value={deptHeadForm.head_user_id}
                  onChange={(e) => setDeptHeadForm((f) => ({ ...f, head_user_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                >
                  <option value="">— เลือกผู้ใช้ —</option>
                  {users?.map?.((u) => {
                    const id = u?.user_id ?? u?.id;
                    const label = formatUserName(u) || u?.email || `ผู้ใช้ #${id}`;
                    return (
                      <option key={id} value={id}>
                        {label} {/* เอาแค่ชื่อ ไม่ต้องโชว์อีเมลแล้ว */}
                        {/* ถ้าอยากโชว์เลขไอดีต่อท้าย คงไว้ได้:  — #{id} */}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">วันที่-เวลา เริ่มมีผล</label>
                <input
                  type="datetime-local"
                  value={deptHeadForm.effective_from}
                  onChange={(e) => setDeptHeadForm((f) => ({ ...f, effective_from: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAssignDeptHead}
                disabled={headSaving || !deptHeadForm.head_user_id}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                title="บันทึก/เปลี่ยนหัวหน้าสาขา"
              >
                <Save size={16} />
                {headSaving ? "กำลังบันทึก..." : "บันทึก/เปลี่ยนหัวหน้าสาขา"}
              </button>
            </div>

            {/* แสดงหัวหน้าปัจจุบัน + ประวัติย่อ */}
            <div className="grid md:grid-cols-2 gap-4 mt-5">
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
      </div>
    </div>
  );
}
