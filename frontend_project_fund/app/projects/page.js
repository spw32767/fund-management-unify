'use client';

import PublicHeader from '../components/layout/PublicHeader';
import UnderDevelopmentContent from '../components/public/UnderDevelopmentContent';

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <PublicHeader />
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center px-6 py-12">
        <UnderDevelopmentContent
          title="ข้อมูลทุนวิจัย"
          description="เนื้อหาเกี่ยวกับข้อมูลทุนวิจัยกำลังอยู่ระหว่างการจัดเตรียม เพื่อให้ผู้ใช้งานเข้าถึงรายละเอียดทุนได้สะดวกและครบถ้วน"
          backHref="/"
          backLabel="กลับสู่หน้าแรก"
        />
      </main>
    </div>
  );
}
