'use client';

import Image from 'next/image';

const DEFAULT_ALT = 'โลโก้ระบบบริหารจัดการทุนวิจัย';

export default function AppLogo({
  size = 80,
  className = '',
  imageClassName = '',
  priority = false,
  alt = DEFAULT_ALT,
  withFrame = true
}) {
  const baseClasses = withFrame
    ? 'relative inline-flex items-center justify-center rounded-2xl bg-white shadow-lg p-3'
    : 'relative inline-flex';

  return (
    <div
      className={`${baseClasses} ${className}`.trim()}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <Image
        src="/image_icon/fund_cpkku_logo.png"
        alt={alt}
        fill
        sizes={`${size}px`}
        priority={priority}
        className={`object-contain ${imageClassName}`.trim()}
      />
    </div>
  );
}
