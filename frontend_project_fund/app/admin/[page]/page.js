"use client";

import AuthGuard from "../../components/AuthGuard";
import { AdminPageContent } from "../page";

export default function AdminDynamicPage({ params }) {
  const page = Array.isArray(params?.page) ? params.page[0] : params?.page;

  return (
    <AuthGuard allowedRoles={[3, "admin"]} requireAuth={true}>
      <AdminPageContent initialPage={page} />
    </AuthGuard>
  );
}
