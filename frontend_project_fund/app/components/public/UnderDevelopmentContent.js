'use client';

import { Construction, ArrowLeft, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UnderDevelopmentContent({
  title = 'หน้านี้อยู่ระหว่างการพัฒนา',
  description = 'ฟีเจอร์นี้จะพร้อมใช้งานเร็ว ๆ นี้ กรุณาติดตามอัปเดตจากทีมพัฒนา',
  backHref = '/',
  backLabel = 'กลับสู่หน้าแรก'
}) {
  const router = useRouter();

  return (
    <section className="rounded-3xl border border-white/60 bg-white/80 p-10 shadow-xl shadow-blue-500/5 backdrop-blur">
      <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            <Construction size={18} />
            <span>Under Development</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">{title}</h1>
          <p className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg">{description}</p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:scale-[1.02] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Home size={18} />
              {backLabel}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-full border border-blue-600/30 bg-white px-6 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-600 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              <ArrowLeft size={18} />
              ย้อนกลับ
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 rounded-2xl bg-blue-50/80 p-6 text-center text-blue-900 shadow-inner">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-blue-600 shadow">
            <Construction size={40} />
          </div>
          <div className="text-sm text-blue-800">
            <p className="font-semibold">เคล็ดลับ</p>
            <p className="mt-1 text-blue-700/80">
              สามารถกลับไปยังหน้าอื่น ๆ ได้จากเมนูด้านบนหรือปุ่มด้านซ้าย
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
