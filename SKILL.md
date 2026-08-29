---
name: aya-news-skill
description: Use when a user asks for current AI news, cross-vertical creator posts, viral-topic tracking, self-media ideas, evidence research, scripts, or articles that must remain verifiable and avoid false whole-network claims.
---

# AyaNewsSkill

Turn current news and verified public creator posts into useful content without hiding uncertainty or trapping the reader in one source ecosystem. Prefer helping a specific audience solve a concrete problem over merely summarizing headlines.

## Non-negotiable rules

1. Cite every factual claim, number, attribution, release detail, and trend statement with one or more `[S#]` markers.
2. Keep each `[S#]` mapped to a title, publisher, date, and clickable original URL.
3. Label source boundaries: official statement, research finding, media report, engineering/community experience, or inference.
4. Never rewrite a media report as confirmed fact. Never treat a company claim as independent validation.
5. Seek at least 3 distinct sources and 2 evidence types. Include domestic and international sources when both are relevant and available.
6. If evidence is insufficient or conflicting, say so and narrow the conclusion. Do not fill gaps from memory.
7. Give low-cost, testable, audience-specific actions. Separate actions from factual conclusions.
8. Treat `trend-v1`, `opportunity-v2`, and `creator-hotness-v1` as rankings over AyaNews's collected sample, never proof of whole-network popularity.

Read [evidence-rules.md](references/evidence-rules.md) before drafting. Read [api.md](references/api.md) when using the AI News API. Read only the selected format section in [content-formats.md](references/content-formats.md). Read [site-deployment-contract.md](references/site-deployment-contract.md) only when deploying or replacing the bound website API.

## Runtime check

Use the bundled zero-dependency client instead of guessing endpoint versions:

```bash
node "<skill-directory>/scripts/ainews.mjs" doctor
```

The client is permanently bound by default to `https://ainews.xiaotianaya.com`. It automatically prefers Content API v1 and falls back to the site's deployed read-only legacy endpoints. Override with `AI_NEWS_API_BASE_URL` only for an explicitly provided mirror or local development server.

The installed directory is always `aya-news-skill`, regardless of whether the archive is copied, cloned, or installed into Codex, Claude Code, or a generic Agent Skills directory. Resolve every bundled file relative to this `SKILL.md`; never assume the repository checkout path.

If `doctor` returns `ok: false`, report the attempted endpoints and stop. Do not scrape arbitrary pages, invent news, or switch to an unrelated provider without the user's approval.

## Cross-vertical creator retrieval

Use Creator Intelligence when the request is about what beauty, fashion, AI-tech, or entertainment creators actually published, which post is accelerating, or which subject multiple creators adopted:

```bash
node "<skill-directory>/scripts/ainews.mjs" creators --vertical ai-tech --status verified
node "<skill-directory>/scripts/ainews.mjs" creator-posts --query "Agent" --vertical ai-tech
node "<skill-directory>/scripts/ainews.mjs" creator-hot --window 24h --type cross_platform --vertical ai-tech
node "<skill-directory>/scripts/ainews.mjs" creator-topics --window 72h --vertical beauty
node "<skill-directory>/scripts/ainews.mjs" creator-sources
```

Open every selected post's original HTTPS URL before citing it. `complete` means cursor exhaustion plus reconciliation; `partial` means only a platform-limited history is available; `blocked` means permission/risk control prevents access; `unconfigured` means the operator has not supplied required access. Never turn any of those states into “all posts collected.” Missing metrics remain `null`, not zero.

Use `creator-changes --since N` for committed event polling. Save `nextCursor`; on HTTP 410, reload the response's `resync` collection and resume at `latestCursor`. The Skill is read-only: it may explain signed Webhook, SSE, subscriptions, retries, and dead letters, but it must not register users, create endpoints, or call admin/maintenance routes.

## Workflow

### 1. Frame the beneficial problem

Extract or reasonably infer:

- `topic`: the AI subject or current event
- `audience`: who needs help
- `goal`: the real decision, obstacle, or desired outcome
- `format`: `short-video`, `article`, `newsletter`, or `xiaohongshu`
- `freshness`: default 14 days; use 7 for fast news and up to 30 for thin topics

State the problem in one sentence. Ask only if the missing choice would materially change the answer.

### 2. Retrieve a diverse evidence pack

For current hotspots or creator ideas, begin with the real Topic pipeline rather than the legacy keyword trend endpoint:

```bash
node "<skill-directory>/scripts/ainews.mjs" topics --window 72h --limit 20
node "<skill-directory>/scripts/ainews.mjs" topic --id "TOPIC_ID" --window 48h
node "<skill-directory>/scripts/ainews.mjs" opportunities --window 48h --profile tool-review
node "<skill-directory>/scripts/ainews.mjs" random-opportunity --window 72h --profile general --exclude "PREVIOUS_TOPIC_ID"
```

Use `24h` for breaking signals, `48h` for rising discussions, and `72h` for slower project/community evidence. A Topic score ranks AyaNews's collected sample; it does not prove whole-network popularity. Open Topic detail and cite its original `signals[].url` values before making factual claims.

Select one creator profile: `general`, `short-video`, `tool-review`, `news-commentary`, or `deep-dive`. Use `exclude` with the current Topic ID when rerolling. Do not silently switch profiles merely to obtain a higher score; a tool-review request must not be filled with a paper-only topic.

Run the bundled client with the fields above:

```bash
node "<skill-directory>/scripts/ainews.mjs" brief \
  --topic "AI Agent" \
  --topic-id "TOPIC_ID" \
  --audience "小型团队" \
  --goal "判断是否值得试用" \
  --format article
```

The client calls `GET /api/content/v1/brief` when available. When a Topic ID is known, pass `--topic-id` so the brief uses that Topic's current Signal evidence rather than a new fuzzy keyword search. If the independently deployed website has not enabled v1 yet, it searches the current website API and deterministically constructs the same citation ledger locally.

If the brief returns `insufficient_evidence`:

1. Expand `days` once, up to 30.
2. Simplify the topic into one or two core terms.
3. Use the bundled `search` and `trends` commands to find adjacent evidence.
4. If still insufficient, stop and report what is missing.

Do not use admin refresh, source reset, authentication, or internal maintenance endpoints.

### 3. Run the diversity gate

Build an evidence ledger with columns: citation ID, claim supported, evidence type, region, publisher, date, URL, limitation.

Before drafting, check:

- at least 3 distinct publishers unless the user explicitly requests a single-source summary;
- no more than 2 selected items from one publisher;
- at least 2 evidence types;
- both `cn` and `global` regions when the topic has meaningful domestic/international coverage;
- primary or research evidence for strong product-performance or scientific claims;
- at least one source that adds a different perspective, limitation, or counterpoint.

If a condition cannot be met, disclose that gap near the conclusion.

When the user asks about the site's overall filter bubble or source health, read the latest scheduled model review before drafting:

```bash
node "<skill-directory>/scripts/ainews.mjs" vision
```

The vision snapshot combines the latest model review with the public source-health registry. Use `review` when only the diversity audit is needed, or `source-health` when only collection status is needed. Treat every result as a diagnosis of the site's collected sample and configured sources, not a measurement of the whole AI industry. If the client reports `unknown`, do not rewrite it as healthy or unhealthy.

AyaNews now exposes deterministic event Topics, creator opportunities, Signal source health and a REST What Changed cursor. To follow changes:

```bash
node "<skill-directory>/scripts/ainews.mjs" changes --since 0
```

Save the returned `nextCursor`. If `resyncRequired` is true after HTTP 410, discard the expired cursor and reload `topics`. AyaNews exposes authenticated Creator SSE and signed Webhook delivery with a durable outbox, retries and dead letters; those are operator/user workflows, not anonymous Skill commands. MCP and A2A are not live; never invent those endpoints.

### 4. Separate claim layers

Use these exact logical layers while reasoning:

- **Confirmed in source:** directly stated in an original release, document, dataset, or paper.
- **Reported:** attributed to a named media or secondary source.
- **Inferred:** analysis derived from multiple sources; explicitly mark it as an inference.
- **Unknown:** cannot be supported by retrieved evidence; omit or state the uncertainty.

Never merge layers into a stronger claim.

### 5. Draft for usefulness

Select the matching template from `assets/`:

- `short-video-template.md` for 45–90 second scripts
- `article-template.md` for articles and newsletters
- `problem-solving-template.md` for practical answers and step-by-step guidance

Lead with the audience's pain point or decision. Explain why the evidence matters to them. Prefer a small experiment, checklist, or decision rule over generic advice.

### 6. Claim-by-claim citation audit

Before responding, inspect every sentence:

- Add `[S#]` immediately after factual language.
- Add multiple citations when a statement is synthesized from multiple sources.
- Rephrase unsupported certainty as a bounded inference or remove it.
- Ensure every `[S#]` appears once in the final source list with a working URL.
- Ensure advice is labeled as advice, not evidence.

Do not cite the AI News API response itself when the response already includes the original article URL. Cite the original URL.

## Response contract

Return, in order:

1. The requested content or answer, with inline `[S#]` citations.
2. `行动建议` containing concrete, low-risk next steps.
3. `证据边界` describing disagreements, missing perspectives, and uncertainty.
4. `来源` mapping every `[S#]` to publisher, title, date, evidence type, and clickable URL.

For a content brief, also include the selected angle, intended audience, format, hook, outline, why-now evidence, uncertainty, disclosure risk, and evidence ledger. For a publish-ready draft, keep the citation markers unless the user explicitly asks for a separate fact-check sheet.
