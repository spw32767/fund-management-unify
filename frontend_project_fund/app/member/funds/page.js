"use client";

import AuthGuard from "../../components/AuthGuard";
import { MemberPageContent } from "../page";

export default function MemberFundsPage() {
  return (
    <AuthGuard
      allowedRoles={[1, 2, 4, 'teacher', 'staff', 'dept_head']}
      requireAuth={true}
    >
      <MemberPageContent initialPage="research-fund" />
    </AuthGuard>
  );
}