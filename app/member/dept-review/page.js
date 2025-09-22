"use client";

import AuthGuard from "../../components/AuthGuard";
import DeptHeadReview from "../components/dept/DeptHeadReview";

export default function DeptReviewPage() {
  return (
    <AuthGuard
      allowedRoles={[4, 'dept_head']}
      requireAuth={true}
    >
      <DeptHeadReview />
    </AuthGuard>
  );
}