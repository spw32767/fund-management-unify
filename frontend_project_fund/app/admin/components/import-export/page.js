"use client";

import AuthGuard from "../../components/AuthGuard";
import { AdminPageContent } from "../page";

export default function ImportExportPage() {
  return (
    <AuthGuard allowedRoles={[3, "admin"]} requireAuth={true}>
      <AdminPageContent initialPage="import-export" />
    </AuthGuard>
  );
}