import assert from 'node:assert/strict';
import { test } from 'node:test';

import { archiveBaseName, runtimeEntries, skillName } from '../install.mjs';
import packageJson from '../package.json' with { type: 'json' };

test('runtime package includes every required Agent Skill component and excludes repository-only files', () => {
  assert.deepEqual(runtimeEntries, ['SKILL.md', 'agents', 'assets', 'references', 'scripts']);
  assert(!runtimeEntries.includes('README.md'));
  assert(!runtimeEntries.includes('tests'));
  assert(!runtimeEntries.includes('.env'));
});

test('canonical package names stay stable while the repository brand is AyaNewsSkill', () => {
  assert.equal(skillName, 'aya-news-skill');
  assert.equal(archiveBaseName, 'AyaNewsSkill');
});

test('phase 4 Creator Intelligence release is versioned as 2.4', () => {
  assert.equal(packageJson.version, '2.4.0');
});
