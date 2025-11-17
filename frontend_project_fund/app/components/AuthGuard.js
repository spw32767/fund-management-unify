// app/components/AuthGuard.js
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <Image
            src="/image_icon/fund_cpkku_logo.png"
            alt="โลโก้กองทุนวิจัย"
            width={120}
            height={120}
            priority
          />
          <p className="text-gray-600">กำลังโหลดหน้า...</p>
          <p className="text-sm text-gray-500">กำลังตรวจสอบสิทธิ์...</p>
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