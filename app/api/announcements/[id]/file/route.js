// app/api/announcements/[id]/file/route.js
import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "";

export async function POST(req, { params }) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file) {
      return NextResponse.json({ success: false, error: "Missing file" }, { status: 400 });
    }
    const mime = file.type || "";
    if (!mime.startsWith("application/pdf")) {
      return NextResponse.json({ success: false, error: "Only PDF is allowed" }, { status: 415 });
    }
    const MAX = 20 * 1024 * 1024;
    if (typeof file.size === "number" && file.size > MAX) {
      return NextResponse.json({ success: false, error: "File too large (max 20 MB)" }, { status: 413 });
    }

    const auth = req.headers.get("authorization");
    const res = await fetch(`${BACKEND}/api/v1/admin/announcements/${params.id}/file`, {
      method: "POST",
      headers: { ...(auth ? { authorization: auth } : {}) },
      body: form,
      cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") || "application/json; charset=utf-8" },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Replace failed" }, { status: 500 });
  }
}
