import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AiNewsClient } from '../scripts/ainews.mjs';

test('successful API responses must be JSON objects', async () => {
  for (const body of ['', 'null', '[]', '17', '"ok"']) {
    const client = new AiNewsClient({
      baseUrl: 'https://ainews.example',
      fetchImpl: async () => new Response(body, { status: 200 })
    });
    await assert.rejects(client.fetchJson('/api/health'), (error) => error?.code === 'INVALID_RESPONSE', body);
  }
});

test('valid JSON payloads remain compatible', async () => {
  const client = new AiNewsClient({
    baseUrl: 'https://ainews.example',
    fetchImpl: async () => new Response(JSON.stringify({ success: true, data: { items: [] } }), { status: 200 })
  });
  const response = await client.fetchJson('/api/health');
  assert.equal(response.ok, true);
  assert.deepEqual(response.payload.data.items, []);
});

test('HTML and empty error responses still permit endpoint fallback', async () => {
  for (const body of ['', '<html>Not Found</html>']) {
    const client = new AiNewsClient({
      baseUrl: 'https://ainews.example',
      fetchImpl: async () => new Response(body, { status: 404 })
    });
    const response = await client.fetchJson('/api/content/v1/latest');
    assert.equal(response.status, 404);
    assert.equal(response.ok, false);
    assert.deepEqual(response.payload, {});
  }
});
