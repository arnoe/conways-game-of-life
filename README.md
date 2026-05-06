# Conway's Game of Life — a take-home build

A Conway's Game of Life web app built end-to-end through the BMAD agentic workflow, shipping the MVP floor (Epics 1–4) with a transparent trail of architecture decisions, AI usage, and deliberate skips.

The original take-home brief and the full planning artifacts live under [`docs/planning-artifacts/`](docs/planning-artifacts/). This README is the candidate's thinking document — what was built, why it looks the way it does, what was traded off, and what would come next.

---

## 1. Quick start

Prereqs: Node LTS and `pnpm`.

```bash
pnpm install
pnpm nx run @cgol-scaffold/web:dev      # http://localhost:3000
pnpm nx test sim                         # unit tests for the simulation core
pnpm nx test web                         # unit + integration tests for the UI
pnpm nx e2e @cgol-scaffold/web-e2e       # Playwright happy-path + keyboard + responsive
```

CI runs `lint`, `typecheck`, Jest, and Playwright (chromium-only) on every PR into `main`. Failing checks block merge; an auto-approve workflow lets fully-green PRs land without a manual approval step.

---

## 2. What this app does (and what it doesn't)

**What ships.** Size a grid (5–200 in either dimension), paint cells with a click or tap, run the simulation with Play/Pause/Step, see a generation counter advance live, Clear or Randomize the grid (Randomize uses a fixed 0.3 density), and adjust the simulation rate from 1 to 60 generations per second with a slider — including changing the rate mid-run without restarting the requestAnimationFrame loop. The app is responsive at 375px portrait, keyboard-reachable on every control, and serves a single-page client component over Next.js App Router.

**What's not in.** No saved patterns, no NestJS persistence, no Web Worker / OffscreenCanvas performance tier, no pluggable rule sets. Those are stretch tiers (Epics 5–8) and are deliberately deferred — see §5.

---

## 3. Architecture & module map

The repo is an **Nx monorepo** with two apps and one library:

- **`apps/web`** — the Next.js 16 (TypeScript, App Router, Turbopack) UI. Single page, single client component tree. State lives in a `useReducer` whose action union is fully exhaustive across Stories 3.1–3.5; the simulation loop is a `useSimulationLoop` hook that owns a rAF + accumulator pattern so changing the speed slider mid-run does not cancel-and-restart the loop. Rendering is a single `<canvas>` with devicePixelRatio-aware draws — there is no DOM-per-cell.
- **`libs/sim`** — the simulation core. Pure functions, no DOM, no React. Exposes `createGrid`, `toggleCell`, `step`, `clearGrid`, `randomizeGrid`, plus the `Grid` type. `step` implements Conway's B3/S23 deterministically, with rule-by-rule unit tests, edge-case boundary tests, and canonical-pattern tests (block, blinker, glider). The library is the natural target for the brief's "at least one shared library" requirement.
- **`apps/web-e2e`** — the Playwright test suite. Three specs: `happy-path.spec.ts` (Story 4.1, full play-pause-clear flow), `keyboard.spec.ts` (Story 4.2, Tab-order walk plus slider arrow keys), and `responsive.spec.ts` (Story 4.3, 375×667 portrait, no horizontal scroll, stacked layout, touch-tap parity).

**Why these boundaries.** Module-boundary enforcement is the unsexy part that earns the Nx setup. `nx.json`'s `@nx/enforce-module-boundaries` rule, paired with `tags` on each project, makes a cross-boundary import (e.g., `apps/web` reaching past `libs/sim`'s public surface) fail CI rather than slip through review. The deliberate-violation demonstration captured in [`docs/implementation-artifacts/branch-protection.md`](docs/implementation-artifacts/branch-protection.md) — Story 1.2 — is committed evidence that the rule actually fires.

The full decision record lives in [`docs/planning-artifacts/architecture.md`](docs/planning-artifacts/architecture.md). Conway's rules themselves are not recapped here; reviewers know them.

---

## 4. Trade-offs and conscious deviations

These are the deliberate departures from the planning artifacts (or from the obvious-but-wrong default). Each one is a judgment call, not a regret.

1. **Workspace scope is `@cgol-scaffold/*`, not `@conways-game-of-life/*`.** Story 1.1's `create-nx-workspace --preset=next` generator landed with `cgol-scaffold` as the default scope (Nx auto-shortens the workspace folder name). Renaming post-scaffold would mean either editing the first commit (violates the "first commit is raw scaffolding" hard rule) or a sweeping single-purpose commit that touches every import. Decision: keep the scope, document the deviation. Project-context rule #20 ("always use the alias, never relative paths") still holds in spirit.
2. **CSS Modules over Tailwind.** Architecture and `docs/project-context.md` §2 both list Tailwind. The Nx Next preset that landed in Story 1.1 ships CSS Modules by default; setting up Tailwind would have been a second-commit infrastructure change, viable but not worth the time across 4 components. Decision: ship CSS Modules; do not framework-hop mid-build. The brief calls out framework-hopping as a fail signal.
3. **Viewport meta is provided via Next's typed `viewport` export, not a manual `<meta>` tag.** Story 4.3 uses the canonical Next.js 13.2+ idiom (`export const viewport: Viewport = {...}` in `app/layout.tsx`). Same emitted HTML, slightly more typed.
4. **RuleSet abstraction (Epic 8) deferred. B3/S23 is hardwired in `libs/sim/step.ts`.** A `RuleSet` interface with one implementation is decoration, not architecture. The brief asks for a polished MVP, not ten things half-built.
5. **Web Worker / OffscreenCanvas (Epic 6) deferred.** The rAF + accumulator hits the perf budget at default 30×30 and through ~100×100 without offloading. Architecture §5.3 documents the upgrade path — the simulation core is a pure-function module precisely so a Web Worker boundary can be slotted in later without touching the React tree.
6. **NestJS API + persistence (Epic 7) deferred — stretch tier.** The `libs/api-client` lib was *not* scaffolded as an empty barrel (project-context rule #13 suggests it should be), since it isn't used in MVP. Scaffolding empty libs days early is yak-shaving when the stretch tier wasn't attempted.
7. **Pattern library (Epic 5) deferred — stretch tier.** Glider / blinker / Gosper-gun seeds would be roughly half a day; the spend went to README polish and the a11y audit. Brief: signal density over feature count.
8. **No density slider on Randomize.** PRD locks density at 0.3. A density slider would be one more control on a small UI; "ship the spec, don't gold-plate."
9. **Accepted Next.js 16 / Turbopack `customConditions` workaround.** `tsconfig.base.json` declares `"customConditions": ["@cgol-scaffold/source"]` so Nx's bundler-mode TS can resolve workspace libs from source. Turbopack 16 emits a transient warning. Dropping the condition would lose the source-on-save path. Decision: keep, accept the warning, document.

---

## 5. What I deliberately skipped (and what I'd build next)

A priority-ordered list of stretch epics. With another day of focused work, I would attempt them in this order:

1. **Epic 5 — Pattern library.** Highest signal-per-hour for the user. A glider that visibly demonstrates the rules engine works is worth more than another performance tier.
2. **Epic 6 — Web Worker + OffscreenCanvas.** Lifts the practical ceiling above ~150×150 and shows the perf-tiering muscle. The `libs/sim` boundary is already shaped for this.
3. **Epic 8 — Pluggable rule engine.** Clean interface change; demonstrates boundary discipline on a feature axis. Most of the work is choosing a rule-string format (e.g. "B3/S23") and threading it through `step()`.
4. **Epic 7 — NestJS persistence.** Highest cost, lowest UX win for a single-session toy. Only worth attempting in a longer build window.

The full deferred-epic breakdown lives in [`docs/planning-artifacts/epics.md`](docs/planning-artifacts/epics.md).

---

## 6. AI usage — how this was actually built

This build was orchestrated by the BMAD Master agent invoking SM (Scrum Master), Dev, Architect, and Code Review subagents per story. Each story file in [`docs/implementation-artifacts/`](docs/implementation-artifacts/) was drafted by an SM reading the planning artifacts, then a Dev subagent implemented against that file in a fresh context, then a Code Review subagent gave a fresh-context read before merge. The repository's `_bmad/`, `.claude/`, `.cursor/`, and `.opencode/` directories are committed and capture the agent configs and slash commands used — they are evaluation artifacts, not throwaway tooling.

Three concrete moments where the loop earned its keep or got pushed back on:

**AI helped — Story 2.3, corner-survival AC.** The original AC for "all-alive 3×3 → step()" said the four corner cells die. I had read and accepted it. The SM subagent, while drafting the story file, hand-computed the canonical Conway expectation and noted that on an all-alive 3×3 grid each corner has exactly 3 live neighbors and *survives* (rule 2: 2–3 neighbors → live), not dies. The story file was rewritten to assert the correct cell-by-cell output — the kind of correction easy to miss in hand-review and easy for an AI to catch when forced to enumerate.

**I pushed back on AI — Epic 1, typecheck-target gap.** The Code Review agent flagged that CI ran `nx affected -t lint` and `-t test` but had no `typecheck` target on `apps/web` (the Nx Next.js generator didn't emit one). Its first suggestion was to add a custom `typecheck` target by hand to every `project.json`. I pushed back: per-project edits drift from the Nx default and become a maintenance burden. The fix was to wire `tsc --noEmit` through Nx's built-in `typecheck` plugin once it landed, scoped via a single workflow step. Same coverage, less custom config.

**I pushed back on AI — Epic 3, `next-env.d.ts` CI break.** Code Review flagged a CI failure caused by `next-env.d.ts` drifting between local and CI. Next.js 16 / Turbopack regenerates it on `next dev` and `next build`. The agent's first suggestion: commit the regenerated file. I pushed back: it is auto-generated (Next documents it as such) and committing it just re-creates the drift on the next dev run. The right fix is to gitignore `next-env.d.ts` and make `typecheck` depend on `build` so the file exists when CI typechecks (commit `624582b`).

The full report — three more "AI was wrong" examples and three "AI worked well" prompts — lives in [`docs/implementation-artifacts/ai-usage.md`](docs/implementation-artifacts/ai-usage.md). The committed BMAD configs and slash commands live under [`_bmad/`](./_bmad/), [`.claude/commands/`](./.claude/commands/), [`.cursor/commands/`](./.cursor/commands/), and [`.opencode/`](./.opencode/) — none of those directories are gitignored.

---

## 7. What I'm not happy with

Honest list. Things a reviewer might note that I would not push back on:

- **The CSS Module / Tailwind deviation isn't a clean win.** Tailwind would have produced visibly more polished spacing and typography in the same time. Future-self note: budget 30 minutes to set up Tailwind in the scaffolding-commit follow-up if it doesn't ship by default.
- **Test coverage on `useSimulationLoop` is integration-flavored, not unit-pure.** The rAF + accumulator hook is verified by counting tick calls under fake timers, which is correct, but a reviewer who wanted to see explicit accumulator-arithmetic unit tests (e.g., "given dt=33ms and interval=100ms, after 4 frames the accumulator value is X") wouldn't find them. The current tests assert the right user-visible behavior; they don't dissect the math.
- **No deployed preview.** The brief says "welcome but not required." A Vercel deploy would have been ~20 minutes; deferred to keep the PR diff focused.
- **E2E uses counter-based verification, not canvas pixel reads.** Story 4.1 locks this trade-off (no pixel sampling, no debug globals). It's the right call for the MVP — the alternative paths each have their own brittleness — but a reviewer who wanted to see "the cell at (5,5) is alive" verified by reading `getImageData` will not find it.
- **No axe-core a11y check.** Story 4.2 explicitly skips this. A targeted Tab-walk + accessible-name audit covers the WCAG 2.1 AA criteria the project actually claims; axe-core would have added a blanket scan but also a dependency and a brittle CI step.
- **No formal performance benchmark.** NFR4 ("≥30 gen/sec at 50×50") was checked casually during development, not by a benchmark suite.

---

## 8. Where to read more

**Planning artifacts** (canonical "what good looks like"):
- [`docs/planning-artifacts/product-brief.md`](docs/planning-artifacts/product-brief.md)
- [`docs/planning-artifacts/prd.md`](docs/planning-artifacts/prd.md)
- [`docs/planning-artifacts/architecture.md`](docs/planning-artifacts/architecture.md)
- [`docs/planning-artifacts/epics.md`](docs/planning-artifacts/epics.md)

**Implementation artifacts** — one file per story under [`docs/implementation-artifacts/`](docs/implementation-artifacts/):
- Epic 1 (workspace + CI): stories 1.1–1.6, plus the [boundary-violation demo](docs/implementation-artifacts/branch-protection.md).
- Epic 2 (simulation core): stories 2.1–2.4.
- Epic 3 (UI): stories 3.1–3.5.
- Epic 4 (E2E + a11y + responsive + this README): stories 4.1–4.4.
- Sprint state: [`sprint-status.yaml`](docs/implementation-artifacts/sprint-status.yaml).

**AI artifacts (committed, not gitignored):**
- [`_bmad/`](./_bmad/) — BMAD Method v6.0.2 install (workflows, agents, slash commands).
- [`.claude/commands/`](./.claude/commands/) — 43 BMAD slash commands for Claude Code.
- [`.cursor/commands/`](./.cursor/commands/) — same command set, mirrored for Cursor.
- [`.opencode/`](./.opencode/) — same command set, mirrored for opencode.

The full AI-usage report is at [`docs/implementation-artifacts/ai-usage.md`](docs/implementation-artifacts/ai-usage.md).
