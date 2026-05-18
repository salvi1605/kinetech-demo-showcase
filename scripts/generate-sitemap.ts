/**
 * Genera public/sitemap.xml y public/robots.xml desde una única fuente de verdad.
 * Se ejecuta vía npm scripts `predev` y `prebuild`.
 *
 * REGLA: Solo URLs canónicas. No incluir aliases, redirects ni rutas privadas.
 * Si agregás una ruta pública nueva en src/App.tsx, sumala acá (y solo acá).
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

const BASE_URL = "https://agendixpro.app";

interface SitemapEntry {
  path: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: string;
}

// Única fuente de verdad de rutas públicas indexables.
const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/pricing", changefreq: "monthly", priority: "0.9" },
  { path: "/contact", changefreq: "monthly", priority: "0.7" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/cancellation-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/login", changefreq: "yearly", priority: "0.4" },
];

function generateSitemap(items: SitemapEntry[]): string {
  // Dedupe defensivo por path canónico.
  const seen = new Set<string>();
  const unique = items.filter((e) => {
    if (seen.has(e.path)) return false;
    seen.add(e.path);
    return true;
  });

  const lastmod = new Date().toISOString().split("T")[0];

  const urls = unique.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    ``,
  ].join("\n");
}

function generateRobotsTxt(): string {
  return [
    `# Robots.txt for AgendixPro (${BASE_URL})`,
    `# Sitemap reference for all crawlers`,
    `Sitemap: ${BASE_URL}/sitemap.xml`,
    ``,
    `# Googlebot — full access`,
    `User-agent: Googlebot`,
    `Allow: /`,
    ``,
    `# Bingbot — full access`,
    `User-agent: Bingbot`,
    `Allow: /`,
    ``,
    `# Social media crawlers — full access (for Open Graph / Twitter Cards)`,
    `User-agent: Twitterbot`,
    `Allow: /`,
    ``,
    `User-agent: facebookexternalhit`,
    `Allow: /`,
    ``,
    `# Default — all other crawlers`,
    `User-agent: *`,
    `Allow: /`,
    ``,
  ].join("\n");
}

mkdirSync(resolve("public"), { recursive: true });

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`✓ sitemap.xml generado (${entries.length} URLs)`);

writeFileSync(resolve("public/robots.txt"), generateRobotsTxt());
console.log(`✓ robots.txt generado (${BASE_URL}/sitemap.xml)`);
