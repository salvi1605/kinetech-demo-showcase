# Project architecture rules

- Keep report status aggregation in `src/utils/reportMetrics.ts` so dashboards and exports use one reconciled definition.- Build WhatsApp links and messages only via `src/utils/whatsapp.ts`, and offer reminder sends only through `src/components/shared/ReminderActions.tsx`, so channel rules, consent checks and texts stay identical everywhere.
- Send manual appointment emails only through the `send-appointment-email` function, which renders registry templates and sends directly via Lovable's email API (no queue), so the clinic-branded sender stays in one place.
- Load fonts only from the bundled @fontsource packages imported in src/main.tsx, never from third-party font CDNs, so visitors' data is not sent to external providers without consent (GDPR).
- Treat /unsubscribe as a legacy-link notice only; managed email owns unsubscribe state and links, so obsolete tokens are never submitted or reported as successfully processed.
- Build reminder cancellation links through the WhatsApp utility using the current clinic contact phone; avoid adding clinic fields or changing tenant data solely for template copy.
- Keep attendance status and billing separate: `appointments.is_charged` only applies to `no_show`, is reset by a DB trigger otherwise, and only the roles in `CHARGE_EDITOR_ROLES` may change it (mirrored and enforced by a DB trigger), so absence stats stay truthful.
- Audit `is_charged` changes with a DB trigger (`update_charge` in audit_log), never from the client, because audit_log is not client-writable and logs must not be skippable.
