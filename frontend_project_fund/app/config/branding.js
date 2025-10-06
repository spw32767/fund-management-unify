// app/config/branding.js
// Centralized branding configuration for header logo and titles.
// Update the values below to customize the text/icon displayed in the
// top-left corner of both the admin and member dashboards.

export const BRANDING = Object.freeze({
  /** Display name shown next to the logo in the header. */
  appName: "Fund Management",

  /** Short label or acronym rendered inside the fallback logo badge. */
  appAcronym: "F",

  /** Text that appears under the title for each experience. */
  subtitles: {
    admin: "ระบบบริหารจัดการทุน - Admin",
    member: "ระบบบริหารจัดการทุน - Member",
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
  },
});
