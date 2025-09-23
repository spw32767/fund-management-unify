"use client";

import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

const TONE_STYLES = {
  warning: {
    container: "flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800",
    icon: AlertCircle,
  },
  success: {
    container: "flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800",
    icon: CheckCircle2,
  },
  error: {
    container: "flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800",
    icon: XCircle,
  },
  info: {
    container: "flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800",
    icon: Info,
  },
};

export default function DeptReviewNotice({ guard, className }) {
  if (!guard) {
    return null;
  }

  const {
    isPending,
    isRecommended,
    isDeptRejected,
    missingCriticalStatuses,
    needsDeptReview,
    currentStatusName,
  } = guard;

  let tone = "info";
  let title = "สถานะการพิจารณาของหัวหน้าสาขา";
  let detail = null;

  if (missingCriticalStatuses) {
    tone = "error";
    detail = "ไม่พบสถานะที่จำเป็นสำหรับขั้นตอนหัวหน้าสาขา กรุณาติดต่อผู้ดูแลระบบ";
  } else if (isDeptRejected) {
    tone = "error";
    detail = "หัวหน้าสาขาไม่เห็นควรพิจารณาคำร้องนี้";
  } else if (isPending) {
    tone = "warning";
    detail = "รอการพิจารณาจากหัวหน้าสาขา ผู้ดูแลระบบยังไม่สามารถอนุมัติหรือไม่อนุมัติได้";
  } else if (isRecommended) {
    tone = "success";
    detail = "หัวหน้าสาขาเห็นควรพิจารณาแล้ว สามารถดำเนินการต่อได้";
  } else if (needsDeptReview) {
    tone = "info";
    detail = currentStatusName
      ? `สถานะปัจจุบัน: ${currentStatusName}`
      : "ตรวจสอบสถานะการพิจารณาของหัวหน้าสาขาก่อนดำเนินการ";
  } else {
    return null;
  }

  const style = TONE_STYLES[tone] || TONE_STYLES.info;
  const classes = [style.container, className].filter(Boolean).join(" ");
  const Icon = style.icon;

  return (
    <div className={classes}>
      <Icon className="mt-0.5 h-5 w-5" />
      <div>
        <p className="font-semibold">{title}</p>
        {detail && <p className="mt-1 text-sm leading-relaxed">{detail}</p>}
      </div>
    </div>
  );
}