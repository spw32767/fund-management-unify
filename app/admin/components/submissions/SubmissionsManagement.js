// app/admin/components/submissions/SubmissionsManagement.js
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { FileText } from 'lucide-react';
import PageLayout from '../common/PageLayout';
import SubmissionTable from './SubmissionTable';
import SubmissionFilters from './SubmissionFilters';
import SubmissionDetails from './SubmissionDetails';
import ExportButton from './ExportButton';
import { submissionsListingAPI, adminSubmissionAPI, commonAPI } from '../../../lib/admin_submission_api';
import { toast } from 'react-hot-toast';

// ----------- CONFIG -----------
const WINDOW_SIZE = 20;        // how many rows to show at a time
const PAGE_SIZE_BACKEND = 100; // how many per request when we fetch-all

export default function SubmissionsManagement() {
  // Views
  const [currentView, setCurrentView] = useState('list');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  // Data stores
  const [allSubmissions, setAllSubmissions] = useState([]); // everything for selected year (raw)
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');

  // Filters (client-side only; no year_id here—year lives in selectedYear)
  const [filters, setFilters] = useState({
    category: '',
    subcategory: '',
    status: '',
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    total_submissions: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    revision_count: 0
  });

  // “Window” into filtered data (no page numbers)
  const [cursor, setCursor] = useState(0); // start index of the window
  const latestReq = useRef(0);             // race token for fetch-all

  // Lookup maps for names/descriptions
  const [catMap, setCatMap] = useState({});
  const [subMap, setSubMap] = useState({});
  const [budgetMap, setBudgetMap] = useState({});
  const [subBudgetDescMap, setSubBudgetDescMap] = useState({});
  const [detailsMap, setDetailsMap] = useState({});
  const [userMap, setUserMap] = useState({});

  // ---------- YEARS ----------
  const fetchYears = async () => {
    try {
      const response = await commonAPI.getYears();
      console.log('Years response:', response);
      if (response?.years && Array.isArray(response.years)) {
        setYears(response.years);
        if (!selectedYear && response.years.length) {
          const currentYear = response.years.find(y => y.is_current) || response.years[0];
          setSelectedYear(String(currentYear.year_id));
        }
      }
    } catch (err) {
      console.error('Error fetching years:', err);
      toast.error('ไม่สามารถดึงข้อมูลปีงบประมาณได้');
    }
  };

  useEffect(() => { fetchYears(); }, []); // initial only

  // ---------- FETCH-ALL for selected year (no backend pagination in UI) ----------
  const fetchAllForYear = async (yearId) => {
    setLoading(true);
    const reqId = ++latestReq.current;
    try {
      let page = 1;
      let done = false;
      const aggregate = [];

      while (!done) {
        const params = {
          page,
          limit: PAGE_SIZE_BACKEND,
          year_id: yearId || '',
          sort_by: 'created_at',
          sort_order: 'desc',
        };
        console.log('[FetchAll] /admin/submissions params:', params);

        const res = await submissionsListingAPI.getAdminSubmissions(params);
        if (reqId !== latestReq.current) return; // race protection

        const chunk = res?.submissions || res?.data || [];
        aggregate.push(...chunk);

        // stop if last page or no pagination info
        const totalPages = res?.pagination?.total_pages || 0;
        if (!chunk.length || totalPages <= page) done = true;
        page += 1;

        // safety cap
        if (aggregate.length > 5000) done = true;
      }

      // Client-side hard filter by year (belt & suspenders)
      const Y = String(yearId || '');
      const filteredByYear = Y
        ? aggregate.filter(s => String(s.year_id) === Y || String(s.Year?.year_id) === Y)
        : aggregate;

      console.log('[FetchAll] total fetched:', aggregate.length, 'after year filter:', filteredByYear.length);

      setAllSubmissions(filteredByYear);
      setCursor(0);

      try {
        const fs = await commonAPI.getFundStructure(); // GET /funds/structure

        const cMap = {}, sMap = {}, bMap = {}, subDescMap = {};
        const categories = fs?.categories || fs?.data?.categories || [];

        categories.forEach(cat => {
          const catId = cat.category_id ?? cat.id;
          const catName = cat.category_name ?? cat.name;
          if (catId != null) cMap[String(catId)] = catName || `หมวดทุน ${catId}`;

          const subs = cat.subcategories || cat.children || [];
          subs.forEach(sc => {
            const sid = sc.subcategory_id ?? sc.id;
            const sname = sc.subcategory_name ?? sc.name;
            if (sid != null) sMap[String(sid)] = sname || `ประเภททุน ${sid}`;

            const budgets = sc.subcategory_budgets || sc.budgets || sc.children || [];
            budgets.forEach(b => {
              const bid  = b.subcategory_budget_id ?? b.id;
              const desc = b.fund_description ?? b.description ?? '';
              if (bid != null) bMap[String(bid)] = desc;
              if (sid != null && !subDescMap[String(sid)] && desc) subDescMap[String(sid)] = desc;
            });
          });
        });

        setCatMap(cMap);
        setSubMap(sMap);
        setBudgetMap(bMap);
        setSubBudgetDescMap(subDescMap);
      } catch (e) {
        console.warn('Failed to load fund structure; will fallback to IDs', e);
      }

      // Compute statistics on the client (count by status)
      const countBy = (id) => filteredByYear.filter(r => Number(r.status_id) === id).length;
      setStatistics({
        total_submissions: filteredByYear.length,
        pending_count: countBy(1),
        approved_count: countBy(2),
        rejected_count: countBy(3),
        revision_count: countBy(4),
      });
    } catch (err) {
      if (reqId === latestReq.current) {
        console.error('Error fetching submissions:', err);
        toast.error('ไม่สามารถดึงข้อมูลคำร้องได้');
      }
    } finally {
      if (reqId === latestReq.current) setLoading(false);
    }
  };

  // ---------- CLIENT FILTER + SORT + SEARCH ----------
  const filteredAndSorted = useMemo(() => {
    let arr = allSubmissions;

    // filter by dropdowns
    if (filters.category) {
      arr = arr.filter(s => String(s.category_id) === String(filters.category));
    }
    if (filters.subcategory) {
      arr = arr.filter(s => String(s.subcategory_id) === String(filters.subcategory));
    }
    if (filters.status) {
      arr = arr.filter(s => String(s.status_id) === String(filters.status));
    }

    // --- SEARCH across key columns ---
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();

      const statusText = (sid) => {
        switch (Number(sid)) {
          case 1: return 'รอพิจารณา';
          case 2: return 'อนุมัติแล้ว';
          case 3: return 'ไม่อนุมัติ';
          case 4: return 'ต้องแก้ไข';
          default: return '';
        }
      };

      const norm = (v) => (v ?? '').toString().toLowerCase();

      arr = arr.filter(s => {
        // submission_number
        const subno = norm(s.submission_number);

        // category / subcategory names via maps (with row fallbacks)
        const catName =
          s?.Category?.category_name ||
          (s?.category_id != null ? catMap[String(s.category_id)] : undefined) ||
          s?.category_name || '';
        const subName =
          s?.Subcategory?.subcategory_name ||
          (s?.subcategory_id != null ? subMap[String(s.subcategory_id)] : undefined) ||
          s?.FundApplicationDetail?.Subcategory?.subcategory_name ||
          s?.subcategory_name || '';

        // article title (row detail if present; detailsMap for visible rows; row title fallback)
        const dp = detailsMap[s.submission_id];
        const dpo = dp?.details?.data || dp?.data || dp || {};
        const article =
          s?.PublicationRewardDetail?.paper_title ||
          dpo?.paper_title ||
          s?.title || '';

        // author display (userMap then row)
        const listAuthor =
          (s?.User?.user_fname && s?.User?.user_lname)
            ? `${s.User.user_fname} ${s.User.user_lname}`
            : (s?.User?.email || '');
        const authorFromMap = s?.user_id ? userMap[String(s.user_id)] : '';
        const author = authorFromMap || listAuthor || '';

        // amount as plain and formatted string
        const rawAmt = Number(
          (dpo?.total_amount ?? dpo?.total_reward_amount ?? dpo?.net_amount ??
            (dpo?.reward_amount || 0) + (dpo?.revision_fee || 0) + (dpo?.publication_fee || 0) - (dpo?.external_funding_amount || 0)) ||
          (s?.approved_amount ?? s?.requested_amount ?? s?.amount ?? 0)
        );
        const amtStr = isFinite(rawAmt) ? rawAmt.toString() : '';
        const amtFmt = isFinite(rawAmt) ? rawAmt.toLocaleString() : '';

        // status
        const statusStr = norm(s.display_status || s.status?.status_name || statusText(s.status_id));

        // date string
        const dateVal = s?.display_date || s?.submitted_at || s?.created_at || '';
        const dateStr = dateVal ? new Date(dateVal).toLocaleDateString('th-TH') : '';

        const fields = [
          subno,
          norm(catName),
          norm(subName),
          norm(article),
          norm(author),
          amtStr, amtFmt,
          statusStr,
          norm(dateStr),
        ];

        return fields.some(f => f && f.includes(q));
      });
    }

    // sort (client side)
    const order = (filters.sort_order || 'desc').toLowerCase();
    const sortBy = filters.sort_by || 'created_at';

    const val = (s) => {
      switch (sortBy) {
        case 'updated_at': return new Date(s.updated_at || s.update_at || 0).getTime();
        case 'submitted_at': return new Date(s.submitted_at || 0).getTime();
        case 'submission_number': return (s.submission_number || '').toString();
        case 'status_id': return Number(s.status_id) || 0;
        case 'created_at':
        default: return new Date(s.created_at || s.create_at || 0).getTime();
      }
    };

    const arrCopy = [...arr].sort((a, b) => {
      const A = val(a), B = val(b);
      if (typeof A === 'string' || typeof B === 'string') {
        return order === 'asc' ? String(A).localeCompare(String(B)) : String(B).localeCompare(String(A));
      }
      return order === 'asc' ? A - B : B - A;
    });

    return arrCopy;
  // include maps and details so search updates when they arrive
  }, [allSubmissions, filters, catMap, subMap, userMap, detailsMap]);

  // When year changes → fetch all for that year; reset window
  useEffect(() => {
    if (currentView === 'list' && selectedYear !== undefined) {
      fetchAllForYear(selectedYear);
    }
  }, [currentView, selectedYear]); // single effect; no duplicate triggers

  // Fetch details for the visible 20 rows (for amount & author fallback)
  useEffect(() => {
    const visible = filteredAndSorted.slice(cursor, cursor + WINDOW_SIZE);

    // fetch details for ANY visible row that doesn't have details yet
    const need = visible
      .filter(s => !detailsMap[s.submission_id])
      .map(s => s.submission_id);

    if (!need.length) return;

    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.allSettled(
          need.map(id => adminSubmissionAPI.getSubmissionDetails(id))
        );
        if (cancelled) return;

        const add = {};
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') add[need[i]] = r.value;
        });
        if (Object.keys(add).length) {
          setDetailsMap(prev => ({ ...prev, ...add }));
          try {
            const addUsers = {};
            Object.values(add).forEach(dp => {
              const subUsers =
                dp?.submission_users || dp?.SubmissionUsers ||
                dp?.data?.submission_users || dp?.data?.SubmissionUsers || [];

              subUsers.forEach(su => {
                const u = su?.user || su?.User;
                const id = String(u?.user_id ?? su?.user_id ?? '');
                if (!id) return;
                const first = u?.user_fname || u?.first_name || '';
                const last  = u?.user_lname || u?.last_name || '';
                const email = u?.email || '';
                const name  = `${first} ${last}`.trim() || email || `User ${id}`;
                addUsers[id] = name;
              });

              const owner =
                dp?.User || dp?.user ||
                dp?.submission?.User || dp?.Submission?.User ||
                dp?.data?.submission?.User || dp?.data?.Submission?.User;
              if (owner) {
                const id = String(owner.user_id ?? '');
                if (id) {
                  const first = owner.user_fname || owner.first_name || '';
                  const last  = owner.user_lname || owner.last_name || '';
                  const email = owner.email || '';
                  const name  = `${first} ${last}`.trim() || email || `User ${id}`;
                  addUsers[id] = name;
                }
              }
            });

            if (Object.keys(addUsers).length) {
              setUserMap(prev => ({ ...prev, ...addUsers }));
            }
          } catch {}
        }
      } catch {
        // ignore; leave cells as fallbacks
      }
    })();

    return () => { cancelled = true; };
  }, [cursor, filteredAndSorted, detailsMap]);

  // Windowed slice (no page numbers)
  const windowed = useMemo(() => {
    const start = Math.max(0, Math.min(cursor, Math.max(0, filteredAndSorted.length - 1)));
    return filteredAndSorted.slice(start, start + WINDOW_SIZE);
  }, [filteredAndSorted, cursor]);

  // ---------- Handlers ----------
  const handleYearChange = (yearId) => {
    console.log('Year changed to:', yearId);
    setSelectedYear(yearId);
    setCursor(0);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCursor(0); // reset window on filter change
  };

  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setCursor(0);
  };

  const handleSort = (column) => {
    const newOrder =
      filters.sort_by === column && filters.sort_order === 'asc'
        ? 'desc'
        : 'asc';
    setFilters(prev => ({ ...prev, sort_by: column, sort_order: newOrder }));
    setCursor(0);
  };

  const handlePrev = () => {
    setCursor(c => Math.max(0, c - WINDOW_SIZE));
  };

  const handleNext = () => {
    setCursor(c => (c + WINDOW_SIZE < filteredAndSorted.length ? c + WINDOW_SIZE : c));
  };

  const handleViewSubmission = (submissionId) => {
    setSelectedSubmissionId(submissionId);
    setCurrentView('details');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedSubmissionId(null);
    // We already have all data locally; no refetch needed
  };

  const handleExport = async (format) => {
    try {
      // You can export the currently filtered set
      toast.success(`เตรียมข้อมูล export เรียบร้อย (${filteredAndSorted.length} รายการ)`);
      // TODO: send filtered params or data to your backend exporter if needed
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('ไม่สามารถ export ข้อมูลได้');
    }
  };

  const getSelectedYearInfo = () => {
    if (!selectedYear) return { year: 'ทั้งหมด', budget: 0 };
    const y = years.find(y => String(y.year_id) === String(selectedYear));
    return y || { year: selectedYear, budget: 0 };
  };

  // ---------- Views ----------
  if (currentView === 'details' && selectedSubmissionId) {
    return (
      <SubmissionDetails
        submissionId={selectedSubmissionId}
        onBack={handleBackToList}
      />
    );
  }

  // ---------- List View ----------
  return (
    <PageLayout
      title="จัดการคำร้องขอทุน"
      subtitle="บันทึกข้อมูลการอนุมัติทุนและจัดการคำร้องทั้งหมด"
      icon={FileText}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/admin" },
        { label: "จัดการคำร้อง" }
      ]}
      actions={<ExportButton onExport={handleExport} />}
    >
      {/* Year Selector */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">เลือกปีงบประมาณ</h3>
              <p className="text-sm text-gray-600">เลือกปีงบประมาณเพื่อดูภาพรวมข้อมูลคำร้องขอทุน</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="block w-full sm:w-64 pl-3 pr-10 py-3 text-base border-2 border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg bg-white font-medium"
              >
                <option value="">ทุกปีงบประมาณ</option>
                {years.map((year) => (
                  <option key={year.year_id} value={year.year_id}>
                    ปีงบประมาณ {year.year} {year.is_current ? '(ปีปัจจุบัน)' : ''}
                  </option>
                ))}
              </select>
              {selectedYear && (
                <div className="text-right">
                  <div className="text-sm text-gray-600">งบประมาณทั้งหมด</div>
                  <div className="text-xl font-bold text-indigo-600">
                    ฿{(getSelectedYearInfo().budget || 0).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics (client-side over current year) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <StatCard label="คำร้องทั้งหมด" value={statistics.total_submissions} />
        <StatCard label="รอพิจารณา" value={statistics.pending_count} color="text-yellow-600" />
        <StatCard label="อนุมัติแล้ว" value={statistics.approved_count} color="text-green-600" />
        <StatCard label="ไม่อนุมัติ" value={statistics.rejected_count} color="text-red-600" />
        <StatCard label="ต้องแก้ไข" value={statistics.revision_count} color="text-orange-600" />
      </div>

      {/* Filters */}
      <div className="bg-white shadow-md rounded-lg border border-gray-200">
        <SubmissionFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
        />

        {/* Table */}
        <SubmissionTable
          submissions={windowed}
          loading={loading}
          sortBy={filters.sort_by}
          sortOrder={filters.sort_order}
          onSort={handleSort}
          onView={handleViewSubmission}
          catMap={catMap}
          subMap={subMap}
          budgetMap={budgetMap}
          subBudgetDescMap={subBudgetDescMap}
          detailsMap={detailsMap}
          userMap={userMap}
        />

        {/* Simple Prev / Next controls (no page numbers) */}
        {!loading && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-b-lg">
            <div className="text-sm text-gray-700">
              แสดง <span className="font-medium">{filteredAndSorted.length === 0 ? 0 : cursor + 1}</span>{' '}
              ถึง{' '}
              <span className="font-medium">
                {Math.min(cursor + WINDOW_SIZE, filteredAndSorted.length)}
              </span>{' '}
              จาก <span className="font-medium">{filteredAndSorted.length}</span> รายการ
            </div>

            <div className="space-x-2">
              <button
                onClick={handlePrev}
                disabled={cursor <= 0}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ◀ ก่อนหน้า
              </button>
              <button
                onClick={handleNext}
                disabled={cursor + WINDOW_SIZE >= filteredAndSorted.length}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ถัดไป ▶
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

// Small presentational helper
function StatCard({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="bg-white overflow-hidden shadow-md rounded-lg border border-gray-200">
      <div className="px-4 py-5 sm:p-6">
        <dt className="text-sm font-medium text-gray-500 truncate">{label}</dt>
        <dd className={`mt-1 text-3xl font-semibold ${color}`}>{value}</dd>
      </div>
    </div>
  );
}
