# Idris Sadiq: Portfolio

A calm, professional portfolio that opens in **Calm** mode every visit. One **CHAOS** button turns the whole page into a bright cartoon space adventure; **Restore order** (or Esc) brings it back. English and 日本語.

## Run
```
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve dist/ at http://localhost:4173
```

## What is here
- **Calm page** (`src/App.tsx`, `src/content.ts`): hero, highlights, research interests, selected work, grant and placement, foundations, bench notes, path, learning, Japanese practice, contact (email, LinkedIn, GitHub, CV download and the Japanese row).
- **Eight interactive simulations** (`src/sims/<name>/`: `core.ts` pure logic with Vitest tests, `View.tsx` rendering). They are lazy-loaded, pause when off-screen, are keyboard accessible, and carry the caption "Illustrative simulation, not measured data":
  PID twin (the "Auto-tune (demo)" button is a simple search optimiser, not the research RL tuner), 8-bit CPU, pipe leak inspection, swarm sandbox, quadruped gait lab, vehicle arena, G.A.I.T. signal lab (with "Not a medical device"), net-and-debris.

## Edit the content
- Every fact, string and bilingual text: `src/content.ts`. Status badges: `statusLabel`.
- Rules: no invented numbers or claims; deck wording wins for status; hide details you cannot support. Items awaiting your answer are in `docs/open-questions.md`.
- **Every Japanese string is a draft** and needs a native Japanese reader before the site is shared.
- Habit numbers (Duolingo, LeetCode) carry an `asOf` date in `content.ts`. Re-check them on publish day.

## Tune the chaos

## Checks
```
npm run lint && npm run typecheck && npm run test -- --run && npm run build
node tests/calm-check.mjs        # Calm downloads no Chaos assets (needs npm run preview)
node tests/chaos-check.mjs       # Moon collapse, Restore order, Esc, barrel roll
node tests/esc-collapse.mjs      # regression: Esc during the Moon pile
node tests/browsers.mjs          # Chromium, Firefox, WebKit smoke (needs npx playwright install firefox webkit)
node tests/mobile.mjs            # iPhone-size Japanese view of the sims, overflow check
node tests/gravity.mjs           # Moon: fall down, fall up, then the song (needs npm run preview)
node tests/chaos-gags2.mjs       # omae, shattering text, dodging buttons, persistent comments
node tests/rick-filter.mjs       # filter chips, swarm parts, shake and rick roll
node tests/flyby-crash.mjs       # click a flyer: it crashes and explodes
node tests/robot-evict.mjs       # pet robot gets angry, evicts you
node tests/section-notes.mjs     # section comments arrive after a dwell
node tests/cena.mjs              # jumpscare
node tests/enlarge.mjs           # every simulation can be enlarged without cut-off
node tests/net-interact.mjs      # net sim: drop, throw and pick up debris
npm run test:e2e                 # calm, chaos, esc, browsers, mobile against npm run preview
npm run test:chaos               # the Chaos gag tests (add the preview URL as an argument)
node tests/shots.mjs             # screenshots + console-error check (needs npm run dev)
CHECK_STRICT=1 npm run check:publish   # private-term blocklist and draft markers
CHECK_STRICT=1 npm run check:jokes     # fails until every caption is chosen or written
```
Last mobile Lighthouse on the local preview: Performance 93, Accessibility 100, Best Practices 100, SEO 100 (LCP 2.5 s, CLS 0, TBT 190 ms). Re-run before publishing.

## Media
Photos and recordings come from the portfolio deck. Put originals in `src/assets/raw/` (gitignored) and run `npm run media` to create responsive WebP in `public/media/img/`. Videos are in `public/media/vid/` (H.264, lazy). `stepscribe.mp4` and `rl-pid.mp4` are short project videos made with the brag tool (sources in the private `project-videos/` folder); they use a bundled music bed, so check its licence terms before publishing or swap the track. See `docs/credits.md`.

## Before going public
1. Answer `docs/open-questions.md`; get a native review of the Japanese text.
3. Fill `docs/blocklist.txt` (private terms, one per line, gitignored) and run `CHECK_STRICT=1 npm run check:publish`.
4. Strip EXIF from any new photos and check backgrounds for people or private screens.
5. Push to GitHub, then Settings → Pages → Source: GitHub Actions. The workflow in `.github/workflows/deploy.yml` runs lint, typecheck, tests and the strict checks before building. For a project site the base path is set to `/<repo>/` automatically; for `<user>.github.io` remove the `VITE_BASE` line.

## Not built yet

## Documents
Private working documents (build report, improvement audit, publish checklist, privacy sweep, open questions, blocklist, the build guide copy) live in `docs/` on disk but are git-ignored, so they are never committed.

## Deploying under a base path
`VITE_BASE=/<repo>/ npm run build` makes a project-site build; `/` (the default) makes a user-site build. The workflow chooses automatically. To check a project-site build locally: build with `VITE_BASE=/robotics-portfolio/`, serve it with `vite preview` (same variable), then `node tests/base-path.mjs http://localhost:4173/robotics-portfolio/`.
