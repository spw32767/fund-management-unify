'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, KeyRound, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { passwordAPI, APIError, NetworkError } from '../lib/api';
import Swal from 'sweetalert2';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [form, setForm] = useState({ new_password: '', confirm_password: '' });
  const [status, setStatus] = useState({ message: '', error: '' });
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams?.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      setStatus(prev => ({ ...prev, error: '' }));
    } else {
      setStatus({ message: '', error: 'ไม่พบโทเคนสำหรับตั้งรหัสผ่านใหม่ กรุณาตรวจสอบลิงก์อีกครั้ง' });
    }
  }, [searchParams]);

  const handleChange = event => {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async event => {
    event.preventDefault();

    setStatus({ message: '', error: '' });

    if (!token.trim()) {
      setStatus({ message: '', error: 'ไม่พบโทเคนสำหรับตั้งรหัสผ่านใหม่ กรุณาเปิดลิงก์จากอีเมลอีกครั้ง' });
      return;
    }

    if (form.new_password.length < 8) {
      setStatus({ message: '', error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' });
      return;
    }

    if (form.new_password !== form.confirm_password) {
      setStatus({ message: '', error: 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน' });
      return;
    }

    setLoading(true);

    try {
      await passwordAPI.resetPassword({
        token: token.trim(),
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      });

      setForm({ new_password: '', confirm_password: '' });
      setToken('');

      await Swal.fire({
        icon: 'success',
        title: 'ตั้งรหัสผ่านใหม่เรียบร้อย',
        text: 'คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที',
        confirmButtonText: 'กลับไปที่หน้าเข้าสู่ระบบ',
      });

      router.replace('/login');
    } catch (err) {
      let message =
        err instanceof NetworkError || err instanceof APIError
          ? err.message
          : 'ไม่สามารถตั้งรหัสผ่านใหม่ได้ในขณะนี้';

      if (err instanceof APIError && err.status === 400 && /expired/i.test(err.message || '')) {
        message = 'ลิงก์สำหรับตั้งรหัสผ่านนี้หมดอายุแล้ว กรุณาขอรับลิงก์ใหม่อีกครั้ง';
      }

      setStatus({ message: '', error: message });
    } finally {
      setLoading(false);
    }
  };

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

            <h1 className="text-2xl font-bold text-gray-900 mb-2">ตั้งรหัสผ่านใหม่</h1>
            <p className="text-gray-600">กรอกโทเคนและรหัสผ่านใหม่เพื่อเข้าใช้งานระบบอีกครั้ง</p>
          </div>

          {status.message && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-sm text-green-700 flex items-start">
              <CheckCircle2 className="w-5 h-5 mt-0.5 text-green-500" />
              <span className="ml-3">{status.message}</span>
            </div>
          )}

          {status.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700 flex items-start">
              <AlertCircle className="w-5 h-5 mt-0.5 text-red-500" />
              <span className="ml-3">{status.error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                โทเคนสำหรับตั้งรหัสผ่านใหม่
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="token"
                  name="token"
                  type="text"
                  readOnly
                  value={token}
                  className="block w-full pl-10 pr-3 py-3 text-gray-500 border border-gray-200 rounded-xl bg-gray-100 cursor-not-allowed"
                  placeholder="ระบบจะกรอกโทเคนอัตโนมัติจากลิงก์ที่ได้รับ"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                ระบบจะใช้โทเคนจากลิงก์ที่คุณได้รับอัตโนมัติ หากลิงก์หมดอายุโปรดขอรับใหม่
              </p>
            </div>

            <div>
              <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-2">
                รหัสผ่านใหม่
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="new_password"
                  name="new_password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={form.new_password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-12 py-3 text-gray-600 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="กรุณากรอกรหัสผ่านใหม่"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
                ยืนยันรหัสผ่านใหม่
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={form.confirm_password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-12 py-3 text-gray-600 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="กรุณากรอกยืนยันรหัสผ่าน"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  กำลังตั้งรหัสผ่านใหม่...
                </>
              ) : (
                <>
                  <KeyRound className="w-5 h-5 mr-2" />
                  ตั้งรหัสผ่านใหม่
                </>
              )}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => router.push('/forgot-password')}
              className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <KeyRound className="w-4 h-4" />
              ขอรับลิงก์ใหม่อีกครั้ง
            </button>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}