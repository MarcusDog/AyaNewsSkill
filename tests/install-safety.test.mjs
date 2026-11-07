import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { installSkill, skillName } from '../install.mjs';

test('force install preserves an existing installation when release files are missing', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aya-invalid-release-'));
  const sourceDir = path.join(root, 'incomplete-release');
  const targetRoot = path.join(root, 'target');
  const installDir = path.join(targetRoot, skillName);
  const marker = path.join(installDir, 'user-data.txt');
  try {
    await mkdir(sourceDir, { recursive: true });
    await mkdir(installDir, { recursive: true });
    await writeFile(marker, 'keep-existing-installation');

    await assert.rejects(
      installSkill({ sourceDir, targetRoot, force: true }),
      /发布包缺少必需文件/
    );
    assert.equal(await readFile(marker, 'utf8'), 'keep-existing-installation');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
