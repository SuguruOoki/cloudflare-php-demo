/**
 * Session (storageState) の読み込み/保存の共通ロジック。
 *
 * - ローカル実行時: ~/.claude/skills/speakerdeck-publish/.session/speakerdeck.json
 * - CI 実行時:     env.SPEAKERDECK_SESSION (base64 encoded JSON) を優先
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = resolve(__dirname, '..', '..', '.session', 'speakerdeck.json');

export function getSessionPath() {
  return process.env.SPEAKERDECK_SESSION_PATH || DEFAULT_PATH;
}

/**
 * Playwright の storageState を取得する。
 * CI では env.SPEAKERDECK_SESSION を優先（base64 encoded JSON）。
 * ローカルではファイルから読み込む。
 */
export async function loadStorageState() {
  if (process.env.SPEAKERDECK_SESSION) {
    try {
      const decoded = Buffer.from(process.env.SPEAKERDECK_SESSION, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error(
        `SPEAKERDECK_SESSION env var is set but not valid base64-encoded JSON: ${error.message}`
      );
    }
  }

  const path = getSessionPath();
  if (!existsSync(path)) {
    throw new Error(
      `Session file not found: ${path}\n` +
      `Run 'node login.mjs' first to create a session, or set SPEAKERDECK_SESSION env var.`
    );
  }

  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

/**
 * storageState をファイルに保存する（login.mjs 用）。
 */
export async function saveStorageState(state) {
  const path = getSessionPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(state, null, 2), 'utf8');
  return path;
}

/**
 * CLI 引数を簡易パース（--key value 形式）。
 */
export function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}
