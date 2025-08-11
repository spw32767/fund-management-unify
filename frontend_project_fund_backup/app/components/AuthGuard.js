// app/components/AuthGuard.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import UnauthorizedPage from "./UnauthorizedPage";

export default function AuthGuard({ 
  children, 
  allowedRoles = [], // [1, 2, 3] หรือ ['teacher', 'staff', 'admin']
  requireAuth = true,
  fallback = null 
}) {
  const { isAuthenticated, user, isLoading, hasAnyRole } = useAuth();
  const router = useRouter();
  const [showUnauthorized, setShowUnauthorized] = useState(false);
  const [initialCheck, setInitialCheck] = useState(false);

  useEffect(() => {
    // รอให้ auth context โหลดเสร็จก่อน
    if (isLoading) return;

    // ทำเครื่องหมายว่าเช็คครั้งแรกแล้ว
    if (!initialCheck) {
      setInitialCheck(true);
    }

    console.log('AuthGuard check:', {
      isAuthenticated,
      user: user ? { role_id: user.role_id, role: user.role } : null,
      allowedRoles,
      requireAuth
    });

    // ถ้าต้องการ authentication แต่ยังไม่ได้ login
    if (requireAuth && !isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      router.replace('/login');
      return;
    }

    // ถ้า login แล้วแต่ไม่มีสิทธิ์ตาม role ที่กำหนด
    if (isAuthenticated && allowedRoles.length > 0) {
      if (!hasAnyRole(allowedRoles)) {
        console.log('User does not have required role:', { 
          userRole: user?.role_id || user?.role, 
          allowedRoles 
        });
        setShowUnauthorized(true);
        return;
      }
    }

    // ถ้าผ่านการตรวจสอบทั้งหมด
    setShowUnauthorized(false);
  }, [isAuthenticated, user, isLoading, requireAuth, allowedRoles, hasAnyRole, router, initialCheck]);

  // แสดง loading ขณะตรวจสอบ auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                F
              </div>
            </div>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            กำลังตรวจสอบสิทธิ์...
          </h2>
          
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-sm">กรุณารอสักครู่</span>
          </div>
        </div>
      </div>
    );
  }

  // ถ้าไม่มีสิทธิ์ ให้แสดงหน้า unauthorized
  if (showUnauthorized) {
    return fallback || <UnauthorizedPage />;
  }

  // ถ้าต้องการ auth แต่ยังไม่ได้ login (จะ redirect ใน useEffect)
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // ถ้าผ่านการตรวจสอบทั้งหมด ให้แสดง children
  return <>{children}</>;
}