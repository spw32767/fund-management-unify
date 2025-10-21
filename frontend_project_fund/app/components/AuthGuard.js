// app/components/AuthGuard.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import UnauthorizedPage from "./UnauthorizedPage";

const ROLE_NAME_BY_ID = {
  1: 'teacher',
  2: 'staff',
  3: 'admin',
  4: 'dept_head',
};

const normalizeRoleName = (role) => {
  if (role == null) {
    return null;
  }

  if (typeof role === 'object') {
    if (role.role != null) {
      return normalizeRoleName(role.role);
    }
    if (role.role_id != null) {
      return normalizeRoleName(role.role_id);
    }
  }

  if (typeof role === 'string') {
    return role;
  }

  if (typeof role === 'number') {
    return ROLE_NAME_BY_ID[role] || null;
  }

  return null;
};

const MEMBER_ALLOWED_ROLES = ['teacher', 'staff', 'dept_head'];

export const canAccess = (pathname, role) => {
  if (!pathname) {
    return true;
  }

  const normalizedRole = normalizeRoleName(role);

  if (pathname.startsWith('/admin')) {
    return normalizedRole === 'admin';
  }

  if (pathname.startsWith('/member')) {
    return normalizedRole ? MEMBER_ALLOWED_ROLES.includes(normalizedRole) : false;
  }

  return true;
};

export default function AuthGuard({
  children,
  allowedRoles = [], // [1, 2, 3] หรือ ['teacher', 'staff', 'admin']
  requireAuth = true,
  fallback = null
}) {
  const { isAuthenticated, user, isLoading, hasAnyRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showUnauthorized, setShowUnauthorized] = useState(false);
  const [initialCheck, setInitialCheck] = useState(false);

  useEffect(() => {
    // รอให้ auth context โหลดเสร็จก่อน
    if (isLoading) return;

    // ทำเครื่องหมายว่าเช็คครั้งแรกแล้ว
    if (!initialCheck) {
      setInitialCheck(true);
    }

    // ถ้าต้องการ authentication แต่ยังไม่ได้ login
    if (requireAuth && !isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      router.replace('/login');
      return;
    }

    // ถ้า login แล้วแต่ไม่มีสิทธิ์ตาม role ที่กำหนด
    if (isAuthenticated && allowedRoles.length > 0) {
      if (!hasAnyRole(allowedRoles)) {
        setShowUnauthorized(true);
        return;
      }
    }

    if (isAuthenticated) {
      const roleValue = user?.role ?? user?.role_id;
      if (!canAccess(pathname, roleValue)) {
        setShowUnauthorized(true);
        return;
      }
    }

    // ถ้าผ่านการตรวจสอบทั้งหมด
    setShowUnauthorized(false);
  }, [
    isAuthenticated,
    user,
    isLoading,
    requireAuth,
    allowedRoles,
    hasAnyRole,
    router,
    initialCheck,
    pathname,
  ]);

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