'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, AlertCircle, Lock, Mail, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login, isLoading, error, clearError, isAuthenticated, user } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Redirect if already authenticated - แก้ไขให้ใช้ Next.js router
  useEffect(() => {
    if (isAuthenticated && user && !redirecting) {
      setRedirecting(true);
      redirectBasedOnRole();
    }
  }, [isAuthenticated, user, redirecting]);

  // แก้ไขการ redirect ให้ใช้ Next.js router และตรวจสอบ role ให้แม่นยำ
  const redirectBasedOnRole = () => {
    if (!user) {
      return;
    }

    // ตรวจสอบ role จาก user object
    const userRole = user.role_id || user.role;

    // หน่วงเวลาเล็กน้อยเพื่อให้ state update เสร็จ
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      return;
    }

    try {
      await login(formData.email, formData.password);

      // อย่าทำการ redirect ที่นี่ ให้ useEffect จัดการ
      // เพราะ login function จะ update isAuthenticated และ user state
      
    } catch (error) {
      console.error('Login error:', error);
      // Error จะถูก handle ใน AuthContext แล้ว
    }
  };

  const handleSSOLogin = () => {};

  // แสดง loading screen ขณะ redirecting
  if (redirecting) {
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
            เข้าสู่ระบบสำเร็จ
          </h1>
          
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span>กำลังเปลี่ยนหน้า...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Login Form */}
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-6 mb-4">
              <Image
                src="/image_icon/iconcpkku.png"
                alt="CPKKU Icon"
                width={175}
                height={100}
                className="object-contain"
                priority
              />
              <Image
                src="/image_icon/fund_cpkku_logo.png"
                alt="Fund CPKKU Logo"
                width={100}
                height={100}
                className="object-contain"
                priority
              />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              เข้าสู่ระบบ
            </h1>

            <p className="text-gray-600">
              ระบบบริหารจัดการทุนวิจัย
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                อีเมล
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-3 text-gray-600 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="กรุณากรอกอีเมล"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                รหัสผ่าน
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-12 py-3 text-gray-600 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="กรุณากรอกรหัสผ่าน"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  เข้าสู่ระบบ
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" aria-hidden="true"></span>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">หรือเข้าสู่ระบบด้วย</span>
              </div>
            </div>

            <div>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors duration-200"
                onClick={handleSSOLogin}
              >
                <KeyRound className="w-5 h-5" />
                SSO
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © 2024 ระบบบริหารจัดการทุนวิจัย. สงวนลิขสิทธิ์.
          </p>
        </div>
      </div>
    </div>
  );
}