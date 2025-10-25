"use client";

import { Home, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PublicNavigation({
  currentPage,
  onNavigate,
  closeMenu,
}) {
  const router = useRouter();

  const handleHomeClick = () => {
    if (onNavigate) {
      onNavigate("home");
    }
    if (closeMenu) {
      closeMenu();
    }
  };

  const handleLoginClick = () => {
    if (closeMenu) {
      closeMenu();
    }
    router.push("/login");
  };

  const isActive = (page) => currentPage === page;

  return (
    <nav className="pb-40 md:ms-4">
      <button
        onClick={handleHomeClick}
        className={`flex items-center gap-2 mb-2.5 w-full transition-colors ${
          isActive("home")
            ? "text-blue-500 font-semibold"
            : "text-gray-700 hover:text-blue-500"
        }`}
      >
        <Home size={20} />
        <span className="flex-1 text-left">หน้าหลัก</span>
      </button>

      <div className="border-t border-gray-200 mt-6 pt-4">
        <button
          onClick={handleLoginClick}
          className="flex items-center gap-2 text-gray-700 hover:text-blue-500 transition-colors w-full"
        >
          <LogIn size={20} />
          <span>เข้าสู่ระบบ</span>
        </button>
      </div>
    </nav>
  );
}