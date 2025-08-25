"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Eye, Download, FileText, ClipboardList, Plus } from "lucide-react";
import { submissionAPI } from "@/app/lib/teacher_api";
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

  // Map display year to year_id used by API
  const YEAR_ID_MAP = { "2566": 1, "2567": 2, "2568": 3 };

  // Load applications on mount and when year filter changes
  useEffect(() => {
    loadApplications();
  }, [yearFilter]);

  useEffect(() => {
    filterApplications();
  }, [searchTerm, statusFilter, yearFilter, applications]);

  // Load applications from API
  const loadApplications = async () => {
    setLoading(true);
    try {
      // Build query params for API
      const params = { limit: 100 };
      if (yearFilter !== "all") {
        const yearId = YEAR_ID_MAP[yearFilter];
        if (yearId) params.year_id = yearId;
      }

      const response = await submissionAPI.getSubmissions(params);
      
      // Debug log
      console.log('API Response:', response);
      
        if (response.success && response.submissions) {
          // Transform data to match existing structure
          const transformedData = response.submissions.map(sub => ({
            application_id: sub.submission_id,
            application_number: sub.submission_number,
            project_title: getTitle(sub),
            category_name: sub.category_name ?? null,
            subcategory_name: getSubmissionTypeName(sub.submission_type),
            requested_amount: getAmount(sub),
            // API returns lowercase keys; keep PascalCase fallback for backward compatibility
            status: sub.status?.status_name || sub.Status?.status_name || getStatusName(sub.status_id),
            status_code: getStatusCode(sub.status_id),
          submitted_at: sub.created_at,
          year: sub.year?.year || sub.Year?.year || '2568',
          year_id: sub.year_id || sub.Year?.year_id,
          // Keep original data for reference
          _original: sub
        }));
        
        setApplications(transformedData);
        setFilteredApplications(transformedData);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      // Fallback to empty array
      setApplications([]);
      setFilteredApplications([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions to extract data
  const getTitle = (submission) => {
    if (submission.submission_type === 'publication_reward') {
      // Check both article_title and paper_title for compatibility
      return submission.PublicationRewardDetail?.article_title ||
            submission.publication_reward_detail?.article_title ||
            submission.PublicationRewardDetail?.paper_title ||
            submission.publication_reward_detail?.paper_title ||
            'เงินรางวัลตีพิมพ์';
    } else if (submission.submission_type === 'fund_application') {
      // Prefer project_name fields but fall back to project_title
      return submission.FundApplicationDetail?.project_name_th ||
            submission.FundApplicationDetail?.project_name_en ||
            submission.FundApplicationDetail?.project_title ||
            submission.fund_application_detail?.project_name_th ||
            submission.fund_application_detail?.project_name_en ||
            submission.fund_application_detail?.project_title ||
            'ทุนวิจัย';
    }
    return 'ไม่ระบุ';
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

  const getSubmissionTypeName = (type) => {
    const typeMap = {
      'publication_reward': 'เงินรางวัลตีพิมพ์',
      'fund_application': 'ทุนวิจัย'
    };
    return typeMap[type] || type;
  };

  const getStatusName = (statusId) => {
    const statusMap = {
      1: 'รอพิจารณา',
      2: 'อนุมัติ',
      3: 'ปฏิเสธ',
      4: 'ต้องการข้อมูลเพิ่มเติม',
      5: 'ร่าง'
    };
    return statusMap[statusId] || 'ไม่ทราบสถานะ';
  };

  const getStatusCode = (statusId) => {
    const codeMap = {
      1: 'pending',
      2: 'approved',
      3: 'rejected',
      4: 'revision',
      5: 'draft'
    };
    return codeMap[statusId] || 'unknown';
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
      filtered = filtered.filter(app => app.status_code === statusFilter);
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
      className: "text-sm"
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
      accessor: "status",
      render: (value, row) => {
        // Get status_id from original data
        const statusId = row._original?.status_id || 1;
        return <StatusBadge status={value} statusId={statusId} />;
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

  const handleDownload = (id) => {
    console.log("Download:", id);
    // Handle download
  };

  const handleCreateNew = () => {
    if (onNavigate) {
      onNavigate('research-fund');
    }
  };

  const handleRefresh = () => {
    loadApplications();
  };

  return (
    <PageLayout
      title="คำร้องของฉัน"
      subtitle="รายการคำร้องทั้งหมดที่คุณได้ยื่นไว้"
      icon={ClipboardList}
      actions={
        <div className="flex gap-2">
          <button 
            onClick={handleRefresh}
            className="btn btn-secondary"
            disabled={loading}
          >
            {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
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
        { label: "หน้าแรก", href: "/teacher" },
        { label: "คำร้องของฉัน" }
      ]}
    >
      <Card 
        title="รายการคำร้อง" 
        collapsible={false}
        headerClassName="bg-gray-50"
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
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="pending">รอพิจารณา</option>
            <option value="approved">อนุมัติ</option>
            <option value="rejected">ปฏิเสธ</option>
            <option value="revision">ต้องการข้อมูลเพิ่มเติม</option>
            <option value="draft">ร่าง</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="all">ปีทั้งหมด</option>
            <option value="2568">2568</option>
            <option value="2567">2567</option>
            <option value="2566">2566</option>
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