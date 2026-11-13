import assert from 'node:assert/strict';
import { lstat, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { installSkill, runtimeEntries, skillName } from '../install.mjs';

async function fixture(root, label) {
  const sourceDir = path.join(root, label);
  await mkdir(sourceDir);
  for (const entry of runtimeEntries) {
    if (entry === 'SKILL.md') await writeFile(path.join(sourceDir, entry), label);
    else await mkdir(path.join(sourceDir, entry));
  }
  return sourceDir;
}

test('force installation stages files and replaces only after a valid source is available', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aya-install-stage-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const targetRoot = path.join(root, 'skills');
  const original = await fixture(root, 'original');
  const replacement = await fixture(root, 'replacement');
  const { installDir } = await installSkill({ sourceDir: original, targetRoot });
  assert.equal(await readFile(path.join(installDir, 'SKILL.md'), 'utf8'), 'original');

  await rm(path.join(replacement, 'scripts'), { recursive: true });
  await writeFile(path.join(replacement, 'scripts'), 'not a directory');
  await assert.rejects(installSkill({ sourceDir: replacement, targetRoot, force: true }), /文件类型不正确/);
  assert.equal(await readFile(path.join(installDir, 'SKILL.md'), 'utf8'), 'original');

  await rm(path.join(replacement, 'scripts'));
  await symlink(path.join(root, 'outside'), path.join(replacement, 'scripts'));
  await assert.rejects(installSkill({ sourceDir: replacement, targetRoot, force: true }), /文件类型不正确/);
  assert.equal(await readFile(path.join(installDir, 'SKILL.md'), 'utf8'), 'original');

  await rm(path.join(replacement, 'scripts'));
  await mkdir(path.join(replacement, 'scripts'));
  await installSkill({ sourceDir: replacement, targetRoot, force: true });
  assert.equal(await readFile(path.join(installDir, 'SKILL.md'), 'utf8'), 'replacement');
  assert.deepEqual(await readdir(targetRoot), [skillName]);
});

test('dangling target symlinks require explicit --force replacement', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aya-install-link-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sourceDir = await fixture(root, 'source');
  const targetRoot = path.join(root, 'skills');
  await mkdir(targetRoot);
  const installed = path.join(targetRoot, skillName);
  await symlink(path.join(root, 'missing'), installed);

  await assert.rejects(
    installSkill({ sourceDir, targetRoot }),
    /已经存在/
  );
  assert.equal((await lstat(installed)).isSymbolicLink(), true);
  await installSkill({ sourceDir, targetRoot, force: true });
  assert.equal((await lstat(installed)).isDirectory(), true);
  assert.equal(await readFile(path.join(installed, 'SKILL.md'), 'utf8'), 'source');
});
