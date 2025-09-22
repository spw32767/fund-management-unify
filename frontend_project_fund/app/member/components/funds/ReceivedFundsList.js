"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Eye, Download, Gift } from "lucide-react";
import { submissionAPI } from "@/app/lib/member_api";
import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import DataTable from "../common/DataTable";
import StatusBadge from "../common/StatusBadge";
import EmptyState from "../common/EmptyState";

export default function ReceivedFundsList({ onNavigate }) {
  const [funds, setFunds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadFunds();
  }, []);

  const loadFunds = async () => {
    setLoading(true);
    try {
      const response = await submissionAPI.getSubmissions({ status: 2, limit: 1000 });
      if (response.success && Array.isArray(response.submissions)) {
        const transformed = response.submissions.map((sub) => ({
          submission_id: sub.submission_id,
          submission_number: sub.submission_number,
          category_name: sub.category_name || sub.category?.category_name || "-",
          subcategory_name: sub.subcategory_name || sub.subcategory?.subcategory_name || "-",
          year:
            (typeof sub.year === "object" ? sub.year?.year : sub.year) ||
            (typeof sub.Year === "object" ? sub.Year?.year : sub.Year) ||
            "-",
          year_id:
            sub.year_id ||
            sub.Year?.year_id ||
            (typeof sub.year === "object" ? sub.year?.year_id : undefined),
          approved_amount:
            sub.approved_amount ??
            sub.fund_application_detail?.approved_amount ??
            sub.publication_reward_detail?.total_approve_amount ??
            null,
          status: sub.status?.status_name || "-",
          status_id: sub.status_id,
          _original: sub,
        }));
        // Sort newest first by created_at
        transformed.sort(
          (a, b) =>
            new Date(b._original.created_at || b._original.create_at || 0) -
            new Date(a._original.created_at || a._original.create_at || 0)
        );
        setFunds(transformed);
      } else {
        setFunds([]);
      }
    } catch (err) {
      console.error("Error loading received funds:", err);
      setFunds([]);
    } finally {
      setLoading(false);
    }
  };

  const yearOptions = useMemo(() => {
    const set = new Set();
    funds.forEach((f) => {
      if (f.year && f.year !== "-") set.add(f.year);
    });
    return Array.from(set).sort().reverse();
  }, [funds]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    funds.forEach((f) => {
      if (f.category_name && f.category_name !== "-") set.add(f.category_name);
    });
    return Array.from(set).sort();
  }, [funds]);

  const filteredFunds = useMemo(() => {
    let data = [...funds];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (f) =>
          f.submission_number?.toLowerCase().includes(term) ||
          f.category_name?.toLowerCase().includes(term) ||
          f.subcategory_name?.toLowerCase().includes(term)
      );
    }
    if (yearFilter !== "all") {
      data = data.filter((f) => f.year === yearFilter);
    }
    if (categoryFilter !== "all") {
      data = data.filter((f) => f.category_name === categoryFilter);
    }
    return data;
  }, [funds, searchTerm, yearFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredFunds.length / ITEMS_PER_PAGE));
  const currentData = filteredFunds.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const columns = [
    {
      header: "เลขที่คำร้อง",
      accessor: "submission_number",
      className: "font-medium",
    },
    {
      header: "หมวดหมู่ทุน",
      accessor: "category_name",
      render: (v) => (v == null || v === "" ? "-" : v),
    },
    {
      header: "ชื่อทุน",
      accessor: "subcategory_name",
      className: "text-sm",
      render: (v) => (v == null || v === "" ? "-" : v),
    },
    {
      header: "ปี",
      accessor: "year",
      render: (v) => v || "-",
    },
    {
      header: "จำนวนอนุมัติ",
      accessor: "approved_amount",
      render: (v) => (v != null ? `฿${Number(v).toLocaleString()}` : "-"),
    },
    {
      header: "สถานะ",
      accessor: "status",
      render: (v, row) => <StatusBadge status={v} statusId={row.status_id} />,
    },
    {
      header: "การดำเนินการ",
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            className="text-blue-600 hover:bg-blue-50 p-1 rounded"
            title="ดูรายละเอียด"
            onClick={() => handleView(row.submission_id, row._original)}
          >
            <Eye size={18} />
          </button>
          <button
            className="text-green-600 hover:bg-green-50 p-1 rounded"
            title="ดาวน์โหลดเอกสาร"
            onClick={() => handleDownload(row.submission_id)}
          >
            <Download size={18} />
          </button>
        </div>
      ),
    },
  ];

  const handleView = (id, original) => {
    if (!onNavigate) return;
    const type = original?.submission_type;
    if (type === "publication_reward") {
      onNavigate("publication-reward-detail", { submissionId: id });
    } else {
      onNavigate("fund-application-detail", { submissionId: id });
    }
  };

  const handleDownload = (id) => {
    console.log("Download", id);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleYearFilterChange = (e) => {
    setYearFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (e) => {
    setCategoryFilter(e.target.value);
    setCurrentPage(1);
  };

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
      <Card title="รายการทุนที่ได้รับ" collapsible={false} headerClassName="bg-gray-50">
        {/* Search & Filters */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="ค้นหาเลขที่คำร้องหรือชื่อทุน"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            value={categoryFilter}
            onChange={handleCategoryFilterChange}
          >
            <option value="all">หมวดหมู่ทั้งหมด</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            value={yearFilter}
            onChange={handleYearFilterChange}
          >
            <option value="all">ปีทั้งหมด</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
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
              searchTerm || categoryFilter !== "all" || yearFilter !== "all"
                ? "ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา"
                : "คุณยังไม่เคยได้รับทุน"
            }
            action={
              (searchTerm || categoryFilter !== "all" || yearFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("all");
                    setYearFilter("all");
                  }}
                  className="btn btn-secondary"
                >
                  ล้างการค้นหา
                </button>
              )
            }
          />
        ) : (
          <>
            <DataTable columns={columns} data={currentData} />

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
              <span>
                แสดง {filteredFunds.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}
                -{(currentPage - 1) * ITEMS_PER_PAGE + currentData.length} จาก {filteredFunds.length} รายการ
              </span>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ก่อนหน้า
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  ถัดไป
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </PageLayout>
  );
}