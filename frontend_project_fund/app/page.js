'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';
import PublicHeader from './components/layout/PublicHeader';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      // รอให้ AuthContext โหลดเสร็จก่อน
      if (isLoading) {
        return;
      }

      if (isAuthenticated && user) {
        // ถ้า user ล็อกอินแล้ว ให้ redirect ตาม role
        redirectBasedOnRole(user);
      } else {
        // ถ้ายังไม่ล็อกอิน แสดงหน้า Landing Page
        setCheckingAuth(false);
      }
    };

    checkAuthentication();
  }, [isAuthenticated, user, isLoading, router]);

  const redirectBasedOnRole = (userData) => {
    const userRole = userData.role_id || userData.role;
    
    // ใช้ setTimeout เพื่อให้มั่นใจว่า state update เสร็จแล้ว
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

  // แสดง loading screen ขณะตรวจสอบ authentication
  if (isLoading || checkingAuth) {
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
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ระบบบริหารจัดการทุนวิจัย
          </h1>
          
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span>กำลังตรวจสอบสิทธิ์...</span>
          </div>
        </div>
      </div>
    );
  }

  // แสดง Landing Page สำหรับผู้ใช้ที่ยังไม่ล็อกอิน
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <PublicHeader />
        <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl flex-col items-center justify-center px-6 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1 text-sm font-medium text-blue-700 shadow-sm">
            <span className="inline-flex h-2 w-2 rounded-full bg-blue-600"></span>
            Under Development
          </span>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            ระบบกำลังอยู่ในระหว่างการพัฒนา
          </h1>
          <p className="mb-8 max-w-2xl text-base text-gray-600 sm:text-lg">
            หน้านี้จะพร้อมให้ใช้งานเร็ว ๆ นี้ ขณะนี้ทีมงานกำลังพัฒนาฟังก์ชันการใช้งานเพื่อให้ผู้ใช้ได้รับประสบการณ์ที่ดีที่สุด
          </p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:scale-[1.02] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            เข้าสู่ระบบ
          </button>
        </main>
      </div>
    );
  }

  // ไม่ควรถึงจุดนี้ เพราะจะ redirect ไปแล้ว
  return null;
}