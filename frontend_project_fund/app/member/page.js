// teacher/page.js - Teacher Dashboard

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import AuthGuard from "../components/AuthGuard";
import Header from "./components/layout/Header";
import Navigation from "./components/layout/Navigation";
import DashboardContent from "./components/dashboard/DashboardContent";
import ResearchFundContent from "./components/funds/ResearchFundContent";
import ApplicationList from "./components/applications/ApplicationList";
import UnderDevelopmentContent from "./components/common/UnderDevelopmentContent";
import PromotionFundContent from "./components/funds/PromotionFundContent";
import PublicationRewardForm from "./components/applications/PublicationRewardForm";
import UserProfile from "./components/profile/UserProfile";
import PublicationRewardDetail from "./components/funds/PublicationRewardDetail";
import FundApplicationDetail from "./components/funds/FundApplicationDetail";
import AnnouncementPage from "./components/announcements/AnnouncementPage";
import GenericFundApplicationForm from "./components/applications/GenericFundApplicationForm";
import ReceivedFundsList from "./components/funds/ReceivedFundsList";
import NotificationCenter from "./components/notifications/NotificationCenter";
import DeptHeadReview from "./components/dept/DeptHeadReview";
import { useAuth } from "../contexts/AuthContext";
import ProjectsList from "./components/projects/ProjectsList";


export function MemberPageContent({ initialPage = 'profile', initialMode = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [selectedFundData, setSelectedFundData] = useState(null);
  const [currentMode, setCurrentMode] = useState(initialMode ?? null);
  const { user } = useAuth();
  const pathname = usePathname();

  const FUND_STORAGE_KEY = "member_selected_fund";

  const normalizePage = useCallback((page) => {
    const allowedPages = [
      'dashboard',
      'profile',
      'research-fund',
      'promotion-fund',
      'applications',
      'received-funds',
      'application-form',
      'publication-reward-form',
      'generic-fund-application',
      'fund-application-detail',
      'publication-reward-detail',
      'announcements',
      'notifications',
      'projects',
      'dept-review',
    ];

    return allowedPages.includes(page) ? page : 'profile';
  }, []);

  const pageFromPath = useCallback(
    (path) => {
      if (typeof path !== 'string') return { page: 'profile', mode: null };
      const segments = path.split('/').filter(Boolean);

      if (segments[0] !== 'member') return { page: 'profile', mode: null };

      const page = normalizePage(segments[1] || 'profile');
      const mode = segments[2] || null;

      return { page, mode };
    },
    [normalizePage]
  );

  const syncPathWithPage = useCallback(
    (page, { mode = null, replace = false } = {}) => {
      if (typeof window === 'undefined') return;

      const normalized = normalizePage(page);
      const modeSegment = mode ? `/${mode}` : '';
      const targetPath = `/member/${normalized}${modeSegment}`;

      if (window.location.pathname === targetPath) return;

      const method = replace ? 'replaceState' : 'pushState';
      window.history[method]({ page: normalized }, '', targetPath);
    },
    [normalizePage]
  );

  const isDeptHead = useMemo(() => {
    if (!user) return false;
    return (
      user.role === 'dept_head' ||
      user.user_role === 'dept_head' ||
      user.role_id === 4
    );
  }, [user]);

  useEffect(() => {
    const normalized = normalizePage(initialPage);
    setCurrentPage(normalized);
    setCurrentMode(initialMode ?? null);
    setSelectedFundData(null);
    syncPathWithPage(normalized, { mode: initialMode ?? null, replace: true });
  }, [initialMode, initialPage, normalizePage, syncPathWithPage]);

  useEffect(() => {
    if (isDeptHead && initialPage === 'profile') {
      setCurrentPage('dept-review');
      setCurrentMode(null);
      syncPathWithPage('dept-review', { replace: true });
    }
  }, [isDeptHead, initialPage, syncPathWithPage]);

  useEffect(() => {
    const { page, mode } = pageFromPath(pathname);
    setCurrentPage(page);
    setCurrentMode(mode ?? null);
  }, [pageFromPath, pathname]);

  useEffect(() => {
    const formPages = new Set([
      'generic-fund-application',
      'publication-reward-form',
      'application-form',
      'fund-application-detail',
      'publication-reward-detail',
    ]);

    if (formPages.has(currentPage)) {
      if (!selectedFundData && typeof window !== 'undefined') {
        try {
          const cached = window.sessionStorage.getItem(FUND_STORAGE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === 'object') {
              setSelectedFundData(parsed);
            }
          }
        } catch (err) {
          console.warn('Unable to restore selected fund data:', err);
        }
      }
    } else if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(FUND_STORAGE_KEY);
      } catch {}
    }
  }, [currentPage, selectedFundData]);

  useEffect(() => {
    const handlePopState = () => {
      const { page, mode } = pageFromPath(window.location.pathname);
      setSelectedFundData(null);
      setCurrentPage(page);
      setCurrentMode(mode ?? null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pageFromPath]);

  const handleNavigate = (page, data, options = {}) => {
    // ถ้าออกจากหน้าฟอร์มใดๆ ให้ล้างข้อมูลทุนที่เลือก
    if (['application-form', 'publication-reward-form', 'generic-fund-application'].includes(currentPage) &&
        !['application-form', 'publication-reward-form', 'generic-fund-application'].includes(page)) {
      setSelectedFundData(null);
    }

    const nextMode = options.mode ?? null;
    setCurrentPage(page);
    setCurrentMode(nextMode);
    syncPathWithPage(page, { mode: nextMode });

    if (data) {
      setSelectedFundData(data);
      try {
        window.sessionStorage.setItem(FUND_STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        console.warn('Unable to persist selected fund data:', err);
      }
    }
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardContent onNavigate={handleNavigate} />;
      case 'profile':
        return <UserProfile onNavigate={handleNavigate} />;
      case 'research-fund':
        return <ResearchFundContent onNavigate={handleNavigate} />;
      case 'promotion-fund':
        return <PromotionFundContent onNavigate={handleNavigate} />;
      case 'publication-reward-form':
        return (
          <PublicationRewardForm
            onNavigate={handleNavigate}
            categoryId={selectedFundData?.category_id}
            yearId={selectedFundData?.year_id}
            submissionId={selectedFundData?.submissionId}
            originPage={selectedFundData?.originPage}
            mode={currentMode}
            readOnly={currentMode === 'view-only'}
          />
        );
      case 'generic-fund-application':
        return (
          <GenericFundApplicationForm
            onNavigate={handleNavigate}
            subcategoryData={selectedFundData}
            readOnly={currentMode === 'view-only'}
          />
        );
      case 'applications':
        return <ApplicationList onNavigate={handleNavigate} />;
      case 'received-funds':
        return <ReceivedFundsList onNavigate={handleNavigate} />;
      case 'application-form':
        return (
          <GenericFundApplicationForm
            onNavigate={handleNavigate}
            subcategoryData={selectedFundData}
          />
        );
      case 'publication-reward-detail':
        return <PublicationRewardDetail submissionId={selectedFundData?.submissionId} onNavigate={handleNavigate} />;
      case 'fund-application-detail':
        return <FundApplicationDetail submissionId={selectedFundData?.submissionId} onNavigate={handleNavigate} />;
      case 'announcements':
        return <AnnouncementPage />;
      case 'notifications':
        return <NotificationCenter />;
      case 'projects':
        return <ProjectsList />;
      case 'dept-review':
        return <DeptHeadReview />;
      default:
        return <UnderDevelopmentContent currentPage={currentPage} />;
    }
  };

  const getPageTitle = () => {
    const titles = {
      'dashboard': 'แดชบอร์ด',
      'profile': 'ข้อมูลส่วนตัว',
      'promotion-fund': 'ทุนส่งเสริมกิจกรรม',
      'research-fund': 'ทุนอุดหนุนกิจกรรม',
      'applications': 'คำร้องของฉัน',
      'received-funds': 'ทุนที่เคยได้รับ',
      'application-form': 'ยื่นคำร้องใหม่',
      'publication-reward-form': 'รางวัลตีพิมพ์',
      'generic-fund-application': 'ยื่นขอทุน',
      'fund-application-detail': 'รายละเอียดคำร้องขอทุน',
      'announcements': 'ประกาศกองทุนวิจัยและนวัตกรรม',
      'notifications': 'การแจ้งเตือน',
      'projects': 'โครงการ',
      'dept-review': 'พิจารณาคำร้องของหัวหน้าสาขา',
    };
    return titles[currentPage] || currentPage;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        currentPageTitle={getPageTitle()}
        onNavigate={handleNavigate}
        Navigation={({ closeMenu }) => (
          <Navigation
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            handleNavigate={handleNavigate}
            submenuOpen={submenuOpen}
            setSubmenuOpen={setSubmenuOpen}
            closeMenu={closeMenu}
          />
        )}
      />

      <div className="flex mt-24 sm:mt-20 min-h-[calc(100vh-5rem)]">
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

export default function MemberPage() {
  return (
    <AuthGuard
      allowedRoles={[1, 2, 4, 'teacher', 'staff', 'dept_head']}
      requireAuth={true}
    >
      <MemberPageContent />
    </AuthGuard>
  );
}