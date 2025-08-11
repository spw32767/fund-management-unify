// dashboard/BudgetSummary.js
"use client";

import { DollarSign, TrendingUp, TrendingDown, PieChart } from "lucide-react";

export default function BudgetSummary({ budget }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const percentageUsed = budget.total > 0 
    ? ((budget.thisYear / budget.total) * 100).toFixed(1)
    : 0;

  const percentageRemaining = budget.total > 0
    ? ((budget.remaining / budget.total) * 100).toFixed(1)
    : 0;

  const budgetItems = [
    {
      label: "งบประมาณที่ได้รับทั้งหมด",
      value: formatCurrency(budget.total),
      icon: DollarSign,
      bgColor: "bg-gray-50",
      textColor: "text-gray-700",
      iconColor: "text-gray-500"
    },
    {
      label: "ใช้ไปในปีนี้",
      value: formatCurrency(budget.thisYear),
      icon: TrendingDown,
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      iconColor: "text-blue-500",
      percentage: `${percentageUsed}%`
    },
    {
      label: "คงเหลือสำหรับปีนี้",
      value: formatCurrency(budget.remaining),
      icon: TrendingUp,
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      iconColor: "text-green-500",
      percentage: `${percentageRemaining}%`
    }
  ];

  return (
    <div className="space-y-4">
      {/* Budget Items */}
      {budgetItems.map((item, index) => (
        <div
          key={index}
          className={`flex items-center justify-between p-4 ${item.bgColor} rounded-lg transition-all hover:shadow-md`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${item.bgColor}`}>
              <item.icon size={20} className={item.iconColor} />
            </div>
            <div>
              <p className="text-sm text-gray-600">{item.label}</p>
              {item.percentage && (
                <p className="text-xs text-gray-500">{item.percentage} ของทั้งหมด</p>
              )}
            </div>
          </div>
          <span className={`font-bold text-lg ${item.textColor}`}>
            {item.value}
          </span>
        </div>
      ))}

      {/* Visual Progress Bar */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">การใช้งบประมาณ</span>
          <span className="text-sm text-gray-600">{percentageUsed}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div className="h-full flex">
            <div 
              className="bg-blue-500 transition-all duration-500"
              style={{ width: `${percentageUsed}%` }}
            />
            <div 
              className="bg-green-500 transition-all duration-500"
              style={{ width: `${percentageRemaining}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <span className="text-blue-600">ใช้ไป: {percentageUsed}%</span>
          <span className="text-green-600">คงเหลือ: {percentageRemaining}%</span>
        </div>
      </div>

      {/* Summary Card */}
      <div className="mt-4 p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <PieChart size={20} />
          <h4 className="font-semibold">สรุปการใช้งบประมาณ</h4>
        </div>
        <p className="text-sm opacity-90">
          คุณได้ใช้งบประมาณไปแล้ว {percentageUsed}% จากงบประมาณทั้งหมดที่ได้รับ
        </p>
      </div>
    </div>
  );
}