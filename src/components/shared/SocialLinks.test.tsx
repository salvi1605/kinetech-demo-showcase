/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { create } from "react-test-renderer";
import { SOCIAL_LINKS } from "@/lib/socialLinks";
import { SocialLinks } from "./SocialLinks";

const EXPECTED_URLS = [
  "https://www.instagram.com/agendixpro.app",
  "https://www.facebook.com/profile.php?id=61596084324485",
  "https://www.tiktok.com/@agendixpro",
  "https://www.youtube.com/@AgendixPro",
];

describe("social links data", () => {
  test("lists exactly the four owner-approved profile URLs", () => {
    expect(SOCIAL_LINKS.map((s) => s.url)).toEqual(EXPECTED_URLS);
  });

  test("every network has a name and TikTok shows its name as text", () => {
    expect(SOCIAL_LINKS.every((s) => s.name.length > 0)).toBe(true);
    const tiktok = SOCIAL_LINKS.find((s) => s.id === "tiktok");
    expect(tiktok?.showName).toBe(true);
    expect(SOCIAL_LINKS.filter((s) => s.showName).map((s) => s.name)).toEqual(["TikTok"]);
  });
});

describe("social links footer", () => {
  test("renders each profile opening in a new tab with an accessible label", () => {
    const tree = create(
      <SocialLinks label="Síguenos" ariaPrefix="AgendixPro en" />
    );
    const anchors = tree.root.findAllByType("a");

    expect(anchors.map((a) => a.props.href)).toEqual(EXPECTED_URLS);
    for (const anchor of anchors) {
      expect(anchor.props.target).toBe("_blank");
      expect(String(anchor.props.rel)).toContain("noopener");
      expect(String(anchor.props["aria-label"]).startsWith("AgendixPro en ")).toBe(true);
    }
    expect(
      anchors.map((a) => a.props["aria-label"])
    ).toEqual([
      "AgendixPro en Instagram",
      "AgendixPro en Facebook",
      "AgendixPro en TikTok",
      "AgendixPro en YouTube",
    ]);
    tree.unmount();
  });
});
