// NotificationBell.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import NotificationList from "./NotificationList";
import { notificationsAPI } from "../../lib/notifications_api";

export default function NotificationBell({ onViewAll }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsAPI.list({ limit: 20 }),
        notificationsAPI.count(),
      ]);

      const items = Array.isArray(listRes?.items)
        ? listRes.items
        : Array.isArray(listRes)
          ? listRes
          : [];

      setNotifications(items);
      const unread = typeof countRes?.unread === "number"
        ? countRes.unread
        : items.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
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
        prev.map((n) =>
          n.notification_id === id ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    }
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-100 rounded-full"
        aria-label="notification-toggle"
      >
        <Bell size={24} className="text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <NotificationList
              notifications={notifications}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClose={() => setShowDropdown(false)}
              onViewAll={handleViewAll}
              isLoading={isLoading}
              errorMessage={errorMessage}
            />
          </div>
        </>
      )}
    </div>
  );
}