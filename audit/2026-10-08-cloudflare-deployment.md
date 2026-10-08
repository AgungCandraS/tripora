# Cloudflare deployment, 8 October 2026

- URL: https://tripora-web.candrasaputraagung.workers.dev
- Worker: `tripora-web`
- Account: `bcbef1258087626bc4dbd63d9972a53a`
- Version: `02b90739-0828-4f8e-956c-d99c24e98b6a`
- Uploaded bundle: 1,646.27 KiB gzip; no paid cache or Images bindings.
- Reported startup time: 24 ms. This is not per-request CPU usage.

Public HTTP verification passed for 15 pages, invalid-route missing-page content/noindex, catalog pagination, filtering, search and saved IDs. The homepage references the real Situ Cileunca JPEG, the JPEG returns HTTP 200, and removed slideshow controls are absent from the HTML. GSAP was previously checked in the local build; no browser automation surface was available for a live visual test.

The backend is not deployed. `/api/v1/health` returns HTTP 503 with code `API_UNAVAILABLE` because `API_URL` is not configured. Login, registration, booking and payment cannot operate until the backend is published.

A Neon Free database is prepared on an isolated schema-only branch, with PostGIS and nine migrations. Existing branch data was not migrated. Render Free Redis and Free web service creation both returned HTTP 402: payment information is required for this account. No paid plan was selected. Neon compute is suspended while the backend remains blocked to conserve shared Free quota.
