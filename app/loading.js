import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white text-center">
      <Image
        src="/image_icon/fund_cpkku_logo.png"
        alt="โลโก้กองทุนวิจัย"
        width={160}
        height={160}
        priority
      />
      <p className="text-lg font-medium text-gray-700">กำลังโหลดหน้า...</p>
      <p className="text-sm text-gray-500">กำลังตรวจสอบสิทธิ์...</p>
    </div>
  );
}