"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock3,
  Inbox,
  Info,
  XCircle,
} from "lucide-react";
import PageLayout from "../common/PageLayout";
import { notificationsAPI } from "@/app/lib/notifications_api";
import { systemAPI } from "@/app/lib/api";

export default function AdminNotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [visibleCount, setVisibleCount] = useState(0);
  const [expandedIds, setExpandedIds] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);

  const PAGE_SIZE = 10;

  const isLoadingRef = useRef(false);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    const list = Array.isArray(notifications) ? [...notifications] : [];

    const byYear =
      yearFilter === "all"
        ? list
        : list.filter((item) => {
            const date = new Date(item?.created_at);
            if (Number.isNaN(date.getTime())) return false;
            return date.getFullYear() === Number(yearFilter);
          });

    return byYear.sort((a, b) => {
      const aDate = new Date(a?.created_at).getTime();
      const bDate = new Date(b?.created_at).getTime();

      if (Number.isNaN(aDate) || Number.isNaN(bDate)) return 0;
      return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
    });
  }, [notifications, sortOrder, yearFilter]);

  const displayedNotifications = useMemo(
    () => filteredNotifications.slice(0, visibleCount || PAGE_SIZE),
    [filteredNotifications, visibleCount]
  );

  const hasMore = displayedNotifications.length < filteredNotifications.length;

  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const loadNotifications = useCallback(async () => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const batchSize = 100;
      let offset = 0;
      const items = [];

      while (true) {
        const data = await notificationsAPI.list({ limit: batchSize, offset });
        const batch = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];

        if (batch.length === 0) break;

        items.push(...batch);
        offset += batch.length;

        if (batch.length < batchSize) break;
      }

      const unique = Array.from(
        new Map(items.map((item) => [item.notification_id, item])).values()
      );

      setNotifications(unique);
      setVisibleCount(PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load notifications", error);
      setErrorMessage("ไม่สามารถโหลดการแจ้งเตือนได้");
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [PAGE_SIZE]);

  const loadYears = useCallback(async () => {
    try {
      const yearRes = await systemAPI.getYears();
      const rawYears = Array.isArray(yearRes?.years)
        ? yearRes.years
        : Array.isArray(yearRes?.data)
          ? yearRes.data
          : Array.isArray(yearRes)
            ? yearRes
            : [];

      const normalizedYears = rawYears
        .map((item) => {
          const value = item?.year ?? item?.year_id ?? item;
          const num = Number(value);
          return Number.isNaN(num) ? null : num;
        })
        .filter(Boolean);

      const uniqueYears = Array.from(new Set(normalizedYears)).sort(
        (a, b) => b - a
      );

      setAvailableYears(uniqueYears);
    } catch (error) {
      console.error("Failed to load years for notifications", error);
      setAvailableYears([]);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    loadYears();
  }, [loadNotifications, loadYears]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [PAGE_SIZE, sortOrder, yearFilter]);

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.notification_id === id
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const toggleNotification = async (id) => {
    await markAsRead(id);
    setExpandedIds((prevExpanded) =>
      prevExpanded.includes(id)
        ? prevExpanded.filter((existingId) => existingId !== id)
        : [...prevExpanded, id]
    );
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, is_read: true }))
      );
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  };

  return (
    <PageLayout
      title="การแจ้งเตือน"
      subtitle="ติดตามการแจ้งเตือนทั้งหมดสำหรับผู้ดูแลระบบ"
      icon={Bell}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/admin" },
        { label: "การแจ้งเตือน" },
      ]}
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ศูนย์การแจ้งเตือน</p>
              <h2 className="text-xl font-bold text-slate-900">รายการแจ้งเตือนทั้งหมด</h2>
              <p className="text-sm text-slate-500">จัดการการแจ้งเตือนจำนวนมากด้วยตัวกรองและการเรียงลำดับ</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <div className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                ยังไม่อ่าน {unreadCount}
              </div>
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
              >
                <CheckCheck size={16} /> อ่านทั้งหมด
              </button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-3 md:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              <Inbox className="h-4 w-4 text-slate-500" />
              ทั้งหมด {filteredNotifications.length} รายการ
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-700">กรองตามปี</span>
              <div className="relative flex-1">
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value="all">ทุกปี</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-700">เรียงลำดับ</span>
              <div className="relative flex-1">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value="desc">ล่าสุดไปเก่า</option>
                  <option value="asc">เก่าไปใหม่</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </label>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center gap-3 rounded-xl bg-slate-50 p-6 text-slate-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500" />
                กำลังโหลดการแจ้งเตือน...
              </div>
            ) : errorMessage ? (
              <div className="rounded-xl bg-rose-50 p-6 text-center text-rose-600 ring-1 ring-rose-100">
                {errorMessage}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500">
                  <Bell className="h-6 w-6" />
                </div>
                <p className="font-semibold text-slate-800">ยังไม่มีการแจ้งเตือนตามเงื่อนไขที่เลือก</p>
                <p className="text-sm text-slate-500">ลองเปลี่ยนตัวกรองหรือกลับมาดูอีกครั้งเมื่อมีการอัปเดต</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {displayedNotifications.map((notification) => {
                  const type = notification.type || "info";
                  const isRead = notification.is_read;

                  const typeBadge =
                    type === "success"
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                      : type === "warning"
                        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                        : type === "error"
                          ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                          : "bg-sky-50 text-sky-700 ring-1 ring-sky-100";

                const TypeIcon =
                  type === "success"
                    ? CheckCheck
                    : type === "warning"
                      ? AlertTriangle
                        : type === "error"
                          ? XCircle
                          : Info;

                const isExpanded = expandedIds.includes(notification.notification_id);

                return (
                  <div
                    key={notification.notification_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleNotification(notification.notification_id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleNotification(notification.notification_id);
                      }
                    }}
                    className={`h-full w-full cursor-pointer rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      isRead
                        ? "border-slate-100"
                        : "border-sky-100 ring-1 ring-sky-100 bg-gradient-to-br from-sky-50/70 to-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 ${
                          isRead ? "" : "ring-2 ring-offset-2 ring-sky-200 ring-offset-sky-50"
                        }`}
                      >
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-slate-900">{notification.title}</h4>
                              <span className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${typeBadge}`}>
                                {type === "success"
                                  ? "สำเร็จ"
                                  : type === "warning"
                                    ? "แจ้งเตือน"
                                    : type === "error"
                                      ? "ต้องดำเนินการ"
                                      : "ทั่วไป"}
                              </span>
                              {!isRead && <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-4 w-4" /> {formatDateTime(notification.created_at)}
                              </span>
                              {notification.related_submission_id && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-700 ring-1 ring-sky-100">
                                  อ้างอิง #{notification.related_submission_id}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="rounded-full border border-slate-200 bg-white p-1 text-slate-600 shadow-sm">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-inner">
                            <div className="mb-2 text-[13px] font-semibold text-slate-800">รายละเอียดการแจ้งเตือน</div>
                            <div className="whitespace-pre-line leading-relaxed text-slate-700">
                              {notification.message}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

            <div className="flex items-center justify-center py-4">
              {hasMore ? (
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((prev) =>
                      Math.min(prev + PAGE_SIZE, filteredNotifications.length)
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
                >
                  แสดงเพิ่มเติม
                </button>
              ) : notifications.length > 0 ? (
                <p className="text-xs text-slate-400">แสดงการแจ้งเตือนครบทั้งหมดแล้ว</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}