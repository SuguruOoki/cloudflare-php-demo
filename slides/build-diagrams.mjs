#!/usr/bin/env node
/**
 * diagrams/*.mmd を diagrams/*.svg にレンダリングする。
 * .svg が .mmd より新しければスキップするインクリメンタルビルド。
 */
import { readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const diagramsDir = resolve(here, 'diagrams');

const mmdFiles = readdirSync(diagramsDir).filter((f) => f.endsWith('.mmd'));

let built = 0;
let skipped = 0;

for (const mmd of mmdFiles) {
  const svg = mmd.replace(/\.mmd$/, '.svg');
  const mmdPath = join(diagramsDir, mmd);
  const svgPath = join(diagramsDir, svg);

  let shouldBuild = true;
  try {
    const mmdStat = statSync(mmdPath);
    const svgStat = statSync(svgPath);
    if (svgStat.mtimeMs >= mmdStat.mtimeMs) {
      shouldBuild = false;
    }
  } catch {
    // svg 無し → ビルド
  }

  if (!shouldBuild) {
    skipped++;
    continue;
  }

  console.log(`[mmd -> svg] ${mmd}`);
  const res = spawnSync(
    'npx',
    ['mmdc', '-i', mmdPath, '-o', svgPath, '-b', 'transparent', '--quiet'],
    { stdio: 'inherit' }
  );
  if (res.status !== 0) {
    console.error(`Failed to render ${mmd}`);
    process.exit(res.status ?? 1);
  }
  built++;
}

console.log(`Diagrams: built=${built}, skipped=${skipped}, total=${mmdFiles.length}`);
