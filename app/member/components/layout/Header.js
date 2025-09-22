"use client";

import {
  LayoutDashboard,
  ChevronDown,
  FileText,
  DollarSign,
  LogOut,
  HandHelping,
  ClipboardList,
  User,
  Gift,
  Bell,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";

export default function Navigation({ 
  currentPage, 
  setCurrentPage,
  handleNavigate, 
  submenuOpen, 
  setSubmenuOpen 
}) {
  const { logout, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const roleName = user?.role || (user?.role_id != null ? (
    user.role_id === 1 ? 'teacher' :
    user.role_id === 2 ? 'staff' :
    user.role_id === 3 ? 'admin' :
    user.role_id === 4 ? 'dept_head' : null
  ) : null);

  const baseMenu = [
    {
      id: 'funds',
      label: 'ทุนที่สมัครได้',
      icon: DollarSign,
      href: '/member/funds',
      pageId: 'research-fund',
    },
    {
      id: 'applications',
      label: 'คำร้องของฉัน',
      icon: ClipboardList,
      href: '/member/applications',
      pageId: 'applications',
    },
    {
      id: 'notifications',
      label: 'การแจ้งเตือน',
      icon: Bell,
      href: '/member/notifications',
      pageId: 'notifications',
    },
  ];

  const featureMenu = [
    {
      id: 'dashboard',
      label: 'แดชบอร์ด',
      icon: LayoutDashboard,
    },
    {
      id: 'profile',
      label: 'ข้อมูลส่วนตัว',
      icon: User,
    },
    {
      id: 'promotion-fund',
      label: 'ทุนอุดหนุนกิจกรรม',
      icon: HandHelping,
    },
    {
      id: 'received-funds',
      label: 'ทุนที่เคยได้รับ',
      icon: Gift,
    },
    {
      id: 'announcements',
      label: 'ประกาศกองทุนวิจัยและนวัตกรรม',
      icon: FileText,
    },
    {
      id: 'generic-fund-application',
      label: 'ทดสอบหน้า',
      icon: FileText,
    },
  ];

  const deptHeadMenu = roleName === 'dept_head'
    ? [{
        id: 'dept-review',
        label: 'พิจารณาคำร้อง (สาขา)',
        icon: ShieldCheck,
        href: '/member/dept-review',
      }]
    : [];

  const menuItems = [...baseMenu, ...featureMenu, ...deptHeadMenu];

  const closeMobileMenu = () => {
    const mobileMenuButton = document.querySelector('[aria-label="close-mobile-menu"]');
    if (mobileMenuButton) mobileMenuButton.click();
  };

  const handleMenuClick = (item) => {
    if (item.hasSubmenu) {
      setSubmenuOpen(!submenuOpen);
      return;
    }

    if (item.href) {
      router.push(item.href);
    } else if (item.pageId && handleNavigate) {
      handleNavigate(item.pageId);
    } else if (handleNavigate) {
      handleNavigate(item.id);
    } else if (item.pageId) {
      setCurrentPage(item.pageId);
    } else {
      setCurrentPage(item.id);
    }

    closeMobileMenu();
  };

  const handleSubmenuClick = (parentId, submenuItem) => {
    // ใช้ handleNavigate ถ้ามี ไม่งั้นใช้ setCurrentPage
    if (handleNavigate) {
      handleNavigate(submenuItem.id);
    } else {
      setCurrentPage(submenuItem.id);
    }
    closeMobileMenu();
  };

  const handleLogout = async () => {
    try {
      console.log("Logout from navigation");
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout API fails, still redirect to login
      router.replace('/login');
    }
  };

  const isActive = (item) => {
    if (item.href && pathname?.startsWith(item.href)) {
      return true;
    }

    const targetId = item.pageId || item.id;
    return (
      currentPage === targetId ||
      (targetId === 'submit-request' && ['application-form', 'draft'].includes(currentPage))
    );
  };

  return (
    <nav className="pb-40 md:ms-4">
      {menuItems.map((item) => (
        <div key={item.id}>
          <button
            onClick={() => handleMenuClick(item)}
            className={`flex items-center gap-2 mb-2.5 w-full hover:text-blue-500 transition-colors ${
              isActive(item) ? 'text-blue-500 font-semibold' : 'text-gray-700'
            }`}
          >
            <item.icon size={20} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.hasSubmenu && (
              <ChevronDown
                size={16}
                className={`transition-transform duration-300 ${
                  submenuOpen && item.id === 'submit-request' ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>

          {/* Submenu */}
          {item.hasSubmenu && submenuOpen && item.id === 'submit-request' && (
            <div className="ml-6 mt-2 space-y-1 animate-in slide-in-from-top-2">
              {item.submenu.map((subItem) => (
                <button
                  key={subItem.id}
                  onClick={() => handleSubmenuClick(item.id, subItem)}
                  className={`flex items-center gap-2 mb-2.5 w-full transition-colors ${
                    currentPage === subItem.id ? 'text-blue-500 font-semibold' : 'text-gray-700 hover:text-blue-500'
                  }`}
                >
                  <subItem.icon size={16} />
                  <span>{subItem.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Logout Button */}
      <div className="border-t border-gray-200 mt-6 pt-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition-colors w-full"
        >
          <LogOut size={20} />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </nav>
  );
}