/**
 * 初回対話ログインスクリプト。
 *
 * 1. ブラウザを開いて SpeakerDeck のサインインページへ遷移
 * 2. ユーザーが手動で GitHub OAuth 連携ログインを完了
 * 3. Enter キー押下でセッション（storageState）を保存
 *
 * Usage: node login.mjs
 */

import { chromium } from 'playwright';
import { saveStorageState, getSessionPath } from './lib/session.mjs';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

async function waitForEnter(prompt) {
  const rl = readline.createInterface({ input, output });
  await rl.question(prompt);
  rl.close();
}

async function main() {
  console.log('[login] Launching Chromium (headful)...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('[login] Navigating to https://speakerdeck.com/signin');
  await page.goto('https://speakerdeck.com/signin', { waitUntil: 'domcontentloaded' });

  console.log('');
  console.log('========================================================');
  console.log('  In the browser window:');
  console.log('  1. Click "Sign in with GitHub" (or your usual button)');
  console.log('  2. Complete the OAuth flow');
  console.log('  3. Wait until you are redirected back to speakerdeck.com');
  console.log('  4. Verify you can see your dashboard / profile dropdown');
  console.log('  5. Come back to THIS terminal and press Enter');
  console.log('========================================================');
  console.log('');

  await waitForEnter('Press Enter once you are fully signed in on SpeakerDeck...');

  // 念のため現在のURLでログイン済みかを軽く検証
  const currentUrl = page.url();
  console.log(`[login] Current URL: ${currentUrl}`);

  // ログイン済み判定: signin にリダイレクトされていなければOK
  if (currentUrl.includes('/signin') || currentUrl.includes('/users/sign_in')) {
    console.error('[login] ERROR: still on sign-in page. Login seems incomplete.');
    await browser.close();
    process.exit(1);
  }

  const state = await context.storageState();
  const savedPath = await saveStorageState(state);
  console.log(`[login] Session saved to: ${savedPath}`);
  console.log('[login] You can now use publish.mjs / update.mjs.');

  await browser.close();
}

main().catch((err) => {
  console.error('[login] Failed:', err);
  process.exit(1);
});
