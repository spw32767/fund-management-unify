"use client";

import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Save, RefreshCw, Calendar as CalendarIcon, Clock } from "lucide-react";
import systemConfigAPI from "../../../lib/system_config_api";

// ---- helper: แปลงวันที่เป็นรูปแบบไทยอ่านง่าย (ปี พ.ศ., เดือนเป็นคำ, เวลา HH:mm) ----
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
    }).formatToParts(d);
    const parts = Object.fromEntries(fmt.map((p) => [p.type, p.value]));
    const day = parts.day ?? "";
    const month = parts.month ?? "";
    const year = parts.year ?? "";
    const hour = (parts.hour ?? "").padStart(2, "0");
    const minute = (parts.minute ?? "").padStart(2, "0");
    return `วันที่ ${day} ${month} พ.ศ. ${year} เวลา ${hour}:${minute} น.`;
  } catch {
    return "-";
  }
}

const SystemConfigSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    current_year: "",
    start_date: "",
    end_date: "",

    // 5 ฟิลด์ประกาศ (อิงชื่อคอลัมน์ตาม DB/API)
    main_annoucement: "",
    reward_announcement: "",
    activity_support_announcement: "",
    conference_announcement: "",
    service_announcement: "",
  });

  const [windowInfo, setWindowInfo] = useState(null);
  const [annList, setAnnList] = useState([]); // รายการประกาศทั้งหมด

  const toast = (icon, title) =>
    Swal.fire({ toast: true, position: "top-end", timer: 2500, showConfirmButton: false, icon, title });

  const toLocalInput = (iso) => {
    try {
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
        d.getMinutes()
      )}`;
    } catch {
      return "";
    }
  };

  const toISOOrNull = (s) => (s ? new Date(s).toISOString() : null);

  const loadAnnouncements = async () => {
    const data = await systemConfigAPI.listAnnouncements();
    // รองรับทั้งรูปแบบ array ตรง ๆ และ {data: [...]}
    const items = Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
    setAnnList(Array.isArray(items) ? items : []);
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const raw = await systemConfigAPI.getAdmin();
      const normalized = systemConfigAPI.normalizeWindow(raw);

      setForm({
        current_year: normalized.current_year ?? "",
        start_date: normalized.start_date ? toLocalInput(normalized.start_date) : "",
        end_date: normalized.end_date ? toLocalInput(normalized.end_date) : "",

        main_annoucement: normalized.main_annoucement ?? "",
        reward_announcement: normalized.reward_announcement ?? "",
        activity_support_announcement: normalized.activity_support_announcement ?? "",
        conference_announcement: normalized.conference_announcement ?? "",
        service_announcement: normalized.service_announcement ?? "",
      });

      setWindowInfo({
        is_open_effective: normalized.is_open_effective,
        is_open_raw: normalized.is_open_raw,
        now: normalized.now,
        start_date: normalized.start_date,
        end_date: normalized.end_date,
      });
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาดในการโหลด");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadAnnouncements(), loadConfig()]).catch(() => {});
  }, []);

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

        // ส่ง 5 ฟิลด์ประกาศเป็นหมายเลขหรือ null
        main_annoucement: form.main_annoucement ? Number(form.main_annoucement) : null,
        reward_announcement: form.reward_announcement ? Number(form.reward_announcement) : null,
        activity_support_announcement: form.activity_support_announcement ? Number(form.activity_support_announcement) : null,
        conference_announcement: form.conference_announcement ? Number(form.conference_announcement) : null,
        service_announcement: form.service_announcement ? Number(form.service_announcement) : null,
      };

      await systemConfigAPI.updateAdmin(payload);
      toast("success", "บันทึกตั้งค่าระบบสำเร็จ");
      await loadConfig();
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const windowText = (() => {
    const s = form.start_date ? new Date(form.start_date).toISOString() : null;
    const e = form.end_date ? new Date(form.end_date).toISOString() : null;
    if (!s && !e) return "ไม่กำหนดช่วงเวลา (เปิดตลอด)";
    if (s && e) return `ตั้งแต่ ${formatThaiFull(s)} ถึง ${formatThaiFull(e)}`;
    if (s && !e) return `ตั้งแต่ ${formatThaiFull(s)} ถึง ไม่มีกำหนด`;
    if (!s && e) return `ตั้งแต่ ไม่มีกำหนด ถึง ${formatThaiFull(e)}`;
    return "-";
  })();

  const renderAnnSelect = (label, valueKey) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
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
    </div>
  );

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
            onClick={() => { setLoading(true); Promise.all([loadAnnouncements(), loadConfig()]).finally(() => setLoading(false)); }}
            disabled={loading || saving}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw size={16} />
            รีโหลด
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Section 1: ปีงบประมาณ & ช่วงเวลา */}
        <section className="rounded-lg border border-gray-300 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">ปีงบประมาณ & ช่วงเวลา</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">ปีงบประมาณปัจจุบัน</label>
              <input
                type="text"
                value={form.current_year}
                onChange={(e) => setForm((f) => ({ ...f, current_year: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                placeholder="เช่น 2568"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">วันเวลาเปิดรับ (Start)</label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600"
              />
              <p className="text-xs text-gray-500">แสดงผล: {form.start_date ? formatThaiFull(new Date(form.start_date).toISOString()) : "—"}</p>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">วันเวลาปิดรับ (End)</label>
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600"
              />
              <p className="text-xs text-gray-500">แสดงผล: {form.end_date ? formatThaiFull(new Date(form.end_date).toISOString()) : "—"}</p>
            </div>
          </div>
        </section>

        {/* Section 2: เลือกประกาศ (หลัง End) */}
        <section className="rounded-lg border border-gray-300 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">ประกาศที่ใช้งาน</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {renderAnnSelect("ประกาศหลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัยฯ", "main_annoucement")}
            {renderAnnSelect("ประกาศขอใช้เงินกองทุนอุดหนุนกิจกรรม", "reward_announcement")}
            {renderAnnSelect("ประกาศขอใช้เงินกองทุนส่งเสริมการวิจัย", "activity_support_announcement")}
            {renderAnnSelect("ประกาศงานประชุมวิชาการ", "conference_announcement")}
            {renderAnnSelect("ประกาศงานบริการวิชาการและการบริการ", "service_announcement")}
          </div>
        </section>

        {/* Section 3: สถานะ & ช่วงเวลาที่ตั้งค่า */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-lg border border-gray-300 p-5">
            <div className="text-sm text-gray-700 flex items-center gap-2 mb-2">
              <Clock size={14} /> สถานะการเปิดรับ
            </div>
            <div
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${
                windowInfo?.is_open_effective
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-red-100 text-red-800 border-red-200"
              }`}
            >
              {windowInfo?.is_open_effective ? "เปิด (effective)" : "ปิด (effective)"}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              เวลาระบบ: {windowInfo?.now ? formatThaiFull(windowInfo.now) : "-"}
            </div>
          </div>

          <div className="rounded-lg border border-gray-300 p-5">
            <div className="text-sm text-gray-700 flex items-center gap-2 mb-2">
              <CalendarIcon size={14} /> ช่วงเวลาที่ตั้งค่า
            </div>
            <div className="text-sm text-gray-700">
              {(() => {
                const s = form.start_date ? new Date(form.start_date).toISOString() : null;
                const e = form.end_date ? new Date(form.end_date).toISOString() : null;
                if (!s && !e) return "ไม่กำหนดช่วงเวลา (เปิดตลอด)";
                if (s && e) return `ตั้งแต่ ${formatThaiFull(s)} ถึง ${formatThaiFull(e)}`;
                if (s && !e) return `ตั้งแต่ ${formatThaiFull(s)} ถึง ไม่มีกำหนด`;
                if (!s && e) return `ตั้งแต่ ไม่มีกำหนด ถึง ${formatThaiFull(e)}`;
                return "-";
              })()}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SystemConfigSettings;
