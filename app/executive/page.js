"use client";

import AuthGuard from "../components/AuthGuard";
import { AdminPageContent } from "../admin/page";

export default function ExecutivePage() {
  return (
    <AuthGuard allowedRoles={[5, 'executive']} requireAuth={true}>
      <AdminPageContent basePath="/executive" />
    </AuthGuard>
  );
}