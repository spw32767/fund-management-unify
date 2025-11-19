"use client";

import { use } from "react";
import AuthGuard from "../../components/AuthGuard";
import { MemberPageContent } from "../page";

export default function MemberDynamicPage({ params }) {
  const resolvedParams = use(params);
  const page = Array.isArray(resolvedParams?.page)
    ? resolvedParams.page[0]
    : resolvedParams?.page;

  return (
    <AuthGuard
      allowedRoles={[1, 2, 4, "teacher", "staff", "dept_head"]}
      requireAuth={true}
    >
      <MemberPageContent initialPage={page} />
    </AuthGuard>
  );
}