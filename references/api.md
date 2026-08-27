# AI News Content API

Default base URL: `https://ainews.xiaotianaya.com`

Local development base URL: `http://localhost:3002`

All endpoints used by this Skill are read-only and return JSON. No API key is required.

## Recommended client

Run:

```bash
node "<skill-directory>/scripts/ainews.mjs" doctor
node "<skill-directory>/scripts/ainews.mjs" topics --window 72h --limit 20
node "<skill-directory>/scripts/ainews.mjs" topic --id "TOPIC_ID"
node "<skill-directory>/scripts/ainews.mjs" opportunities --window 48h
node "<skill-directory>/scripts/ainews.mjs" random-opportunity --window 72h
node "<skill-directory>/scripts/ainews.mjs" changes --since 0
node "<skill-directory>/scripts/ainews.mjs" latest --limit 10
node "<skill-directory>/scripts/ainews.mjs" search --query "AI Agent"
node "<skill-directory>/scripts/ainews.mjs" trends
node "<skill-directory>/scripts/ainews.mjs" vision
node "<skill-directory>/scripts/ainews.mjs" source-health
node "<skill-directory>/scripts/ainews.mjs" brief --topic "AI Agent" --audience "小型团队" --goal "评估是否试用" --format article
```

The client prefers the v1 routes below. When v1 is not yet available on the independently deployed website, it automatically uses `/api/news/latest`, `/api/news/search`, and `/api/analytics/smart-trends`, then normalizes the response. Never write endpoint fallback logic ad hoc.

## Capabilities

`GET /api/content/v1/capabilities`

Lists supported tools and the citation policy.

## Real Signal and Topic API

### Hot Topics

`GET /api/signals/v1/topics?window=24h|48h|72h&page=1&limit=20`

Returns persisted event clusters ordered by explainable `trendScore`, latest evidence time and stable Topic ID. A Topic includes `evidenceStrength`; treat `single-source` as an explicit limitation.

### Topic detail

`GET /api/signals/v1/topics/{id}`

Returns the canonical Topic and its original evidence links in `signals[].url`. Old alias IDs resolve to `canonical_topic_id` without changing the evidence identity.

### Creator opportunities

- `GET /api/signals/v1/opportunities?window=48h`
- `GET /api/signals/v1/opportunities/random?window=72h`

`creator_score` uses the versioned `opportunity-v1` formula. It ranks creator usefulness inside the collected evidence set; it is not a promise that a post will perform well.

### Signal source health

`GET /api/signals/v1/sources`

`configured` means the operator has satisfied the source's access requirement. `status` reports observed collection health (`online`, `degraded`, `offline`, `unconfigured`, `disabled`, or `pending`). Never infer one from the other.

Source tiers:

- L1: no-auth public News, Hacker News, GitHub, Mastodon, Reddit RSS, Hugging Face and Bilibili adapters.
- L2: optional official YouTube/X APIs requiring operator credentials.
- L3: optional self-hosted RSSHub, NewsNow and JSON Bridge integrations.
- L4: disabled login-state sidecars; not scheduled by the web server.

### What Changed cursor

`GET /api/signals/v1/changes?since=0&limit=100`

Persist `meta.next_cursor` for the next poll. HTTP 410 with `error: cursor_expired` means retained history no longer contains that cursor; reload `/api/signals/v1/topics` and resume from the returned `latest_cursor`.

## Latest news

`GET /api/content/v1/latest?limit=20&category=AI新闻`

Use for broad monitoring. Every item includes its original `url`, publisher, publication date, region, and source group.

## Search

`GET /api/content/v1/search?q=Agent&limit=20&category=新工具`

`q` is required. Use short topic terms rather than full questions.

## Trends

`GET /api/content/v1/trends`

Returns topics comparing the most recent seven days with the preceding seven days. Each topic includes `recentCount`, `previousCount`, `growth`, `trend`, and `sources`.

## Content brief

`GET /api/content/v1/brief?topic=Agent&audience=小型电商商家&goal=降低客服成本&format=short-video&days=14&limit=6`

Parameters:

- `topic`: topic terms
- `audience`: intended beneficiary
- `goal`: practical outcome
- `format`: `short-video`, `article`, `newsletter`, or `xiaohongshu`
- `days`: 1–30, default 14
- `limit`: 3–8, default 6

Success returns an evidence pack, diversity counts, a citation policy, an output guide, and a source-bound prompt. HTTP 422 means the current query does not have enough evidence; inspect `data.notice`, expand the window once, or narrow the claim.

## Vision monitor and source health

`GET /api/content/v1/source-health`

Returns the configured public source registry, collection timestamps, article counts, and a summary of `healthy`, `delayed`, `error`, `pending`, and `inactive` states. The public response intentionally omits internal error details.

Run `vision` to combine this registry with the latest `/api/analytics/diversity-review` result. This is a site-sample audit, not a claim about the whole AI industry. On an older deployment the client falls back to `/api/news/sources` and marks health as `unknown` rather than inventing a status.

## Machine-readable discovery

- OpenAPI 3.1: `/openapi.json`
- Agent-readable skill policy: `/skill.md`
- JSON Feed 1.1: `/feed.json`
- RSS 2.0: `/rss.xml`
- Topic JSON Feed 1.1: `/topics/feed.json`
- Topic RSS 2.0: `/topics/rss.xml`

MCP, A2A and signed Webhooks are not live. Event Topics and What Changed are available through the REST endpoints above. Check `/api/content/v1/capabilities` rather than guessing future protocols.

## Safe usage

Never call `/api/admin/*`, `/api/news/update`, authentication endpoints, or refresh endpoints from this skill. Do not send private customer data in query parameters.

Only remote HTTPS origins are accepted. Plain HTTP is restricted to `localhost`, `127.0.0.1`, and `::1` for development.
