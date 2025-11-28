"use client";

import Image from "next/image";
import { useMemo } from "react";
import { LogIn } from "lucide-react";
import { HiMenu } from "react-icons/hi";
import { RxCross2 } from "react-icons/rx";
import { useRouter } from "next/navigation";
import { BRANDING } from "../../config/branding";

export default function PublicHeader({
  isOpen,
  setIsOpen,
  Navigation,
  currentPageTitle = "หน้าหลัก",
}) {
  const router = useRouter();

  const {
    appName,
    appAcronym,
    subtitles = {},
    logo: {
      text: logoText,
      imageSrc: logoImageSrc,
      imageAlt: logoImageAlt,
      backgroundClass: logoBackgroundClass,
      containerClassName,
      containerStyle,
      imageWidth,
      imageHeight,
      imageClassName,
      imageStyle,
      useFill,
      imageWrapperClassName,
      imageWrapperStyle,
    } = {},
  } = BRANDING;

  const logoContainerClass = useMemo(() => {
    const baseSizeClass = containerClassName || "w-10 h-10";
    const sharedClasses = "rounded-lg flex items-center justify-center";
    const background = logoBackgroundClass ?? "bg-gradient-to-br from-blue-500 to-purple-600";

    return [baseSizeClass, sharedClasses, background].filter(Boolean).join(" ");
  }, [containerClassName, logoBackgroundClass]);

  const handleLogin = () => {
    router.push("/login");
  };

  const loginButtonBaseClass =
    "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:shadow-xl";

  const handleToggleMenu = () => {
    setIsOpen?.((prev) => !prev);
  };

  const handleCloseMenu = () => {
    setIsOpen?.(false);
  };

  const renderLogoContent = () => {
    if (logoImageSrc) {
      if (useFill) {
        return (
          <div
            className={`relative w-full h-full ${imageWrapperClassName || ""}`}
            style={imageWrapperStyle || undefined}
          >
            <Image
              src={logoImageSrc}
              alt={logoImageAlt || appName || "Application logo"}
              fill
              className={imageClassName || "object-contain"}
              priority
              style={imageStyle || undefined}
            />
          </div>
        );
      }

      return (
        <Image
          src={logoImageSrc}
          alt={logoImageAlt || appName || "Application logo"}
          width={imageWidth || 32}
          height={imageHeight || 32}
          className={imageClassName || "w-8 h-8 object-contain"}
          priority
          style={imageStyle || undefined}
        />
      );
    }

    return (
      <span className="text-white font-bold text-xl">
        {logoText || appAcronym || "F"}
      </span>
    );
  };

  const renderNavigation = () => {
    if (!Navigation) return null;
    if (typeof Navigation === "function") {
      return Navigation({ closeMenu: handleCloseMenu });
    }
    return Navigation;
  };

  return (
    <header className="fixed top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            className={`${
              isOpen ? "hidden" : "block"
            } inline-flex items-center justify-center me-4 ms-3 p-2 w-10 h-10 text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200`}
            onClick={handleToggleMenu}
            aria-label="open-mobile-menu"
          >
            <HiMenu className="w-5 h-5 text-gray-700" />
          </button>

          <div className={logoContainerClass} style={containerStyle || undefined}>
            {renderLogoContent()}
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">
              {subtitles.public || subtitles.member || "กองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์"}
            </h1>
            <p className="text-sm text-gray-700 leading-tight">
              {appName || "Fund Management"}
            </p>
            <p className="text-xs text-gray-500 mt-1">{currentPageTitle}</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={handleLogin}
            className={`${loginButtonBaseClass} px-6 py-2.5`}
          >
            <LogIn size={18} />
            <span>เข้าสู่ระบบ</span>
          </button>
        </div>

        {isOpen && (
          <button
            className="md:hidden inline-flex items-center justify-center me-4 ms-3 p-2 w-10 h-10 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
            onClick={handleCloseMenu}
            aria-label="close-mobile-menu"
          >
            <RxCross2 className="w-5 h-5 text-gray-700" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-gray-200/50 z-40" onClick={handleCloseMenu}>
          <div
            className="absolute top-0 pt-5 right-0 h-screen z-50 w-64 bg-white shadow p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-3">
              <button onClick={handleCloseMenu} aria-label="close-mobile-menu">
                <RxCross2 className="w-7 h-7 text-gray-600 hover:text-red-500" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg md:hidden">
              <button
                onClick={handleLogin}
                className={`${loginButtonBaseClass} w-full justify-center px-6 py-3`}
              >
                <LogIn size={18} />
                <span>เข้าสู่ระบบ</span>
              </button>
            </div>

            {renderNavigation()}
          </div>
        </div>
      )}
    </header>
  );
}