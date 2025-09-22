"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import Card from "../common/Card";
import PageLayout from "../common/PageLayout";
import NotificationList from "./NotificationList";
import { mockNotifications } from "../data/mockData";

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState(mockNotifications);

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.notification_id === id
          ? { ...notification, is_read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({
      ...notification,
      is_read: true,
    })));
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
        />
      </Card>
    </PageLayout>
  );
}