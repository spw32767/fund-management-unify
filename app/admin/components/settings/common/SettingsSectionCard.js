"use client";

import React from "react";
import { motion } from "framer-motion";

const cardMotionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: "easeOut" },
};

export default function SettingsSectionCard({
  icon: Icon,
  iconSize = 20,
  iconBgClass = "bg-blue-100",
  iconColorClass = "text-blue-600",
  title,
  description,
  actions,
  children,
  className = "",
  headerClassName = "",
  contentClassName = "",
}) {
  return (
    <motion.div
      {...cardMotionProps}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`.trim()}
    >
      <div
        className={`px-6 py-4 border-b border-gray-200 flex flex-col gap-4 md:flex-row md:items-center md:justify-between ${headerClassName}`.trim()}
      >
        <div className="flex items-center gap-3">
          {Icon ? (
            <div className={`inline-flex items-center justify-center p-2 rounded-lg ${iconBgClass}`}>
              <Icon size={iconSize} className={iconColorClass} />
            </div>
          ) : null}
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            {description ? (
              <p className="text-sm text-gray-600">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <div className={`p-6 ${contentClassName}`.trim()}>{children}</div>
    </motion.div>
  );
}