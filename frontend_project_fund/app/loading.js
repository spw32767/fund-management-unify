import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <Image
        src="/image_icon/fund_cpkku_logo.png"
        alt="โลโก้กองทุนวิจัย"
        width={160}
        height={160}
        priority
      />
    </div>
  );
}
