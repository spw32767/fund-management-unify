'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, Send, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { passwordAPI, APIError, NetworkError } from '../lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ message: '', error: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();

    const sanitizedEmail = email.trim();
    if (!sanitizedEmail) {
      setStatus({ message: '', error: 'กรุณากรอกอีเมลที่ใช้ลงทะเบียน' });
      return;
    }

    setLoading(true);
    setStatus({ message: '', error: '' });

    try {
      await passwordAPI.requestReset({ email: sanitizedEmail });
      setStatus({
        message:
          'หากอีเมลนี้อยู่ในระบบ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้แล้ว กรุณาตรวจสอบกล่องจดหมายของคุณ',
        error: ''
      });
    } catch (err) {
      const message =
        err instanceof NetworkError || err instanceof APIError
          ? err.message
          : 'ไม่สามารถส่งคำขอได้ในขณะนี้';
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

            <h1 className="text-2xl font-bold text-gray-900 mb-2">ลืมรหัสผ่าน</h1>
            <p className="text-gray-600">กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่</p>
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
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="block w-full pl-10 pr-3 py-3 text-gray-600 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="กรุณากรอกอีเมล"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  กำลังส่งคำขอ...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  ส่งลิงก์ตั้งรหัสผ่านใหม่
                </>
              )}
            </button>
          </form>

          <div className="mt-6">
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