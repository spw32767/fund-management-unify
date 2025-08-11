// app/admin/page.js - Admin Dashboard

"use client";

import { useState } from "react";
import AuthGuard from "../components/AuthGuard";
import Header from "./components/layout/Header";
import Navigation from "./components/layout/Navigation";
import DashboardContent from "./components/dashboard/DashboardContent";
import ResearchFundContent from "./components/funds/ResearchFundContent";
import PromotionFundContent from "./components/funds/PromotionFundContent";
import FundSettingsContent from "./components/settings/FundSettingsContent";
import UnderDevelopmentContent from "./components/common/UnderDevelopmentContent";

function AdminPageContent() {
  const [isOpen, setIsOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleNavigate = (page, data) => {
    setCurrentPage(page);
    
    if (data) {
      console.log("Navigate with data:", data);
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
      case 'applications-list':
        return <UnderDevelopmentContent currentPage={currentPage} />;
      case 'fund-settings':
        return <FundSettingsContent currentPage={handleNavigate} />;
      case 'approval-records':
        return <UnderDevelopmentContent currentPage={currentPage} />;
      default:
        return <UnderDevelopmentContent currentPage={currentPage} />;
    }
  };

  const getPageTitle = () => {
    const titles = {
      'dashboard': 'แดชบอร์ด',
      'research-fund': 'ทุนส่งเสริมงานวิจัย',
      'promotion-fund': 'ทุนอุดหนุนกิจกรรม',
      'applications-list': 'รายการการขอทุน',
      'fund-settings': 'ตั้งค่าทุน',
      'approval-records': 'บันทึกข้อมูลการอนุมัติทุน'
    };
    return titles[currentPage] || currentPage;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header 
        isOpen={isOpen} 
        setIsOpen={setIsOpen} 
        Navigation={() => (
          <Navigation
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            handleNavigate={handleNavigate}
            submenuOpen={submenuOpen}
            setSubmenuOpen={setSubmenuOpen}
          />
        )}
      />

      <div className="flex mt-20 min-h-[calc(100vh-5rem)]">
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
        <div className="md:ml-64 flex-1">
          {/* Page Content */}
          <div className="px-8 pb-8">
            {renderPageContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

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