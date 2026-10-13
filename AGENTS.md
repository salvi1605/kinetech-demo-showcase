# Project architecture rules

- Keep report status aggregation in `src/utils/reportMetrics.ts` so dashboards and exports use one reconciled definition.- Build WhatsApp links only via `src/utils/whatsapp.ts` (phone normalization, message, wa.me URL) so every reminder button formats numbers and text the same way.
