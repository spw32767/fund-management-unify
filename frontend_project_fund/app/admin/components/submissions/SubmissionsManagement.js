// app/admin/components/submissions/SubmissionsManagement.js
'use client';

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import PageLayout from '../common/PageLayout';
import SubmissionTable from './SubmissionTable';
import SubmissionFilters from './SubmissionFilters';
import SubmissionDetails from './SubmissionDetails';
import ExportButton from './ExportButton';
import { submissionsListingAPI, adminSubmissionAPI, commonAPI } from '../../../lib/admin_submission_api';
import { adminAPI } from '../../../lib/admin_api';
import { toast } from 'react-hot-toast';

export default function SubmissionsManagement() {
  const [currentView, setCurrentView] = useState('list');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 20,
    totalCount: 0,
    totalPages: 0
  });
  
  const [filters, setFilters] = useState({
    year_id: '',
    category: '',
    subcategory: '',
    status: '',
    search: '',
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

  // Fetch years for dropdown
  const fetchYears = async () => {
    try {
      // ใช้ commonAPI สำหรับ years (endpoint /years)
      const response = await commonAPI.getYears();
      console.log('Years response:', response);
      
      if (response && response.years && Array.isArray(response.years)) {
        setYears(response.years);
        // Set default to current/latest year if available
        if (response.years.length > 0 && !selectedYear) {
          const currentYear = response.years.find(y => y.is_current) || response.years[0];
          setSelectedYear(currentYear.year_id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching years:', error);
      toast.error('ไม่สามารถดึงข้อมูลปีงบประมาณได้');
    }
  };

  // Fetch initial data
  useEffect(() => {
    fetchYears();
  }, []);

  // Update filters when selectedYear changes
  useEffect(() => {
    if (selectedYear) {
      setFilters({ ...filters, year_id: selectedYear });
    }
  }, [selectedYear]);
  const processSubmissionsData = async (rawSubmissions) => {
    if (!rawSubmissions || !Array.isArray(rawSubmissions)) return [];
    
    // For first few submissions, fetch detailed data
    const detailedSubmissions = await Promise.all(
      rawSubmissions.slice(0, Math.min(rawSubmissions.length, 10)).map(async (submission) => {
        try {
          // Fetch detailed data for each submission
          const detailResponse = await adminSubmissionAPI.getSubmissionDetails(
            submission.submission_id || submission.id
          );
          
          console.log(`Detail for submission ${submission.submission_id}:`, detailResponse);
          
          let processedSubmission = { ...submission };
          
          // Map publication details if exists
          if (detailResponse.details && detailResponse.details.data) {
            processedSubmission.PublicationRewardDetail = detailResponse.details.data;
          }
          
          // Ensure submission_users array exists
          if (detailResponse.submission_users && Array.isArray(detailResponse.submission_users)) {
            processedSubmission.submission_users = detailResponse.submission_users;
          }
          
          // Ensure documents array exists
          if (detailResponse.documents && Array.isArray(detailResponse.documents)) {
            processedSubmission.documents = detailResponse.documents;
          }
          
          // Extract main author from submission_users if available
          if (processedSubmission.submission_users && processedSubmission.submission_users.length > 0) {
            const mainAuthor = processedSubmission.submission_users.find(
              user => user.is_primary || user.role === 'owner'
            );
            if (mainAuthor && mainAuthor.user) {
              processedSubmission.User = mainAuthor.user;
            }
          }
          
          // Normalize status information
          if (detailResponse.submission && detailResponse.submission.status) {
            processedSubmission.status_id = detailResponse.submission.status.application_status_id || submission.status_id;
            processedSubmission.status_name = detailResponse.submission.status.status_name;
          } else if (submission.status) {
            processedSubmission.status_id = submission.status.application_status_id || submission.status_id;
            processedSubmission.status_name = submission.status.status_name;
          }
          
          return processedSubmission;
          
        } catch (error) {
          console.error(`Error fetching details for submission ${submission.submission_id}:`, error);
          // Return original submission if detail fetch fails
          return { ...submission };
        }
      })
    );
    
    // Process remaining submissions without detailed data
    const remainingSubmissions = rawSubmissions.slice(10).map(submission => {
      let processedSubmission = { ...submission };
      
      // Basic status processing for remaining items
      if (submission.status) {
        processedSubmission.status_id = submission.status.application_status_id || submission.status_id;
        processedSubmission.status_name = submission.status.status_name;
      }
      
      return processedSubmission;
    });
    
    const allProcessedSubmissions = [...detailedSubmissions, ...remainingSubmissions];
    
    // Add display fields for all submissions
    return allProcessedSubmissions.map(submission => {
      submission.display_title = getDisplayTitle(submission);
      submission.display_author = getDisplayAuthor(submission);
      submission.display_amount = getDisplayAmount(submission);
      submission.display_status = getDisplayStatus(submission);
      submission.display_type = getSubmissionTypeDisplay(submission);
      submission.display_date = submission.submitted_at || submission.created_at;
      return submission;
    });
  };

  // Helper function to get display title
  const getDisplayTitle = (submission) => {
    // First check if PublicationRewardDetail exists
    if (submission.PublicationRewardDetail) {
      return submission.PublicationRewardDetail.paper_title || 
             submission.PublicationRewardDetail.title_th || 
             submission.title || 
             'ไม่ระบุชื่อเรื่อง';
    }
    
    // Fallback for publication_reward type without details
    if (submission.submission_type === 'publication_reward') {
      return `รางวัลผลงานตีพิมพ์ - ${submission.submission_number || 'ไม่ระบุเลขที่'}`;
    }
    
    // General fallback
    return submission.title || submission.submission_number || 'ไม่ระบุชื่อเรื่อง';
  };

  // Helper function to get display author
  const getDisplayAuthor = (submission) => {
    // Check User field first
    if (submission.User) {
      const user = submission.User;
      const firstName = user.user_fname || user.first_name || user.full_name?.split(' ')[0] || '';
      const lastName = user.user_lname || user.last_name || user.full_name?.split(' ').slice(1).join(' ') || '';
      return `${firstName} ${lastName}`.trim() || user.email || 'ไม่ระบุผู้ใช้';
    }
    
    // Check submission_users array
    if (submission.submission_users && submission.submission_users.length > 0) {
      const mainAuthor = submission.submission_users.find(u => u.is_primary) || submission.submission_users[0];
      if (mainAuthor && mainAuthor.user) {
        const user = mainAuthor.user;
        const firstName = user.user_fname || user.first_name || '';
        const lastName = user.user_lname || user.last_name || '';
        return `${firstName} ${lastName}`.trim() || user.email || 'ไม่ระบุผู้ใช้';
      }
    }
    
    // Check if submission has direct user info
    if (submission.user_id) {
      return `User ID: ${submission.user_id}`;
    }
    
    return 'ไม่ระบุผู้ใช้';
  };

  // Helper function to get display amount
  const getDisplayAmount = (submission) => {
    // Check PublicationRewardDetail first
    if (submission.PublicationRewardDetail) {
      const detail = submission.PublicationRewardDetail;
      const totalAmount = detail.total_reward_amount || 
                         detail.total_amount || 
                         detail.net_amount || 
                         ((detail.publication_reward || detail.reward_amount || 0) + 
                          (detail.revision_fee || detail.editing_fee || 0) + 
                          (detail.publication_fee || detail.page_charge || 0) - 
                          (detail.external_funding_amount || detail.external_fund_amount || 0));
      
      return totalAmount || 0;
    }
    
    // Fallback to submission fields
    return submission.requested_amount || submission.amount || 0;
  };

  // Helper function to get display status
  const getDisplayStatus = (submission) => {
    if (submission.status_name) {
      return submission.status_name;
    }
    
    if (submission.status && submission.status.status_name) {
      return submission.status.status_name;
    }
    
    // Status mapping based on application_status table
    const statusMap = {
      1: 'รอพิจารณา',
      2: 'อนุมัติ', 
      3: 'ปฏิเสธ',
      4: 'ต้องการข้อมูลเพิ่มเติม',
      5: 'ร่าง'
    };
    
    return statusMap[submission.status_id] || 'ไม่ทราบสถานะ';
  };

  // Helper function to get submission type display
  const getSubmissionTypeDisplay = (submission) => {
    const typeMap = {
      'publication_reward': 'รางวัลผลงานตีพิมพ์',
      'fund_application': 'ขอทุนวิจัย',
      'promotion_fund': 'ทุนอุดหนุนกิจกรรม'
    };
    
    return typeMap[submission.submission_type] || submission.submission_type || 'ไม่ระบุประเภท';
  };

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
      console.log('Admin Submissions Response:', response);
      
      if (response.success || response.submissions) {
        const rawSubmissions = response.submissions || response.data || [];
        const processedSubmissions = await processSubmissionsData(rawSubmissions);
        
        console.log('Processed Submissions:', processedSubmissions);
        setSubmissions(processedSubmissions);
        
        // Handle pagination
        if (response.pagination) {
          setPagination({
            currentPage: response.pagination.current_page || 1,
            perPage: response.pagination.per_page || 20,
            totalCount: response.pagination.total_count || 0,
            totalPages: response.pagination.total_pages || 0
          });
        }
        
        // Handle statistics
        if (response.statistics) {
          setStatistics(response.statistics);
        } else {
          // Calculate statistics from submissions if not provided
          const stats = calculateStatistics(processedSubmissions);
          setStatistics(stats);
        }
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('ไม่สามารถดึงข้อมูลคำร้องได้');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics if not provided by API
  const calculateStatistics = (submissions) => {
    const stats = {
      total_submissions: submissions.length,
      pending_count: 0,    // status_id = 1 (รอพิจารณา)
      approved_count: 0,   // status_id = 2 (อนุมัติ)
      rejected_count: 0,   // status_id = 3 (ปฏิเสธ)  
      revision_count: 0    // status_id = 4 (ต้องการข้อมูลเพิ่มเติม)
      // status_id = 5 (ร่าง) - ไม่นับในสถิติหลัก
    };

    submissions.forEach(submission => {
      switch (submission.status_id) {
        case 1:
          stats.pending_count++;
          break;
        case 2:
          stats.approved_count++;
          break;
        case 3:
          stats.rejected_count++;
          break;
        case 4:
          stats.revision_count++;
          break;
        // case 5: draft - ไม่นับในสถิติ
      }
    });

    return stats;
  };

  // Fetch on mount and when filters/pagination change
  useEffect(() => {
    if (currentView === 'list') {
      fetchSubmissions();
    }
  }, [pagination.currentPage, filters]);

  // Get selected year info
  const getSelectedYearInfo = () => {
    if (!selectedYear) return { year: 'ทั้งหมด', budget: 0 };
    const yearInfo = years.find(y => y.year_id.toString() === selectedYear);
    return yearInfo || { year: selectedYear, budget: 0 };
  };

  // Handle year change
  const handleYearChange = (yearId) => {
    setSelectedYear(yearId);
    setPagination({ ...pagination, currentPage: 1 }); // Reset to first page
  };

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
      {/* Year Selection - Above Statistics */}
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
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ก่อนหน้า
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ถัดไป
              </button>
            </div>
            
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  แสดง{' '}
                  <span className="font-medium">
                    {((pagination.currentPage - 1) * pagination.perPage) + 1}
                  </span>{' '}
                  ถึง{' '}
                  <span className="font-medium">
                    {Math.min(pagination.currentPage * pagination.perPage, pagination.totalCount)}
                  </span>{' '}
                  จาก{' '}
                  <span className="font-medium">{pagination.totalCount}</span>{' '}
                  รายการ
                </p>
              </div>
              
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">หน้าก่อน</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    const isCurrentPage = pageNum === pagination.currentPage;
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          isCurrentPage
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage >= pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">หน้าถัดไป</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}