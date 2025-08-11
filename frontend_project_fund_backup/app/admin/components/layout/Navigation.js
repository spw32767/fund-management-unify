// app/admin/components/layout/Navigation.js
"use client";

import { 
  LayoutDashboard,
  DollarSign,
  FileText,
  Settings,
  LogOut,
  HandHelping,
  ClipboardCheck,
  FileCheck
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function Navigation({ 
  currentPage, 
  setCurrentPage,
  handleNavigate, 
  submenuOpen, 
  setSubmenuOpen 
}) {
  const { logout } = useAuth();
  const router = useRouter();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'แดชบอร์ด',
      icon: LayoutDashboard,
      hasSubmenu: false
    },
    {
      id: 'research-fund',
      label: 'ทุนส่งเสริมงานวิจัย',
      icon: HandHelping,
      hasSubmenu: false
    },
    {
      id: 'promotion-fund',
      label: 'ทุนอุดหนุนกิจกรรม',
      icon: DollarSign,
      hasSubmenu: false
    },
    {
      id: 'applications-list',
      label: 'รายการการขอทุน',
      icon: FileText,
      hasSubmenu: false    
    },
    {
      id: 'fund-settings',
      label: 'ตั้งค่าทุน',
      icon: Settings,
      hasSubmenu: false
    },
    {
      id: 'approval-records',
      label: 'บันทึกข้อมูลการอนุมัติทุน',
      icon: FileCheck,
      hasSubmenu: false
    }
  ];

  const handleMenuClick = (item) => {
    if (item.hasSubmenu) {
      setSubmenuOpen(!submenuOpen);
    } else {
      // ใช้ handleNavigate ถ้ามี ไม่งั้นใช้ setCurrentPage
      if (handleNavigate) {
        handleNavigate(item.id);
      } else {
        setCurrentPage(item.id);
      }
      // Close mobile menu if open
      const mobileMenuButton = document.querySelector('[aria-label="close-mobile-menu"]');
      if (mobileMenuButton) mobileMenuButton.click();
    }
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

  const isActive = (itemId) => {
    return currentPage === itemId;
  };

  return (
    <nav className="pb-40 md:ms-4">
      {menuItems.map((item) => (
        <div key={item.id}>
          <button
            onClick={() => handleMenuClick(item)}
            className={`flex items-center gap-2 mb-2.5 w-full hover:text-blue-500 transition-colors ${
              isActive(item.id) ? 'text-blue-500 font-semibold' : 'text-gray-700'
            }`}
          >
            <item.icon size={20} />
            <div className="flex-1 text-left">
              <span>{item.label}</span>
              {item.description && (
                <span className="text-xs text-gray-500 block">{item.description}</span>
              )}
            </div>
          </button>
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