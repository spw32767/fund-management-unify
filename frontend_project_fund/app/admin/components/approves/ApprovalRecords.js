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

// =========================
// Helpers
// =========================
const fmtTHB0 = (n) =>
  typeof n === 'number' && !Number.isNaN(n)
    ? n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
    : '-';

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

// คืนค่าเป็นอาร์เรย์ถ้าเป็นไปได้ มิฉะนั้น []
function asArray(maybe) {
  if (Array.isArray(maybe)) return maybe;
  return [];
}

// แปลง rows ดิบ → โครงหมวดหมู่
function groupRowsToCategories(rows) {
  const list = asArray(rows);
  if (list.length === 0) return [];

  const map = new Map();
  for (const r of list) {
    const categoryId = r.category_id ?? r.CategoryID ?? r.categoryId ?? null;
    const categoryName = r.category_name ?? r.CategoryName ?? r.category ?? '-';
    const catKey = `${categoryId}::${categoryName}`;

    if (!map.has(catKey)) {
      map.set(catKey, {
        categoryId,
        categoryName,
        items: [],
        total: 0,
      });
    }

    const label =
      r.subcategory_budget_label ||
      r.subcategory_budget_name ||
      r.subcategory_name ||
      r.SubcategoryBudgetLabel ||
      r.SubcategoryName ||
      'ทุนย่อย';

    const amount = Number(
      r.approved_amount ??
        r.total_approved_amount ??
        r.TotalApprovedAmount ??
        r.amount ??
        0
    ) || 0;

    const cat = map.get(catKey);
    cat.items.push({ label, amount });
    cat.total += amount;
  }
  return Array.from(map.values());
}

// =========================
export default function ApprovalRecords() {
  // meta
  const [years, setYears] = useState([]);     // [{id,label}]
  const [users, setUsers] = useState([]);     // normalized users
  const [loadingMeta, setLoadingMeta] = useState(true);

  // filters
  const [yearId, setYearId] = useState(null);
  const [yearLabel, setYearLabel] = useState('');
  const [userId, setUserId] = useState(null);

  // data
  const [categories, setCategories] = useState([]); // [{categoryId,categoryName,items:[{label,amount}], total}]
  const [loadingData, setLoadingData] = useState(false);

  // ---------- Load years & users ----------
  useEffect(() => {
    let alive = true;

    async function loadMeta() {
      setLoadingMeta(true);
      try {
        const [yearsRes, usersRes] = await Promise.all([
          adminAPI.getYears(),                       // GET /admin/years
          apiClient.get('/users', { page_size: 1000 }) // GET /users
        ]);

        const yearListRaw = Array.isArray(yearsRes) ? yearsRes : yearsRes?.years || yearsRes?.data || [];
        const userListRaw = Array.isArray(usersRes) ? usersRes : usersRes?.users || usersRes?.data || [];

        const yearList = yearListRaw.map(normalizeYear);
        const allUsers = userListRaw.map(normalizeUser);

        // แสดงทุกคน ยกเว้น admin (role_id=3) และไม่เอาที่ soft-delete
        const visibleUsers = allUsers
          .filter((u) => u.user_id != null)
          .filter((u) => u.role_id !== 3)
          .filter((u) => !u.delete_at)
          .sort((a, b) => (a.display_name || '').localeCompare(b.display_name || '', 'th'));

        if (!alive) return;

        setYears(yearList);
        setUsers(visibleUsers);

        // defaults
        if (!yearId && yearList.length) {
          setYearId(yearList[0].id);
          setYearLabel(yearList[0].label);
        }
        if (!userId && visibleUsers.length) {
          setUserId(visibleUsers[0].user_id);
        }
      } catch (err) {
        console.error(err);
        toast.error('โหลดปี/ผู้ใช้ไม่สำเร็จ');
      } finally {
        if (alive) setLoadingMeta(false);
      }
    }

    loadMeta();
    return () => { alive = false; };
  }, []); // load once

  // ---------- Load totals on filters change ----------
  useEffect(() => {
    if (!userId || !yearId) return;

    let alive = true;

    async function loadTotals() {
      setLoadingData(true);
      try {
        const params = {
          user_id: userId,
          teacher_id: userId,   // เผื่อฝั่ง BE ใช้ key นี้
          year_id: yearId,
          year: Number(yearLabel) || undefined, // เผื่อฝั่ง BE รับเป็นปี พ.ศ.
          sort: 'category_name',
          dir: 'ASC',
        };

        const res = await adminAPI.getApprovalTotals(params); // /admin/approval-records/totals

        // ----- คลาย payload ให้รองรับหลายรูปแบบ -----
        const payload = res?.data ?? res ?? {};
        let cats = [];

        // (A) categories พร้อมใช้
        const catsA = payload?.categories ?? payload?.data?.categories;
        if (Array.isArray(catsA)) {
          cats = catsA.map((c) => ({
            categoryId: c.categoryId ?? c.category_id ?? null,
            categoryName: c.categoryName ?? c.category_name ?? '-',
            items: asArray(c.items).map((it) => ({
              label: it.label ?? it.name ?? it.budget_name ?? it.subcategory_name ?? '-',
              amount: Number(it.amount ?? it.total ?? 0) || 0,
            })),
            total:
              Number(c.total ?? 0) ||
              asArray(c.items).reduce((s, it) => s + (Number(it.amount) || 0), 0),
          }));
        } else {
          // (B) ไม่มี categories → ลองหาชุด rows
          const rowsCandidate =
            asArray(payload?.rows) ||
            asArray(payload?.data?.rows) ||
            asArray(payload?.records) ||
            asArray(payload?.data?.records) ||
            (Array.isArray(payload) ? payload : []) ||
            asArray(payload?.data);

          cats = groupRowsToCategories(rowsCandidate);
        }

        if (!alive) return;
        setCategories(cats);
      } catch (e) {
        console.error(e);
        toast.error('โหลดข้อมูลสรุปอนุมัติไม่สำเร็จ');
        setCategories([]);
      } finally {
        if (alive) setLoadingData(false);
      }
    }

    loadTotals();
    return () => { alive = false; };
  }, [userId, yearId, yearLabel]);

  const grandTotal = useMemo(
    () => categories.reduce((s, c) => s + (Number(c.total) || 0), 0),
    [categories]
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
          <button onClick={handleExport} className="btn btn-primary" disabled={loadingMeta || loadingData}>
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
            {/* ผู้ใช้ (ยกเว้น Admin) */}
            <div className="space-y-2">
              <label className="block text-ml font-medium text-gray-700">ผู้ใช้</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-ml"
                value={userId ?? ''}
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

            {/* ปีงบประมาณ (พ.ศ.) */}
            <div className="space-y-2">
              <label className="block text-ml font-medium text-gray-700">ปีงบประมาณ (พ.ศ.)</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-ml"
                value={yearId ?? ''}
                disabled={loadingMeta || !years.length}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const found = years.find((y) => y.id === id);
                  setYearId(id);
                  setYearLabel(found?.label ?? '');
                }}
              >
                {years.length === 0 ? (
                  <option value="">{loadingMeta ? 'กำลังโหลด…' : '— ไม่มีข้อมูล —'}</option>
                ) : (
                  years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* ผลการอนุมัติ */}
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
        {/* ตารางตามหมวดทุน */}
        {loadingData ? (
          <div className="py-16 text-center text-sm text-gray-500">กำลังโหลดข้อมูล…</div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">ไม่พบบันทึกการอนุมัติ</div>
        ) : (
          <div className="space-y-8">
            {categories.map((cat) => (
              <div key={cat.categoryId ?? cat.categoryName} className="space-y-3">
                <div className="font-bold">{cat.categoryName}</div>
                <div className="overflow-hidden rounded-md border border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-ml font-medium text-gray-700">ทุนย่อย / งบประมาณ</th>
                        <th className="px-4 py-3 text-right text-ml font-medium text-gray-700 w-48">จำนวนเงิน (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {cat.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-ml">{it.label}</td>
                          <td className="px-4 py-3 text-ml text-right">
                            {typeof it.amount === 'number' ? fmtTHB0(it.amount) : <span className="text-gray-400 italic">-</span>}
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
                      {fmtTHB0(cat.items?.reduce((s, it) => s + (Number(it.amount) || 0), 0))} บาท
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* สรุปผลรวม (อยู่ล่างสุดของการ์ด) */}
        <div className="mt-10 pt-6 border-t flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-base md:text-lg text-gray-700">
            ยอดเงินที่อาจารย์{' '}
            <span className="font-semibold text-gray-900">
              {selectedUser?.display_name || '—'}
            </span>{' '}
            ได้รับอนุมัติให้เบิกในปีงบประมาณ{' '}
            <span className="font-semibold text-gray-900">{yearLabel || '—'}</span>
          </div>
          <div className="text-right">
            <div className="text-sm md:text-base text-gray-500">รวมทั้งสิ้น</div>
            <div className="text-3xl md:text-4xl font-extrabold">
              {fmtTHB0(grandTotal)} บาท
            </div>
          </div>
        </div>
      </Card>
    </PageLayout>
  );
}
