"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Eye, Gift, RefreshCcw } from "lucide-react";
import { submissionAPI, teacherAPI } from "@/app/lib/member_api";
import { systemAPI } from "@/app/lib/api";
import { systemConfigAPI } from "@/app/lib/system_config_api";
import { statusService } from "@/app/lib/status_service";
import { useStatusMap } from "@/app/hooks/useStatusMap";
import { isApprovedStatus } from "../utils/status";
import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import DataTable from "../common/DataTable";
import StatusBadge from "../common/StatusBadge";
import EmptyState from "../common/EmptyState";

export default function ReceivedFundsList({ onNavigate }) {
  const [funds, setFunds] = useState([]);
  const [filteredFunds, setFilteredFunds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [years, setYears] = useState([]);
  const [yearsLoading, setYearsLoading] = useState(false);
  const latestFundsRequestRef = useRef(0);
  const {
    statuses: statusOptions,
    getLabelById,
    getCodeById,
    isLoading: statusLoading,
  } = useStatusMap();

  useEffect(() => {
    loadYears();
  }, []);

  useEffect(() => {
    loadFunds();
  }, [yearFilter, years]);

  useEffect(() => {
    filterFunds();
  }, [searchTerm, statusFilter, yearFilter, funds]);

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

  const handleRefresh = () => {
    loadFunds();
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

  const loadFunds = async () => {
    const requestId = ++latestFundsRequestRef.current;
    setLoading(true);
    try {
      const params = { limit: 1000 };
      if (yearFilter !== "all") {
        const yearId = findYearIdByLabel(yearFilter);
        if (yearId) params.year_id = yearId;
      }

      const [response, subRes] = await Promise.all([
        submissionAPI.getSubmissions(params),
        teacherAPI.getVisibleSubcategories(),
        statusService.fetchAll().catch((error) => {
          console.error("Error fetching statuses:", error);
          return [];
        }),
      ]);

      const subMap = {};
      if (Array.isArray(subRes?.subcategories)) {
        subRes.subcategories.forEach((sc) => {
          const id = sc.original_subcategory_id ?? sc.subcategory_id;
          if (id != null) {
            subMap[String(id)] = sc.subcategory_name || "-";
          }
        });
      }

      if (response.success && Array.isArray(response.submissions)) {
        const transformed = response.submissions.map((sub) => {
          const subId = getSubcategoryId(sub);

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
            (statusId != null ? getLabelById(statusId) : undefined);

          return {
            application_id: sub.submission_id,
            application_number: sub.submission_number,
            project_title: getProjectTitle(sub),
            category_name: getCategoryName(sub),
            subcategory_name:
              getMappedSubcategoryName(subId, subMap) ?? getSubcategoryName(sub),
            requested_amount: getApprovedAmount(sub),
            status_id: statusId,
            status_code: statusCode,
            status_fallback: fallbackStatusName,
            submitted_at: sub.created_at,
            year:
              resolveSubmissionYear(sub) ??
              (yearFilter !== 'all' ? String(yearFilter) : null),
            year_id: sub.year_id || sub.Year?.year_id,
            _original: sub,
          };
        });

        const approvedFunds = transformed.filter((item) => {
          const statusId = item.status_id ?? item._original?.status_id;
          const statusCode = item.status_code ?? item._original?.status?.status_code;
          const statusName =
            item.status_fallback ||
            item._original?.status?.status_name ||
            item._original?.Status?.status_name ||
            "";

          return isApprovedStatus(statusId, statusCode, statusName);
        });

        approvedFunds.sort(
          (a, b) =>
            new Date(b._original?.created_at || b._original?.create_at || 0) -
            new Date(a._original?.created_at || a._original?.create_at || 0)
        );

        if (latestFundsRequestRef.current === requestId) {
          setFunds(approvedFunds);
          setFilteredFunds(approvedFunds);
        }
      } else if (latestFundsRequestRef.current === requestId) {
        setFunds([]);
        setFilteredFunds([]);
      }
    } catch (error) {
      console.error("Error loading received funds:", error);
      if (latestFundsRequestRef.current === requestId) {
        setFunds([]);
        setFilteredFunds([]);
      }
    } finally {
      if (latestFundsRequestRef.current === requestId) {
        setLoading(false);
      }    }
  };

  const filterFunds = () => {
    let data = [...funds];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (item) =>
          item.application_number?.toLowerCase().includes(term) ||
          item.project_title?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      data = data.filter((item) => {
        if (item.status_id == null) return false;
        return String(item.status_id) === String(statusFilter);
      });
    }

    if (yearFilter !== "all") {
      data = data.filter((item) => item.year === yearFilter);
    }

    setFilteredFunds(data);
  };

  const handleViewDetail = (id) => {
    const fund = funds.find((f) => f.application_id === id);
    if (!fund) return;

    if (fund._original?.submission_type === "publication_reward") {
      onNavigate?.("publication-reward-detail", { submissionId: id });
    } else {
      onNavigate?.("fund-application-detail", { submissionId: id });
    }
  };

  const approvedStatusOptions = useMemo(() => {
    if (!Array.isArray(statusOptions)) return [];
    return statusOptions.filter((status) =>
      isApprovedStatus(
        status.application_status_id,
        status.status_code,
        status.status_name
      )
    );
  }, [statusOptions]);

  const columns = [
    {
      header: "เลขที่คำร้อง",
      accessor: "application_number",
      className: "font-medium",
    },
    {
      header: "หมวดหมู่ทุน",
      accessor: "category_name",
      render: (value) => (value == null || value === "" ? "-" : value),
    },
    {
      header: "ชื่อทุน",
      accessor: "subcategory_name",
      className: "text-sm",
      render: (value, row) => {
        const fundName = value == null || value === "" ? "-" : String(value);
        const projectTitle = row?.project_title;
        const hasProjectTitle =
          projectTitle != null && String(projectTitle).trim() !== "" && projectTitle !== "-";

        return (
          <div className="flex flex-col gap-1 max-w-sm">
            <span className="break-words" title={fundName}>
              {fundName}
            </span>
            {hasProjectTitle && (
              <span className="text-xs text-gray-600 break-words" title={String(projectTitle)}>
                {projectTitle}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "จำนวนเงิน",
      accessor: "requested_amount",
      render: (value) => `฿${(value || 0).toLocaleString()}`,
    },
    {
      header: "วันที่ส่ง",
      accessor: "submitted_at",
      render: (value) => (value ? new Date(value).toLocaleDateString("th-TH") : "-"),
    },
    {
      header: "สถานะ",
      accessor: "status_id",
      render: (_, row) => (
        <StatusBadge
          statusId={row.status_id ?? row._original?.status_id}
          fallbackLabel={row.status_fallback}
        />
      ),
    },
    {
      header: "การดำเนินการ",
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            title="ดูรายละเอียด"
            onClick={() => handleViewDetail(row.application_id)}
          >
            <Eye size={16} />
            ดูรายละเอียด
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="ทุนที่เคยได้รับ"
      subtitle="รายการทุนที่คุณเคยได้รับ"
      icon={Gift}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/member" },
        { label: "ทุนที่เคยได้รับ" },
      ]}
    >
      <Card title="รายการทุนที่เคยได้รับ" 
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
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
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
            disabled={statusLoading && !approvedStatusOptions.length}
          >
            {approvedStatusOptions.map((status) => (
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

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        ) : filteredFunds.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="ไม่พบข้อมูลทุน"
            message={
              searchTerm || statusFilter !== "all" || yearFilter !== "all"
                ? "ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา"
                : "คุณยังไม่เคยได้รับทุน"
            }
            action={
              searchTerm || statusFilter !== "all" || yearFilter !== "all" ? (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setYearFilter("all");
                  }}
                  className="btn btn-secondary"
                >
                  ล้างการค้นหา
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <DataTable columns={columns} data={filteredFunds} emptyMessage="ไม่พบคำร้องที่ค้นหา" />
            <div className="mt-4 text-sm text-gray-600">
              แสดง {filteredFunds.length} รายการ จากทั้งหมด {funds.length} รายการ
            </div>
          </>
        )}
      </Card>
    </PageLayout>
  );
}

function getProjectTitle(submission) {
  if (!submission || typeof submission !== "object") {
    return "-";
  }

  if (submission.submission_type === "publication_reward") {
    return (
      submission.publication_reward_detail?.paper_title ||
      submission.PublicationRewardDetail?.paper_title ||
      submission.publication_reward_detail?.article_title ||
      submission.PublicationRewardDetail?.article_title ||
      submission.title ||
      submission.project_title ||
      "-"
    );
  }

  if (submission.submission_type === "fund_application") {
    return (
      submission.fund_application_detail?.project_title ||
      submission.FundApplicationDetail?.project_title ||
      submission.fund_application_detail?.project_name ||
      submission.FundApplicationDetail?.project_name ||
      submission.project_title ||
      submission.title ||
      "-"
    );
  }

  return submission.project_title || submission.title || "-";
}

function getApprovedAmount(submission) {
  if (!submission || typeof submission !== "object") {
    return 0;
  }

  if (submission.submission_type === "publication_reward") {
    return (
      submission.publication_reward_detail?.total_approve_amount ??
      submission.PublicationRewardDetail?.total_approve_amount ??
      submission.publication_reward_detail?.reward_amount ??
      submission.PublicationRewardDetail?.reward_amount ??
      0
    );
  }

  if (submission.submission_type === "fund_application") {
    return (
      submission.approved_amount ??
      submission.fund_application_detail?.approved_amount ??
      submission.FundApplicationDetail?.approved_amount ??
      submission.fund_application_detail?.requested_amount ??
      submission.FundApplicationDetail?.requested_amount ??
      0
    );
  }

  return 0;
}

function getCategoryName(submission) {
  if (!submission || typeof submission !== "object") {
    return "-";
  }

  if (submission.category_name) {
    return submission.category_name;
  }

  if (submission.submission_type === "publication_reward") {
    return "เงินรางวัลการตีพิมพ์";
  }

  return (
    submission.fund_application_detail?.subcategory?.category?.category_name ||
    submission.FundApplicationDetail?.Subcategory?.Category?.CategoryName ||
    submission.category?.category_name ||
    submission.Category?.CategoryName ||
    "-"
  );
}

function getSubcategoryName(submission) {
  if (!submission || typeof submission !== "object") {
    return "-";
  }

  if (submission.submission_type === "publication_reward") {
    return "-";
  }

  const rawValue =
    submission.fund_application_detail?.subcategory?.subcategory_name ||
    submission.FundApplicationDetail?.Subcategory?.subcategory_name ||
    submission.fund_application_detail?.subcategory?.SubcategoryName ||
    submission.FundApplicationDetail?.Subcategory?.SubcategoryName ||
    submission.subcategory?.subcategory_name ||
    submission.Subcategory?.SubcategoryName ||
    submission.subcategory_name;

  if (typeof rawValue === "string" && rawValue.trim() !== "") {
    const [namePart] = rawValue.split(" - ");
    return namePart?.trim() || "-";
  }

  return "-";
}

function getSubcategoryId(submission) {
  if (!submission || typeof submission !== "object") {
    return null;
  }

  return (
    submission.subcategory_id ??
    submission.SubcategoryID ??
    submission.fund_application_detail?.subcategory_id ??
    submission.FundApplicationDetail?.subcategory_id ??
    null
  );
}

function getMappedSubcategoryName(subcategoryId, subMap) {
  if (subcategoryId == null) {
    return null;
  }

  const key = String(subcategoryId);
  const value = subMap ? subMap[key] : null;
  if (typeof value === "string") {
    const [namePart] = value.split(" - ");
    return namePart?.trim() || null;
  }

  return value ?? null;
}