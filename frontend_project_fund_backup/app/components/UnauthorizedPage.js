// app/components/UnauthorizedPage.js
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Shield, Home, LogIn, AlertTriangle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function UnauthorizedPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleGoToLogin = async () => {
    try {
      setIsLoggingOut(true);
      console.log('Logging out before redirecting to login...');
      
      // ทำการ logout ก่อน
      await logout();
      
      // รอสักครู่เพื่อให้ logout เสร็จ
      setTimeout(() => {
        router.replace('/login');
      }, 500);
      
    } catch (error) {
      console.error('Logout error:', error);
      // ถึงแม้ logout จะ error ก็ยัง redirect ไป login
      router.replace('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleGoHome = () => {
    router.replace('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full mb-4 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <div className="flex justify-center">
            <AlertTriangle className="w-6 h-6 text-orange-500 animate-pulse" />
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ไม่มีสิทธิ์เข้าถึง
          </h1>
          <p className="text-gray-600 mb-2">
            คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้
          </p>
          <p className="text-sm text-gray-500">
            กรุณาตรวจสอบการเข้าสู่ระบบของคุณ หรือติดต่อผู้ดูแลระบบ
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleGoToLogin}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังออกจากระบบ...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                ออกจากระบบและกลับไปหน้า Login
              </>
            )}
          </button>
          
          <button
            onClick={handleGoHome}
            className="w-full flex items-center justify-center gap-3 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200"
          >
            <Home className="w-5 h-5" />
            กลับไปหน้าหลัก
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-gray-400">
          <p>หากคุณคิดว่านี่เป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ</p>
        </div>
      </div>
    </div>
  );
}