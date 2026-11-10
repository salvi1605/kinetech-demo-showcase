export interface SocialLink {
  id: "instagram" | "facebook" | "tiktok" | "youtube";
  /** Network name, used in the accessible label and as visible text when there is no icon. */
  name: string;
  url: string;
  /** True when the network has no recognizable icon available and its name must be shown. */
  showName: boolean;
}

/**
 * AgendixPro social profiles. Single source of truth for the public footer,
 * so every public page (home, /kinesiologia, /pricing, ...) links the same URLs.
 */
export const SOCIAL_LINKS: SocialLink[] = [
  {
    id: "instagram",
    name: "Instagram",
    url: "https://www.instagram.com/agendixpro.app",
    showName: false,
  },
  {
    id: "facebook",
    name: "Facebook",
    url: "https://www.facebook.com/profile.php?id=61596084324485",
    showName: false,
  },
  {
    id: "tiktok",
    name: "TikTok",
    url: "https://www.tiktok.com/@agendixpro",
    showName: true,
  },
  {
    id: "youtube",
    name: "YouTube",
    url: "https://www.youtube.com/@AgendixPro",
    showName: false,
  },
];
