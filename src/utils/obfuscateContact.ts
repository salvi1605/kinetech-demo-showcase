/**
 * Obfuscates contact URLs so they don't appear as plain text in the HTML source.
 * Scrapers looking for mailto: / wa.me patterns won't find them in the static markup.
 *
 * The values are split and reassembled at runtime, making simple regex scrapers ineffective.
 */

const _e = ["agendix", "pro2026", "@", "gm", "ail", ".com"];
const _w = ["https://", "wa", ".me/", "1226", "2244", "099"];

/** Returns `mailto:agendixpro2026@gmail.com` assembled at runtime */
export function getMailtoHref(): string {
  return `mailto:${_e.join("")}`;
}

/** Returns `https://wa.me/12262244099` assembled at runtime */
export function getWhatsAppHref(): string {
  return _w.join("");
}
