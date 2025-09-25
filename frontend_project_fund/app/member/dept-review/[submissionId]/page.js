"use client";

import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/app/components/AuthGuard";
import DeptHeadSubmissionDetails from "@/app/member/components/dept/details/DeptHeadSubmissionDetails";

export default function DeptHeadSubmissionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params?.submissionId;

  return (
    <AuthGuard allowedRoles={[4, "dept_head"]} requireAuth>
      <DeptHeadSubmissionDetails
        submissionId={submissionId}
        onBack={() => router.push("/member/dept-review")}
      />
    </AuthGuard>
  );
}
