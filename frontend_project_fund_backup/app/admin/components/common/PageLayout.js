// PageLayout.js - Template for consistent page structure
"use client";

import PageHeader from "./PageHeader";
import LoadingSpinner from "./LoadingSpinner";

export default function PageLayout({ 
  children, 
  title, 
  subtitle, 
  icon, 
  actions, 
  breadcrumbs,
  loading = false 
}) {
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        actions={actions}
        breadcrumbs={breadcrumbs}
      />
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}