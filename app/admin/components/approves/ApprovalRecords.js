// app/admin/components/approves/ApprovalRecords.js
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileCheck, FileText, Filter, Download } from 'lucide-react';

import PageLayout from '../common/PageLayout';
import Card from '../common/Card';
import StatusBadge from '@/app/admin/components/common/StatusBadge';
import { toast } from 'react-hot-toast';

import adminAPI from '@/app/lib/admin_api';
import apiClient from '@/app/lib/api';

// ===== Mock เฉพาะ “ตารางสรุป” ชั่วคราว จนกว่า endpoint รายงานผลจะพร้อม =====
const MOCK_DATA = [
  {
    categoryId: 1,
    categoryName: 'ทุนส่งเสริมงานวิจัย',
    subItems: [
      { id: 11, name: 'ทุนย่อย 1', amount: 5000 },
      { id: 12, name: 'ทุนย่อย 2', amount: null },
      { id: 13, name: 'ทุนย่อย 3', amount: 200 },
    ],
  },
  {
    categoryId: 2,
    categoryName: 'ทุนอุดหนุนกิจกรรม',
    subItems: [
      { id: 21, name: 'ทุนย่อย 1', amount: null },
      { id: 22, name: 'ทุนย่อย 2', amount: 5000 },
      { id: 23, name: 'ทุนย่อย 3', amount: null },
    ],
  },
];

const formatTHB0 = (n) =>
  typeof n === 'number' && !Number.isNaN(n)
    ? n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
    : '-';

// ---- normalizers ----
const normalizeYear = (y) => {
  if (typeof y === 'number' || typeof y === 'string') {
    const num = Number(y);
    return { id: num, label: String(num) };
  }
  const id = Number(y.year_id ?? y.id ?? y.year);
  const label = String(y.year ?? y.year_th ?? y.name ?? id);
  return { id, label };
};

const normalizeUser = (u) => {
  const id = u.user_id ?? u.id ?? u.uid ?? null;
  const fname = u.user_fname ?? u.first_name ?? '';
  const lname = u.user_lname ?? u.last_name ?? '';
  const name = (u.name ?? `${fname} ${lname}`)?.trim();
  const roleId = Number(u.role_id ?? u.role?.id ?? u.roleId ?? 0);
  return {
    user_id: id != null ? Number(id) : null,
    display_name: name || (u.email ? String(u.email) : `ผู้ใช้ #${id}`),
    role_id: roleId,
    delete_at: u.delete_at ?? null,
  };
};

// ---- main component ----
export default function ApprovalRecords() {
  // meta
  const [years, setYears] = useState([]);     // [{id,label}]
  const [users, setUsers] = useState([]);     // normalized users

  // filters
  const [year, setYear] = useState('');
  const [userId, setUserId] = useState('');

  const [loadingMeta, setLoadingMeta] = useState(true);

  // 1) โหลดปี + ผู้ใช้ (ทุกคน ยกเว้น admin)
  useEffect(() => {
    let alive = true;

    async function loadMeta() {
      setLoadingMeta(true);
      try {
        const [yearsRes, usersRes] = await Promise.all([
          adminAPI.getYears(),                            // มีอยู่แล้วใน lib
          apiClient.get('/users', { page_size: 1000 }),   // ดึงทั้งหมดจาก /users
        ]);

        const yearListRaw = Array.isArray(yearsRes) ? yearsRes : yearsRes?.years || yearsRes?.data || [];
        const userListRaw = Array.isArray(usersRes) ? usersRes : usersRes?.users || usersRes?.data || [];

        const yearList = yearListRaw.map(normalizeYear);
        const allUsers = userListRaw.map(normalizeUser);

        // เงื่อนไข “แสดงทุกคน ยกเว้น admin (role_id=3)” และกัน soft-delete
        const visibleUsers = allUsers
          .filter((u) => u.user_id != null)
          .filter((u) => u.role_id !== 3)
          .filter((u) => !u.delete_at);

        // เรียงตามชื่อเพื่อ UX
        visibleUsers.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || '', 'th'));

        if (!alive) return;

        setYears(yearList);
        setUsers(visibleUsers);

        // ตั้ง default
        if (!year && yearList.length) setYear(yearList[0].label);
        if (!userId && visibleUsers.length) setUserId(visibleUsers[0].user_id);
      } catch (err) {
        console.error(err);
        toast.error('โหลดปี/ผู้ใช้ไม่สำเร็จ');
      } finally {
        if (alive) setLoadingMeta(false);
      }
    }

    loadMeta();
    return () => { alive = false; };
  }, []); // โหลดครั้งเดียว

  // รวมทั้งหมดจาก MOCK_DATA (เฉพาะตอนยังไม่มี API สรุปจริง)
  const grandTotal = useMemo(
    () => MOCK_DATA.reduce((sum, cat) => sum + cat.subItems.reduce((acc, it) => acc + (it.amount ?? 0), 0), 0),
    []
  );

  const selectedUser = users.find((u) => String(u.user_id) === String(userId));

  const handleExport = () => {
    toast('กำลังพัฒนา Export CSV/Excel', { icon: '🛠️' });
  };

  return (
    <PageLayout
      title="บันทึกข้อมูลการอนุมัติทุน"
      subtitle="รวมรายการคำร้องที่ได้รับการอนุมัติแล้ว"
      icon={FileCheck}
      breadcrumbs={[
        { label: 'หน้าแรก', href: '/admin' },
        { label: 'บันทึกข้อมูลการอนุมัติทุน' },
      ]}
      actions={
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn btn-primary">
            <Download size={18} />
            Export
          </button>
        </div>
      }
    >
      {/* ตัวกรอง */}
      <div className="mb-6">
        <Card title="ตัวกรอง (Filters)" icon={Filter} collapsible={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ผู้ใช้ (อาจารย์/เจ้าหน้าที่ ทั้งหมด ยกเว้น admin) */}
            <div className="space-y-2">
              <label className="block text-ml font-medium text-gray-700">ผู้ใช้</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-ml"
                value={userId || ''}
                disabled={loadingMeta || !users.length}
                onChange={(e) => setUserId(Number(e.target.value))}
              >
                {users.length === 0 ? (
                  <option value="">{loadingMeta ? 'กำลังโหลด…' : '— ไม่มีข้อมูล —'}</option>
                ) : (
                  users.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.display_name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* ปีงบประมาณ */}
            <div className="space-y-2">
              <label className="block text-ml font-medium text-gray-700">ปีงบประมาณ (พ.ศ.)</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-ml"
                value={year || ''}
                disabled={loadingMeta || !years.length}
                onChange={(e) => setYear(e.target.value)}
              >
                {years.length === 0 ? (
                  <option value="">{loadingMeta ? 'กำลังโหลด…' : '— ไม่มีข้อมูล —'}</option>
                ) : (
                  years.map((y) => (
                    <option key={y.id} value={y.label}>
                      {y.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* สรุปผล + ป้ายสถานะ */}
      <Card
        icon={FileText}
        collapsible={false}
        title={
          <div className="flex items-center gap-3">
            <span>ผลการอนุมัติทุน</span>
            <StatusBadge statusId={2} />
          </div>
        }
        headerClassName="items-center"
      >
        {/* ตารางตามหมวดทุน (ยังใช้ mock จนกว่า API จะพร้อม) */}
        <div className="space-y-8">
          {MOCK_DATA.map((cat) => (
            <div key={cat.categoryId} className="space-y-3">
              <div className="font-bold">{cat.categoryName}</div>
              <div className="overflow-hidden rounded-md border border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-ml font-medium text-gray-700">รายการ</th>
                      <th className="px-4 py-3 text-right text-ml font-medium text-gray-700 w-48">
                        จำนวนเงิน (บาท)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {cat.subItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-ml">{item.name}</td>
                        <td className="px-4 py-3 text-ml text-right">
                          {item.amount == null ? (
                            <span className="text-gray-400 italic">-</span>
                          ) : (
                            formatTHB0(item.amount)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* รวมต่อหมวด */}
              <div className="flex justify-end">
                <div className="bg-gray-50 rounded px-4 py-2 text-ml">
                  <span className="text-gray-600">รวมหมวด:</span>
                  <span className="ml-2 font-medium">
                    {formatTHB0(cat.subItems.reduce((s, it) => s + (it.amount ?? 0), 0))} บาท
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* สรุปผลรวม (อยู่ล่างสุดของการ์ด) */}
        <div className="mt-10 pt-6 border-t flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-base md:text-lg text-gray-700">
            ยอดเงินที่อาจารย์{' '}
            <span className="font-semibold text-gray-900">
              {selectedUser?.display_name || '—'}
            </span>{' '}
            ได้รับอนุมัติให้เบิกในงบประมาณปี{' '}
            <span className="font-semibold text-gray-900">
              {year || '—'}
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm md:text-base text-gray-500">รวมทั้งสิ้น</div>
            <div className="text-3xl md:text-4xl font-extrabold">
              {formatTHB0(grandTotal)} บาท
            </div>
          </div>
        </div>
      </Card>
    </PageLayout>
  );
}
