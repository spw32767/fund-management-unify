"use client";

import { use } from "react";
import AuthGuard from "../../components/AuthGuard";
import { AdminPageContent } from "../../admin/page";

export default function ExecutiveDynamicPage({ params }) {
  const resolvedParams = use(params);
  const page = Array.isArray(resolvedParams?.page)
    ? resolvedParams.page[0]
    : resolvedParams?.page;

  return (
    <AuthGuard allowedRoles={[5, "executive"]} requireAuth={true}>
      <AdminPageContent initialPage={page} basePath="/executive" />
    </AuthGuard>
  );
}