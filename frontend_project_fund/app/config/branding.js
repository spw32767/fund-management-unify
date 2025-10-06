// app/config/branding.js
// Centralized branding configuration for header logo and titles.
// Update the values below to customize the text/icon displayed in the
// top-left corner of both the admin and member dashboards.

export const BRANDING = Object.freeze({
  /** Display name shown next to the logo in the header. */
  appName: "Research, Innovation, and Academic Services Fund, College of Computing",

  /** Short label or acronym rendered inside the fallback logo badge. */
  appAcronym: "F",

  /** Text that appears under the title for each experience. */
  subtitles: {
    admin: "กองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์",
    member: "กองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์",
  },

  /**
   * Logo rendering options.
   * - Set `text` to override the fallback letter displayed in the badge.
   * - Provide `imageSrc` (e.g. "/logo.svg") to render an image instead of text.
   * - Adjust `backgroundClass` to change the badge styling (set to "" to remove).
   */
    logo: {
    text: null,
    imageSrc: "/image_icon/fund_cpkku_logo.png",
    imageAlt: "Fund CPKKU logo",
    backgroundClass: "",
    /** Tailwind classes to control the badge size. */
    containerClassName: "w-12 h-12",
    /** Optional inline styles for the badge wrapper. */
    containerStyle: {},
    /** Intrinsic dimensions passed to the Next.js <Image> component. */
    imageWidth: 96,
    imageHeight: 96,
    /** Tailwind classes applied to the rendered <Image>. */
    imageClassName: "w-full h-full object-contain",
    /** Optional inline styles passed to the <Image> element. */
    imageStyle: {},
    /**
     * When true, use the Next.js `fill` layout so the logo stretches to
     * completely fill the badge container. Helpful when you want to control
     * sizing purely through Tailwind classes without tweaking width/height.
     */
    useFill: false,
    /**
     * Additional classes and styles for the wrapper that becomes `relative`
     * when `useFill` is enabled.
     */
    imageWrapperClassName: "",
    imageWrapperStyle: {},
  },
});