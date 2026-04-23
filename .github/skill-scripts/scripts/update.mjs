/**
 * 既存デッキの PDF 差し替えスクリプト。
 *
 * Usage:
 *   node update.mjs --deck-url https://speakerdeck.com/user/slug \
 *                   --pdf /path/to/slides.pdf
 *
 * Env:
 *   SPEAKERDECK_SESSION    base64 encoded storageState
 *   SPEAKERDECK_DECK_URL   --deck-url の代替
 *   SPEAKERDECK_PDF_PATH   --pdf の代替
 *   HEADFUL                truthy なら headless を無効化
 */

import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadStorageState, parseArgs } from './lib/session.mjs';

async function main() {
  const args = parseArgs(process.argv);

  const deckUrl = args['deck-url'] || process.env.SPEAKERDECK_DECK_URL;
  const pdfPath = args.pdf || process.env.SPEAKERDECK_PDF_PATH;

  if (!deckUrl) {
    console.error('[update] --deck-url (or SPEAKERDECK_DECK_URL) is required.');
    process.exit(2);
  }
  if (!pdfPath || !existsSync(pdfPath)) {
    console.error(`[update] --pdf is required and must exist. got: ${pdfPath}`);
    process.exit(2);
  }

  const storageState = await loadStorageState();

  const headless = !process.env.HEADFUL;
  console.log(`[update] headless=${headless}, deck=${deckUrl}, pdf=${pdfPath}`);
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  try {
    // 1. デッキの編集ページへ遷移
    // SpeakerDeck では `{deckUrl}/edit` で編集画面に入れる。
    const editUrl = deckUrl.replace(/\/$/, '') + '/edit';
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

    if (page.url().includes('/signin') || page.url().includes('/users/sign_in')) {
      throw new Error(
        'Session expired. Run `node login.mjs` again, or refresh SPEAKERDECK_SESSION secret.'
      );
    }

    // 2. "Replace deck" / "Upload new version" ボタンを探す
    // SpeakerDeck では「Replace deck」セクションに file input がある。
    const replaceButton = page.locator(
      'button:has-text("Replace deck"), a:has-text("Replace deck"), button:has-text("Upload new version")'
    ).first();

    if (await replaceButton.count()) {
      await replaceButton.click().catch(() => {});
    }

    // 3. PDF を file input に attach
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 30000 });
    await fileInput.setInputFiles(resolve(pdfPath));
    console.log('[update] PDF attached, waiting for processing...');

    // 4. 置換完了を待つ（成功メッセージ or 再描画）
    // SpeakerDeck は replace 完了で toast やバッジが出る想定。
    // 保守的に 3 分タイムアウトで waitForLoadState + URL が edit 外に戻るのを待つ。
    await Promise.race([
      page.waitForSelector(
        'text=/uploaded|updated|replacing|processing/i',
        { timeout: 180000 }
      ).catch(() => null),
      page.waitForLoadState('networkidle', { timeout: 180000 }).catch(() => null),
    ]);

    // 5. Save ボタン（あれば）を押下
    const saveButton = page.locator(
      'button[type="submit"]:has-text("Save"), input[type="submit"][value*="Save"]'
    ).first();
    if (await saveButton.count()) {
      await saveButton.click();
      await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => null);
    }

    console.log('[update] Deck updated successfully:');
    console.log(deckUrl);
    process.stdout.write(`${deckUrl}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[update] Failed:', err);
  process.exit(1);
});
