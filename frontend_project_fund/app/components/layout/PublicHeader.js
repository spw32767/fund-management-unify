'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const NAV_ITEMS = [
  { label: 'หน้าแรก', href: '/' },
  { label: 'ข้อมูลทุน', href: '/projects' }
];

export default function PublicHeader() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="border-b border-white/20 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-12 w-12">
            <Image
              src="/image_icon/fund_cpkku_logo.png"
              alt="โลโก้ระบบบริหารจัดการทุนวิจัย"
              fill
              sizes="48px"
              className="object-contain"
              priority
            />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">ระบบบริหารจัดการทุนวิจัย</p>
            <p className="text-xs text-gray-500">Faculty of Engineering, KKU</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-4 text-sm font-medium text-gray-600 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 transition ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/20'
                    : 'text-gray-600 hover:bg-white/80 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
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
