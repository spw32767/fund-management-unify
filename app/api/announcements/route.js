// app/api/announcements/route.js
import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "";

export async function POST(req) {
  try {
    const form = await req.formData();

    // Basic server-side checks
    const file = form.get("file");
    if (!file) {
      return NextResponse.json({ success: false, error: "Missing file" }, { status: 400 });
    }
    // MIME check (เบื้องต้น)
    const mime = file.type || "";
    if (!mime.startsWith("application/pdf")) {
      return NextResponse.json({ success: false, error: "Only PDF is allowed" }, { status: 415 });
    }
    // (ถ้าต้องจำกัดขนาด) file.size <= 20MB เป็นต้น
    const MAX = 20 * 1024 * 1024;
    if (typeof file.size === "number" && file.size > MAX) {
      return NextResponse.json({ success: false, error: "File too large (max 20 MB)" }, { status: 413 });
    }

    // Forward to Go endpoint
    const auth = req.headers.get("authorization");
    const res = await fetch(`${BACKEND}/api/v1/admin/announcements`, {
      method: "POST",
      headers: {
        ...(auth ? { authorization: auth } : {}),
        // สำคัญ: อย่าตั้ง content-type เอง ให้ fetch กำหนด boundary ให้จาก FormData
      },
      body: form,
      cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") || "application/json; charset=utf-8" },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Upload failed" }, { status: 500 });
  }
}
