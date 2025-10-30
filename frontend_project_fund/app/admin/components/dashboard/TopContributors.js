"use client";

import { formatNumber, formatThaiDateTime } from "@/app/utils/format";

export default function TopContributors({ users = [] }) {
  const items = Array.isArray(users) ? users.slice(0, 6) : [];

  if (!items.length) {
    return (
      <p className="text-center text-gray-500 py-6">
        ยังไม่มีข้อมูลการใช้งานที่โดดเด่น
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-2 pr-4 font-medium">ผู้ใช้งาน</th>
            <th className="py-2 px-4 font-medium text-center">ยื่นคำร้อง</th>
            <th className="py-2 px-4 font-medium text-center">สร้าง/แก้ไข</th>
            <th className="py-2 px-4 font-medium text-center">เข้าสู่ระบบ</th>
            <th className="py-2 px-4 font-medium text-center">กิจกรรมรวม</th>
            <th className="py-2 pl-4 font-medium text-right">เข้าสู่ระบบล่าสุด</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((user) => {
            const lastLogin = user.last_login ? formatThaiDateTime(user.last_login) : "-";
            return (
              <tr key={user.user_id || user.user_name} className="text-gray-700">
                <td className="py-3 pr-4">
                  <p className="font-semibold text-gray-900">{user.user_name || "ไม่ระบุชื่อ"}</p>
                  <p className="text-xs text-gray-500">
                    รวม {formatNumber(user.submission_count ?? 0)} คำร้อง
                  </p>
                </td>
                <td className="py-3 px-4 text-center font-semibold text-blue-600">
                  {formatNumber(user.submission_count ?? 0)}
                </td>
                <td className="py-3 px-4 text-center text-gray-700">
                  {formatNumber((user.create_count ?? 0) + (user.update_count ?? 0))}
                </td>
                <td className="py-3 px-4 text-center text-gray-700">
                  {formatNumber(user.login_count ?? 0)}
                </td>
                <td className="py-3 px-4 text-center text-emerald-600 font-semibold">
                  {formatNumber(user.total_actions ?? 0)}
                </td>
                <td className="py-3 pl-4 text-right text-gray-500">
                  {lastLogin}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}