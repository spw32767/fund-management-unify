"use client";

import { useEffect, useState } from "react";
import AdminPublicationsImport from "./AdminPublicationsImport";
import AdminScopusImport from "./AdminScopusImport";
import AdminKkuPeopleScraper from "./AdminKkuPeopleScraper";

const TAB_CONFIG = [
  {
    id: "scholar",
    label: "Google Scholar",
    description: "นำเข้าผลงานวิชาการและตั้งค่า Google Scholar Author ID",
  },
  {
    id: "scopus",
    label: "Scopus",
    description: "จัดการ Scopus Author ID, API Key และกระบวนการนำเข้าข้อมูลงานวิจัย",
  },
  {
    id: "kku-profile",
    label: "KKU Profile",
    description: "ดึงข้อมูลโปรไฟล์บุคลากรจากระบบมหาวิทยาลัย",
  },
];

function getValidTab(tabId) {
  return TAB_CONFIG.some((tab) => tab.id === tabId) ? tabId : "scholar";
}

export default function AdminAcademicImports({ initialTab = "scholar" }) {
  const [activeTab, setActiveTab] = useState(getValidTab(initialTab));

  useEffect(() => {
    setActiveTab(getValidTab(initialTab));
  }, [initialTab]);

  const renderContent = () => {
    switch (activeTab) {
      case "scopus":
        return <AdminScopusImport />;
      case "kku-profile":
        return <AdminKkuPeopleScraper />;
      case "scholar":
      default:
        return <AdminPublicationsImport />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Academic Data Import
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">
          ข้อมูลผลงานวิชาการ / Academic Data Import
        </h1>
        <p className="text-sm text-slate-600">
          รวมเครื่องมือนำเข้าข้อมูลจากหลายแหล่งไว้ในหน้าจอเดียว จัดการ Author ID,
          API Key และการเรียกใช้งานตัวดึงข้อมูลได้โดยไม่ต้องสลับเมนู
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:gap-3 sm:px-6">
          {TAB_CONFIG.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-50 ${
                  isActive
                    ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                    : "text-slate-600 hover:bg-white hover:text-blue-700"
                }`}
              >
                <div>{tab.label}</div>
                <div className="text-[11px] font-normal text-slate-500">
                  {tab.description}
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-white p-4 sm:p-6">{renderContent()}</div>
      </div>

    </div>
  );
}