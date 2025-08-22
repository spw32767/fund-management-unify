"use client";

import { 
  LayoutDashboard,
  ChevronDown,
  FileText,
  DollarSign,
  LogOut,
  HandHelping,
  ClipboardList,
  PlusCircle,
  User,
  Gift,
  TrendingUp
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
      id: 'profile',
      label: 'ข้อมูลส่วนตัว',
      icon: User,
      hasSubmenu: false
    },
    {
      id: 'research-fund',
      label: 'ทุนส่งเสริมการวิจัย',
      icon: TrendingUp,
      hasSubmenu: false
    },
    {
      id: 'promotion-fund',
      label: 'ทุนอุดหนุนกิจกรรม',
      icon: DollarSign,
      hasSubmenu: false
    },
    {
      id: 'applications',
      label: 'คำร้องของฉัน',
      icon: ClipboardList,
      hasSubmenu: false
    },
    {
      id: 'received-funds',
      label: 'ทุนที่เคยได้รับ',
      icon: Gift,
      hasSubmenu: false
    },
    {
    id: 'announcements',
    label: 'ประกาศกองทุนวิจัยและนวัตกรรม',
    icon: FileText,
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

  const handleSubmenuClick = (parentId, submenuItem) => {
    // ใช้ handleNavigate ถ้ามี ไม่งั้นใช้ setCurrentPage
    if (handleNavigate) {
      handleNavigate(submenuItem.id);
    } else {
      setCurrentPage(submenuItem.id);
    }
    // Close mobile menu if open
    const mobileMenuButton = document.querySelector('[aria-label="close-mobile-menu"]');
    if (mobileMenuButton) mobileMenuButton.click();
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
    return currentPage === itemId || 
           (itemId === 'submit-request' && ['application-form', 'draft'].includes(currentPage));
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