# Deployment

The frontend is live at [tripora-web.candrasaputraagung.workers.dev](https://tripora-web.candrasaputraagung.workers.dev), Worker version `02b90739-0828-4f8e-956c-d99c24e98b6a`. Public HTTP checks passed for 15 pages, catalog search/filtering/pagination, saved-place lookups, and the real Situ Cileunca hero image. Backend routes currently return the configured `API_UNAVAILABLE` response with HTTP 503.

Cloudflare Workers, Render and Neon authentication work. The Vercel-managed Neon Free organization rejects new projects, but permits a separate schema-only branch. Database `tripora` and role `tripora_owner` were created on branch `br-blue-meadow-awrhnry7` of project `royal-sunset-23278382`. PostGIS 3.5 is enabled, all nine migrations were applied, and the database has five reference roles and zero users. The original branch was not migrated. Credentials remain in ignored local deployment state.

Render rejects both Free Key Value and Free web service creation with HTTP 402, explicitly requesting payment information at `https://dashboard.render.com/billing`. No backend service or paid resource was created. The remaining step is resolving this account requirement or selecting another backend host, then publishing the API and configuring frontend `API_URL`.

The Neon branch shares the existing project's Free quota. Vercel-managed accounts forbid changing its suspend interval; this endpoint inherited `suspend_timeout_seconds: 0` and uses fixed 0.25 CU. Its compute is suspended while waiting for backend hosting to avoid idle quota consumption. Prefer a directly managed Neon Free organization with normal automatic suspension for ongoing hosting.

## Frontend: Cloudflare Workers Free

Tripora uses dynamic Next.js routes, session cookies, search and checkout. [Cloudflare recommends Workers for full-stack Next.js](https://developers.cloudflare.com/pages/framework-guides/nextjs/); Pages supports a static export. The existing Next.js app is adapted with [OpenNext](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/).

The configuration creates a Worker and static assets, with no R2, KV or paid Images bindings. Images use ordinary browser loading for this deployment. The checked bundle compressed to 1,685,778 bytes, below the Free limit of 3 MiB. The [Free limits](https://developers.cloudflare.com/workers/platform/limits/) also include 100,000 requests per day and 10 ms CPU per request. Bundle size checks do not prove that every rendered route fits the CPU budget; confirm this with live traffic metrics after deployment.

All browser API calls use `/api/v1` on the frontend origin. The proxy forwards them to `API_URL`, preserves separate HttpOnly session cookies, and disables response caching. Server-rendered API calls use the same backend origin directly. Do not set `NEXT_PUBLIC_API_URL` to an external backend for the Cloudflare build.

After the backend has an HTTPS origin, run from the repository root:

```powershell
$env:API_URL = "https://YOUR-BACKEND.onrender.com"
node scripts/configure-cloudflare.cjs
npm run build:cloudflare -w @tripora/web
Push-Location apps/web
npx wrangler deploy --dry-run --outdir .open-next/dry-run
Pop-Location
node scripts/check-worker-size.cjs
npm run deploy:cloudflare -w @tripora/web
```

Wrangler is now authenticated with Workers write permissions for the account configured in `apps/web/wrangler.jsonc`. OAuth credentials remain local. The public account ID is also configured in the GitHub secret `CLOUDFLARE_ACCOUNT_ID`; `CLOUDFLARE_API_TOKEN` is still required for GitHub deployment. Confirm the account uses Workers Free before publishing: the current OAuth session cannot read subscription billing details (HTTP 403).

For GitHub deployment, set repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Once `deploy-cloudflare.yml` exists on the default branch, run **Deploy Cloudflare Workers** with `backend_url` set to the backend HTTPS origin. This workflow validates credentials and the Free bundle limit before publishing. Keep the Cloudflare account on the Free plan; the workflow does not change billing plans.

## Backend: Render Free with external PostgreSQL

`render.yaml` defines a Singapore Docker web service and private Key Value instance, both explicitly on `plan: free`. Import it as a Render Blueprint from the branch containing these files. The API and worker share one container because Render's free web service does not include a separate always-on background worker.

Provide these values in Render:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Production PostgreSQL connection URL with TLS and PostGIS support |
| `CORS_ORIGIN` | Exact frontend HTTPS origin |
| `WEB_PUBLIC_BASE_URL` | Same frontend HTTPS origin |
| `MAYAR_API_KEY` | Merchant API credential, when accepting real payments |
| `MAYAR_WEBHOOK_TOKEN` | Strong secret configured on the Mayar webhook |
| `EMAIL_DELIVERY_URL` | HTTPS endpoint for the notification delivery adapter |
| `EMAIL_DELIVERY_TOKEN` | Credential for that adapter |

JWT secrets are generated by Render. `REDIS_URL` uses the private Key Value connection. `PORT` comes from the hosting service. The health endpoint is `/api/v1/health`. The Docker entrypoint applies Prisma migrations, creates required role reference rows, then starts the API and worker. It never seeds demo accounts, credentials or bookable activities.

Use a dedicated PostgreSQL database, verify PostGIS availability before deploying, and retain a backup policy. No production database is provisioned by this Blueprint. Do not point the service at the local development or verification database. Existing approved vendors and published activities need a deliberate production import; the 998-place discovery catalog is already bundled with the frontend.

Set the payment webhook to `https://YOUR-BACKEND.onrender.com/api/v1/webhooks/mayar` with the configured token. Payment simulation remains unavailable in production. Email jobs remain pending until an adapter is configured.

### Free service limits

[Render Free web services](https://render.com/docs/free) sleep after 15 minutes without incoming traffic and take time to resume. The proxy waits up to 90 seconds for an upstream response. Reconciliation and email processing pause while the service sleeps and resume from PostgreSQL state after startup. This setup suits a preview or low-traffic launch; it cannot guarantee timely background processing for real paid bookings.

[Free Key Value](https://render.com/docs/key-value) has no disk persistence. PostgreSQL holds reservation expiry and notification outbox records for recovery. Capacity is limited to 25 MB and 50 connections. No public Redis connections are enabled. Do not create a paid service or upgrade a plan as part of this configuration.

## Verification and remaining work

Local checks passed for the OpenNext build, Worker dry run and upload size, Render Blueprint JSON Schema, backend container startup against an isolated PostGIS test database, and HTTP flows through the same-origin proxy. Existing booking/payment/ownership tests and the backend supervisor checks also run in CI.

Frontend publishing and public route checks are complete. Backend publishing still requires Render account verification or another compatible host. After the backend is published, check login/refresh/logout cookies, backend health, webhook validation, email delivery, Worker CPU usage, and service restarts. Local backend startup checks are not a live backend deployment test.

Free service plans are not a guarantee of zero charges if a payment method is added and included quotas are exceeded. [Render's FAQ](https://render.com/docs/faq) documents supplementary charges for outbound bandwidth and build pipeline minutes. No payment method, paid plan or paid add-on is configured by this repository.

The 8 October dependency check still reports 68 advisories including development tooling; `npm audit --omit=dev` reports 14 (6 high, 7 moderate, 1 low). Compatible patch updates were applied. Remaining framework/transitive advisories need targeted remediation and validation before accepting real transactions; no forced major-version upgrades were applied.
