// Staff/page.js - Staff Dashboard

"use client";

import { useState } from "react";
import AuthGuard from "../components/AuthGuard";
import Header from "./components/layout/Header";
import Navigation from "./components/layout/Navigation";
import DashboardContent from "./components/dashboard/DashboardContent";
import ResearchFundContent from "./components/funds/ResearchFundContent";
import ApplicationList from "./components/applications/ApplicationList";
import ApplicationForm from "./components/applications/ApplicationForm";
import UnderDevelopmentContent from "./components/common/UnderDevelopmentContent";
import PromotionFundContent from "./components/funds/PromotionFundContent";
import PublicationRewardForm from "./components/applications/PublicationRewardForm";

function StaffPageContent() {
  const [isOpen, setIsOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('profile');
  const [selectedFundData, setSelectedFundData] = useState(null);

  const handleNavigate = (page, data) => {
    // ถ้าออกจากหน้าฟอร์มใดๆ ให้ล้างข้อมูลทุนที่เลือก
    if (['application-form', 'publication-reward-form'].includes(currentPage) && 
        !['application-form', 'publication-reward-form'].includes(page)) {
      setSelectedFundData(null);
    }
    
    setCurrentPage(page);
    
    if (data) {
      console.log("Navigate with data:", data);
      setSelectedFundData(data);
    }
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardContent onNavigate={handleNavigate} />;
      case 'profile':
        return <UnderDevelopmentContent currentPage={currentPage} title="ข้อมูลส่วนตัว" />;
      case 'research-fund':
        return <ResearchFundContent onNavigate={handleNavigate} />;
      case 'promotion-fund':
        return <PromotionFundContent onNavigate={handleNavigate} />;
      case 'publication-reward-form':
        return <PublicationRewardForm onNavigate={handleNavigate}/>;
      case 'applications':
        return <ApplicationList onNavigate={handleNavigate} />;
      case 'received-funds':
        return <UnderDevelopmentContent currentPage={currentPage} title="ทุนที่เคยได้รับ" />;
      case 'application-form':
        return <ApplicationForm selectedFund={selectedFundData} />;
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
      'application-form': 'ยื่นคำร้องใหม่'
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

export default function StaffPage() {
  return (
    <AuthGuard 
      allowedRoles={[1, 2]}
      requireAuth={true}
    >
      <StaffPageContent />
    </AuthGuard>
  );
}