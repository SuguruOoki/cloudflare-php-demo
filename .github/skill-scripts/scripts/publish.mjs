/**
 * 新規デッキ公開スクリプト。
 *
 * Usage:
 *   node publish.mjs --pdf /path/to/slides.pdf \
 *                    --title "Title" \
 *                    --description "Description..." \
 *                    --tags "php,laravel,cloudflare" \
 *                    --visibility public \
 *                    --category technology \
 *                    --downloads false
 *
 * Env:
 *   SPEAKERDECK_SESSION  base64 encoded storageState (CI 用途、優先)
 *   HEADFUL              truthy なら headless を無効化（デバッグ用）
 */

import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStorageState, parseArgs } from './lib/session.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadDefaults() {
  const path = resolve(__dirname, '..', 'config', 'defaults.json');
  if (!existsSync(path)) return {};
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  const args = parseArgs(process.argv);
  const defaults = await loadDefaults();

  const pdfPath = args.pdf;
  if (!pdfPath || !existsSync(pdfPath)) {
    console.error(`[publish] --pdf is required and must exist. got: ${pdfPath}`);
    process.exit(2);
  }

  const opts = {
    title: args.title || defaults.title || 'Untitled deck',
    description: args.description || defaults.description || '',
    tags: args.tags || defaults.tags || '',
    visibility: args.visibility || defaults.visibility || 'public',
    category: args.category || defaults.category || 'technology',
    downloads: (args.downloads ?? String(defaults.downloads ?? 'false')) === 'true',
  };

  const storageState = await loadStorageState();

  const headless = !process.env.HEADFUL;
  console.log(`[publish] headless=${headless}, pdf=${pdfPath}`);
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  try {
    // 1. 新規アップロードページへ
    await page.goto('https://speakerdeck.com/presentations/new', {
      waitUntil: 'domcontentloaded',
    });

    // ログイン切れ検知
    if (page.url().includes('/signin') || page.url().includes('/users/sign_in')) {
      throw new Error(
        'Session expired. Run `node login.mjs` again, or refresh SPEAKERDECK_SESSION secret.'
      );
    }

    // 2. PDF を input[type=file] に attach
    // NOTE: SpeakerDeckはドラッグ＆ドロップUIだが、裏に input[type=file] が存在する。
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(resolve(pdfPath));
    console.log('[publish] PDF attached, waiting for upload/processing...');

    // 3. アップロード完了までの待機
    // SpeakerDeck は upload 完了後に編集フォームへ遷移する。
    // 遷移 or title input の出現を待つ。
    await page.waitForSelector(
      'input[name="talk[title]"], input#talk_title, form textarea[name="talk[description]"]',
      { timeout: 180000 }
    );

    // 4. メタデータ入力
    const titleInput = page.locator(
      'input[name="talk[title]"], input#talk_title'
    ).first();
    await titleInput.fill(opts.title);

    const descTextarea = page.locator(
      'textarea[name="talk[description]"], textarea#talk_description'
    ).first();
    if (await descTextarea.count()) {
      await descTextarea.fill(opts.description);
    }

    // タグ入力（SpeakerDeckは複数のtag UI形式があるので両対応）
    if (opts.tags) {
      const tagInput = page.locator(
        'input[name="talk[tags]"], input#talk_tags, input[name="talk[tag_list]"]'
      ).first();
      if (await tagInput.count()) {
        await tagInput.fill(opts.tags);
      }
    }

    // カテゴリ選択
    const categorySelect = page.locator(
      'select[name="talk[category_id]"], select#talk_category_id'
    ).first();
    if (await categorySelect.count()) {
      // "Technology" ラベルでマッチ
      await categorySelect.selectOption({ label: /technology/i }).catch(async () => {
        // フォールバック: value が small caps のケース
        await categorySelect.selectOption({ value: opts.category });
      });
    }

    // 公開範囲
    if (opts.visibility === 'public') {
      const publicRadio = page
        .locator('input[type="radio"][value="public"], input#talk_visibility_public')
        .first();
      if (await publicRadio.count()) await publicRadio.check();
    } else if (opts.visibility === 'unlisted') {
      const unlistedRadio = page
        .locator('input[type="radio"][value="unlisted"], input#talk_visibility_unlisted')
        .first();
      if (await unlistedRadio.count()) await unlistedRadio.check();
    }

    // ダウンロード許可
    const downloadCheckbox = page.locator(
      'input[type="checkbox"][name="talk[downloadable]"], input#talk_downloadable'
    ).first();
    if (await downloadCheckbox.count()) {
      const checked = await downloadCheckbox.isChecked();
      if (opts.downloads && !checked) await downloadCheckbox.check();
      if (!opts.downloads && checked) await downloadCheckbox.uncheck();
    }

    // 5. Publish ボタン押下
    const publishButton = page
      .locator(
        'button:has-text("Publish"), input[type="submit"][value*="Publish"], button[type="submit"]:has-text("Save")'
      )
      .first();
    await publishButton.click();

    // 6. 完了まで遷移を待つ（デッキ詳細ページへ）
    await page.waitForURL(/speakerdeck\.com\/[^/]+\/[^/]+$/, { timeout: 60000 });
    const url = page.url();

    console.log('[publish] Deck published successfully:');
    console.log(url);

    // CI での後続 step 用に stdout の最終行に URL を出す
    process.stdout.write(`${url}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[publish] Failed:', err);
  process.exit(1);
});
