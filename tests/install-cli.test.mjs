import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { promisify } from 'node:util';

const run = promisify(execFile);
const installer = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../install.mjs');

test('installer refuses missing CLI option values without running installation', async () => {
  for (const args of [
    ['--target'],
    ['--target-dir'],
    ['--target', '--force'],
    ['--target-dir', '--force']
  ]) {
    await assert.rejects(
      run(process.execPath, [installer, ...args]),
      (error) => {
        assert.match(error.stderr, /缺少参数值/);
        return true;
      }
    );
  }
});
