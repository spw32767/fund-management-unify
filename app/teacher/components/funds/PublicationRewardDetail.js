"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  User, 
  BookOpen, 
  Award, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Eye,
  Edit,
  Trash2,
  Users,
  Link,
  Hash,
  Building,
  FileCheck
} from "lucide-react";
import { submissionAPI, submissionUsersAPI } from "@/app/lib/teacher_api";
import apiClient from "@/app/lib/api";
import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import StatusBadge from "../common/StatusBadge";
import { formatCurrency } from "@/app/utils/format";

const getStatusName = (statusId) => {
  const statuses = {
    1: 'รอพิจารณา',
    2: 'อนุมัติ',
    3: 'ไม่อนุมัติ',
    4: 'ต้องแก้ไข',
  };
  return statuses[statusId] || 'ไม่ทราบสถานะ';
};

const getStatusIcon = (statusId) => {
  switch (statusId) {
    case 2:
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 3:
      return <XCircle className="h-5 w-5 text-red-600" />;
    case 4:
      return <AlertCircle className="h-5 w-5 text-orange-600" />;
    default:
      return <Clock className="h-5 w-5 text-yellow-600" />;
  }
};

export default function PublicationRewardDetail({ submissionId, onNavigate }) {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  const getUserFullName = (user) => {
    if (!user) return "-";
    
    const firstName =
      user.user_fname ||
      user.first_name ||
      user.full_name?.split(" ")[0] ||
      user.fullname?.split(" ")[0] ||
      user.name?.split(" ")[0] ||
      "";
    const lastName =
      user.user_lname ||
      user.last_name ||
      user.full_name?.split(" ").slice(1).join(" ") ||
      user.fullname?.split(" ").slice(1).join(" ") ||
      user.name?.split(" ").slice(1).join(" ") ||
      "";

    const fullName = (user.full_name || user.fullname || `${firstName} ${lastName}`).trim();

    
    return fullName || "-";
  };

  const getUserEmail = (user) => {
    if (!user) return "";
    return user.email || "";
  };

  // Helper to get main author data
  const getMainAuthor = () => {
    if (!submission) return null;
    const directAuthor = submission.User || submission.user;
    const hasDirectData =
      directAuthor &&
      (directAuthor.user_id ||
        directAuthor.user_fname ||
        directAuthor.first_name ||
        directAuthor.full_name ||
        directAuthor.fullname ||
        directAuthor.name);
    if (hasDirectData) return directAuthor;
    const fromList = submission.submission_users?.find(
      (u) => u.is_primary || u.role === "owner" || u.role === "first_author"
    );
    return fromList?.User || fromList?.user || null;
  };

  useEffect(() => {
    if (submissionId) {
      loadSubmissionDetail();
    }
  }, [submissionId]);

  const loadSubmissionDetail = async () => {
    setLoading(true);
    try {
      // โหลด submission detail
      const response = await submissionAPI.getSubmission(submissionId);
      console.log('Submission Detail:', response);
      
       // เริ่มจากข้อมูล submission พื้นฐาน
      let submissionData = response.submission || response;

      // นำข้อมูล submission_users จาก response ถ้ามีมาใช้ก่อน
      if (response.submission_users && response.submission_users.length > 0) {
        submissionData.submission_users = response.submission_users;
      }
      
      // ถ้าผู้แต่งที่ได้มายังไม่มีข้อมูล User ให้โหลดแยก
      const needsUserData =
        !submissionData.submission_users ||
        submissionData.submission_users.some((u) => {
          const ud = u.User || u.user;
          if (!ud) return true;
          const idValid = ud.user_id && ud.user_id !== 0;
          const hasName =
            ud.user_fname ||
            ud.user_lname ||
            ud.first_name ||
            ud.last_name ||
            ud.full_name ||
            ud.fullname ||
            ud.name;
          return !idValid || !hasName;
        });

      if (needsUserData) {
        try {
          const usersResponse = await submissionUsersAPI.getUsers(submissionId);
          if (usersResponse && usersResponse.users) {
            submissionData.submission_users = usersResponse.users;
          }
        } catch (error) {
          console.log('Could not load submission users separately');
        }
      }
      
      setSubmission(submissionData);
    } catch (error) {
      console.error('Error loading submission detail:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleBack = () => {
    if (onNavigate) {
      onNavigate('applications');
    }
  };

  const handleEdit = () => {
    // Navigate to edit form
    if (onNavigate) {
      onNavigate('publication-reward-form', { submissionId });
    }
  };

  const handleView = async (fileId) => {
    try {
      const token = apiClient.getToken();
      const url = `${apiClient.baseURL}/files/managed/${fileId}/download`;
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('File not found');
      const blob = await response.blob();
      const fileURL = window.URL.createObjectURL(blob);
      window.open(fileURL, '_blank');
      window.URL.revokeObjectURL(fileURL);
    } catch (error) {
      console.error('Error viewing document:', error);
    }
  };

  const handleDownload = async (fileId, fileName = 'document') => {
    try {
      await apiClient.downloadFile(`/files/managed/${fileId}/download`, fileName);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  if (loading) {
    return (
      <PageLayout
        title="รายละเอียดคำร้อง"
        subtitle="กำลังโหลดข้อมูล..."
        icon={FileText}
      >
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!submission) {
    return (
      <PageLayout
        title="ไม่พบข้อมูล"
        subtitle="ไม่พบข้อมูลคำร้องที่ต้องการ"
        icon={AlertCircle}
      >
        <Card collapsible={false}>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">ไม่พบข้อมูลคำร้องที่ต้องการ</p>
            <button onClick={handleBack} className="btn btn-primary mt-4">
              กลับไปหน้ารายการ
            </button>
          </div>
        </Card>
      </PageLayout>
    );
  }

// Extract publication details
const pubDetail = submission.PublicationRewardDetail ||
                  submission.publication_reward_detail || {};

// Approved amount only appears for approved submissions
const approvedAmountRaw = pubDetail?.approved_amount;
const approvedAmount =
  approvedAmountRaw !== undefined && approvedAmountRaw !== null
    ? Number(approvedAmountRaw)
    : null;
const showApprovedColumn =
  submission.status_id === 2 &&
  approvedAmount !== null &&
  !Number.isNaN(approvedAmount);

// documents may come from different property names depending on the API response
const documents = submission.documents || submission.submission_documents || [];
  
  return (
    <PageLayout
      title={`เงินรางวัลตีพิมพ์ #${submission.submission_number}`}
      subtitle="รายละเอียดคำร้องขอเงินรางวัลการตีพิมพ์ผลงานวิชาการ"
      icon={Award}
      actions={
        <div className="flex gap-2">
          <button onClick={handleBack} className="btn btn-secondary">
            <ArrowLeft size={20} />
            กลับ
          </button>
          {submission.status_id === 5 && ( // Draft status
            <button onClick={handleEdit} className="btn btn-primary">
              <Edit size={20} />
              แก้ไข
            </button>
          )}
        </div>
      }
      breadcrumbs={[
        { label: "หน้าแรก", href: "/teacher" },
        { label: "คำร้องของฉัน", href: "#", onClick: handleBack },
        { label: submission.submission_number }
      ]}
    >
      {/* Status Summary Card */}
      <Card className="mb-6 border-l-4 border-blue-500" collapsible={false}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              {getStatusIcon(submission.status_id)}
              <h3 className="text-lg font-semibold">สถานะคำร้อง</h3>
              <div className="flex-shrink-0">
                <StatusBadge
                  status={submission.Status?.status_name}
                  statusId={submission.status_id}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
              <div>
                <span className="text-gray-500">วันที่สร้างคำร้อง:</span>
                <span className="ml-2 font-medium">
                  {new Date(submission.created_at).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              {submission.submitted_at && (
                <div>
                  <span className="text-gray-500">วันที่ส่งคำร้อง:</span>
                  <span className="ml-2 font-medium">
                    {new Date(submission.submitted_at).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}
              {submission.approved_at && (
                <div>
                  <span className="text-gray-500">วันที่อนุมัติ:</span>
                  <span className="ml-2 font-medium">
                    {new Date(submission.approved_at).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(pubDetail.reward_amount || 0)}
            </div>
            <div className="text-sm text-gray-500">จำนวนเงินที่ขอ</div>
            {showApprovedColumn && (
              <div className="mt-2">
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(approvedAmount)}
                </div>
                <div className="text-sm text-gray-500">จำนวนเงินที่อนุมัติ</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            รายละเอียดบทความ
          </button>
          <button
            onClick={() => setActiveTab('authors')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'authors'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ผู้แต่งร่วม
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            เอกสารแนบ
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ประวัติ
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Publication Information */}
          <Card title="ข้อมูลบทความ" icon={BookOpen} collapsible={false}>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">ชื่อบทความ</label>
                <p className="font-medium">{pubDetail.paper_title || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">ชื่อวารสาร</label>
                <p className="font-medium">{pubDetail.journal_name || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Volume/Issue</label>
                  <p className="font-medium">{pubDetail.volume_issue || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">หน้า</label>
                  <p className="font-medium">{pubDetail.page_numbers || '-'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">วันที่ตีพิมพ์</label>
                <p className="font-medium">
                  {pubDetail.publication_date 
                    ? new Date(pubDetail.publication_date).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">DOI</label>
                <p className="font-medium">
                  {pubDetail.doi ? (
                    <a href={`https://doi.org/${pubDetail.doi}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-blue-600 hover:underline flex items-center gap-1">
                      {pubDetail.doi}
                      <Link size={14} />
                    </a>
                  ) : '-'}
                </p>
              </div>
            </div>
          </Card>

          {/* Journal Quality */}
          <Card title="คุณภาพวารสาร" icon={Award} collapsible={false}>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Quartile</label>
                <div className="mt-1">
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium
                    ${pubDetail.quartile === 'Q1' ? 'bg-green-100 text-green-800' :
                      pubDetail.quartile === 'Q2' ? 'bg-blue-100 text-blue-800' :
                      pubDetail.quartile === 'Q3' ? 'bg-yellow-100 text-yellow-800' :
                      pubDetail.quartile === 'Q4' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'}`}>
                    {pubDetail.quartile || 'N/A'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Impact Factor</label>
                <p className="font-medium text-lg">{pubDetail.impact_factor || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">การ Index</label>
                <p className="font-medium">{pubDetail.indexing || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">ประเภทการตีพิมพ์</label>
                <p className="font-medium">{pubDetail.publication_type || 'journal'}</p>
              </div>
            </div>
          </Card>

          {/* Financial Information */}
          <Card title="ข้อมูลการเงิน" icon={DollarSign} collapsible={false}>
            <div className="space-y-4">
              {/* Column headers */}
              <div
                className={`grid ${showApprovedColumn ? "grid-cols-3" : "grid-cols-2"} pb-2 border-b text-sm text-gray-600`}
              >
                <div></div>
                <div className="text-right">จำนวนที่ขอ</div>
                {showApprovedColumn && (
                  <div className="text-right">จำนวนที่อนุมัติ</div>
                )}
              </div>

              {/* Requested reward */}
              <div
                className={`grid ${showApprovedColumn ? "grid-cols-3" : "grid-cols-2"} items-center`}
              >
                <span className="text-gray-600">เงินรางวัลที่ขอ</span>
                <span className="text-right font-semibold">
                  {formatCurrency(pubDetail.reward_amount || 0)}
                </span>
                {showApprovedColumn && <span></span>}
              </div>
              
              {/* Revision fee */}
              {pubDetail.revision_fee > 0 && (
                <div
                  className={`grid ${showApprovedColumn ? "grid-cols-3" : "grid-cols-2"} items-center`}
                >
                  <span className="text-gray-600">ค่าปรับปรุง</span>
                  <span className="text-right">
                    {formatCurrency(pubDetail.revision_fee)}
                  </span>
                  {showApprovedColumn && <span></span>}
                </div>
              )}
              
              {/* Publication fee */}
              {pubDetail.publication_fee > 0 && (
                <div
                  className={`grid ${showApprovedColumn ? "grid-cols-3" : "grid-cols-2"} items-center`}
                >
                  <span className="text-gray-600">ค่าตีพิมพ์</span>
                  <span className="text-right">
                    {formatCurrency(pubDetail.publication_fee)}
                  </span>
                  {showApprovedColumn && <span></span>}
                </div>
              )}
              
              {/* External funding */}
              {pubDetail.external_funding_amount > 0 && (
                <div
                  className={`grid ${showApprovedColumn ? "grid-cols-3" : "grid-cols-2"} items-center`}
                >
                  <span className="text-gray-600">เงินสนับสนุนจากภายนอก</span>
                  <span className="text-right text-red-600">
                    {formatCurrency(-pubDetail.external_funding_amount)}
                  </span>
                  {showApprovedColumn && <span></span>}
                </div>
              )}

              {/* Total */}
              <div
                className={`grid ${showApprovedColumn ? "grid-cols-3" : "grid-cols-2"} items-center pt-2 border-t`}
              >
                <span className="font-medium">ยอดรวมสุทธิ</span>
                <span className="text-right font-bold text-blue-600">
                  {formatCurrency(
                    pubDetail.total_amount || pubDetail.reward_amount || 0
                  )}
                </span>
                {showApprovedColumn && (
                  <span className="text-right font-bold text-green-600">
                    {formatCurrency(approvedAmount)}
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Additional Information */}
          <Card title="ข้อมูลเพิ่มเติม" icon={FileCheck} collapsible={false}>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">สถานะผู้แต่ง</label>
                <p className="font-medium">
                  {pubDetail.author_type === 'first_author' ? 'ผู้แต่งหลัก' :
                   pubDetail.author_type === 'corresponding_author' ? 'Corresponding Author' :
                   pubDetail.author_type === 'coauthor' ? 'ผู้แต่งร่วม' : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">จำนวนผู้แต่ง</label>
                <p className="font-medium">{pubDetail.author_count || 1} คน</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">ได้รับทุนสนับสนุนจากมหาวิทยาลัย</label>
                <p className="font-medium">
                  {pubDetail.has_university_funding === 'yes' ? 'ใช่' : 'ไม่ใช่'}
                </p>
              </div>
              {pubDetail.funding_references && (
                <div>
                  <label className="text-sm text-gray-500">หมายเลขอ้างอิงทุน</label>
                  <p className="font-medium">{pubDetail.funding_references}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Authors Tab */}
      {activeTab === 'authors' && (
        <Card title="รายชื่อผู้แต่ง" icon={Users} collapsible={false}>
          <div className="space-y-6">
            {/* แสดงผู้แต่งหลัก */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">ผู้แต่งหลัก (เจ้าของผลงาน)</h4>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {getUserFullName(getMainAuthor())}
                    </div>
                    <div className="text-sm text-gray-500">
                      {getUserEmail(getMainAuthor())}
                    </div>
                  </div>
                  <span className="ml-auto px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    เจ้าของผลงาน
                  </span>
                </div>
              </div>
            </div>

            {/* แสดงผู้แต่งร่วม */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                ผู้แต่งร่วม {submission.submission_users && submission.submission_users.filter(u => u.role === 'coauthor' || u.role === 'co_author').length > 0 && 
                `(${submission.submission_users.filter(u => u.role === 'coauthor' || u.role === 'co_author').length} คน)`}
              </h4>
              
              {submission.submission_users && submission.submission_users.filter(u => u.role === 'coauthor' || u.role === 'co_author').length > 0 ? (
                <div className="space-y-2">
                  {submission.submission_users
                    .filter(user => user.role === 'coauthor' || user.role === 'co_author')
                    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                    .map((submissionUser, index) => {
                      const userData = submissionUser.user || submissionUser.User;
                      
                      return (
                        <div key={submissionUser.user_id || index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-500 w-8">
                              {index + 1}.
                            </span>
                            <div className="flex-1 ml-3">
                              <div className="font-medium text-gray-900">
                                {getUserFullName(userData)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {getUserEmail(userData)}
                              </div>
                            </div>
                            <span className="ml-auto px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                              ผู้แต่งร่วม
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">ไม่มีข้อมูลผู้แต่งร่วม</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card title="เอกสารแนบ" icon={FileText} collapsible={false}>
          <div className="space-y-4">
            {documents.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {documents.map((doc, index) => {
                  const fileId = doc.file_id || doc.File?.file_id || doc.file?.file_id;
                  const docName = doc.File?.original_name || doc.file?.original_name || doc.original_filename || doc.file_name || doc.name || `เอกสารที่ ${index + 1}`;
                  return (
                    <li key={doc.document_id || fileId || index} className="py-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-sm text-gray-700">{docName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(fileId)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md"
                        >
                          <Eye className="h-4 w-4" />
                          ดู
                        </button>
                        <button
                          onClick={() => handleDownload(fileId, docName)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-md"
                        >
                          <Download className="h-4 w-4" />
                          ดาวน์โหลด
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-center text-gray-500 py-8">ไม่มีเอกสารแนบ</p>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card title="ประวัติการดำเนินการ" icon={Clock} collapsible={false}>
          <div className="space-y-4">
            <div className="flow-root">
              {/* Using positive margin to ensure the timeline container grows with content */}
              <ul className="mb-8">
                {/* Created */}
                <li>
                  <div className="relative pb-8">
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></span>
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-white" />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          สร้างคำร้อง
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(submission.created_at).toLocaleString('th-TH')}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>

                {/* Submitted */}
                {submission.submitted_at && (
                  <li>
                    <div className="relative pb-8">
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></span>
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            ส่งคำร้อง
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(submission.submitted_at).toLocaleString('th-TH')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                )}

                {/* Status updates after submission */}
                {submission.status_id !== 1 && submission.status_id !== 5 && (
                  <li>
                    <div className="relative">
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            submission.status_id === 2
                              ? 'bg-green-500'
                              : submission.status_id === 3
                              ? 'bg-red-500'
                              : 'bg-orange-500'
                          }`}>
                            {getStatusIcon(submission.status_id)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            {getStatusName(submission.status_id)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(submission.approved_at || submission.updated_at).toLocaleString('th-TH')}
                          </p>
                          {pubDetail.approval_comment && submission.status_id === 2 && (
                            <p className="text-sm text-gray-600 mt-1">
                              หมายเหตุ: {pubDetail.approval_comment}
                            </p>
                          )}
                          {(pubDetail.reject_reason || pubDetail.rejection_reason) &&
                            submission.status_id === 3 && (
                              <p className="text-sm text-gray-600 mt-1">
                                เหตุผลที่ไม่อนุมัติ: {pubDetail.reject_reason ||
                                  pubDetail.rejection_reason}
                              </p>
                            )}
                        </div>
                      </div>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </PageLayout>
  );
}