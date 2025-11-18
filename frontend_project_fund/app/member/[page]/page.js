"use client";

import AuthGuard from "../../components/AuthGuard";
import { MemberPageContent } from "../page";

export default function MemberDynamicPage({ params }) {
  const page = Array.isArray(params?.page) ? params.page[0] : params?.page;

  return (
    <AuthGuard
      allowedRoles={[1, 2, 4, "teacher", "staff", "dept_head"]}
      requireAuth={true}
    >
      <MemberPageContent initialPage={page} />
    </AuthGuard>
  );
}
