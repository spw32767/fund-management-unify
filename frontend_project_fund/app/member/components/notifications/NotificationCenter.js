"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Inbox, Sparkles } from "lucide-react";
import PageLayout from "../common/PageLayout";
import NotificationList from "@/app/components/notifications/NotificationList";
import { notificationsAPI } from "@/app/lib/notifications_api";

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await notificationsAPI.list({ limit: 100 });
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setNotifications(items);
    } catch (error) {
      console.error("Failed to load notifications", error);
      setErrorMessage("ไม่สามารถโหลดการแจ้งเตือนได้");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

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
      subtitle="ติดตามความคืบหน้าการยื่นคำร้องและข่าวสารสำคัญ"
      icon={Bell}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/member" },
        { label: "การแจ้งเตือน" },
      ]}
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm text-slate-500">
              ทั้งหมด
              <Inbox className="h-5 w-5 text-slate-400" />
            </div>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{notifications.length}</p>
            <p className="text-sm text-slate-500">การแจ้งเตือนที่บันทึกไว้</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm text-slate-500">
              ยังไม่อ่าน
              <Sparkles className="h-5 w-5 text-amber-500" />
            </div>
            <p className="mt-2 text-3xl font-semibold text-amber-600">{unreadCount}</p>
            <p className="text-sm text-slate-500">แจ้งเตือนใหม่พร้อมให้ดำเนินการ</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm text-slate-500">
              ที่อ่านแล้ว
              <CheckCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-2 text-3xl font-semibold text-emerald-600">{notifications.length - unreadCount}</p>
            <p className="text-sm text-slate-500">ข้อมูลที่คุณรับทราบแล้ว</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ศูนย์การแจ้งเตือน</p>
              <h2 className="text-xl font-bold text-slate-900">รายการแจ้งเตือนทั้งหมด</h2>
              <p className="text-sm text-slate-500">ปรับปรุงหน้ารวมใหม่เพื่อให้ค้นหาและจัดการการแจ้งเตือนได้ง่ายขึ้น</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium">
                <Bell className="h-4 w-4" /> อัปเดตอัตโนมัติ
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                <Sparkles className="h-4 w-4" /> ดีไซน์ใหม่
              </span>
            </div>
          </div>

          <NotificationList
            notifications={notifications}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onClose={() => {}}
            onViewAll={() => {}}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        </div>
      </div>
    </PageLayout>
  );
}