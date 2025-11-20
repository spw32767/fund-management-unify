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
import AdminPublicationsImport from "./components/settings/announcement_config/AdminPublicationsImport";
import AdminKkuPeopleScraper from "./components/settings/announcement_config/AdminKkuPeopleScraper";
import AdminScopusImport from "./components/settings/announcement_config/AdminScopusImport";
import ApprovalRecords from "./components/approves/ApprovalRecords";
import AdminNotificationCenter from "./components/notifications/NotificationCenter";

function AdminPageContent({ initialPage = 'dashboard' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const pathname = usePathname();

  const normalizePage = useCallback((page) => {
    const allowedPages = [
      'dashboard',
      'research-fund',
      'promotion-fund',
      'applications-list',
      'legacy-submissions',
      'fund-settings',
      'projects',
      'approval-records',
      'publications-import',
      'scopus-import',
      'kku-people-scraper',
      'notifications',
    ];

    return allowedPages.includes(page) ? page : 'dashboard';
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
    setCurrentPage(normalized);
    syncPathWithPage(normalized, { replace: true });
  }, [initialPage, normalizePage, syncPathWithPage]);

  useEffect(() => {
    const pageFromUrl = pageFromPath(pathname);
    setCurrentPage(pageFromUrl);
  }, [pageFromPath, pathname]);

  useEffect(() => {
    const handlePopState = () => {
      const pageFromUrl = pageFromPath(window.location.pathname);
      setCurrentPage(pageFromUrl);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pageFromPath]);

  const handleNavigate = (page) => {
    setCurrentPage(page);
    syncPathWithPage(page);
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardContent onNavigate={handleNavigate} />;
      case 'research-fund':
        return <ResearchFundContent onNavigate={handleNavigate} />;
      case 'promotion-fund':
        return <PromotionFundContent onNavigate={handleNavigate} />;
      case 'applications-list':
        return <SubmissionsManagement currentPage={handleNavigate} />;
      case 'legacy-submissions':
        return <LegacySubmissionManager />;
      case 'fund-settings':
        return <FundSettingsContent onNavigate={handleNavigate} />;
      case 'projects':
        return <ProjectsContent />;
      case 'approval-records':
        return <ApprovalRecords currentPage={handleNavigate} />;
      case 'publications-import':
        return <AdminPublicationsImport currentPage={handleNavigate} />;
      case 'scopus-import':
        return <AdminScopusImport />;
      case 'kku-people-scraper':
        return <AdminKkuPeopleScraper />;
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
        'legacy-submissions': 'จัดการคำร้อง (ข้อมูลเก่า)',
        'fund-settings': 'ตั้งค่าทุน',
        'projects': 'จัดการโครงการ',
        'approval-records': 'บันทึกข้อมูลการอนุมัติทุน',
        'publications-import': 'นำเข้าผลงานวิชาการ (Google Scholar)',
        'scopus-import': 'นำเข้าผลงานวิชาการ (Scopus)',
        'kku-people-scraper': 'KKU Profile Scraper',
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
        <div className="md:ml-64 flex-1 w-full">
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