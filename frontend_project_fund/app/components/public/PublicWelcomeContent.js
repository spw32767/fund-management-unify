import { LogIn, LayoutDashboard } from 'lucide-react';
import PageLayout from '@/app/member/components/common/PageLayout';

export default function PublicWelcomeContent({ appDisplayName, tagline, onLogin, pageTitle }) {
  return (
    <PageLayout
      title={pageTitle}
      subtitle={`ยินดีต้อนรับเข้าสู่ ${appDisplayName}`}
      icon={LayoutDashboard}
      breadcrumbs={[{ label: pageTitle }]}
    >
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="px-8 py-12 sm:px-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-blue-700">
            ยินดีต้อนรับ
          </span>
          <h2 className="mt-6 text-3xl font-semibold leading-tight text-gray-900 sm:text-4xl">
            {appDisplayName}
          </h2>
          <p className="mt-4 max-w-2xl text-base text-gray-600 sm:text-lg">
            {tagline}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              onClick={onLogin}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
                <LogIn size={18} />
              <span>เข้าสู่ระบบ</span>
            </button>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}