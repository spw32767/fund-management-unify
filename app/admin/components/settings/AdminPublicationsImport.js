"use client";
import { useState } from "react";
import { publicationsAPI, usersAPI } from "@/app/lib/api";

// Author ID helpers
function normalizeAuthorId(s) {
  const x = (s || "").trim();
  if (!x) return "";
  return x.startsWith("_") ? x : `_${x}`;
}
function looksLikeAuthorId(s) {
  const x = (s || "").trim().replace(/^_/, "");
  return /^[a-zA-Z0-9_-]{10,}$/.test(x);
}

export default function AdminPublicationsImport() {
  const [userId, setUserId] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [userHits, setUserHits] = useState([]);
  const [authorId, setAuthorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function searchUsers() {
    if (!userQuery.trim()) return;
    setLoading(true); setMsg("");
    try {
      const res = await usersAPI.search(userQuery.trim());
      setUserHits(res?.data || []);
      if (!res?.data?.length) setMsg("ไม่พบผู้ใช้ในระบบที่ตรงคำค้น");
    } catch (e) {
      setMsg(e.message || "User search error");
    } finally {
      setLoading(false);
    }
  }

  async function importOne() {
    const id = normalizeAuthorId(authorId);
    if (!userId) { setMsg("กรุณาเลือกหรือกรอก User ID"); return; }
    if (!looksLikeAuthorId(id)) { setMsg("Author ID ไม่ถูกต้อง (ตัวอย่าง: _lza5VIAAAAJ)"); return; }

    setLoading(true); setMsg("");
    try {
      const s = await publicationsAPI.importScholarForUser(userId, id);
      setMsg(
        `นำเข้าเสร็จ • fetched ${s.fetched ?? 0} • created ${s.created ?? 0} • updated ${s.updated ?? 0} • failed ${s.failed ?? 0}`
      );
    } catch (e) {
      setMsg(e.message || "Import error");
    } finally {
      setLoading(false);
    }
  }

  async function importAll() {
    setLoading(true); setMsg("");
    try {
      const s = await publicationsAPI.importScholarBatch();
      setMsg(
        `Batch • users ${s.users ?? 0} • fetched ${s.fetched ?? 0} • created ${s.created ?? 0} • updated ${s.updated ?? 0} • failed ${s.failed ?? 0}`
      );
    } catch (e) {
      setMsg(e.message || "Batch error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">นำเข้าผลงานวิชาการ (Google Scholar)</h2>

      {/* A) เลือกอาจารย์จากฐานข้อมูล (ค้นหาจาก DB) */}
      <div className="p-4 rounded-xl border space-y-3 bg-white">
        <div className="font-medium">เลือกอาจารย์จากฐานข้อมูล</div>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-md px-3 py-2"
            placeholder="พิมพ์ชื่อ/อีเมล แล้วกดค้นหา (เช่น: suphawich)"
            value={userQuery}
            onChange={(e)=>setUserQuery(e.target.value)}
          />
          <button
            onClick={searchUsers}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-slate-700 text-white disabled:opacity-50"
          >
            {loading ? "กำลังค้นหา..." : "ค้นหา"}
          </button>
        </div>
        {userHits.length > 0 && (
          <ul className="space-y-2 mt-3">
            {userHits.map(u => (
              <li key={u.user_id} className="flex items-center justify-between border rounded-md p-2">
                <div className="text-sm">
                  <div className="font-medium">{u.name || `(ID: ${u.user_id})`}</div>
                  <div className="text-gray-600">{u.email}</div>
                </div>
                <button
                  onClick={()=>setUserId(String(u.user_id))}
                  className="px-3 py-1 rounded bg-gray-900 text-white text-sm"
                >
                  ใช้ User ID {u.user_id}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="text-xs text-gray-600 mt-2">หรือกรอก User ID ตรงๆ:</div>
        <input
          className="border rounded-md px-3 py-2 w-60"
          placeholder="User ID"
          value={userId}
          onChange={(e)=>setUserId(e.target.value)}
        />
      </div>

      {/* B) กรอก Author ID เท่านั้น (ไม่มีการค้นหาด้วยชื่อ) */}
      <div className="p-4 rounded-xl border space-y-3 bg-white">
        <div className="font-medium">กรอก Google Scholar Author ID</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
          <input
            className="border rounded-md px-3 py-2 md:col-span-2"
            placeholder="เช่น: _lza5VIAAAAJ (ถ้าไม่มี _ ระบบจะเติมให้)"
            value={authorId}
            onChange={(e)=>setAuthorId(e.target.value)}
          />
          <button
            onClick={importOne}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-green-600 text-white disabled:opacity-50"
          >
            {loading ? "กำลังนำเข้า..." : "นำเข้า"}
          </button>
        </div>
        <div className="text-xs text-gray-600">
          หา Author ID ได้จาก URL โปรไฟล์ Scholar:
          {" "}
          <code>https://scholar.google.com/citations?user=<b>_XXXXXXXXXXX</b></code>
        </div>
      </div>

      {/* C) Batch Import */}
      <div className="p-4 rounded-xl border space-y-3 bg-white">
        <div className="font-medium">นำเข้าทั้งหมด (เฉพาะผู้ที่บันทึก Scholar ID แล้ว)</div>
        <button
          onClick={importAll}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-purple-600 text-white disabled:opacity-50"
        >
          {loading ? "กำลังรัน..." : "รัน Batch Import"}
        </button>
      </div>

      {!!msg && (
        <div className="p-3 rounded-md bg-yellow-50 text-yellow-800 text-sm border">{msg}</div>
      )}
    </div>
  );
}
