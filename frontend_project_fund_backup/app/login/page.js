'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, AlertCircle, Lock, Mail, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { healthAPI, AuthError, NetworkError } from '../lib/api';

export default function LoginPage() {
  const { login, isLoading, error, clearError, isAuthenticated, user } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);
  const [checkingServer, setCheckingServer] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  // Check server health on component mount
  useEffect(() => {
    checkServerHealth();
  }, []);

  // Redirect if already authenticated - แก้ไขให้ใช้ Next.js router
  useEffect(() => {
    if (isAuthenticated && user && !redirecting) {
      console.log('User authenticated, redirecting...', user);
      setRedirecting(true);
      redirectBasedOnRole();
    }
  }, [isAuthenticated, user, redirecting]);

  // Check server health
  const checkServerHealth = async () => {
    setCheckingServer(true);
    try {
      const health = await healthAPI.check();
      setServerStatus({ status: 'online', message: health.message });
    } catch (error) {
      setServerStatus({ 
        status: 'offline', 
        message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' 
      });
    } finally {
      setCheckingServer(false);
    }
  };

  // แก้ไขการ redirect ให้ใช้ Next.js router และตรวจสอบ role ให้แม่นยำ
  const redirectBasedOnRole = () => {
    if (!user) {
      console.log('No user data found');
      return;
    }

    // ตรวจสอบ role จาก user object
    const userRole = user.role_id || user.role;
    console.log('User role detected:', userRole, 'User data:', user);
    
    // หน่วงเวลาเล็กน้อยเพื่อให้ state update เสร็จ
    setTimeout(() => {
      if (userRole === 1 || userRole === 'teacher') {
        console.log('Redirecting to teacher dashboard');
        router.replace('/teacher');
      } else if (userRole === 3 || userRole === 'admin') {
        console.log('Redirecting to admin dashboard');
        router.replace('/admin');
      } else if (userRole === 2 || userRole === 'staff') {
        console.log('Redirecting to staff dashboard');
        router.replace('/staff');
      } else {
        console.log('Redirecting to default dashboard');
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
      console.log('Attempting login...');
      const response = await login(formData.email, formData.password);
      console.log('Login response:', response);
      
      // อย่าทำการ redirect ที่นี่ ให้ useEffect จัดการ
      // เพราะ login function จะ update isAuthenticated และ user state
      
    } catch (error) {
      console.error('Login error:', error);
      // Error จะถูก handle ใน AuthContext แล้ว
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                F
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            เข้าสู่ระบบ
          </h1>
          
          <p className="text-gray-600">
            ระบบบริหารจัดการทุนวิจัย
          </p>
        </div>

        {/* Server Status */}
        <div className="mb-6">
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${
            checkingServer 
              ? 'bg-gray-50 border-gray-200' 
              : serverStatus?.status === 'online'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {checkingServer ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                <span className="text-sm text-gray-600">ตรวจสอบสถานะเซิร์ฟเวอร์...</span>
              </>
            ) : serverStatus?.status === 'online' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">เชื่อมต่อเซิร์ฟเวอร์สำเร็จ</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span className="text-sm">{serverStatus?.message}</span>
              </>
            )}
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
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
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  จดจำการเข้าสู่ระบบ
                </label>
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
              disabled={isLoading || serverStatus?.status !== 'online'}
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