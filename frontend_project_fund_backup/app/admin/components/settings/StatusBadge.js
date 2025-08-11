// components/common/StatusBadge.js
import React from "react";

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    status === 'active' 
      ? 'bg-green-100 text-green-800 border border-green-200' 
      : 'bg-red-100 text-red-800 border border-red-200'
  }`}>
    {status === 'active' ? (
      <>
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
        เปิดใช้งาน
      </>
    ) : (
      <>
        <div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-1"></div>
        ปิดใช้งาน
      </>
    )}
  </span>
);

export default StatusBadge;