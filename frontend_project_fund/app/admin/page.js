// app/admin/page.js - Admin Dashboard

"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AuthGuard from "../components/AuthGuard";
import Header from "./components/layout/Header";
import Navigation from "./components/layout/Navigation";
import DashboardContent from "./components/dashboard/DashboardContent";
import ResearchFundContent from "./components/funds/ResearchFundContent";
import PromotionFundContent from "./components/funds/PromotionFundContent";
import FundSettingsContent from "./components/settings";
import ProjectsContent from "./components/projects/ProjectsContent";
import UnderDevelopmentContent from "./components/common/UnderDevelopmentContent";
import SubmissionsManagement from "./components/submissions/SubmissionsManagement";
import LegacySubmissionManager from "./components/submissions/legacy/LegacySubmissionManager";
import AdminAcademicImports from "./components/settings/announcement_config/AdminAcademicImports";
import AdminScopusResearchSearch from "./components/research/AdminScopusResearchSearch";
import ApprovalRecords from "./components/approves/ApprovalRecords";
import AdminNotificationCenter from "./components/notifications/NotificationCenter";
import AdminImportExportPage from "./components/import-export/AdminImportExportPage";
import GenericFundApplicationForm from "../member/components/applications/GenericFundApplicationForm";
import PublicationRewardForm from "../member/components/applications/PublicationRewardForm";

const IMPORT_TAB_MAP = {
  'publications-import': 'scholar',
  'scopus-import': 'scopus',
  'kku-people-scraper': 'kku-profile',
};

function AdminPageContent({ initialPage = 'dashboard' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [importTab, setImportTab] = useState('scholar');
  const [selectedFundData, setSelectedFundData] = useState(null);
  const [currentMode, setCurrentMode] = useState(null);
  const pathname = usePathname();

  const normalizePage = useCallback((page) => {
    const canonicalPage = IMPORT_TAB_MAP[page] ? 'academic-imports' : page;
    const allowedPages = [
      'dashboard',
      'research-fund',
      'promotion-fund',
      'applications-list',
      'scopus-research-search',
      'legacy-submissions',
      'fund-settings',
      'projects',
      'approval-records',
      'academic-imports',
      'import-export',
      'notifications',
      'generic-fund-application',
      'publication-reward-form',
    ];

    return allowedPages.includes(canonicalPage) ? canonicalPage : 'dashboard';
  }, []);

  const pageFromPath = useCallback(
    (path) => {
      if (typeof path !== 'string') return 'dashboard';

      const segments = path.split('/').filter(Boolean);

      if (segments[0] !== 'admin') return 'dashboard';
      return normalizePage(segments[1] || 'dashboard');
    },
    [normalizePage]
  );

  const syncPathWithPage = useCallback(
    (page, { replace = false } = {}) => {
      if (typeof window === 'undefined') return;

      const normalized = normalizePage(page);
      const targetPath = `/admin/${normalized}`;

      if (window.location.pathname === targetPath) return;

      const method = replace ? 'replaceState' : 'pushState';
      window.history[method]({ page: normalized }, '', targetPath);
    },
    [normalizePage]
  );

  useEffect(() => {
    const normalized = normalizePage(initialPage);
    const initialTab = IMPORT_TAB_MAP[initialPage];

    if (normalized === 'academic-imports' && initialTab) {
      setImportTab(initialTab);
    }

    setCurrentPage(normalized);
    syncPathWithPage(normalized, { replace: true });
  }, [initialPage, normalizePage, syncPathWithPage]);

  useEffect(() => {
    const pageFromUrl = pageFromPath(pathname);
    const normalized = normalizePage(pageFromUrl);
    const initialTab = IMPORT_TAB_MAP[pageFromUrl];

    if (normalized === 'academic-imports' && initialTab) {
      setImportTab(initialTab);
    }

    setCurrentPage(normalized);
  }, [normalizePage, pageFromPath, pathname]);

  useEffect(() => {
    const handlePopState = () => {
      const pageFromUrl = pageFromPath(window.location.pathname);
      const normalized = normalizePage(pageFromUrl);
      const initialTab = IMPORT_TAB_MAP[pageFromUrl];

      if (normalized === 'academic-imports' && initialTab) {
        setImportTab(initialTab);
      }

      setCurrentPage(normalized);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [normalizePage, pageFromPath]);

  const handleNavigate = (page, data = null, options = {}) => {
    const normalized = normalizePage(page);

    if (normalized === 'academic-imports' && IMPORT_TAB_MAP[page]) {
      setImportTab(IMPORT_TAB_MAP[page]);
    }

    const nextMode = options.mode ?? null;
    setCurrentMode(nextMode);
    setCurrentPage(normalized);
    syncPathWithPage(normalized);

    if (data) {
      setSelectedFundData(data);
      try {
        window.sessionStorage.setItem('admin_selected_fund', JSON.stringify(data));
      } catch (err) {
        console.warn('Unable to persist selected fund data:', err);
      }
    } else if (!['generic-fund-application', 'publication-reward-form'].includes(normalized)) {
      setSelectedFundData(null);
      try {
        window.sessionStorage.removeItem('admin_selected_fund');
      } catch {}
    }
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardContent onNavigate={handleNavigate} />;
      case 'research-fund':
        return <ResearchFundContent onNavigate={handleNavigate} />;
      case 'promotion-fund':
        return <PromotionFundContent onNavigate={handleNavigate} />;
      case 'generic-fund-application':
        return (
          <GenericFundApplicationForm
            onNavigate={handleNavigate}
            subcategoryData={selectedFundData}
            readOnly
          />
        );
      case 'publication-reward-form':
        return (
          <PublicationRewardForm
            onNavigate={handleNavigate}
            categoryId={selectedFundData?.category_id}
            yearId={selectedFundData?.year_id}
            submissionId={selectedFundData?.submissionId}
            originPage={selectedFundData?.originPage}
            mode={currentMode}
            readOnly
          />
        );
      case 'applications-list':
        return <SubmissionsManagement currentPage={handleNavigate} />;
      case 'scopus-research-search':
        return <AdminScopusResearchSearch onNavigate={handleNavigate} />;
      case 'legacy-submissions':
        return <LegacySubmissionManager />;
      case 'fund-settings':
        return <FundSettingsContent onNavigate={handleNavigate} />;
      case 'projects':
        return <ProjectsContent />;
      case 'approval-records':
        return <ApprovalRecords currentPage={handleNavigate} />;
      case 'import-export':
        return <AdminImportExportPage />;
      case 'academic-imports':
        return <AdminAcademicImports initialTab={importTab} />;
      case 'notifications':
        return <AdminNotificationCenter />;
      default:
        return <UnderDevelopmentContent currentPage={currentPage} />;
    }
  };

  const getPageTitle = () => {
      const titles = {
        'dashboard': 'แดชบอร์ดผู้ดูแลระบบ',
        'research-fund': 'ทุนส่งเสริมงานวิจัย',
        'promotion-fund': 'ทุนอุดหนุนกิจกรรม',
        'applications-list': 'รายการการขอทุน',
        'scopus-research-search': 'ค้นหางานวิจัย',
        'legacy-submissions': 'จัดการคำร้อง (ข้อมูลเก่า)',
        'fund-settings': 'ตั้งค่าทุน',
        'projects': 'จัดการโครงการ',
        'approval-records': 'บันทึกข้อมูลการอนุมัติทุน',
        'import-export': 'นำเข้า / ส่งออก',
        'academic-imports': 'ข้อมูลผลงานวิชาการ / Academic Data Import',
        'scopus-research-search': 'ค้นหางานวิจัย',
        'notifications': 'การแจ้งเตือน'
    };
    return titles[currentPage] || currentPage;
  };

  const navigationMenu = (
    <Navigation
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      handleNavigate={handleNavigate}
      submenuOpen={submenuOpen}
      setSubmenuOpen={setSubmenuOpen}
    />
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        currentPageTitle={getPageTitle()}
        Navigation={navigationMenu}
      />

      <div className="flex min-h-[calc(100vh-5rem)] mt-24 sm:mt-20">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 bg-white border-r border-gray-300 fixed h-[calc(100vh-5rem)] overflow-y-auto shadow-sm">
          <div className="p-5">
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                เมนูหลัก
              </h2>
            </div>
            <Navigation
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              handleNavigate={handleNavigate}
              submenuOpen={submenuOpen}
              setSubmenuOpen={setSubmenuOpen}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="md:ml-64 flex-1 min-w-0 overflow-x-auto">
          {/* Page Content */}
          <div className="px-4 pb-8 pt-4 sm:px-6 lg:px-8">
            {renderPageContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

export { AdminPageContent };

export default function AdminPage() {
  return (
    <AuthGuard 
      allowedRoles={[3, 'admin']}
      requireAuth={true}
    >
      <AdminPageContent />
    </AuthGuard>
  );
}