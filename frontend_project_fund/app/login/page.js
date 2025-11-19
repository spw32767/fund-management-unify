'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Lock,
  Mail,
  KeyRound,
  ArrowLeft,
  Send,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { passwordAPI, APIError, NetworkError } from '../lib/api';

export default function LoginPage() {
  const { login, isLoading, error, clearError, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [mode, setMode] = useState('login');
  const [globalMessage, setGlobalMessage] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState({ message: '', error: '' });
  const [forgotLoading, setForgotLoading] = useState(false);

  const [resetForm, setResetForm] = useState({
    token: '',
    new_password: '',
    confirm_password: ''
  });
  const [resetStatus, setResetStatus] = useState({ message: '', error: '' });
  const [resetLoading, setResetLoading] = useState(false);

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

  const handleModeChange = (nextMode) => {
    if (nextMode === 'forgot') {
      router.push('/forgot-password');
      return;
    }

    if (nextMode === 'reset') {
      const tokenParam = searchParams?.get('token') || resetForm.token.trim();
      const target = tokenParam
        ? `/reset-password?token=${encodeURIComponent(tokenParam)}`
        : '/reset-password';
      router.push(target);
      return;
    }

    if (nextMode !== 'login' && error) {
      clearError();
    }

    if (nextMode === 'login') {
      setForgotEmail('');
      setForgotStatus({ message: '', error: '' });
      setResetStatus({ message: '', error: '' });
      setResetForm(prev => ({
        token: searchParams?.get('token') || prev.token,
        new_password: '',
        confirm_password: ''
      }));
      setMode('login');
    }
  };

  const handleForgotSubmit = async (event) => {
    event.preventDefault();

    setForgotStatus({ message: '', error: '' });

    const sanitizedEmail = forgotEmail.trim();
    if (!sanitizedEmail) {
      setForgotStatus({ message: '', error: 'กรุณากรอกอีเมลที่ใช้ลงทะเบียน' });
      return;
    }

    setForgotLoading(true);
    try {
      await passwordAPI.requestReset({ email: sanitizedEmail });
      setForgotStatus({
        message:
          'หากอีเมลนี้อยู่ในระบบ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้แล้ว กรุณาตรวจสอบกล่องอีเมลของคุณ',
        error: ''
      });
    } catch (err) {
      const message = err instanceof NetworkError || err instanceof APIError ? err.message : 'ไม่สามารถส่งคำขอได้ในขณะนี้';
      setForgotStatus({ message: '', error: message });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetChange = (event) => {
    const { name, value } = event.target;
    setResetForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleResetSubmit = async (event) => {
    event.preventDefault();

    setResetStatus({ message: '', error: '' });

    if (!resetForm.token.trim()) {
      setResetStatus({ message: '', error: 'กรุณากรอกโทเคนสำหรับตั้งรหัสผ่านใหม่' });
      return;
    }

    if (resetForm.new_password.length < 8) {
      setResetStatus({ message: '', error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' });
      return;
    }

    if (resetForm.new_password !== resetForm.confirm_password) {
      setResetStatus({ message: '', error: 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน' });
      return;
    }

    setResetLoading(true);
    try {
      await passwordAPI.resetPassword({
        token: resetForm.token.trim(),
        new_password: resetForm.new_password,
        confirm_password: resetForm.confirm_password
      });

      setGlobalMessage('ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่ของคุณ');
      setResetForm({ token: '', new_password: '', confirm_password: '' });
      handleModeChange('login');
      router.replace('/login');
    } catch (err) {
      const message = err instanceof NetworkError || err instanceof APIError ? err.message : 'ไม่สามารถตั้งรหัสผ่านใหม่ได้ในขณะนี้';
      setResetStatus({ message: '', error: message });
    } finally {
      setResetLoading(false);
    }
  };

  const modeTitle = useMemo(() => {
    switch (mode) {
      case 'forgot':
        return 'ลืมรหัสผ่าน';
      case 'reset':
        return 'ตั้งรหัสผ่านใหม่';
      default:
        return 'เข้าสู่ระบบ';
    }
  }, [mode]);

  const modeDescription = useMemo(() => {
    switch (mode) {
      case 'forgot':
        return 'กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่';
      case 'reset':
        return 'กรอกโทเคนและรหัสผ่านใหม่เพื่อเข้าใช้งานระบบอีกครั้ง';
      default:
        return 'กองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์';
    }
  }, [mode]);

  useEffect(() => {
    const tokenParam = searchParams?.get('token');
    if (tokenParam) {
      router.replace(`/reset-password?token=${encodeURIComponent(tokenParam)}`);
    }
  }, [searchParams, router]);

  // แสดง loading screen ขณะ redirecting
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center flex flex-col items-center gap-4">
          <Image
            src="/image_icon/fund_cpkku_logo.png"
            alt="Fund CPKKU Logo"
            width={140}
            height={140}
            className="object-contain drop-shadow"
            priority
          />

          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              เข้าสู่ระบบสำเร็จ
            </h1>
            <p className="text-gray-600">กำลังโหลดหน้า...</p>
            <p className="text-sm text-gray-500">กำลังเปลี่ยนหน้า...</p>
          </div>

          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" aria-label="loading" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
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

            <h1 className="text-2xl font-bold text-gray-900 mb-2">{modeTitle}</h1>

            <p className="text-gray-600">{modeDescription}</p>
          </div>

          {globalMessage && mode === 'login' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-sm text-green-700 flex items-start">
              <CheckCircle2 className="w-5 h-5 mt-0.5 text-green-500" />
              <span className="ml-3">{globalMessage}</span>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    onClick={() => handleModeChange('forgot')}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    ลืมรหัสผ่าน?
                  </button>
                </div>
              </div>

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
                  Sign In with KKU Email
                </button>
              </div>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-6">
              {forgotStatus.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start">
                  <AlertCircle className="w-5 h-5 mt-0.5 text-red-500" />
                  <span className="ml-3">{forgotStatus.error}</span>
                </div>
              )}

              {forgotStatus.message && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 flex items-start">
                  <Send className="w-5 h-5 mt-0.5 text-blue-500" />
                  <span className="ml-3">{forgotStatus.message}</span>
                </div>
              )}

              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-2">
                  อีเมลที่ใช้ลงทะเบียน
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="forgot-email"
                    name="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={forgotEmail}
                    onChange={event => setForgotEmail(event.target.value)}
                    className="block w-full pl-10 pr-3 py-3 text-gray-600 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="example@domain.com"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                >
                  {forgotLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      กำลังส่งคำขอ...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      ส่งลิงก์ตั้งรหัสผ่านใหม่
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange('login')}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  กลับเข้าสู่ระบบ
                </button>
              </div>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-6">
              {resetStatus.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start">
                  <AlertCircle className="w-5 h-5 mt-0.5 text-red-500" />
                  <span className="ml-3">{resetStatus.error}</span>
                </div>
              )}

              {resetStatus.message && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 flex items-start">
                  <ShieldCheck className="w-5 h-5 mt-0.5 text-green-500" />
                  <span className="ml-3">{resetStatus.message}</span>
                </div>
              )}

              <div>
                <label htmlFor="reset-token" className="block text-sm font-medium text-gray-700 mb-2">
                  โทเคนสำหรับตั้งรหัสผ่านใหม่
                </label>
                <input
                  id="reset-token"
                  name="token"
                  type="text"
                  value={resetForm.token}
                  onChange={handleResetChange}
                  className="block w-full px-3 py-3 text-gray-600 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="วางโทเคนจากอีเมลที่ได้รับ"
                />
              </div>

              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                  รหัสผ่านใหม่
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="new-password"
                    name="new_password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={resetForm.new_password}
                    onChange={handleResetChange}
                    className="block w-full pl-10 pr-3 py-3 text-gray-600 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                  ยืนยันรหัสผ่านใหม่
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirm-password"
                    name="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={resetForm.confirm_password}
                    onChange={handleResetChange}
                    className="block w-full pl-10 pr-3 py-3 text-gray-600 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="ยืนยันรหัสผ่านใหม่"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                >
                  {resetLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      กำลังบันทึกรหัสผ่าน...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      ตั้งรหัสผ่านใหม่
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange('login')}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  กลับเข้าสู่ระบบ
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}