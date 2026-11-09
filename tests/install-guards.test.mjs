import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { test } from 'node:test';

import { installSkill, skillName } from '../install.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execFileAsync = promisify(execFile);

test('a missing runtime entry does not erase an existing --force installation', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aya-skill-guard-'));
  try {
    const sourceDir = path.join(root, 'incomplete');
    const targetRoot = path.join(root, 'skills');
    const installed = path.join(targetRoot, skillName);
    await mkdir(sourceDir, { recursive: true });
    await mkdir(installed, { recursive: true });
    await writeFile(path.join(sourceDir, 'SKILL.md'), '# incomplete');
    await writeFile(path.join(installed, 'SKILL.md'), '# keep me');

    await assert.rejects(
      installSkill({ sourceDir, targetRoot, force: true }),
      /发布包缺少必需文件/
    );
    assert.equal(await readFile(path.join(installed, 'SKILL.md'), 'utf8'), '# keep me');

    // A valid source still supports forced replacement.
    await installSkill({ sourceDir: projectRoot, targetRoot, force: true });
    assert.match(await readFile(path.join(installed, 'SKILL.md'), 'utf8'), /aya-news-skill/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI rejects option values omitted before another flag', async () => {
  const installer = path.join(projectRoot, 'install.mjs');
  for (const args of [['--target'], ['--target-dir'], ['--target', '--force'], ['--target-dir', '--force']]) {
    await assert.rejects(execFileAsync(process.execPath, [installer, ...args]), /参数 --target/);
  }
});
