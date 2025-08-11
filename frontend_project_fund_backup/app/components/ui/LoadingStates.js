// components/ui/LoadingStates.js - Reusable Loading and Error Components
'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

// Loading Spinner Component
export function LoadingSpinner({ size = 'medium', color = 'blue', text = '' }) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const colorClasses = {
    blue: 'border-blue-200 border-t-blue-600',
    purple: 'border-purple-200 border-t-purple-600',
    green: 'border-green-200 border-t-green-600',
    red: 'border-red-200 border-t-red-600',
    gray: 'border-gray-200 border-t-gray-600',
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`${sizeClasses[size]} border-4 ${colorClasses[color]} rounded-full animate-spin`}></div>
      {text && (
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
}

// Full Page Loading Component
export function PageLoading({ message = 'กำลังโหลด...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="xl" color="blue" />
        <p className="mt-4 text-lg text-gray-600">{message}</p>
        <div className="mt-2 text-sm text-gray-500">
          กรุณารอสักครู่...
        </div>
      </div>
    </div>
  );
}

// Error Alert Component
export function ErrorAlert({ 
  title = 'เกิดข้อผิดพลาด', 
  message, 
  type = 'error', 
  onRetry, 
  onDismiss,
  className = '' 
}) {
  const typeConfig = {
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-500',
      icon: XCircle,
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-500',
      icon: AlertTriangle,
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-500',
      icon: AlertCircle,
    },
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-500',
      icon: CheckCircle,
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className={`flex-shrink-0 mt-0.5 ${config.iconColor}`} size={20} />
        <div className="flex-1">
          <h4 className={`font-medium ${config.textColor}`}>{title}</h4>
          {message && (
            <p className={`mt-1 text-sm ${config.textColor} opacity-90`}>{message}</p>
          )}
          
          {(onRetry || onDismiss) && (
            <div className="mt-3 flex gap-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`text-sm ${config.textColor} hover:opacity-80 underline font-medium`}
                >
                  ลองใหม่
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className={`text-sm ${config.textColor} hover:opacity-80 underline`}
                >
                  ปิด
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Connection Status Component
export function ConnectionStatus({ 
  isOnline = true, 
  onRetry, 
  className = '' 
}) {
  if (isOnline) {
    return (
      <div className={`flex items-center gap-2 text-green-600 ${className}`}>
        <Wifi size={16} />
        <span className="text-sm font-medium">เชื่อมต่อแล้ว</span>
      </div>
    );
  }

  return (
    <div className={`p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
      <div className="flex items-center gap-3">
        <WifiOff className="text-red-600" size={16} />
        <div className="flex-1">
          <span className="text-sm font-medium text-red-800">
            ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้
          </span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-red-600 hover:text-red-700 p-1 rounded"
            title="ลองเชื่อมต่อใหม่"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// Loading Button Component
export function LoadingButton({
  children,
  isLoading = false,
  loadingText = 'กำลังประมวลผล...',
  disabled = false,
  className = '',
  size = 'medium',
  variant = 'primary',
  ...props
}) {
  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg',
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700',
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`
        relative font-medium rounded-lg transition-colors duration-200 
        flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="small" color="gray" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

// Data Loading State Component
export function DataLoadingState({
  isLoading = false,
  error = null,
  data = null,
  onRetry,
  loadingComponent,
  errorComponent,
  emptyComponent,
  children,
}) {
  if (isLoading && !data) {
    return loadingComponent || (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="large" text="กำลังโหลดข้อมูล..." />
      </div>
    );
  }

  if (error) {
    return errorComponent || (
      <ErrorAlert
        title="ไม่สามารถโหลดข้อมูลได้"
        message={error.message || error}
        onRetry={onRetry}
        className="my-4"
      />
    );
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return emptyComponent || (
      <div className="text-center py-8 text-gray-500">
        <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
        <p>ไม่พบข้อมูล</p>
      </div>
    );
  }

  return children;
}

// Progress Bar Component
export function ProgressBar({ 
  value = 0, 
  max = 100, 
  className = '',
  size = 'medium',
  color = 'blue',
  showLabel = false,
  label = ''
}) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeClasses = {
    small: 'h-2',
    medium: 'h-3',
    large: 'h-4',
  };

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-600',
    purple: 'bg-purple-600',
  };

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">
            {label}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} transition-all duration-300 ease-out ${sizeClasses[size]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}