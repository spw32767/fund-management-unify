"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Card from "../common/Card";
import PageLayout from "../common/PageLayout";
import NotificationList from "@/app/components/notifications/NotificationList";
import { notificationsAPI } from "@/app/lib/notifications_api";

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
      <Card title="รายการการแจ้งเตือน" collapsible={false}>
        <NotificationList
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClose={() => {}}
          onViewAll={() => {}}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      </Card>
    </PageLayout>
  );
}