# SpeakerDeck publish skill scripts

This directory mirrors the `~/.claude/skills/speakerdeck-publish/` Skill so that
the same Playwright scripts can run in GitHub Actions (`publish-speakerdeck.yml`).

## Local setup (one-time)

```bash
cd ~/.claude/skills/speakerdeck-publish/scripts
npm install
npx playwright install chromium
node login.mjs     # opens a browser; complete GitHub OAuth and press Enter
```

This creates `~/.claude/skills/speakerdeck-publish/.session/speakerdeck.json`.

## Register CI secrets

1. Encode the session file:
   ```bash
   base64 -i ~/.claude/skills/speakerdeck-publish/.session/speakerdeck.json | pbcopy
   ```
2. On GitHub -> repo Settings -> Secrets and variables -> Actions, add:
   - `SPEAKERDECK_SESSION` = (paste the base64 string)
3. (After the first CI run creates the deck) Add:
   - `SPEAKERDECK_DECK_URL` = URL printed by the workflow (e.g. `https://speakerdeck.com/<you>/<slug>`)

## What the workflow does

- Builds `slides/slides-v3.pdf` with marp-cli
- If `SPEAKERDECK_DECK_URL` is absent: creates a new deck (`publish.mjs`)
- If present: replaces the PDF of the existing deck (`update.mjs`)
- If `SPEAKERDECK_SESSION` is absent: emits a warning and exits 0 (no-op)

## Local dry run

```bash
HEADFUL=1 node ~/.claude/skills/speakerdeck-publish/scripts/publish.mjs \
  --pdf $(pwd)/slides/slides-v3.pdf
```

`HEADFUL=1` disables headless mode so you can visually verify each step.
