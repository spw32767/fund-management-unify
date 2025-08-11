// app/admin/components/layout/Header.js
"use client";

import { useAuth } from "../../../contexts/AuthContext";
import { useState } from "react";
import { User, LogOut, ChevronDown } from "lucide-react";
import { HiMenu } from "react-icons/hi";
import { RxCross2 } from "react-icons/rx";
import { useRouter } from "next/navigation";

export default function Header({ isOpen, setIsOpen, Navigation }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return 'Loading...';
    return `${user.position || ''}${user.user_fname || ''} ${user.user_lname || ''}`.trim();
  };

  // Get initials for avatar
  const getInitials = () => {
    if (!user) return 'AD';
    const fname = user.user_fname || '';
    const lname = user.user_lname || '';
    return `${fname.charAt(0)}${lname.charAt(0)}`.toUpperCase() || 'AD';
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

  return (
    <header className="fixed top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="px-6 py-4 flex justify-between items-center">
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Fund Management</h1>
            <p className="text-xs text-gray-600">ระบบบริหารจัดการทุน - Admin</p>
          </div>
        </div>

        {/* Desktop User Menu */}
        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800">{getUserDisplayName()}</p>
            <p className="text-xs text-gray-600">{getUserRoleDisplay()}</p>
          </div>
          
          {/* User Avatar with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                {getInitials()}
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

        {/* Mobile Menu Button */}
        <button
          className={`${
            isOpen ? "hidden" : "block"
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
    </header>
  );
}