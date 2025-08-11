// Card.js - Reusable Card Component with Animation
"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function Card({ 
  title, 
  children, 
  defaultCollapsed = false,
  icon: Icon,
  action,
  className = "",
  collapsible = true,
  headerClassName = "",
  bodyClassName = ""
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  
  const handleToggle = () => {
    if (collapsible) {
      setCollapsed(!collapsed);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      <div 
        className={`p-5 border-b border-gray-200 flex justify-between items-center transition-colors duration-200 ${
          collapsible ? 'cursor-pointer hover:bg-gray-50' : ''
        } ${headerClassName}`}
        onClick={handleToggle}
      >
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          {Icon && <Icon size={20} className="text-gray-600" />}
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {action && (
            <div onClick={(e) => e.stopPropagation()}>
              {action}
            </div>
          )}
          {collapsible && (
            <button 
              className="text-gray-500 hover:text-gray-700 p-1 transition-transform duration-300"
              aria-label={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? (
                <ChevronRight className="w-5 h-5 transform transition-transform duration-300" />
              ) : (
                <ChevronDown className="w-5 h-5 transform transition-transform duration-300" />
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Animated Content */}
      <div 
        className={`transition-all duration-300 ease-in-out ${
          collapsed ? 'max-h-0' : 'max-h-[4000px]'
        }`}
      >
        <div className={`p-6 ${bodyClassName} ${
          collapsed ? 'opacity-0' : 'opacity-100 transition-opacity duration-300 delay-100'
        }`}>
          {children}
        </div>
      </div>
    </div>
  );
}