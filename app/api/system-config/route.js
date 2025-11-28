// app/api/system-config/route.js
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * Resolve backend base URL.
 * Priority: NEXT_PUBLIC_API_URL -> BACKEND_URL -> default
 * Ensures trailing `/api/v1` and no trailing slash at the end.
 */
function resolveBackendBase() {
  const envA = process.env.NEXT_PUBLIC_API_URL;
  const envB = process.env.BACKEND_URL;
  let base = (envA || envB || "http://127.0.0.1:8080/api/v1").trim();

  // Ensure it includes /api/v1 exactly once
  if (!/\/api\/v1\/?$/.test(base)) {
    base = base.replace(/\/+$/, "");
    if (!/\/api\/v1$/.test(base)) {
      base = `${base}/api/v1`;
    }
  }
  return base.replace(/\/+$/, "");
}

/**
 * Extract Authorization header from:
 * 1) Incoming request headers (Authorization)
 * 2) Cookies: access_token | token | auth_token
 */
async function extractAuthHeader() {
  const h = await headers();
  const headerAuth = h.get("authorization") || h.get("Authorization");
  if (headerAuth) return headerAuth;

  const c = await cookies();
  const cookieToken =
    c.get("access_token")?.value ||
    c.get("token")?.value ||
    c.get("auth_token")?.value;

  if (cookieToken) {
    // If cookie already contains "Bearer ..." keep as-is; else prefix.
    return /^Bearer\s+/i.test(cookieToken)
      ? cookieToken
      : `Bearer ${cookieToken}`;
  }
  return null;
}

/**
 * GET /api/system-config
 * Combine window + current-year + admin full row for convenient frontend use.
 */
export async function GET() {
  try {
    const base = resolveBackendBase();
    const auth = await extractAuthHeader();

    const common = {
      method: "GET",
      headers: {
        ...(auth ? { Authorization: auth } : {}),
        "Cache-Control": "no-store",
        Accept: "application/json",
      },
      cache: "no-store",
    };

    const [wRes, yRes, aRes] = await Promise.all([
      fetch(`${base}/system-config/window`, common),
      fetch(`${base}/system-config/current-year`, common),
      fetch(`${base}/admin/system-config`, common),
    ]);

    const [wJson, yJson, aJson] = await Promise.all([
      wRes.json().catch(() => ({})),
      yRes.json().catch(() => ({})),
      aRes.json().catch(() => ({})),
    ]);

    if (!wRes.ok) {
      return NextResponse.json(
        { success: false, error: wJson?.error || "Upstream error: /system-config/window" },
        { status: wRes.status || 500 }
      );
    }
    if (!yRes.ok) {
      return NextResponse.json(
        { success: false, error: yJson?.error || "Upstream error: /system-config/current-year" },
        { status: yRes.status || 500 }
      );
    }
    if (!aRes.ok) {
      // ไม่ critical มาก แต่แจ้งไปพร้อม payload
      // เรายังคืน window/current-year ได้ตามปกติ
      // ใส่ error ไว้ใน meta ให้ UI ตัดสินใจได้
    }

    // admin data อาจอยู่ใน aJson.data (ตาม controller ที่เราเพิ่มไว้)
    const adminData = aJson?.data || null;

    // ดึงค่าพื้นฐานที่ UI ต้องใช้แบบแบนราบ
    const current_year =
      yJson?.current_year ??
      adminData?.current_year ??
      null;

    const start_date =
      adminData?.start_date ??
      wJson?.start_date ??
      null;

    const end_date =
      adminData?.end_date ??
      wJson?.end_date ??
      null;

    const now = wJson?.now || new Date().toISOString();

      return NextResponse.json(
        {
          success: true,
          current_year,
          start_date,
          end_date,
          contact_info: adminData?.contact_info ?? null,
          window: wJson || null,  // มี is_open_effective, is_open_raw, now, ...
          raw: adminData,         // แถวเต็มจาก /admin/system-config (ถ้ามี)
        now,
        meta: {
          admin_ok: !!aRes.ok,
          admin_status: aRes.status,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to proxy system-config" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/system-config
 * Proxy update to /admin/system-config (update latest row, no insert).
 * Expected payload:
 * {
 *   "current_year": "2568",
 *   "start_date": "2025-09-06T23:01:58Z" | null,
 *   "end_date":   "2025-09-06T23:02:07Z" | null
 * }
 */
export async function PUT(request) {
  try {
    const base = resolveBackendBase();
    const auth = await extractAuthHeader();
    const body = await request.json();

    const res = await fetch(`${base}/admin/system-config`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      return NextResponse.json(
        { success: false, error: data?.error || "Update failed" },
        { status: res.status || 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update system-config" },
      { status: 500 }
    );
  }
}