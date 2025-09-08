"use client";

import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Save, RefreshCw, Calendar, Clock } from "lucide-react";

// ---- helper: ดึง Authorization จาก localStorage/cookie ----
function getAuthHeader() {
  try {
    const keys = ["access_token", "token", "auth_token", "Authorization"];
    for (const k of keys) {
      const v = typeof window !== "undefined" ? window.localStorage.getItem(k) : null;
      if (v) return /^Bearer\s+/i.test(v) ? v : `Bearer ${v}`;
    }
    if (typeof document !== "undefined") {
      const m = document.cookie.match(/(?:^|;\s*)(access_token|token|auth_token)=([^;]+)/i);
      if (m) {
        const val = decodeURIComponent(m[2]);
        return /^Bearer\s+/i.test(val) ? val : `Bearer ${val}`;
      }
    }
  } catch {}
  return null;
}

// ---- helper: แปลงวันที่เป็นรูปแบบไทยอ่านง่าย (ปี พ.ศ., เดือนเป็นคำ, เวลา HH:mm) ----
function formatThaiFull(dtStr) {
  if (!dtStr) return "-";
  try {
    const d = new Date(dtStr);
    // ใช้ Buddhist year + ตัวเลขอารบิก
    const fmt = new Intl.DateTimeFormat("th-TH-u-nu-latn", {
      timeZone: "Asia/Bangkok",
      day: "numeric",
      month: "long",
      year: "numeric", // ใน locale นี้จะเป็น พ.ศ.
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);

    const parts = Object.fromEntries(fmt.map(p => [p.type, p.value]));
    // บาง browser จะให้ year เป็น BE แล้ว เราจึงไม่บวก 543 เพิ่ม
    // สร้างข้อความ: วันที่ 19 มิถุนายน พ.ศ. 2568 เวลา 13:45 น.
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
  });
  const [windowInfo, setWindowInfo] = useState(null);

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

  const loadConfig = async () => {
    setLoading(true);
    try {
      const auth = getAuthHeader();
      const res = await fetch("/api/system-config", {
        method: "GET",
        headers: { ...(auth ? { Authorization: auth } : {}) },
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || "โหลดข้อมูลไม่สำเร็จ");

      setForm({
        current_year: data.current_year ?? "",
        start_date: data.start_date ? toLocalInput(data.start_date) : "",
        end_date: data.end_date ? toLocalInput(data.end_date) : "",
      });
      setWindowInfo(data);
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาดในการโหลด");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
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
      const auth = getAuthHeader();
      const payload = {
        current_year: String(form.current_year).trim(),
        start_date: toISOOrNull(form.start_date),
        end_date: toISOOrNull(form.end_date),
      };

      const res = await fetch("/api/system-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) throw new Error(data?.error || "บันทึกไม่สำเร็จ");

      toast("success", "บันทึกตั้งค่าระบบสำเร็จ");
      await loadConfig();
    } catch (e) {
      toast("error", e.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  // เตรียมข้อความช่วงเวลาแบบอ่านง่าย
  const windowText = (() => {
    const s = form.start_date ? new Date(form.start_date).toISOString() : null;
    const e = form.end_date ? new Date(form.end_date).toISOString() : null;

    if (!s && !e) return "ไม่กำหนดช่วงเวลา (เปิดตลอด)";
    if (s && e) return `ตั้งแต่ ${formatThaiFull(s)} ถึง ${formatThaiFull(e)}`;
    if (s && !e) return `ตั้งแต่ ${formatThaiFull(s)} ถึง ไม่มีกำหนด`;
    if (!s && e) return `ตั้งแต่ ไม่มีกำหนด ถึง ${formatThaiFull(e)}`;
    return "-";
  })();

  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">ตั้งค่าระบบ</h2>
          <p className="text-gray-600 mt-1">กำหนดปีงบประมาณปัจจุบัน และช่วงเวลาเปิด–ปิดการรับคำร้องของระบบ</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadConfig}
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

      {loading ? (
        <div className="text-gray-500">กำลังโหลด...</div>
      ) : (
        <>
          {/* ฟอร์ม */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ปีงบประมาณปัจจุบัน</label>
              <input
                type="text"
                value={form.current_year}
                onChange={(e) => setForm((f) => ({ ...f, current_year: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="เช่น 2568"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">วันเวลาเปิดรับ (Start)</label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">วันเวลาปิดรับ (End)</label>
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* สถานะ + ช่วงเวลา (เอา "ปีงบประมาณในระบบ" ออกตามคำขอ) */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-500 flex items-center gap-2 mb-1">
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

            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-500 flex items-center gap-2 mb-1">
                <Calendar size={14} /> ช่วงเวลาที่ตั้งค่า
              </div>
              <div className="text-base text-gray-800">{windowText}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SystemConfigSettings;
