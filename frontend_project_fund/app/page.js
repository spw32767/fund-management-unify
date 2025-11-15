"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./contexts/AuthContext";
import PublicHeader from "./components/public/PublicHeader";
import PublicNavigation from "./components/public/PublicNavigation";
import PublicWelcomeContent from "./components/public/PublicWelcomeContent";

const PAGE_TITLES = {
  home: 'หน้าหลัก',
};

const APP_DISPLAY_NAME = 'ระบบบริหารจัดการทุนวิจัย';
const WELCOME_TAGLINE =
  'ระบบกลางสำหรับบริหารจัดการทุนวิจัยของวิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isAuthenticated && user) {
      setRedirecting(true);
      redirectBasedOnRole(user);
    } else {
      setRedirecting(false);
    }
  }, [isAuthenticated, user, isLoading, router]);

  const redirectBasedOnRole = (userData) => {
    const userRole = userData.role_id || userData.role;

    setTimeout(() => {
      if (
        userRole === 1 ||
        userRole === 2 ||
        userRole === 4 ||
        userRole === 'teacher' ||
        userRole === 'staff' ||
        userRole === 'dept_head'
      ) {
        router.replace('/member');
      } else if (userRole === 3 || userRole === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }, 100);
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
    setIsMenuOpen(false);
  };

  const currentPageTitle = useMemo(() => {
    return PAGE_TITLES[currentPage] || 'หน้าหลัก';
  }, [currentPage]);

  const handleLogin = () => {
    router.push('/login');
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case 'home':
      default:
        return (
          <PublicWelcomeContent
            appDisplayName={APP_DISPLAY_NAME}
            tagline={WELCOME_TAGLINE}
            onLogin={handleLogin}
            pageTitle={currentPageTitle}
          />
        );
    }
  };

  if (isLoading || redirecting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white text-center">
        <Image
          src="/image_icon/fund_cpkku_logo.png"
          alt="โลโก้กองทุนวิจัย"
          width={160}
          height={160}
          priority
        />
        <h1 className="text-2xl font-bold text-gray-900">{APP_DISPLAY_NAME}</h1>
        <div className="space-y-1 text-gray-600">
          <p className="text-lg font-medium text-gray-700">กำลังโหลดหน้า...</p>
          <p className="text-sm text-gray-500">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <PublicHeader
        isOpen={isMenuOpen}
        setIsOpen={setIsMenuOpen}
        currentPageTitle={currentPageTitle}
        Navigation={({ closeMenu }) => (
          <PublicNavigation
            currentPage={currentPage}
            onNavigate={handleNavigate}
            closeMenu={closeMenu}
          />
        )}
      />

      <div className="flex mt-20 min-h-[calc(100vh-5rem)]">
        <div className="hidden md:block w-64 bg-white border-r border-gray-300 fixed h-[calc(100vh-5rem)] overflow-y-auto shadow-sm">
          <div className="p-5">
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                เมนูหลัก
              </h2>
            </div>
            <PublicNavigation currentPage={currentPage} onNavigate={handleNavigate} />
          </div>
        </div>

        <div className="md:ml-64 flex-1">
          <div className="px-8 pb-8">{renderPageContent()}</div>
        </div>
      </div>
    </div>
  );
}