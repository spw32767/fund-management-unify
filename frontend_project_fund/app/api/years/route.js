// app/api/fm/years/route.js
import { NextResponse } from 'next/server';
import { cookies, headers as nextHeaders } from 'next/headers';

export const dynamic = 'force-dynamic'; // no caching at the route level

// ใช้ ENV เดียวแบบที่โปรเจกต์คุณมีอยู่ (URL เดียว)
// ตัวอย่างใน .env.local: NEXT_PUBLIC_API_URL=http://147.50.230.213:8080/api/v1
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  'http://127.0.0.1:8080/api/v1';

// แยก base กับ path จาก URL เดียว (กันกรณีมี/ไม่มี /api/v1)
let API_BASE = 'http://127.0.0.1:8080';
let API_BASE_PATH = '/api/v1';
try {
  const u = new URL(API_URL);
  API_BASE = `${u.protocol}//${u.host}`;   // e.g. http://147.50.230.213:8080
  API_BASE_PATH = u.pathname || '/api/v1'; // e.g. /api/v1 หรือ '' ถ้า backend ไม่มี prefix
} catch { /* keep defaults */ }

const joinURL = (base, path) =>
  `${base.replace(/\/+$/, '')}/${String(path || '').replace(/^\/+/, '')}`;

// รวม header auth (รับได้ทั้งจาก header และ cookie) — ไม่ไปแตะระบบเก่า
async function buildAuthHeaders() {
  const h = await nextHeaders();
  const incomingAuth = h.get('authorization');

  const base = { Accept: 'application/json', 'Cache-Control': 'no-store' };
  if (incomingAuth) return { ...base, Authorization: incomingAuth };

  // FIX: Await cookies() before calling its methods
  const cookieStore = await cookies();
  const token =
    cookieStore.get('access_token')?.value ||
    cookieStore.get('token')?.value ||
    cookieStore.get('auth_token')?.value;

  return token ? { ...base, Authorization: `Bearer ${token}` } : base;
}

// กันแฮงค์ด้วย timeout เล็กน้อย
async function fetchWithTimeout(url, options = {}, ms = 10000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

// GET /api/fm/years  → proxy ไปยัง <API_URL>/years (และ fallback ไป <BASE>/years เผื่อไม่มี prefix)
export async function GET() {
  const headers = await buildAuthHeaders();

  const primaryURL = joinURL(joinURL(API_BASE, API_BASE_PATH || ''), '/years');
  const fallbackURL = joinURL(API_BASE, '/years');

  try {
    // 1) ลอง path หลักตาม ENV ก่อน
    let resp = await fetchWithTimeout(primaryURL, { headers, cache: 'no-store' });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.warn(`[fm/years] primary failed ${resp.status}: ${text}`);

      // 2) ลอง fallback ถ้า backend ไม่มี /api/v1
      resp = await fetchWithTimeout(fallbackURL, { headers, cache: 'no-store' });
      if (!resp.ok) {
        const text2 = await resp.text().catch(() => '');
        return NextResponse.json(
          { success: false, error: `Backend /years error: ${resp.status} ${text2}` },
          { status: 502 }
        );
      }
    }

    const data = await resp.json().catch(() => ({}));
    // รองรับทั้ง array ตรง ๆ, { years: [...] }, หรือ { data: [...] }
    const years = Array.isArray(data) ? data : (data.years || data.data || []);

    // normalize ให้ shape เหมือนที่ FE ใช้
    const normalized = years.map((y) => ({
      year_id: Number(y.year_id),
      year: String(y.year),
      budget: Number(y.budget || 0),
      status: y.status || 'active',
    }));

    return NextResponse.json({
      success: true,
      years: normalized,
      data: normalized, // เผื่อโค้ดเดิมอ่าน data
    });
  } catch (err) {
    console.error('[fm/years] proxy error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch years: ' + (err?.message || 'unknown') },
      { status: 502 }
    );
  }
}