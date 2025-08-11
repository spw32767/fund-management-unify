// SimpleCard.js - Simple Card Component without expand/collapse
"use client";

export default function SimpleCard({ 
  title, 
  children, 
  icon: Icon,
  action,
  className = "",
  headerClassName = "",
  bodyClassName = "",
  noPadding = false,
  noHeader = false
}) {
  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {!noHeader && (
        <div 
          className={`p-5 border-b border-gray-200 flex justify-between items-center ${headerClassName}`}
        >
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            {Icon && <Icon size={20} className="text-gray-600" />}
            {title}
          </h3>
          {action && (
            <div>{action}</div>
          )}
        </div>
      )}
      
      <div className={noPadding ? '' : 'p-6'}>
        <div className={bodyClassName}>
          {children}
        </div>
      </div>
    </div>
  );
}