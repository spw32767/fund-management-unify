"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { HiMenu } from "react-icons/hi";
import { RxCross2 } from "react-icons/rx";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { BRANDING } from "../../../config/branding";

const roleLabels = {
  teacher: "อาจารย์",
  staff: "เจ้าหน้าที่",
  admin: "ผู้ดูแลระบบ",
  dept_head: "หัวหน้าสาขา",
};

function resolveRoleLabel(user) {
  if (!user) return null;

  if (user.role && roleLabels[user.role]) {
    return roleLabels[user.role];
  }

  if (typeof user.role_id === "number") {
    switch (user.role_id) {
      case 1:
        return roleLabels.teacher;
      case 2:
        return roleLabels.staff;
      case 3:
        return roleLabels.admin;
      case 4:
        return roleLabels.dept_head;
      default:
        return null;
    }
  }

  return null;
}

function getDisplayName(user) {
  if (!user) return "Loading...";

  const prefix =
    user.prefix || user.prefix_name || user.title || user.position || "";
  const firstName =
    user.user_fname || user.first_name || user.firstname || user.name || "";
  const lastName = user.user_lname || user.last_name || user.lastname || "";

  const fullName = [prefix, firstName, lastName]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (fullName) {
    return fullName;
  }

  if (user.email) {
    return user.email;
  }

  return "ผู้ใช้งาน";
}

function getInitials(displayName) {
  if (!displayName) return "MB";

  const parts = displayName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "MB";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase() || "MB";
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Header({
  isOpen,
  setIsOpen,
  Navigation,
  currentPageTitle = "แดชบอร์ดบุคลากร",
}) {
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

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const roleLabel = useMemo(() => resolveRoleLabel(user), [user]);
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      router.replace("/login");
    }
  };

  const handleToggleMenu = () => {
    setIsOpen?.((prev) => !prev);
  };

  const handleCloseMenu = () => {
    setIsOpen?.(false);
  };

  const renderNavigation = () => {
    if (!Navigation) return null;
    if (typeof Navigation === "function") {
      return Navigation({ closeMenu: handleCloseMenu });
    }
    return Navigation;
  };

  return (
    <header className="fixed top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="px-6 py-4 flex justify-between items-center">
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <button
            className={`${
              isOpen ? "hidden" : "block"
            } inline-flex items-center justify-center me-4 ms-3 p-2 w-10 h-10 text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200`}
            onClick={handleToggleMenu}
            aria-label="open-mobile-menu"
          >
            <HiMenu className="w-5 h-5 text-gray-700" />
          </button>

          <div className={logoContainerClass}>{renderLogoContent()}</div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {appName || "Fund Management"}
            </h1>
            <p className="text-xs text-gray-600">
              {subtitles.member || "ระบบบริหารจัดการทุน - Member"}
            </p>
            <p className="text-xs text-gray-500 mt-1">{currentPageTitle}</p>
          </div>
        </div>

        {/* Desktop User Menu */}
        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800">{displayName}</p>
            {roleLabel ? (
              <p className="text-xs text-gray-600">{roleLabel}</p>
            ) : null}
          </div>

          {/* User Avatar with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                {initials}
              </div>
              <ChevronDown size={16} className="text-gray-600" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Close Button */}
        {isOpen && (
          <button
            className="md:hidden inline-flex items-center justify-center me-4 ms-3 p-2 w-10 h-10 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
            onClick={handleCloseMenu}
            aria-label="close-mobile-menu"
          >
            <RxCross2 className="w-5 h-5 text-gray-700" />
          </button>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-gray-200/50 z-40" onClick={handleCloseMenu}>
          <div
            className="absolute top-0 pt-5 right-0 h-screen z-50 w-64 bg-white shadow p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-3">
              <button onClick={handleCloseMenu} aria-label="close-mobile-menu">
                <RxCross2 className="w-7 h-7 text-gray-600 hover:text-red-500" />
              </button>
            </div>

            {/* Mobile User Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg md:hidden">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {initials}
                </div>
                <div>
                  <div className="font-medium text-gray-800">{displayName}</div>
                  {roleLabel ? (
                    <div className="text-xs text-gray-600">{roleLabel}</div>
                  ) : null}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left text-sm text-red-600 hover:text-red-700 flex items-center gap-2"
              >
                <LogOut size={14} />
                ออกจากระบบ
              </button>
            </div>

            {renderNavigation()}
          </div>
        </div>
      )}
    </header>
  );
}