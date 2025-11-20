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
    <div className="mb-6 mt-6 space-y-4">
      {/* Breadcrumbs */}
      {breadcrumbs && (
        <nav className="text-sm">
          <ol className="flex flex-wrap items-center gap-1 text-gray-500">
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-800 leading-tight sm:text-3xl">
            {Icon && <Icon size={32} className="text-gray-600" />}
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-gray-600">{subtitle}</p>
          )}
        </div>

        {actions && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {actions}
          </div>
        )}
      </div>

      {/* Decorative Border */}
      <div className="mt-4 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full w-24"></div>
    </div>
  );
}