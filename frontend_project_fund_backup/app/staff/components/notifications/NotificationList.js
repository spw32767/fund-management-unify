// NotificationList.js
"use client";

import { X, CheckCheck, Info, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

export default function NotificationList({ notifications, onMarkAsRead, onMarkAllAsRead, onClose }) {
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'error':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <Info className="text-blue-500" size={20} />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} นาทีที่แล้ว`;
    } else if (diffHours < 24) {
      return `${diffHours} ชั่วโมงที่แล้ว`;
    } else if (diffHours < 48) {
      return 'เมื่อวาน';
    } else {
      return date.toLocaleDateString('th-TH');
    }
  };

  return (
    <>
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">การแจ้งเตือน</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onMarkAllAsRead}
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
          >
            <CheckCheck size={16} />
            อ่านทั้งหมด
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            ไม่มีการแจ้งเตือน
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.notification_id}
              className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                !notification.is_read ? 'bg-blue-50' : ''
              }`}
              onClick={() => onMarkAsRead(notification.notification_id)}
            >
              <div className="flex gap-3">
                <div className="mt-1">{getIcon(notification.type)}</div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {notification.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {notification.message}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {formatDate(notification.created_at)}
                    </span>
                    {notification.related_application_id && (
                      <button className="text-xs text-blue-600 hover:text-blue-700">
                        ดูรายละเอียด →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 text-center border-t">
        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          ดูการแจ้งเตือนทั้งหมด
        </button>
      </div>
    </>
  );
}