import { ArrowRight } from 'lucide-react';

export default function PublicWelcomeContent({ appDisplayName, tagline, onLogin }) {
  return (
    <div className="mt-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 text-white shadow-xl">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6), transparent 55%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.4), transparent 60%)',
          }}
          aria-hidden="true"
        ></div>

        <div className="relative px-8 py-16 sm:px-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs font-medium uppercase tracking-widest text-white/90 backdrop-blur-sm">
            ยินดีต้อนรับ
          </span>
          <h2 className="mt-6 text-3xl font-bold leading-tight sm:text-4xl">
            ยินดีต้อนรับเข้าสู่ {appDisplayName}
          </h2>
          <p className="mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
            {tagline}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              onClick={onLogin}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              <span>เข้าสู่ระบบ</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
