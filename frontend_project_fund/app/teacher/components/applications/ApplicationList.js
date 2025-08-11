"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Eye, Download, FileText, ClipboardList, Plus } from "lucide-react";
import { mockApplications } from "../data/mockData";
import StatusBadge from "../common/StatusBadge";
import DataTable from "../common/DataTable";
import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import EmptyState from "../common/EmptyState";

export default function ApplicationList() {
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  useEffect(() => {
    // Simulate API call
    setApplications(mockApplications);
    setFilteredApplications(mockApplications);
  }, []);

  useEffect(() => {
    filterApplications();
  }, [searchTerm, statusFilter, yearFilter, applications]);

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
      header: "ชื่อโครงการ",
      accessor: "project_title",
      className: "max-w-xs truncate"
    },
    {
      header: "ประเภททุน",
      accessor: "subcategory_name",
      className: "text-sm"
    },
    {
      header: "จำนวนเงินที่ขอ",
      accessor: "requested_amount",
      render: (value) => `฿${value.toLocaleString()}`
    },
    {
      header: "สถานะ",
      accessor: "status",
      render: (value, row) => <StatusBadge status={row.status_code} text={value} />
    },
    {
      header: "วันที่ส่ง",
      accessor: "submitted_at",
      render: (value) => new Date(value).toLocaleDateString('th-TH')
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
    console.log("View detail:", id);
    // Navigate to detail page
  };

  const handleDownload = (id) => {
    console.log("Download:", id);
    // Handle download
  };

  return (
    <PageLayout
      title="คำร้องของฉัน"
      subtitle="รายการคำร้องทั้งหมดที่คุณได้ยื่นไว้"
      icon={ClipboardList}
      actions={
        <button className="btn btn-primary">
          <Plus size={20} />
          ยื่นคำร้องใหม่
        </button>
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
            <option value="rejected">ไม่อนุมัติ</option>
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
        {filteredApplications.length === 0 ? (
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
                <button className="btn btn-primary">
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