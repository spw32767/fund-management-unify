// app/admin/components/submissions/SubmissionTable.js
'use client';

import { ChevronDown, ChevronUp, Eye } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

export default function SubmissionTable({
  submissions,
  loading,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onRefresh,
  // lookups / enrichments
  catMap = {},
  subMap = {},
  // kept for compatibility with parent props
  budgetMap = {},
  subBudgetDescMap = {},
  detailsMap = {},
  userMap = {},
}) {
  // ---------- helpers ----------
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount) => {
    const n = Number(amount ?? 0);
    if (!isFinite(n) || n <= 0) return '-';
    return `฿${n.toLocaleString()}`;
  };

  const handleSort = (column) => onSort(column);

  const getSortIcon = (column) => {
    if (sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-indigo-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-indigo-600" />
    );
  };

  // ---- Name helpers (keep your fixed columns intact) ----
  const getCategoryName = (s) =>
    s?.Category?.category_name ||
    (s?.category_id != null ? catMap[String(s.category_id)] : undefined) ||
    s?.category_name || '-';

  const getSubcategoryName = (s) =>
    s?.Subcategory?.subcategory_name ||
    (s?.subcategory_id != null ? subMap[String(s.subcategory_id)] : undefined) ||
    s?.FundApplicationDetail?.Subcategory?.subcategory_name ||
    s?.subcategory_name || '-';

  // ----- Normalize detail payloads -----
  const getDP = (s) => detailsMap[s.submission_id] || null;
  const getDPO = (s) =>
    getDP(s)?.details?.data ||
    getDP(s)?.data ||
    getDP(s)?.payload ||
    getDP(s) ||
    null;

  const getPRDetail = (s) => {
    const dpo = getDPO(s);
    return (
      s?.PublicationRewardDetail ||
      dpo?.PublicationRewardDetail ||
      dpo?.publication_reward_detail ||
      dpo?.submission?.PublicationRewardDetail ||
      dpo?.Submission?.PublicationRewardDetail ||
      (dpo && (dpo.paper_title || dpo.total_amount || dpo.reward_amount) ? dpo : null) ||
      null
    );
  };

  const getArticleTitle = (s) => {
    const dpo = getDPO(s);

    // 1) ถ้าเป็น Fund Application ให้ใช้ชื่อโครงการก่อน
    const faTitle =
      s?.FundApplicationDetail?.project_title ||
      dpo?.FundApplicationDetail?.project_title ||
      dpo?.project_title;
    if (faTitle) return faTitle;

    // 2) งานตีพิมพ์: รองรับได้ทั้งอยู่ใน PublicationRewardDetail และอยู่แบน ๆ ใน dpo
    const pr =
      s?.PublicationRewardDetail ||
      dpo?.PublicationRewardDetail ||
      dpo?.publication_reward_detail ||
      dpo?.submission?.PublicationRewardDetail ||
      dpo?.Submission?.PublicationRewardDetail ||
      null;

    const fromPr =
      pr?.paper_title ||
      pr?.paperTitle ||
      pr?.article_title ||
      pr?.title_th ||
      pr?.title;

    const fromDpo =
      dpo?.paper_title ||
      dpo?.paperTitle ||
      dpo?.article_title ||
      dpo?.title_th ||
      dpo?.title;

    return fromPr || fromDpo || s?.title || '-';
  };


  // รองรับทั้ง snake_case, camelCase, PascalCase
  const pickNameFromUserObj = (u) => {
    if (!u || typeof u !== 'object') return '';
    const display =
      u.display_name || u.DisplayName || u.full_name || u.FullName || '';
    const first =
      u.user_fname || u.first_name || u.given_name ||
      u.UserFname || u.FirstName || u.GivenName ||
      u.name_th || u.name || '';
    const last =
      u.user_lname || u.last_name || u.family_name ||
      u.UserLname || u.LastName || u.FamilyName ||
      u.surname_th || u.surname || '';
    const email = u.email || u.user_email || u.Email || u.UserEmail || '';
    const username = u.username || u.UserName || '';
    const name = (display || `${first} ${last}`.trim()).trim();
    return name || email || username;
  };

  // REPLACE this entire function in SubmissionTable.js
  const getAuthorName = (s) => {
    // 1) จากแถวที่ join มาโดยตรง (backend ให้ User/user/applicant มา)
    const uRow = s?.User || s?.user || s?.applicant;
    const rowName = pickNameFromUserObj(uRow);
    if (rowName) return rowName;

    // 2) จากรายละเอียดที่โหลดเฉพาะแถว (detailsMap)
    const dp  = getDP(s);
    const dpo = getDPO(s);
    const uDetails =
      dpo?.submission?.user || dpo?.submission?.User ||
      dpo?.user || dp?.applicant || dpo?.applicant || null;

    const nameFromDetails = pickNameFromUserObj(uDetails);
    if (nameFromDetails) return nameFromDetails;

    // 3) จาก userMap (key = submissions.user_id) ที่ parent เตรียมไว้
    if (s?.user_id && userMap[String(s.user_id)]) return userMap[String(s.user_id)];

    // 4) flat fields เผื่อ backend ยิงแบน ๆ มา
    const flat = pickNameFromUserObj({
      user_fname: s.user_fname, user_lname: s.user_lname,
      email: s.email || s.user_email,
      UserFname: s.UserFname, UserLname: s.UserLname, Email: s.Email
    });
    if (flat) return flat;

    // 5) สุดท้ายจริง ๆ ก็ไม่แสดงเป็น ID แล้ว
    return 'ไม่ระบุผู้ยื่น';
  };

  const getAmount = (s) => {
    // 1) Publication Reward: คำนวณเหมือนเดิม
    const pr = getPRDetail(s);
    if (pr) {
      const total =
        pr.total_amount ?? pr.total_reward_amount ?? pr.net_amount ??
        ((pr.reward_amount || 0) +
         (pr.revision_fee || 0) +
         (pr.publication_fee || 0) -
         (pr.external_funding_amount || 0));
      const n = Number(total || 0);
      return isFinite(n) ? n : 0;
    }

    // 2) Fund Application (& อื่นๆ): แสดง "requested" เสมอ ไม่ใช้ approved
    const dpo = getDPO(s) || {};
    const fa =
      s?.FundApplicationDetail ||
      dpo?.FundApplicationDetail ||
      // ถ้า payload แบน ๆ และมี requested_amount / project_title ให้ถือเป็น FA detail
      (dpo && (dpo.requested_amount != null || dpo.project_title != null) ? dpo : null);

    const requested = Number(
      (fa?.requested_amount ?? s?.requested_amount ?? s?.amount ?? 0)
    );
    return isFinite(requested) ? requested : 0;
  };

  const getDisplayDate = (s) => s?.display_date || s?.submitted_at || s?.created_at;

  const makeRowKey = (s) => {
    const id = s?.submission_id ?? s?.id ?? 'na';
    const type = s?.submission_type || s?.form_type || 'general';
    const ts = s?.updated_at || s?.created_at || s?.submitted_at || '';
    return `${type}:${id}:${ts}`;
  };

  // ---------- UI states ----------
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <div className="ml-3 text-gray-600">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่พบข้อมูลคำร้อง</h3>
        <p className="mt-1 text-sm text-gray-500">ลองปรับเปลี่ยนตัวกรองการค้นหา หรือสร้างคำร้องใหม่</p>
      </div>
    );
  }

  // ---------- Table ----------
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {/* เลขที่คำร้อง (sortable) */}
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('submission_number')}
            >
              <div className="flex items-center space-x-1">
                <span>เลขที่คำร้อง</span>
                {getSortIcon('submission_number')}
              </div>
            </th>

            {/* หมวดทุน */}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              หมวดทุน
            </th>

            {/* ประเภททุน */}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ประเภททุน
            </th>

            {/* ชื่อบทความ */}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ชื่อบทความ
            </th>

            {/* ผู้ยื่น */}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ผู้ยื่น
            </th>

            {/* จำนวนเงิน */}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              จำนวนเงิน
            </th>

            {/* สถานะ (sortable) */}
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('status_id')}
            >
              <div className="flex items-center space-x-1">
                <span>สถานะ</span>
                {getSortIcon('status_id')}
              </div>
            </th>

            {/* วันที่ส่งคำร้อง (sortable) */}
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('created_at')}
            >
              <div className="flex items-center space-x-1">
                <span>วันที่ส่งคำร้อง</span>
                {getSortIcon('created_at')}
              </div>
            </th>

            {/* การดำเนินการ */}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              จัดการ
            </th>

          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {submissions.map((s) => {
            const amount = getAmount(s);
            const catName = getCategoryName(s);
            const subName = getSubcategoryName(s);
            const articleTitle = getArticleTitle(s);
            const author = getAuthorName(s);
            return (
              <tr key={makeRowKey(s)} className="hover:bg-gray-50 transition-colors duration-150">
                {/* เลขที่คำร้อง */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {s.submission_number || s.id || '-'}
                </td>

                {/* หมวดทุน */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {catName}
                </td>

                {/* ประเภททุน */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="block max-w-[260px] truncate" title={subName}>
                    {subName}
                  </span>
                </td>

                {/* ชื่อบทความ */}
                <td className="px-6 py-4 text-sm text-gray-700">
                  <span title={articleTitle} className="line-clamp-2">
                    {articleTitle}
                  </span>
                </td>

                {/* ผู้ยื่น */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {author || 'ไม่ระบุผู้ยื่น'}
                </td>

                {/* จำนวนเงิน */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(amount)}
                </td>

                {/* สถานะ */}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <StatusBadge
                    statusId={s.status_id}
                    fallbackLabel={s.display_status || s.status?.status_name}
                  />
                </td>

                {/* วันที่ส่งคำร้อง */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(getDisplayDate(s))}
                </td>

                {/* การดำเนินการ */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => onView(s.submission_id || s.id)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      title="ดูรายละเอียด"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      ดูรายละเอียด
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}