"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Eye, Download, FileText, ClipboardList, Plus, RefreshCcw } from "lucide-react";
import { submissionAPI, teacherAPI } from "@/app/lib/member_api";
import { systemAPI } from "@/app/lib/api";
import { systemConfigAPI } from "@/app/lib/system_config_api";
import { statusService } from "@/app/lib/status_service";
import { useStatusMap } from "@/app/hooks/useStatusMap";
import StatusBadge from "../common/StatusBadge";
import DataTable from "../common/DataTable";
import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import EmptyState from "../common/EmptyState";

export default function ApplicationList({ onNavigate }) {
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [years, setYears] = useState([]);
  const [yearsLoading, setYearsLoading] = useState(false);
  const latestApplicationsRequestRef = useRef(0);
  const {
    statuses: statusOptions,
    getLabelById,
    getCodeById,
    isLoading: statusLoading,
  } = useStatusMap();

  useEffect(() => {
    loadYears();
  }, []);

  // Load applications on mount and when year filter changes
  useEffect(() => {
    loadApplications();
  }, [yearFilter, years]);

  useEffect(() => {
    filterApplications();
  }, [searchTerm, statusFilter, yearFilter, applications]);

  const loadYears = async () => {
    setYearsLoading(true);
    try {
      const [yearsRes, currentYearRes] = await Promise.all([
        systemAPI
          .getYears()
          .catch((error) => {
            console.error('Error fetching years list:', error);
            return null;
          }),
        systemConfigAPI
          .getCurrentYear()
          .catch((error) => {
            console.error('Error fetching current system year:', error);
            return null;
          }),
      ]);

      const rawYears = Array.isArray(yearsRes?.years)
        ? yearsRes.years
        : Array.isArray(yearsRes?.data)
        ? yearsRes.data
        : Array.isArray(yearsRes)
        ? yearsRes
        : [];

      const normalizedYears = rawYears
        .map((year) => ({
          year_id: year?.year_id != null ? Number(year.year_id) : null,
          year: year?.year != null ? String(year.year) : null,
          budget: year?.budget != null ? Number(year.budget) : 0,
          status: year?.status ?? 'active',
        }))
        .filter((year) => year.year_id != null && year.year);

      setYears(normalizedYears);

      const defaultYearCandidate =
        currentYearRes?.current_year ??
        currentYearRes?.data?.current_year ??
        currentYearRes?.year ??
        null;

      if (defaultYearCandidate != null) {
        const defaultYear = String(defaultYearCandidate);
        const existsInList = normalizedYears.some((year) => String(year.year) === defaultYear);
        if (existsInList) {
          setYearFilter((prev) => (prev === 'all' ? defaultYear : prev));
        }
      }
    } catch (error) {
      console.error('Error loading years data:', error);
    } finally {
      setYearsLoading(false);
    }
  };

  const findYearIdByLabel = (label) => {
    if (!label || !Array.isArray(years)) return null;
    const match = years.find((year) => String(year.year) === String(label));
    return match?.year_id ?? null;
  };

  const findYearLabelById = (yearId) => {
    if (yearId == null || !Array.isArray(years)) return null;
    const match = years.find((year) => Number(year.year_id) === Number(yearId));
    return match?.year ? String(match.year) : null;
  };

  const resolveSubmissionYear = (submission) => {
    if (!submission || typeof submission !== 'object') {
      return null;
    }

    const directYear =
      submission.year?.year ??
      submission.Year?.year ??
      submission.year ??
      submission.Year;

    if (directYear != null && directYear !== '') {
      return String(directYear);
    }

    const mappedYear =
      findYearLabelById(submission.year_id) ??
      findYearLabelById(submission.Year?.year_id);

    if (mappedYear) {
      return mappedYear;
    }

    return null;
  };

  // Load applications from API
  const loadApplications = async () => {
    const requestId = ++latestApplicationsRequestRef.current;
    setLoading(true);
    try {
      // Build query params for API
      const params = { limit: 100 };
      if (yearFilter !== "all") {
        const yearId = findYearIdByLabel(yearFilter);
        if (yearId) params.year_id = yearId;
      }

      const [response, subRes] = await Promise.all([
        submissionAPI.getSubmissions(params),
        teacherAPI.getVisibleSubcategories(),
        statusService.fetchAll().catch((error) => {
          console.error('Error fetching statuses:', error);
          return [];
        })
      ]);

      // Map subcategory_id -> subcategory_name
      const subMap = {};
      if (Array.isArray(subRes?.subcategories)) {
        subRes.subcategories.forEach((sc) => {
          const id = sc.original_subcategory_id ?? sc.subcategory_id;
          if (id != null) {
            subMap[String(id)] = sc.subcategory_name || "-";
          }
        });
      }
      
      // Debug log
      console.log('API Response:', response);

      if (response.success && Array.isArray(response.submissions)) {
        // Transform data to match existing structure
        const transformedData = response.submissions.map(sub => {
          const subId = getSubcategoryId(sub);
          const subName = getMappedSubcategoryName(subId, subMap) ?? getSubcategoryName(sub);
          const statusId =
            sub.status_id ??
            sub.status?.application_status_id ??
            sub.Status?.application_status_id ??
            null;

          const statusCode =
            getCodeById(statusId) ??
            sub.status?.status_code ??
            sub.Status?.status_code ??
            null;

          const fallbackStatusName =
            sub.status?.status_name ||
            sub.Status?.status_name ||
            (statusId != null
              ? getLabelById(statusId)
              : undefined);

          const transformed = {
            application_id: sub.submission_id,
            application_number: sub.submission_number,
            project_title: getTitle(sub),
            category_name: getCategoryName(sub),
            subcategory_name: subName || "-",
            requested_amount: getAmount(sub),
            status_id: statusId,
            status_fallback: fallbackStatusName,
            status_code: statusCode,
            submitted_at: sub.created_at,
            year:
              resolveSubmissionYear(sub) ??
              (yearFilter !== 'all' ? String(yearFilter) : null),
            year_id: sub.year_id || sub.Year?.year_id,
            // Keep original data for reference
            _original: sub
          };

          return transformed;
        });

        const nonApprovedApplications = transformedData.filter((item) => {
          const statusId = item.status_id ?? item._original?.status_id;
          const statusCode = item.status_code ?? item._original?.status?.status_code;
          const fallbackName =
            item.status_fallback ||
            item._original?.status?.status_name ||
            item._original?.Status?.status_name ||
            "";

          const normalizedId = statusId != null ? Number(statusId) : null;
          const normalizedCode = statusCode != null ? String(statusCode).toLowerCase() : "";
          const normalizedName = fallbackName ? fallbackName.toLowerCase() : "";

          const isApprovedLike =
            normalizedId === 2 ||
            normalizedCode === "approved" ||
            normalizedCode === "1" ||
            normalizedCode === "2" ||
            normalizedName.includes("อนุมัติ") ||
            normalizedName.includes("approve");

          const isClosedLike =
            normalizedCode === "closed" ||
            normalizedCode === "close" ||
            normalizedCode === "3" ||
            normalizedName.includes("ปิดทุน") ||
            normalizedName.includes("ปิดโครงการ") ||
            normalizedName.includes("ปิด") ||
            normalizedName.includes("close");

          return !(isApprovedLike || isClosedLike);
        });

        if (latestApplicationsRequestRef.current === requestId) {
          setApplications(nonApprovedApplications);
          setFilteredApplications(nonApprovedApplications);
        }
      } else if (latestApplicationsRequestRef.current === requestId) {
        setApplications([]);
        setFilteredApplications([]);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      // Fallback to empty array
      if (latestApplicationsRequestRef.current === requestId) {
        setApplications([]);
        setFilteredApplications([]);
      }
    } finally {
      if (latestApplicationsRequestRef.current === requestId) {
        setLoading(false);
      }    }
  };

  // Helper functions to extract data
  const getTitle = (submission) => {
    if (!submission || typeof submission !== 'object') {
      return '−';
    }

    if (submission.submission_type === 'publication_reward') {
      return (
        submission.publication_reward_detail?.paper_title ||
        submission.PublicationRewardDetail?.paper_title ||
        submission.publication_reward_detail?.article_title ||
        submission.PublicationRewardDetail?.article_title ||
        submission.title ||
        '−'
      );
    }

    if (submission.submission_type === 'fund_application') {
      return (
        submission.fund_application_detail?.project_title ||
        submission.FundApplicationDetail?.project_title ||
        submission.fund_application_detail?.project_name ||
        submission.FundApplicationDetail?.project_name ||
        submission.project_title ||
        submission.title ||
        '−'
      );
    }

    return submission.project_title || submission.title || '−';
  };

  const getAmount = (submission) => {
    if (submission.submission_type === 'publication_reward') {
      return submission.PublicationRewardDetail?.reward_amount ||
             submission.publication_reward_detail?.reward_amount || 0;
    } else if (submission.submission_type === 'fund_application') {
      return submission.FundApplicationDetail?.requested_amount ||
             submission.fund_application_detail?.requested_amount || 0;
    }
    return 0;
  };

  const getCategoryName = (submission) => {
    if (submission.category_name) {
      return submission.category_name;
    }
    if (submission.submission_type === 'publication_reward') {
      return 'เงินรางวัลการตีพิมพ์';
    }

    return (
      submission.fund_application_detail?.subcategory?.category?.category_name ||
      submission.FundApplicationDetail?.Subcategory?.Category?.CategoryName ||
      submission.category?.category_name ||
      submission.Category?.CategoryName ||
      null
    );
  };
  
  const getSubcategoryName = (submission) => {
    if (submission.submission_type === 'publication_reward') {
      return '-';
    }

    const rawValue =
      submission.fund_application_detail?.subcategory?.subcategory_name ||
      submission.FundApplicationDetail?.Subcategory?.subcategory_name ||
      submission.fund_application_detail?.subcategory?.SubcategoryName ||
      submission.FundApplicationDetail?.Subcategory?.SubcategoryName ||
      submission.subcategory?.subcategory_name ||
      submission.Subcategory?.SubcategoryName ||
      submission.subcategory_name;

    if (typeof rawValue === 'string' && rawValue.trim() !== '') {
      const [namePart] = rawValue.split(' - ');
      return namePart?.trim() || '-';
    }

    return '-';
  };

  const getSubcategoryId = (submission) => {
    if (!submission || typeof submission !== 'object') {
      return null;
    }

    return (
      submission.subcategory_id ??
      submission.SubcategoryID ??
      submission.fund_application_detail?.subcategory_id ??
      submission.FundApplicationDetail?.subcategory_id ??
      null
    );
  };

  const getMappedSubcategoryName = (subcategoryId, subMap) => {
    if (subcategoryId == null) {
      return null;
    }

    const key = String(subcategoryId);
    const value = subMap ? subMap[key] : null;
    if (typeof value === 'string') {
      const [namePart] = value.split(' - ');
      return namePart?.trim() || null;
    }

    return value ?? null;
  };

  const filterApplications = () => {
    let filtered = [...applications];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        app =>
          app.application_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.project_title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(app => {
        if (app.status_id == null) return false;
        return String(app.status_id) === String(statusFilter);
      });
    }

    // Year filter
    if (yearFilter !== "all") {
      filtered = filtered.filter(app => app.year === yearFilter);
    }

    setFilteredApplications(filtered);
  };

  const columns = [
    {
      header: "เลขที่คำร้อง",
      accessor: "application_number",
      className: "font-medium"
    },
    {
      header: "หมวดหมู่ทุน",
      accessor: "category_name",
      render: (value) => (value === null || value === undefined || value === '' ? '-' : value)
    },
    {
      header: "ชื่อทุน",
      accessor: "subcategory_name",
      className: "text-sm",
      render: (value) => {
        const v = (value === null || value === undefined || value === '') ? '-' : String(value);
        return (
          <div className="truncate overflow-hidden whitespace-nowrap max-w-xs" title={v}>
            {v}
          </div>
        );
      }
    },
    {
      header: "ชื่อโครงการ/บทความ",
      accessor: "project_title",
      className: "max-w-xs truncate"
    },
    {
      header: "จำนวนเงิน",
      accessor: "requested_amount",
      render: (value) => `฿${(value || 0).toLocaleString()}`
    },
    {
      header: "วันที่ส่ง",
      accessor: "submitted_at",
      render: (value) => value ? new Date(value).toLocaleDateString('th-TH') : '-'
    },
    {
      header: "สถานะ",
      accessor: "status_id",
      render: (_, row) => {
        const statusId = row.status_id ?? row._original?.status_id;
        return (
          <StatusBadge
            statusId={statusId}
            fallbackLabel={row.status_fallback}
          />
        );
      }
    },
    {
      header: "การดำเนินการ",
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            className="text-blue-600 hover:bg-blue-50 p-1 rounded"
            title="ดูรายละเอียด"
            onClick={() => handleViewDetail(row.application_id)}
          >
            <Eye size={18} />
          </button>
          <button
            className="text-green-600 hover:bg-green-50 p-1 rounded"
            title="ดาวน์โหลดเอกสาร"
            onClick={() => handleDownload(row.application_id)}
          >
            <Download size={18} />
          </button>
        </div>
      )
    }
  ];

  const handleViewDetail = (id) => {
    const app = applications.find(a => a.application_id === id);
    if (app._original.submission_type === 'publication_reward') { 
      onNavigate('publication-reward-detail', { submissionId: id });
    } else {
      onNavigate('fund-application-detail', { submissionId: id });
    }
  };

  const handleCreateNew = () => {
    if (onNavigate) {
      onNavigate('research-fund');
    }
  };

  const handleRefresh = async () => {
    await loadApplications();
  };

  return (
    <PageLayout
      title="คำร้องของฉัน"
      subtitle="รายการคำร้องทั้งหมดที่คุณได้ยื่นไว้"
      icon={ClipboardList}
      actions={
        <div className="flex gap-2">
          <button 
            onClick={handleCreateNew}
            className="btn btn-primary"
          >
            <Plus size={20} />
            ยื่นคำร้องใหม่
          </button>
        </div>
      }
      breadcrumbs={[
        { label: "หน้าแรก", href: "/member" },
        { label: "คำร้องของฉัน" }
      ]}
    >
      <Card 
        title="รายการคำร้อง" 
        collapsible={false}
        headerClassName="bg-white"
        action={
          <button 
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-60"
            disabled={loading}
          >
	          <RefreshCcw className={`w-4 h-4 ${loading ?? "animate-spin"}`} />
            {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
        }
      >
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="ค้นหาเลขที่คำร้อง หรือชื่อโครงการ..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={statusLoading && !statusOptions}
          >
            <option value="all">สถานะทั้งหมด</option>
            {Array.isArray(statusOptions) &&
              statusOptions.map((status) => (
                <option
                  key={status.application_status_id}
                  value={status.application_status_id}
                >
                  {status.status_name}
                </option>
              ))}
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            disabled={yearsLoading && !years.length}
          >
            <option value="all">ปีทั้งหมด</option>
            {years.map((year) => (
              <option key={year.year_id} value={String(year.year)}>
                {year.year}
              </option>
            ))}
          </select>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        ) : filteredApplications.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="ไม่พบคำร้อง"
            message={searchTerm || statusFilter !== 'all' || yearFilter !== 'all' 
              ? "ไม่พบคำร้องที่ตรงกับเงื่อนไขการค้นหา" 
              : "คุณยังไม่มีคำร้องในระบบ"
            }
            action={
              searchTerm || statusFilter !== 'all' || yearFilter !== 'all' ? (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setYearFilter('all');
                  }}
                  className="btn btn-secondary"
                >
                  ล้างการค้นหา
                </button>
              ) : (
                <button 
                  onClick={handleCreateNew}
                  className="btn btn-primary"
                >
                  <Plus size={20} />
                  สร้างคำร้องใหม่
                </button>
              )
            }
          />
        ) : (
          <>
            <DataTable 
              columns={columns}
              data={filteredApplications}
              emptyMessage="ไม่พบคำร้องที่ค้นหา"
            />
            
            {/* Summary */}
            <div className="mt-4 text-sm text-gray-600">
              แสดง {filteredApplications.length} รายการ จากทั้งหมด {applications.length} รายการ
            </div>
          </>
        )}
      </Card>
    </PageLayout>
  );
}