import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildLocalBrief } from '../scripts/ainews.mjs';

test('equivalent publisher labels are not independent corroboration', () => {
  const repeated = [
    { title: 'Agent official announcement', source: 'OpenAI News', url: 'https://example.test/a' },
    { title: 'Agent second announcement', source: ' openai   news ', url: 'https://example.test/b' },
    { title: 'Agent third announcement', source: 'OPENAI NEWS', url: 'https://example.test/c' }
  ];
  const brief = buildLocalBrief(repeated, { topic: 'Agent' });
  assert.equal(brief.diversity.sources, 1);
  assert.equal(brief.status, 'insufficient_evidence');
  assert.equal(brief.evidence.length, 2, 'only two items per normalized publisher');
  assert(brief.blindSpots.some((item) => item.code === 'missing_independent_publishers'));

  const withIndependentPublisher = buildLocalBrief([
    ...repeated,
    { title: 'Agent independent analysis', source: 'Research Lab', url: 'https://research.example/agent' }
  ], { topic: 'Agent' });
  assert.equal(withIndependentPublisher.diversity.sources, 2);
  assert.equal(withIndependentPublisher.status, 'ready');
});
