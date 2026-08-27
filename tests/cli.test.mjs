import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import http from 'node:http';

import {
  AiNewsClient,
  buildLocalBrief,
  normalizeBaseUrl
} from '../scripts/ainews.mjs';

const articles = [
  {
    id: 'qwen-1',
    title: 'Qwen Agent 官方版本发布',
    description: '官方介绍了新的 Agent 能力。',
    source: 'Qwen 官方博客',
    url: 'https://qwen.example/agent',
    publishedAt: '2026-08-06T08:00:00Z',
    region: 'cn',
    sourceGroup: 'product'
  },
  {
    id: 'paper-1',
    title: 'Agent evaluation benchmark',
    description: 'A research benchmark for agent evaluation.',
    source: 'arXiv Artificial Intelligence',
    url: 'https://arxiv.example/agent',
    publishedAt: '2026-08-05T08:00:00Z',
    region: 'global',
    sourceGroup: 'research'
  },
  {
    id: 'media-1',
    title: 'AI Agent enters enterprise workflows',
    description: 'A reported enterprise adoption story.',
    source: 'TechCrunch AI',
    url: 'https://techcrunch.example/agent',
    publishedAt: '2026-08-04T08:00:00Z',
    region: 'global',
    sourceGroup: 'investment'
  }
];

let server;
let baseUrl;
const requestUrls = [];

before(async () => {
  server = http.createServer((request, response) => {
    requestUrls.push(request.url);
    response.setHeader('content-type', 'application/json');
    if (request.url.startsWith('/api/signals/v1/topics/topic-1')) {
      response.end(JSON.stringify({ success: true, data: { id: 'topic-1', canonical_topic_id: 'topic-1', title: 'Acme Tool', signals: [{ url: 'https://github.com/acme/tool' }] } }));
      return;
    }
    if (request.url.startsWith('/api/signals/v1/topics')) {
      response.end(JSON.stringify({ success: true, data: { items: [{ id: 'topic-1', title: 'Acme Tool', trendScore: 72 }] }, meta: { window: '72h' } }));
      return;
    }
    if (request.url.startsWith('/api/signals/v1/opportunities')) {
      response.end(JSON.stringify({ success: true, data: { items: [{ topic_id: 'topic-1', creator_score: 68 }] } }));
      return;
    }
    if (request.url.startsWith('/api/signals/v1/sources')) {
      response.end(JSON.stringify({ success: true, data: { items: [{ id: 'github', status: 'online', configured: true }] } }));
      return;
    }
    if (request.url.startsWith('/api/signals/v1/changes')) {
      if (request.url.includes('since=1')) {
        response.statusCode = 410;
        response.end(JSON.stringify({ success: false, error: 'cursor_expired', resync: '/api/signals/v1/topics', oldest_cursor: 7, latest_cursor: 9 }));
      } else {
        response.end(JSON.stringify({ success: true, data: { items: [{ seq: 4, topicId: 'topic-1' }] }, meta: { next_cursor: 4 } }));
      }
      return;
    }
    if (request.url.startsWith('/api/content/v1/')) {
      response.statusCode = 404;
      response.end(JSON.stringify({ success: false, error: '接口不存在' }));
      return;
    }
    if (request.url.startsWith('/api/news/latest') || request.url.startsWith('/api/news/search')) {
      response.end(JSON.stringify({ success: true, data: { data: articles, total: articles.length } }));
      return;
    }
    if (request.url.startsWith('/api/analytics/smart-trends')) {
      response.end(JSON.stringify({ success: true, data: { topKeywords: [], comparison: { status: 'insufficient_history' } } }));
      return;
    }
    if (request.url.startsWith('/api/analytics/diversity-review')) {
      response.end(JSON.stringify({ success: true, data: { status: 'verified', score: 81, summary: '多样性复核完成 [S1]。', sources: [{ citationId: 'S1', url: 'https://source.test' }] } }));
      return;
    }
    if (request.url === '/health') {
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ success: false }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('base URL accepts HTTPS and local HTTP but rejects unsafe remote HTTP and credentials', () => {
  assert.equal(normalizeBaseUrl('https://ainews.xiaotianaya.com/'), 'https://ainews.xiaotianaya.com');
  assert.equal(normalizeBaseUrl('http://127.0.0.1:3002/'), 'http://127.0.0.1:3002');
  assert.throws(() => normalizeBaseUrl('http://example.com'), /HTTPS/);
  assert.throws(() => normalizeBaseUrl('https://user:pass@example.com'), /凭据/);
});

test('client automatically falls back to the deployed legacy API and normalizes articles', async () => {
  const client = new AiNewsClient({ baseUrl });
  const result = await client.latest({ limit: 2 });

  assert.equal(result.apiMode, 'legacy-compatible');
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].url, articles[0].url);
  assert.equal(result.items[0].region, 'cn');
});

test('doctor reports ready when either v1 or the legacy compatibility layer is available', async () => {
  const client = new AiNewsClient({ baseUrl });
  const result = await client.doctor();

  assert.equal(result.ok, true);
  assert.equal(result.apiMode, 'legacy-compatible');
  assert.equal(result.website, baseUrl);
});

test('client reads topics, topic evidence, creator opportunities and change cursors', async () => {
  const client = new AiNewsClient({ baseUrl });
  const topics = await client.topics({ window: '72h' });
  const detail = await client.topic('topic-1');
  const opportunities = await client.opportunities({ window: '48h' });
  const changes = await client.changes({ since: 0 });
  const expired = await client.changes({ since: 1 });

  assert.equal(topics.items[0].id, 'topic-1');
  assert.equal(detail.signals[0].url, 'https://github.com/acme/tool');
  assert.equal(opportunities.items[0].creator_score, 68);
  assert.equal(changes.nextCursor, 4);
  assert.equal(expired.resyncRequired, true);
  assert.equal(expired.latestCursor, 9);
});

test('client forwards creator profile, random exclusion and Topic id research parameters', async () => {
  const client = new AiNewsClient({ baseUrl });
  await client.opportunities({ window: '48h', profile: 'tool-review' });
  await client.randomOpportunity({ window: '72h', profile: 'short-video', exclude: 'topic-1' });
  await client.brief({ topic: 'Qwen', topicId: 'topic-1', format: 'article' });

  assert(requestUrls.some((url) => url.includes('/api/signals/v1/opportunities?') && url.includes('profile=tool-review')));
  assert(requestUrls.some((url) => url.includes('/api/signals/v1/opportunities/random?') && url.includes('profile=short-video') && url.includes('exclude=topic-1')));
  assert(requestUrls.some((url) => url.includes('/api/content/v1/brief?') && url.includes('topicId=topic-1')));
});

test('source health prefers the real Signal registry when it is available', async () => {
  const client = new AiNewsClient({ baseUrl });
  const health = await client.sourceHealth();
  assert.equal(health.apiMode, 'signals-v1');
  assert.equal(health.summary.online, 1);
  assert.equal(health.sources[0].id, 'github');
});

test('client exposes the latest daily filter-bubble review with its source ledger', async () => {
  const client = new AiNewsClient({ baseUrl });
  const result = await client.review();

  assert.equal(result.status, 'verified');
  assert.equal(result.score, 81);
  assert.equal(result.sources[0].citationId, 'S1');
});

test('client exposes sanitized source health and a combined vision snapshot', async () => {
  const fetchImpl = async (url) => {
    if (String(url).endsWith('/api/content/v1/source-health')) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          generatedAt: '2026-08-26T12:00:00.000Z',
          summary: { total: 2, healthy: 1, delayed: 1, error: 0, pending: 0, inactive: 0 },
          sources: [
            { name: 'Official Feed', status: 'healthy', url: 'https://example.com/feed.xml' },
            { name: 'Delayed Feed', status: 'delayed', url: 'https://example.com/delayed.xml' }
          ]
        }
      }), { status: 200 });
    }
    if (String(url).endsWith('/api/analytics/diversity-review')) {
      return new Response(JSON.stringify({ success: true, data: { status: 'verified', score: 72, sources: [] } }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  };
  const client = new AiNewsClient({ baseUrl: 'https://ainews.example', fetchImpl });

  const health = await client.sourceHealth();
  const vision = await client.vision();

  assert.equal(health.apiMode, 'content-v1');
  assert.equal(health.summary.healthy, 1);
  assert.equal(vision.review.score, 72);
  assert.equal(vision.sourceHealth.summary.delayed, 1);
});

test('source health fallback labels legacy source status as unknown', async () => {
  const fetchImpl = async (url) => {
    if (String(url).endsWith('/api/content/v1/source-health')) {
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }
    return new Response(JSON.stringify({
      success: true,
      data: [{ name: 'Legacy Source', count: 8 }]
    }), { status: 200 });
  };
  const client = new AiNewsClient({ baseUrl: 'https://ainews.example', fetchImpl });

  const health = await client.sourceHealth();

  assert.equal(health.apiMode, 'legacy-compatible');
  assert.equal(health.summary.unknown, 1);
  assert.equal(health.sources[0].status, 'unknown');
});

test('review falls back to the deployed diversity snapshot before the daily endpoint is released', async () => {
  const fetchImpl = async (url) => {
    if (String(url).endsWith('/api/analytics/diversity-review')) {
      return new Response(JSON.stringify({ success: false, error: '接口不存在' }), { status: 404 });
    }
    return new Response(JSON.stringify({
      success: true,
      data: {
        diversityScore: 55,
        riskLevel: 'medium',
        sourceDistribution: [{ name: 'arXiv', percentage: 70 }]
      }
    }), { status: 200 });
  };
  const client = new AiNewsClient({ baseUrl: 'https://ainews.example', fetchImpl });

  const result = await client.review();

  assert.equal(result.status, 'live_snapshot');
  assert.equal(result.score, 55);
  assert.match(result.summary, /兼容接口/);
});

test('local brief fallback creates diverse cited evidence without inventing claims', () => {
  const brief = buildLocalBrief(articles, {
    topic: 'Agent',
    audience: '小型团队',
    goal: '评估是否值得试用',
    format: 'article',
    limit: 6
  });

  assert.equal(brief.status, 'ready');
  assert.equal(brief.evidence.length, 3);
  assert.deepEqual(brief.evidence.map((item) => item.citationId), ['S1', 'S2', 'S3']);
  assert.equal(new Set(brief.evidence.map((item) => item.source)).size, 3);
  assert.equal(new Set(brief.evidence.map((item) => item.evidenceType)).size, 3);
  assert.match(brief.prompt, /\[S1\]/);
  assert.match(brief.prompt, /https:\/\/qwen\.example\/agent/);
});

test('local brief explicitly reports regional and evidence-type filter-bubble gaps', () => {
  const brief = buildLocalBrief(articles.slice(1), { topic: 'Agent', limit: 6 });

  assert(brief.blindSpots.some((item) => item.code === 'missing_cn'));
  assert(brief.blindSpots.some((item) => item.code === 'missing_official'));
  assert.match(brief.prompt, /当前证据盲区/);
});
