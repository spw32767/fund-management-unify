'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';
import PublicHeader from './components/public/PublicHeader';
import PublicNavigation from './components/public/PublicNavigation';
import PublicWelcomeContent from './components/public/PublicWelcomeContent';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                F
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{APP_DISPLAY_NAME}</h1>

          <div className="flex items-center justify-center gap-2 text-gray-600">
            <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span>กำลังตรวจสอบสิทธิ์...</span>
          </div>
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