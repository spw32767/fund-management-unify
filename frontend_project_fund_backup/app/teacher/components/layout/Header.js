"use client";

import { HiMenu } from "react-icons/hi";
import { RxCross2 } from "react-icons/rx";
import { User, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import NotificationBell from "../notifications/NotificationBell";

export default function Header({ isOpen, setIsOpen, Navigation }) {
  const { user, logout, getUserDisplayName, getUserRoleDisplay } = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout API fails, still redirect to login
      router.replace('/login');
    }
  };

  const getInitials = () => {
    if (!user) return 'U';
    const firstName = user.user_fname || '';
    const lastName = user.user_lname || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-50 shadow">
      <div className="flex h-20 w-full items-center justify-between">
        <div className="ml-8">
          <div className="w-40 h-12 bg-gray-50">
            <img src="/image_icon/iconcpkku.png" alt="Logo" />
          </div>
        </div>

        <div className="flex flex-row items-center">
          <div className="flex flex-row items-center gap-4 mr-6">
            {/* Notification Bell */}
            <NotificationBell />

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="hidden md:flex items-center gap-3 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {getInitials()}
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-800">
                    {getUserDisplayName() || 'Loading...'}
                  </div>
                  <div className="text-xs text-gray-600">
                    {getUserRoleDisplay()}
                  </div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      // Navigate to profile page
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
                  >
                    <User size={16} />
                    <span>ข้อมูลส่วนตัว</span>
                  </button>
                  <hr className="my-1" />
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

          {/* Mobile Menu Button */}
          <button
            className={`${
              isOpen ? "block" : "hidden"
            } inline-flex items-center justify-center me-4 ms-3 p-2 w-10 h-10 text-sm text-gray-500 rounded-lg
        md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200`}
            onClick={() => setIsOpen(!isOpen)}
          >
            <HiMenu className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        
        {/* Mobile Menu Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-gray-200/50 z-40"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="absolute top-0 pt-5 right-0 h-screen z-50 w-64 bg-white shadow p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end mb-3">
                <button 
                  onClick={() => setIsOpen(false)}
                  aria-label="close-mobile-menu"
                >
                  <RxCross2 className="w-7 h-7 text-gray-600 hover:text-red-500" />
                </button>
              </div>
              
              {/* Mobile User Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg md:hidden">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {getInitials()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">
                      {getUserDisplayName() || 'Loading...'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {getUserRoleDisplay()}
                    </div>
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
              
              {Navigation}
            </div>
          </div>
        )}
      </div>
      
      {/* Click outside to close dropdown */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
}