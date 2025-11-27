// NotificationList.js
"use client";

import { useState } from "react";

import {
  AlertTriangle,
  CheckCheck,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock3,
  Info,
  X,
  XCircle,
} from "lucide-react";

export default function NotificationList({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
  onViewAll = () => {},
  isLoading = false,
  errorMessage = "",
}) {
  const [expandedIds, setExpandedIds] = useState([]);

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle className="text-emerald-500" size={20} />;
      case "warning":
        return <AlertTriangle className="text-amber-500" size={20} />;
      case "error":
        return <XCircle className="text-rose-500" size={20} />;
      default:
        return <Info className="text-sky-500" size={20} />;
    }
  };

  const typeBadge = (type) => {
    switch (type) {
      case "success":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
      case "warning":
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
      case "error":
        return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
      default:
        return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} นาทีที่แล้ว`;
    } else if (diffHours < 24) {
      return `${diffHours} ชั่วโมงที่แล้ว`;
    } else if (diffHours < 48) {
      return "เมื่อวาน";
    } else {
      return date.toLocaleDateString("th-TH");
    }
  };

  const unreadCount = notifications?.filter?.((item) => !item.is_read).length || 0;

  const toggleNotification = (notificationId) => {
    onMarkAsRead(notificationId);
    setExpandedIds((prevExpanded) =>
      prevExpanded.includes(notificationId)
        ? prevExpanded.filter((id) => id !== notificationId)
        : [...prevExpanded, notificationId]
    );
  };

  return (
    <div className="flex flex-col rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700 text-white px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">ศูนย์การแจ้งเตือน</p>
            <p className="text-xs text-sky-100/90">ใหม่ {unreadCount} รายการ</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllAsRead}
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white backdrop-blur hover:bg-white/25 transition"
            >
              <CheckCheck size={16} />
              อ่านทั้งหมด
            </button>
            <button
              onClick={onClose}
              className="rounded-full bg-white/10 p-1 text-white hover:bg-white/20 transition"
              aria-label="close-notifications"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto bg-slate-50 px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 rounded-xl bg-white p-6 text-slate-500 shadow-sm">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500" />
            กำลังโหลดการแจ้งเตือน...
          </div>
        ) : errorMessage ? (
          <div className="rounded-xl bg-rose-50 p-6 text-center text-rose-600 ring-1 ring-rose-100">
            {errorMessage}
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <BellIcon />
            </div>
            <p className="font-semibold text-slate-800">ยังไม่มีการแจ้งเตือน</p>
            <p className="text-sm text-slate-500">การแจ้งเตือนใหม่จะแสดงที่นี่ทันทีที่มีการอัปเดต</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.notification_id}
              role="button"
              tabIndex={0}
              className={`w-full cursor-pointer rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                notification.is_read
                  ? "border-slate-100"
                  : "border-sky-100 ring-1 ring-sky-100 bg-gradient-to-br from-sky-50/60 to-white"
              }`}
              onClick={() => toggleNotification(notification.notification_id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleNotification(notification.notification_id);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 ${
                    notification.is_read ? "" : "ring-2 ring-offset-2 ring-sky-200 ring-offset-sky-50"
                  }`}
                >
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">
                          {notification.title}
                        </h4>
                        <span className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${typeBadge(notification.type)}`}>
                          {notification.type === "success"
                            ? "สำเร็จ"
                            : notification.type === "warning"
                              ? "แจ้งเตือน"
                              : notification.type === "error"
                                ? "ต้องดำเนินการ"
                                : "ทั่วไป"}
                        </span>
                        {!notification.is_read && (
                          <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={14} /> {formatDate(notification.created_at)}
                        </span>
                        {notification.related_submission_id && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-700 ring-1 ring-sky-100">
                            อ้างอิง #{notification.related_submission_id}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white p-1 text-slate-600 shadow-sm">
                      {expandedIds.includes(notification.notification_id) ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </div>
                  </div>

                  {expandedIds.includes(notification.notification_id) && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-inner">
                      <div className="mb-2 text-[13px] font-semibold text-slate-800">
                        รายละเอียดการแจ้งเตือน
                      </div>
                      <div className="whitespace-pre-line leading-relaxed text-slate-700">
                        {notification.message}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-slate-200 bg-white px-5 py-3 flex items-center justify-between">
        <div className="text-sm text-slate-500">เข้าถึงศูนย์การแจ้งเตือนเพื่อดูรายการทั้งหมด</div>
        <button
          className="text-sm font-semibold text-sky-700 hover:text-sky-800 inline-flex items-center gap-1"
          onClick={onViewAll}
        >
          ดูทั้งหมด
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const BellIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.25 18.75a2.25 2.25 0 11-4.5 0m9-2.25V11.1a6 6 0 10-12 0v5.4l-1.5 1.5h15l-1.5-1.5z"
    />
  </svg>
);