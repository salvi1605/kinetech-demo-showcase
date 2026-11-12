# Project architecture rules

- Keep the branded social image in an asset pointer and mirror its absolute public HTTPS URL in both `index.html` and `SeoHead`; static HTML serves non-JavaScript social crawlers while shared page metadata remains consistent.

- Fetch report rows that can exceed 1000 (appointments, clinical notes) only through `fetchAllRows` in `src/utils/fetchAllRows.ts` with `.order('id').range()`, because the server caps each request at 1000 rows and reports would silently undercount.
- Keep report status aggregation in `src/utils/reportMetrics.ts` so dashboards and exports use one reconciled definition.- Build WhatsApp links and messages only via `src/utils/whatsapp.ts`, and offer reminder sends only through `src/components/shared/ReminderActions.tsx`, so channel rules, consent checks and texts stay identical everywhere.
- Send manual appointment emails only through the `send-appointment-email` function, which renders registry templates and sends directly via Lovable's email API (no queue), so the clinic-branded sender stays in one place.
- Load fonts only from the bundled @fontsource packages imported in src/main.tsx, never from third-party font CDNs, so visitors' data is not sent to external providers without consent (GDPR).
- Treat /unsubscribe as a legacy-link notice only; managed email owns unsubscribe state and links, so obsolete tokens are never submitted or reported as successfully processed.
- Build reminder cancellation links through the WhatsApp utility using the current clinic contact phone; avoid adding clinic fields or changing tenant data solely for template copy.
- Keep attendance status and billing separate: `appointments.is_charged` only applies to `no_show`, is reset by a DB trigger otherwise, and only the roles in `CHARGE_EDITOR_ROLES` may change it (mirrored and enforced by a DB trigger), so absence stats stay truthful.
- Audit `is_charged` changes with a DB trigger (`update_charge` in audit_log), never from the client, because audit_log is not client-writable and logs must not be skippable.
- Invalidate pending-note requests on context changes and unmount, allowing only the latest request to update state; mount the professional banner only for an identified health_pro to prevent false loading and stale summaries.
- Show prices on sales pages (e.g. /kinesiologia) only via `getKinesiologyOffer` in `src/lib/kinesiologyPage.ts`, which reads `t.pricing.early`, so they can never diverge from /pricing.
- Build public social profile links only from `SOCIAL_LINKS` in `src/lib/socialLinks.ts`, rendered by `src/components/shared/SocialLinks.tsx`, so the four official URLs, their new-tab behavior and accessible labels stay identical on every public page.
- Add public indexable routes to the `entries` list in `scripts/generate-sitemap.ts` (the single source of truth, run on predev/prebuild), never by hand-editing `public/sitemap.xml`, because the generator rewrites that file on every build and silently drops routes it does not know.
- Run the post-login profile step only through `ensurePublicUserSafely` (`src/lib/auth/ensurePublicUser.ts`) and show `AccountSetupError` when no profile is usable; this step must never sign the user out, because a profile mismatch otherwise locks staff out on every login.
