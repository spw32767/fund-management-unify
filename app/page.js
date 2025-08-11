'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';

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

      setCheckingAuth(false);

      if (isAuthenticated && user) {
        // ถ้า user ล็อกอินแล้ว ให้ redirect ตาม role
        console.log('User is authenticated, redirecting based on role:', user);
        redirectBasedOnRole(user);
      } else {
        // ถ้ายังไม่ล็อกอิน ให้ไปหน้า login
        console.log('User not authenticated, redirecting to login');
        router.replace('/login');
      }
    };

    checkAuthentication();
  }, [isAuthenticated, user, isLoading, router]);

  const redirectBasedOnRole = (userData) => {
    const userRole = userData.role_id || userData.role;
    console.log('Redirecting user with role:', userRole);
    
    // ใช้ setTimeout เพื่อให้มั่นใจว่า state update เสร็จแล้ว
    setTimeout(() => {
      if (userRole === 1 || userRole === 'teacher') {
        router.replace('/teacher');
      } else if (userRole === 3 || userRole === 'admin') {
        router.replace('/admin');
      } else if (userRole === 2 || userRole === 'staff') {
        router.replace('/staff');
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

  // ไม่ควรถึงจุดนี้ เพราะจะ redirect ไปแล้ว
  return null;
}