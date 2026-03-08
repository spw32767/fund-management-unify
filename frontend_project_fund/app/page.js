"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./contexts/AuthContext";
import PublicHeader from "./components/public/PublicHeader";

const TABS = [
  { id: "home", label: "หน้าหลัก" },
  { id: "researchFund", label: "กองทุนวิจัยฯ" },
  { id: "externalFund", label: "ทุนภายนอก" },
  { id: "publicationSearch", label: "สืบค้นผลงานตีพิมพ์" },
  { id: "research", label: "งานวิจัย" },
  { id: "ip", label: "IP" },
  { id: "mou", label: "MOU" },
  { id: "innovation", label: "นวัตกรรม" },
  { id: "links", label: "Links" },
  { id: "researcherMatching", label: "จับคู่นักวิจัย" },
];

const APP_DISPLAY_NAME = "ระบบบริหารจัดการทุนวิจัย";
const WELCOME_TAGLINE =
  "ระบบกลางสำหรับบริหารจัดการทุนวิจัยของวิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น";

function ResearchFundContent({ onLogin }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="px-6 py-10 sm:px-10 sm:py-12">
        <h3 className="text-2xl font-semibold leading-tight text-gray-900 sm:text-3xl">
          {APP_DISPLAY_NAME}
        </h3>
        <p className="mt-4 max-w-3xl text-base text-gray-600 sm:text-lg">
          {WELCOME_TAGLINE}
        </p>
        <div className="mt-8">
          <button
            onClick={onLogin}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <span>เข้าสู่ระบบ</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function ComingSoonContent({ pageTitle }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="px-8 py-14 sm:px-12 text-center">
        <p className="text-lg font-semibold text-gray-700">{pageTitle}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">กำลังพัฒนา... (Coming Soon)</p>
      </div>
    </section>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("researchFund");

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isAuthenticated && user) {
      setRedirecting(true);
      redirectBasedOnRole(user);
    } else {
      setRedirecting(false);
    }
  }, [isAuthenticated, user, isLoading]);

  const redirectBasedOnRole = (userData) => {
    const userRoleRaw = userData.role_id ?? userData.role;
    const userRole = typeof userRoleRaw === "string" ? userRoleRaw.toLowerCase() : userRoleRaw;
    const userRoleNumber = Number(userRoleRaw);

    setTimeout(() => {
      if (
        userRole === 1 ||
        userRole === 2 ||
        userRole === 4 ||
        userRoleNumber === 1 ||
        userRoleNumber === 2 ||
        userRoleNumber === 4 ||
        userRole === "teacher" ||
        userRole === "staff" ||
        userRole === "dept_head"
      ) {
        router.replace("/member");
      } else if (userRole === 3 || userRoleNumber === 3 || userRole === "admin") {
        router.replace("/admin/dashboard");
      } else if (userRole === 5 || userRoleNumber === 5 || userRole === "executive") {
        router.replace("/executive/dashboard");
      } else {
        router.replace("/dashboard");
      }
    }, 100);
  };

  const currentPageTitle = useMemo(() => {
    return TABS.find((tab) => tab.id === currentPage)?.label || "หน้าหลัก";
  }, [currentPage]);

  const handleLogin = () => {
    router.push("/login");
  };

  const renderPageContent = () => {
    if (currentPage === "researchFund") {
      return <ResearchFundContent onLogin={handleLogin} />;
    }

    return <ComingSoonContent pageTitle={currentPageTitle} />;
  };

  if (isLoading || redirecting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white text-center">
        <Image
          src="/image_icon/fund_cpkku_logo.png"
          alt="โลโก้กองทุนวิจัย"
          width={160}
          height={160}
          priority
        />
        <h1 className="text-2xl font-bold text-gray-900">{APP_DISPLAY_NAME}</h1>
        <div className="space-y-1 text-gray-600">
          <p className="text-lg font-medium text-gray-700">กำลังโหลดหน้า...</p>
          <p className="text-sm text-gray-500">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <PublicHeader
        isOpen={isMenuOpen}
        setIsOpen={setIsMenuOpen}
        currentPageTitle={currentPageTitle}
      />

      <main className="pt-40 lg:pt-32 px-4 sm:px-6 lg:px-8 pb-8">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-sm">
            <div className="border-b border-gray-300 bg-gray-50 p-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {TABS.map((tab) => {
                  const active = currentPage === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setCurrentPage(tab.id)}
                      className={`whitespace-nowrap rounded-md border px-4 py-2 text-sm font-medium transition ${
                        active
                          ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                          : "border-transparent bg-transparent text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-100 p-3 sm:p-4">{renderPageContent()}</div>
          </div>
        </div>
      </main>
    </div>
  );
}




