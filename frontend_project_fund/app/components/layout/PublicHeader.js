'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLogo from '../common/AppLogo';

export default function PublicHeader() {
  const router = useRouter();

  return (
    <header className="border-b border-white/20 backdrop-blur bg-white/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <AppLogo size={48} withFrame={false} className="h-12 w-12" priority />
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">ระบบบริหารจัดการทุนวิจัย</p>
            <p className="text-xs text-gray-500">Faculty of Engineering, KKU</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <span className="rounded-full bg-white/60 px-3 py-1 text-gray-400">กำลังพัฒนา</span>
        </nav>

        <button
          type="button"
          onClick={() => router.push('/login')}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:scale-[1.02] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          เข้าสู่ระบบ
        </button>
      </div>
    </header>
  );
}
