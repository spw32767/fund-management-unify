"use client";

// dashboard/StatCard.js
import { useMemo } from "react";
import { FileText, TrendingUp, Calendar, DollarSign, AlertCircle, RefreshCcw } from "lucide-react";
import { useStatusMap } from "@/app/hooks/useStatusMap";

const STATUS_CARD_STYLES = {
  approved: { gradient: "from-green-500 to-blue-500", icon: TrendingUp },
  pending: { gradient: "from-pink-400 to-violet-500", icon: Calendar },
  rejected: { gradient: "from-red-500 to-rose-500", icon: AlertCircle },
  revision: { gradient: "from-orange-400 to-amber-500", icon: RefreshCcw },
  draft: { gradient: "from-gray-500 to-slate-600", icon: FileText },
};

export default function StatCard({ stats }) {
  const { statuses } = useStatusMap();

  const statusCards = useMemo(() => {
    if (!Array.isArray(statuses) || !stats?.myApplications) {
      return [];
    }

    return statuses
      .map((status) => {
        const count = stats.myApplications[status.status_code];
        if (typeof count !== "number") {
          return null;
        }

        const style = STATUS_CARD_STYLES[status.status_code] || {
          gradient: "from-gray-500 to-slate-600",
          icon: FileText,
        };

        return {
          number: count,
          label: status.status_name,
          gradient: style.gradient,
          icon: style.icon,
        };
      })
      .filter(Boolean);
  }, [statuses, stats?.myApplications]);

  const cards = [
    {
      number: stats.myApplications.total,
      label: "คำร้องทั้งหมดของฉัน",
      gradient: "from-blue-500 to-purple-500",
      icon: FileText,
    },
    ...statusCards,
    {
      number: `฿${stats.budgetUsed.thisYear.toLocaleString()}`,
      label: "งบประมาณที่ได้รับปีนี้",
      gradient: "from-red-500 to-pink-500",
      icon: DollarSign,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`bg-gradient-to-br ${card.gradient} text-white p-6 rounded-lg shadow-lg relative overflow-hidden transform transition-transform hover:scale-105`}
        >
          <div className="relative z-10">
            <div className="text-4xl font-bold mb-1">{card.number}</div>
            <div className="text-sm opacity-90">{card.label}</div>
          </div>
          <div className="absolute right-4 bottom-4 opacity-20">
            <card.icon size={64} />
          </div>
        </div>
      ))}
    </div>
  );
}