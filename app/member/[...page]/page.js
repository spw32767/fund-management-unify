"use client";

import { use } from "react";
import AuthGuard from "../../components/AuthGuard";
import { MemberPageContent } from "../page";

export default function MemberDynamicPage({ params }) {
  const resolvedParams = use(params);
  const pageSegments = Array.isArray(resolvedParams?.page)
    ? resolvedParams.page
    : [];

  const page = pageSegments[0] || 'profile';
  const mode = pageSegments[1] || null;

  return (
    <AuthGuard
      allowedRoles={[1, 2, 4, "teacher", "staff", "dept_head"]}
      requireAuth={true}
    >
      <MemberPageContent initialPage={page} initialMode={mode} />
    </AuthGuard>
  );
}