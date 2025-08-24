'use client';

import { useState, useEffect } from 'react';
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
  Users,
  Link,
  Hash,
  Building,
  FileCheck,
  Check,
  X as XIcon
} from 'lucide-react';
import { adminSubmissionAPI } from '../../../lib/admin_submission_api';
import PageLayout from '../common/PageLayout';
import Card from '../common/Card';
import ApprovalModal from './ApprovalModal';
import { toast } from 'react-hot-toast';

// Status Badge Component
const StatusBadge = ({ status }) => {
  const getStatusConfig = (statusId) => {
    switch (statusId) {
      case 1:
        return { label: 'รอพิจารณา', className: 'bg-yellow-100 text-yellow-800' };
      case 2:
        return { label: 'อนุมัติ', className: 'bg-green-100 text-green-800' };
      case 3:
        return { label: 'ไม่อนุมัติ', className: 'bg-red-100 text-red-800' };
      case 4:
        return { label: 'ต้องแก้ไข', className: 'bg-orange-100 text-orange-800' };
      default:
        return { label: 'ไม่ทราบสถานะ', className: 'bg-gray-100 text-gray-800' };
    }
  };

  const config = getStatusConfig(status);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

// Format helper functions
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatCurrency = (amount) => {
  if (!amount) return '0';
  return Number(amount).toLocaleString();
};

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

export default function SubmissionDetails({ submissionId, onBack }) {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);

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
      fetchSubmissionDetails();
    }
  }, [submissionId]);

  const fetchSubmissionDetails = async () => {
    setLoading(true);
    try {
      const response = await adminSubmissionAPI.getSubmissionDetails(submissionId);
      console.log('Submission Detail:', response);
      
      let submissionData = response.submission || response;

      // นำข้อมูล submission_users จาก response ถ้ามีมาใช้ก่อน
      if (response.submission_users && response.submission_users.length > 0) {
        submissionData.submission_users = response.submission_users;
      }

      // นำข้อมูล documents จาก response ถ้ามี
      if (response.documents && response.documents.length > 0) {
        submissionData.documents = response.documents;
      }

      // Map publication details from response.details.data if available
      if (response.details && response.details.data) {
        submissionData.PublicationRewardDetail = response.details.data;
        console.log('Mapped Publication Detail:', submissionData.PublicationRewardDetail);
      }

      // Also check if details is directly under submission
      if (submissionData.details && submissionData.details.data) {
        submissionData.PublicationRewardDetail = submissionData.details.data;
        console.log('Found Publication Detail in submission.details:', submissionData.PublicationRewardDetail);
      }

      setSubmission(submissionData);
    } catch (error) {
      console.error('Error fetching submission details:', error);
      toast.error('ไม่สามารถดึงข้อมูลคำร้องได้');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  // Handle approval actions
  const handleAction = (action) => {
    setModalAction(action);
    setShowApprovalModal(true);
  };

  const handleModalClose = () => {
    setShowApprovalModal(false);
    setModalAction(null);
  };

  const handleActionSuccess = () => {
    handleModalClose();
    fetchSubmissionDetails(); // Refresh data
    toast.success('ดำเนินการสำเร็จ');
  };

  // Handle document viewing/downloading
  const handleViewDocument = async (fileId, fileName = 'document') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/files/managed/${fileId}/view`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('File not found');
      const blob = await response.blob();
      const fileURL = window.URL.createObjectURL(blob);
      window.open(fileURL, '_blank');
      window.URL.revokeObjectURL(fileURL);
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('ไม่สามารถเปิดเอกสารได้');
    }
  };

  const handleDownload = async (fileId, fileName = 'document') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/files/managed/${fileId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('File not found');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('ไม่สามารถดาวน์โหลดเอกสารได้');
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
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

  // Extract publication details - Updated to handle the actual API response structure
  const pubDetail = submission.PublicationRewardDetail || 
                    submission.publication_reward_detail || 
                    (submission.details && submission.details.data) ||
                    {};

  // Normalize approved amount from possible field names
  const approvedAmount =
    pubDetail.approved_amount ??
    pubDetail.reward_approve_amount ??
    null;

  const mainAuthor = getMainAuthor();

  return (
    <PageLayout
      title={`คำร้องเลขที่ ${submission.submission_number || submission.id}`}
      subtitle={`ยื่นเมื่อ ${submission.submitted_at ? formatDate(submission.submitted_at) : formatDate(submission.created_at)}`}
      icon={FileText}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/admin" },
        { label: "จัดการคำร้อง", onClick: handleBack },
        { label: "รายละเอียด" }
      ]}
      actions={
        <div className="flex space-x-3">
          {submission.status_id === 1 && (
            <>
              <button
                onClick={() => handleAction('approve')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Check className="h-4 w-4 mr-2" />
                อนุมัติ
              </button>
              <button
                onClick={() => handleAction('reject')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <XIcon className="h-4 w-4 mr-2" />
                ไม่อนุมัติ
              </button>
              <button
                onClick={() => handleAction('revision')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                ขอแก้ไข
              </button>
            </>
          )}
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับ
          </button>
        </div>
      }
    >
          <div className="space-y-6">
        {/* Status Card */}
        <Card title="สถานะคำร้อง" icon={Clock} collapsible={false}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(submission.status_id)}
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {getStatusName(submission.status_id)}
                </p>
                <p className="text-sm text-gray-500">
                  อัปเดตล่าสุด: {submission.updated_at ? formatDate(submission.updated_at) : formatDate(submission.created_at)}
                </p>
              </div>
            </div>
            <StatusBadge status={submission.status_id} />
          </div>

          {submission.admin_comment && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">ความเห็นจากผู้ดูแลระบบ</h4>
              <p className="text-sm text-gray-700">{submission.admin_comment}</p>
            </div>
          )}
        </Card>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'details', label: 'รายละเอียดงานวิจัย', icon: BookOpen },
              { id: 'users', label: 'ข้อมูลผู้ยื่นคำร้อง', icon: Users },
              { id: 'documents', label: 'เอกสารแนบ', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Publication Details */}
            <Card title="ข้อมูลงานตีพิมพ์" icon={BookOpen} collapsible={false}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">ชื่อบทความ</label>
                  <p className="font-medium">{pubDetail.paper_title || pubDetail.title_th || submission.title || '-'}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-500">ชื่อบทความ (ภาษาอังกฤษ)</label>
                  <p className="font-medium">{pubDetail.paper_title_en || pubDetail.title_en || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">ชื่อวารสาร</label>
                    <p className="font-medium">{pubDetail.journal_name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Quartile</label>
                    <p className="font-medium">
                      {pubDetail.journal_quartile ? `Q${pubDetail.journal_quartile}` : (pubDetail.quartile ? `Q${pubDetail.quartile}` : '-')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">วันที่ตีพิมพ์</label>
                    <p className="font-medium">
                      {pubDetail.publication_date ? formatDate(pubDetail.publication_date) : 
                       pubDetail.publication_year ? pubDetail.publication_year : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">เล่มที่</label>
                    <p className="font-medium">{pubDetail.volume || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">ฉบับที่</label>
                    <p className="font-medium">{pubDetail.issue || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">หน้า</label>
                    <p className="font-medium">{pubDetail.pages || pubDetail.page_numbers || '-'}</p>
                  </div>
                </div>

                {(pubDetail.doi || pubDetail.doi_url) && (
                  <div>
                    <label className="text-sm text-gray-500">DOI</label>
                    <p className="font-medium break-all">{pubDetail.doi || pubDetail.doi_url}</p>
                  </div>
                )}

                {(pubDetail.database_name || pubDetail.database) && (
                  <div>
                    <label className="text-sm text-gray-500">ฐานข้อมูล</label>
                    <p className="font-medium">{pubDetail.database_name || pubDetail.database}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Financial Summary */}
            <Card title="สรุปการเงิน" icon={DollarSign} collapsible={false}>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">เงินรางวัล</span>
                  <span className="font-semibold text-lg">
                    ฿{formatCurrency(pubDetail.publication_reward || pubDetail.reward_amount || 0)}
                  </span>
                </div>
                {(pubDetail.revision_fee > 0 || pubDetail.editing_fee > 0) && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">ค่าปรับปรุง</span>
                    <span>฿{formatCurrency(pubDetail.revision_fee || pubDetail.editing_fee || 0)}</span>
                  </div>
                )}
                {(pubDetail.publication_fee > 0 || pubDetail.page_charge > 0) && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">ค่าตีพิมพ์</span>
                    <span>฿{formatCurrency(pubDetail.publication_fee || pubDetail.page_charge || 0)}</span>
                  </div>
                )}
                {(pubDetail.external_funding_amount > 0 || pubDetail.external_fund_amount > 0) && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">เงินสนับสนุนจากภายนอก</span>
                    <span className="text-red-600">
                      -฿{formatCurrency(pubDetail.external_funding_amount || pubDetail.external_fund_amount || 0)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-medium">ยอดรวมสุทธิ</span>
                  <span className="font-bold text-xl text-blue-600">
                    ฿{formatCurrency(pubDetail.total_reward_amount || pubDetail.total_amount || pubDetail.net_amount || 
                      ((pubDetail.publication_reward || pubDetail.reward_amount || 0) + 
                       (pubDetail.revision_fee || pubDetail.editing_fee || 0) + 
                       (pubDetail.publication_fee || pubDetail.page_charge || 0) - 
                       (pubDetail.external_funding_amount || pubDetail.external_fund_amount || 0)))}
                  </span>
                </div>
                {submission.status_id === 2 && approvedAmount && (
                  <div className="flex justify-between items-center pt-2 border-t bg-green-50 -mx-4 px-4 py-2">
                    <span className="font-medium text-green-800">จำนวนที่อนุมัติ</span>
                    <span className="font-bold text-xl text-green-600">
                      ฿{formatCurrency(approvedAmount)}
                    </span>
                  </div>
                )}
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
                     pubDetail.author_type === 'coauthor' ? 'ผู้แต่งร่วม' :
                     pubDetail.author_type || '-'}
                  </p>
                </div>

                {pubDetail.external_funding_info && (
                  <div>
                    <label className="text-sm text-gray-500">ข้อมูลทุนสนับสนุน</label>
                    <p className="font-medium">{pubDetail.external_funding_info}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm text-gray-500">วันที่ยื่นคำร้อง</label>
                  <p className="font-medium">
                    {submission.submitted_at ? formatDate(submission.submitted_at) : formatDate(submission.created_at)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'users' && (
          <Card title="ข้อมูลผู้ยื่นคำร้อง" icon={Users} collapsible={false}>
            {mainAuthor && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">ชื่อ-นามสกุล</label>
                  <p className="font-medium">{getUserFullName(mainAuthor)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">อีเมล</label>
                  <p className="font-medium">{getUserEmail(mainAuthor)}</p>
                </div>
                {mainAuthor.department && (
                  <div>
                    <label className="text-sm text-gray-500">หน่วยงาน</label>
                    <p className="font-medium">{mainAuthor.department}</p>
                  </div>
                )}
              </div>
            )}

            {submission.submission_users && submission.submission_users.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-4">ผู้แต่งร่วมทั้งหมด</h4>
                <div className="space-y-3">
                  {submission.submission_users.map((submissionUser, index) => {
                    const user = submissionUser.User || submissionUser.user || submissionUser;
                    return (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{getUserFullName(user)}</p>
                          <p className="text-sm text-gray-600">{getUserEmail(user)}</p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {submissionUser.is_primary ? 'ผู้แต่งหลัก' : 'ผู้แต่งร่วม'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'documents' && (
          <Card title="เอกสารแนบ" icon={FileText} collapsible={false}>
            {submission.documents && submission.documents.length > 0 ? (
              <div className="space-y-4">
                {submission.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-medium">
                          {doc.file?.original_name || doc.file_name || doc.description || `เอกสาร ${index + 1}`}
                        </p>
                        <p className="text-sm text-gray-600">
                          {doc.file?.file_size && `${(doc.file.file_size / 1024 / 1024).toFixed(2)} MB`}
                          {doc.file?.mime_type && ` • ${doc.file.mime_type}`}
                        </p>
                        {doc.description && doc.description !== doc.file?.original_name && (
                          <p className="text-xs text-gray-500">{doc.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDocument(doc.file_id || doc.file?.file_id, doc.file?.original_name || doc.file_name)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="ดูเอกสาร"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc.file_id || doc.file?.file_id, doc.file?.original_name || doc.file_name)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                        title="ดาวน์โหลด"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">ไม่มีเอกสารแนบ</p>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <ApprovalModal
          submission={submission}
          action={modalAction}
          onClose={handleModalClose}
          onSuccess={handleActionSuccess}
        />
      )}
    </PageLayout>
  );
}