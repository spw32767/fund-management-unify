"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const SIZE_CLASS_MAP = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  "2xl": "max-w-4xl",
  "3xl": "max-w-5xl",
  full: "max-w-full",
};

const SettingsModal = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "lg",
  panelClassName = "",
  bodyClassName = "max-h-[75vh] overflow-y-auto px-6 py-5",
  footerClassName = "flex items-center justify-end gap-3 px-6 py-4",
  hideCloseButton = false,
  closeOnBackdrop = true,
  headerClassName = "flex items-center justify-between border-b border-gray-100 px-6 py-4",
  headerContent,
}) => {
  const [shouldRender, setShouldRender] = useState(open);
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    let timeoutId;

    if (open) {
      setShouldRender(true);
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => setIsVisible(true));
      } else {
        setIsVisible(true);
      }
    } else {
      setIsVisible(false);
      timeoutId = setTimeout(() => setShouldRender(false), 200);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [open]);

  if (!shouldRender) return null;

  const sizeClass = SIZE_CLASS_MAP[size] || size || SIZE_CLASS_MAP.lg;

  const showHeader = Boolean(headerContent || title || description || !hideCloseButton);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-8 transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        className={`relative w-full transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-200 ${
          isVisible ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
        } ${sizeClass} ${panelClassName}`}
      >
        {showHeader && (
          <div className={headerClassName}>
            {headerContent ? (
              <div className="flex flex-1 items-center justify-between gap-4">
                <div className="flex-1">{headerContent}</div>
                {!hideCloseButton ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    aria-label="ปิดหน้าต่าง"
                  >
                    <X size={18} />
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                <div>
                  {title ? <div className="text-lg font-semibold text-gray-900">{title}</div> : null}
                  {description ? <p className="text-sm text-gray-500">{description}</p> : null}
                </div>
                {!hideCloseButton ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    aria-label="ปิดหน้าต่าง"
                  >
                    <X size={18} />
                  </button>
                ) : null}
              </>
            )}
          </div>
        )}
        <div className={bodyClassName}>{children}</div>
        {footer ? <div className={footerClassName}>{footer}</div> : null}
      </div>
    </div>
  );
};

export default SettingsModal;