"use client";

import { useMemo } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";

const roleLabels = {
  teacher: "อาจารย์",
  staff: "เจ้าหน้าที่",
  admin: "ผู้ดูแลระบบ",
  dept_head: "หัวหน้าสาขา"
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
  if (!user) return "ผู้ใช้งาน";

  const firstName =
    user.user_fname || user.first_name || user.firstname || user.name || "";
  const lastName = user.user_lname || user.last_name || user.lastname || "";

  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) {
    return fullName;
  }

  if (user.email) {
    return user.email;
  }

  return "ผู้ใช้งาน";
}

function getInitials(displayName) {
  if (!displayName) return "";

  const parts = displayName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Header({
  isOpen,
  setIsOpen,
  Navigation,
  currentPageTitle = "แดชบอร์ดบุคลากร",
}) {
  const { user } = useAuth();

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const roleLabel = useMemo(() => resolveRoleLabel(user), [user]);
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const toggleMenu = () => {
    setIsOpen?.((prev) => !prev);
  };

  const closeMenu = () => {
    setIsOpen?.(false);
  };

  const navigationContent = Navigation
    ? typeof Navigation === "function"
      ? Navigation({ closeMenu })
      : <Navigation closeMenu={closeMenu} />
    : null;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMenu}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 md:hidden"
            aria-label={isOpen ? "close-mobile-menu" : "open-mobile-menu"}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              ระบบบริหารจัดการกองทุนวิจัยและนวัตกรรม
            </p>
            <p className="text-xs font-medium text-slate-500">
              {currentPageTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right md:flex md:flex-col">
            <span className="text-sm font-semibold text-slate-900">
              {displayName}
            </span>
            {roleLabel ? (
              <span className="text-xs font-medium text-slate-500">
                {roleLabel}
              </span>
            ) : null}
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-blue-400 to-blue-300 text-sm font-semibold uppercase tracking-wide text-white shadow-md">
            {initials || ""}
          </div>
        </div>
      </div>

      <div
        className={`md:hidden transition-all duration-200 ${
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div className="border-t border-slate-200 bg-white shadow-lg">
          <div className="px-4 py-6">
            {navigationContent}
          </div>
        </div>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 md:hidden"
          onClick={closeMenu}
        />
      ) : null}
    </header>
  );
}
