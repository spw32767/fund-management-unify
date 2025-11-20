// app/admin/components/layout/Header.js
"use client";

import Image from "next/image";
import { useState } from "react";
import { LogOut, ChevronDown } from "lucide-react";
import { HiMenu } from "react-icons/hi";
import { RxCross2 } from "react-icons/rx";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { BRANDING } from "../../../config/branding";
import NotificationBell from "@/app/components/notifications/NotificationBell";

export default function Header({ isOpen, setIsOpen, Navigation }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const {
    appName,
    appAcronym,
    subtitles = {},
    logo: {
      text: logoText,
      imageSrc: logoImageSrc,
      imageAlt: logoImageAlt,
      backgroundClass: logoBackgroundClass,
    } = {},
  } = BRANDING;

  const logoContainerClass = [
    "w-10 h-10 rounded-lg flex items-center justify-center",
    logoBackgroundClass ?? "bg-gradient-to-br from-blue-500 to-purple-600",
  ]
    .filter(Boolean)
    .join(" ");

  const renderLogoContent = () => {
    if (logoImageSrc) {
      return (
        <Image
          src={logoImageSrc}
          alt={logoImageAlt || appName || "Application logo"}
          width={32}
          height={32}
          className="w-8 h-8 object-contain"
          priority
        />
      );
    }

    return (
      <span className="text-white font-bold text-xl">
        {logoText || appAcronym || "F"}
      </span>
    );
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return 'Loading...';

    const prefix = user.prefix || user.position || '';
    const firstName = user.user_fname || user.first_name || '';
    const lastName = user.user_lname || user.last_name || '';

    return [prefix, firstName, lastName]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Get initials for avatar
  const getInitials = () => {
    if (!user) return 'AD';
    const fname = user.user_fname || '';
    const lname = user.user_lname || '';
    const initialsSource = `${fname} ${lname}`.trim() || user.prefix || 'AD';
    const parts = initialsSource
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) return 'AD';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase() || 'AD';

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Get role display
  const getUserRoleDisplay = () => {
    return 'ผู้ดูแลระบบ';
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.replace('/login');
    }
  };

  const renderNavigationContent = () => {
    if (!Navigation) return null;
    if (typeof Navigation === "function") {
      const NavigationComponent = Navigation;
      return <NavigationComponent />;
    }
    return Navigation;
  };

  return (
    <header className="fixed top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={logoContainerClass}>{renderLogoContent()}</div>
            <div>
              <h1 className="text-lg font-bold text-gray-800 sm:text-xl">
                {appName || "Fund Management"}
              </h1>
              <p className="text-xs text-gray-600">
                {subtitles.admin || "ระบบบริหารจัดการทุน - Admin"}
              </p>
            </div>
          </div>

          <button
            className={`${
              isOpen ? "invisible" : "inline-flex"
            } items-center justify-center rounded-lg border border-gray-200 p-2 text-sm text-gray-600 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 md:hidden`}
            onClick={() => setIsOpen(true)}
            aria-label="open-mobile-menu"
          >
            <HiMenu className="h-5 w-5" />
          </button>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <NotificationBell />
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800">{getUserDisplayName()}</p>
            <p className="text-xs text-gray-600">{getUserRoleDisplay()}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-gray-100"
              aria-haspopup="menu"
              aria-expanded={showUserMenu}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                {getInitials()}
              </div>
              <ChevronDown size={16} className="text-gray-600" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-600 transition hover:bg-red-50"
                >
                  <LogOut size={16} />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative ml-auto flex h-full w-72 max-w-full flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">เมนูการจัดการ</p>
                <p className="text-xs text-gray-500">{getUserDisplayName()}</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="close-mobile-menu"
                className="rounded-lg p-1 text-gray-500 transition hover:text-gray-700"
              >
                <RxCross2 className="h-6 w-6" />
              </button>
            </div>

            <div className="border-b border-gray-100 p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                  {getInitials()}
                </div>
                <div>
                  <div className="font-medium text-gray-800">
                    {getUserDisplayName() || "Loading..."}
                  </div>
                  <div className="text-xs text-gray-600">{getUserRoleDisplay()}</div>
                </div>
              </div>
              <div className="mb-4 flex items-center gap-3 text-sm text-gray-700">
                <NotificationBell />
                <span>การแจ้งเตือน</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 text-sm text-red-600 transition hover:text-red-700"
              >
                <LogOut size={14} />
                ออกจากระบบ
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4" onClick={(e) => e.stopPropagation()}>
              {renderNavigationContent()}
            </div>
          </div>
        </div>
      )}
    </header>
  );

}