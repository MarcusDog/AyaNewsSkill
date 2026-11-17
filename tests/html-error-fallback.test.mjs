import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AiNewsClient } from '../scripts/ainews.mjs';

test('legacy latest still works when the unimplemented v1 route returns HTML 404', async () => {
  const visited = [];
  const client = new AiNewsClient({
    baseUrl: 'https://ainews.example',
    fetchImpl: async (url) => {
      visited.push(String(url));
      if (String(url).includes('/api/content/v1/latest?')) {
        return new Response('<html>Not Found</html>', { status: 404 });
      }
      if (String(url).includes('/api/news/latest?')) {
        return new Response(JSON.stringify({
          success: true,
          data: { data: [{ title: 'Verified story', url: 'https://publisher.example/story', source: 'Publisher' }] }
        }), { status: 200 });
      }
      throw new Error('Unexpected endpoint');
    }
  });

  const result = await client.latest({ limit: 1 });
  assert.equal(result.apiMode, 'legacy-compatible');
  assert.equal(result.items[0].url, 'https://publisher.example/story');
  assert.equal(visited.length, 2);
});

test('malformed JSON in a successful API response is not silently accepted', async () => {
  const client = new AiNewsClient({
    baseUrl: 'https://ainews.example',
    fetchImpl: async () => new Response('<html>Bad proxy response</html>', { status: 200 })
  });
  await assert.rejects(client.fetchJson('/api/health'), (error) => error?.code === 'INVALID_RESPONSE');
});

test('an error response containing valid JSON remains available to the caller', async () => {
  const client = new AiNewsClient({
    baseUrl: 'https://ainews.example',
    fetchImpl: async () => new Response(JSON.stringify({ success: false, error: 'missing' }), { status: 404 })
  });
  const result = await client.fetchJson('/api/missing');
  assert.equal(result.ok, false);
  assert.equal(result.payload.error, 'missing');
});
