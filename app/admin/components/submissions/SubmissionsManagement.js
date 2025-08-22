// app/admin/components/SubmissionsManagement.js
'use client';

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import PageLayout from '../common/PageLayout';
import SubmissionTable from './SubmissionTable';
import SubmissionFilters from './SubmissionFilters';
import SubmissionDetails from './SubmissionDetails';
import ExportButton from './ExportButton';
import { submissionsListingAPI } from '../../../lib/admin_submission_api';
import { toast } from 'react-hot-toast';

export default function SubmissionsManagement() {
  const [currentView, setCurrentView] = useState('list');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 20,
    totalCount: 0,
    totalPages: 0
  });
  
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    year_id: '',
    search: '',
    date_from: '',
    date_to: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  const [statistics, setStatistics] = useState({
    total_submissions: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    revision_count: 0
  });

  // Fetch submissions
  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        limit: pagination.perPage,
        ...filters
      };

      const response = await submissionsListingAPI.getAdminSubmissions(params);
      
      if (response.success) {
        setSubmissions(response.submissions || []);
        setPagination({
          currentPage: response.pagination?.current_page || 1,
          perPage: response.pagination?.per_page || 20,
          totalCount: response.pagination?.total_count || 0,
          totalPages: response.pagination?.total_pages || 0
        });
        
        if (response.statistics) {
          setStatistics(response.statistics);
        }
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('ไม่สามารถดึงข้อมูลคำร้องได้');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when filters/pagination change
  useEffect(() => {
    if (currentView === 'list') {
      fetchSubmissions();
    }
  }, [pagination.currentPage, filters]);

  // Handle filter change
  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
    setPagination({ ...pagination, currentPage: 1 }); // Reset to first page
  };

  // Handle search
  const handleSearch = (searchTerm) => {
    setFilters({ ...filters, search: searchTerm });
    setPagination({ ...pagination, currentPage: 1 });
  };

  // Handle sort
  const handleSort = (column) => {
    const newOrder = 
      filters.sort_by === column && filters.sort_order === 'asc' 
        ? 'desc' 
        : 'asc';
    
    setFilters({
      ...filters,
      sort_by: column,
      sort_order: newOrder
    });
  };

  // Handle page change
  const handlePageChange = (page) => {
    setPagination({ ...pagination, currentPage: page });
  };

  // View submission details
  const handleViewSubmission = (submissionId) => {
    setSelectedSubmissionId(submissionId);
    setCurrentView('details');
  };

  // Back to list
  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedSubmissionId(null);
    fetchSubmissions(); // Refresh list when coming back
  };

  // Handle export
  const handleExport = async (format) => {
    try {
      const params = {
        format: format,
        ...filters
      };
      
      const response = await submissionsListingAPI.exportSubmissions(params);
      
      if (response.data) {
        toast.success(`เตรียมข้อมูล export เรียบร้อย (${response.total} รายการ)`);
        // TODO: Implement actual file download when backend supports it
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('ไม่สามารถ export ข้อมูลได้');
    }
  };

  // Show details view
  if (currentView === 'details' && selectedSubmissionId) {
    return (
      <SubmissionDetails
        submissionId={selectedSubmissionId}
        onBack={handleBackToList}
      />
    );
  }

  // Show list view with PageLayout
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
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <div className="bg-white overflow-hidden shadow-md rounded-lg border border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              คำร้องทั้งหมด
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {statistics.total_submissions}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-md rounded-lg border border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              รอพิจารณา
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-yellow-600">
              {statistics.pending_count}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-md rounded-lg border border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              อนุมัติแล้ว
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">
              {statistics.approved_count}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-md rounded-lg border border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              ไม่อนุมัติ
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-red-600">
              {statistics.rejected_count}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-md rounded-lg border border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              ต้องแก้ไข
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-orange-600">
              {statistics.revision_count}
            </dd>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white shadow-md rounded-lg border border-gray-200">
        {/* Filters */}
        <SubmissionFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
        />

        {/* Table */}
        <SubmissionTable
          submissions={submissions}
          loading={loading}
          sortBy={filters.sort_by}
          sortOrder={filters.sort_order}
          onSort={handleSort}
          onView={handleViewSubmission}
          onRefresh={fetchSubmissions}
        />

        {/* Pagination */}
        {!loading && submissions.length > 0 && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-b-lg">
            {/* ... pagination code เหมือนเดิม ... */}
          </div>
        )}
      </div>
    </PageLayout>
  );
}