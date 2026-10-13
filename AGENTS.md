# Project architecture rules

- Keep report status aggregation in `src/utils/reportMetrics.ts` so dashboards and exports use one reconciled definition.- Build WhatsApp links only via `src/utils/whatsapp.ts` (phone normalization, message, wa.me URL) so every reminder button formats numbers and text the same way.
- Send manual appointment emails only through the `send-appointment-email` function, which renders registry templates and sends directly via Lovable's email API (no queue), so the clinic-branded sender stays in one place.
- Load fonts only from the bundled @fontsource packages imported in src/main.tsx, never from third-party font CDNs, so visitors' data is not sent to external providers without consent (GDPR).
