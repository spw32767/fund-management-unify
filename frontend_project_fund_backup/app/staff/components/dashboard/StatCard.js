// dashboard/StatCard.js
import { FileText, TrendingUp, Calendar, DollarSign } from "lucide-react";

export default function StatCard({ stats }) {
  const cards = [
    {
      number: stats.myApplications.total,
      label: "คำร้องทั้งหมดของฉัน",
      gradient: "from-blue-500 to-purple-500",
      icon: FileText
    },
    {
      number: stats.myApplications.approved,
      label: "อนุมัติแล้ว",
      gradient: "from-green-500 to-blue-500",
      icon: TrendingUp
    },
    {
      number: stats.myApplications.pending,
      label: "รอพิจารณา",
      gradient: "from-pink-400 to-violet-500",
      icon: Calendar
    },
    {
      number: `฿${stats.budgetUsed.thisYear.toLocaleString()}`,
      label: "งบประมาณที่ได้รับปีนี้",
      gradient: "from-red-500 to-pink-500",
      icon: DollarSign
    }
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