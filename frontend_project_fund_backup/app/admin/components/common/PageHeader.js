// PageHeader.js - Consistent Page Header
"use client";

export default function PageHeader({ 
  title, 
  subtitle, 
  icon: Icon,
  actions,
  breadcrumbs 
}) {
  return (
    <div className="mt-6 mb-6">
      {/* Breadcrumbs */}
      {breadcrumbs && (
        <nav className="text-sm mb-2">
          <ol className="flex items-center space-x-2">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && <span className="mx-2 text-gray-400">/</span>}
                {crumb.href ? (
                  <a href={crumb.href} className="text-blue-600 hover:text-blue-700">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-gray-600">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Main Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            {Icon && <Icon size={32} className="text-gray-600" />}
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-gray-600">{subtitle}</p>
          )}
        </div>
        
        {actions && (
          <div className="flex gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Decorative Border */}
      <div className="mt-4 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full w-24"></div>
    </div>
  );
}