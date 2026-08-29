# Bound website deployment contract

The Skill's canonical website is `https://ainews.xiaotianaya.com`. The website may be deployed independently from this repository, but it must preserve the following public read-only contract.

## Preferred Content API v1

- `GET /api/content/v1/capabilities`
- `GET /api/content/v1/latest?limit=20&category=`
- `GET /api/content/v1/search?q=&limit=20&category=`
- `GET /api/content/v1/trends`
- `GET /api/content/v1/brief?topic=&audience=&goal=&format=&days=14&limit=6`

Every news or evidence item must include a working original `url`, title, publisher/source, and publication date when known. Region and evidence type improve diversity selection.

## Compatibility routes

Keep these routes available during migration:

- `GET /api/news/status`
- `GET /api/news/latest`
- `GET /api/news/search?q=`
- `GET /api/analytics/smart-trends`

The bundled client probes v1 first and falls back automatically. It never calls update, refresh, authentication, contact, or admin routes.

## Response and CORS requirements

- Return JSON with a boolean `success` field for API routes.
- Return an explicit 4xx/5xx JSON error instead of an HTML error page.
- Preserve original article URLs; the aggregator URL is not a substitute citation.
- Allow read-only `GET` requests from intended Agent runtimes or expose server-to-server access.
- Rate-limit abusive traffic without requiring a browser-visible secret.

Run `node scripts/ainews.mjs doctor --base-url <deployment-url>` after every deployment.

## Creator Intelligence v1

Keep these anonymous, read-only routes available for the 2.4 Skill:

- `GET /api/creators/v1/verticals`
- `GET /api/creators/v1/creators` and `/creators/{id}`
- `GET /api/creators/v1/posts` and `/creators/{id}/posts`
- `GET /api/creators/v1/hot?window=&type=&vertical=`
- `GET /api/creators/v1/topics` and `/topics/{id}`
- `GET /api/creators/v1/sources`
- `GET /api/creators/v1/changes?since=`

`q` uses literal FTS search; `cursor` is opaque and query-bound. `changes` is monotonic and returns HTTP 410 plus `resync`/`latest_cursor` after retention gaps. Creator responses preserve original HTTPS post URLs, unknown metrics as `null`, formula version, backfill state, partial/blocked reason, and source configuration separately from observed status.

The website also implements same-site authenticated `/api/creators/v1/stream`, subscriptions and delivery endpoints, signed Webhook delivery, YouTube WebSub, signed Sidecar ingest, and admin-only import/backfill/maintenance/backup/export. These routes must remain in `/openapi.json`, but the anonymous Skill client never calls them. MCP and A2A remain unsupported.
