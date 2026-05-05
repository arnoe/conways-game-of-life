---
story_id: 4.4
epic: 4
title: README as thinking document
status: ready-for-dev
priority: MVP
estimated_effort: M
fr_nfr_coverage: [NFR9, AR4, AR5]
inputDocuments:
  - docs/planning-artifacts/epics.md
  - docs/planning-artifacts/architecture.md
  - docs/planning-artifacts/prd.md
  - docs/project-context.md
  - README.md
  - docs/implementation-artifacts/ai-usage.md
---

# Story 4.4 — README as thinking document

**Status:** `ready-for-dev`
**Epic:** 4 — E2E, accessibility, and responsive polish
**Priority:** MVP
**Effort:** M

---

## User story

**As** the panel,
**I want** a README that explains why the architecture looks like it does, what was traded off, how AI was used, what would come next, and what the candidate isn't proud of,
**So that** I get the "thinking document" the brief requires.

---

## Acceptance criteria

Copied verbatim from `docs/planning-artifacts/epics.md` Story 4.4, with stable IDs added.

- **AC-1** — **Given** the repository root README, **when** read top-to-bottom, **then** it contains sections for: one-command local startup; architecture overview (with a link to `docs/planning-artifacts/architecture.md`); module boundaries (with the deliberate-violation demonstration captured in story 1.2); explicit trade-offs and what was deliberately skipped (mirroring architecture §8); AI usage with at least one concrete "AI helped" example and at least one "I pushed back on AI" example (NFR9); "what's next with another 8 hours"; and an honest "what I'm not happy with."

- **AC-2** — **Given** the AI artifact directories, **when** the README is reviewed, **then** it confirms `.claude/`, `.cursor/`, `.opencode/`, and `_bmad/` are committed, references their location, and is not gitignored (AR4).

- **AC-3** — **Given** `git log --oneline`, **when** the README is reviewed, **then** the README does not duplicate the git history but cross-references the most consequential PRs/commits (e.g., the boundary-violation demo, the rAF accumulator implementation).

---

## Locked technical decisions

These are decisions Dev does **not** need to relitigate.

### Scope: this story replaces the root `README.md`. **Only this story is allowed to do that.**

The current `README.md` is the take-home **brief** — what the planning team wrote for the candidate to read on day zero. The brief lives at the root and is what evaluators see first. Story 4.4 replaces it with the candidate's thinking-document deliverable. Stories 4.1, 4.2, 4.3 must NOT touch `README.md`.

### What to preserve from the current README

The current README is itself a planning artifact (the brief). Decision tree:

1. **Strictly factual setup info** (how to clone, install, run, test) — preserve and adapt to the actual scaffold reality (Nx targets, pnpm, port 3000).
2. **The brief's evaluation criteria, "things to avoid," "stretch goals" prose** — DO NOT pad the new README with this. It's the planning team's wording, not the candidate's. The new README is the candidate's voice.
3. **The "What's already in this repo" table mapping files to purposes** — preserve in spirit (link to planning artifacts), but rewrite as the candidate's own architecture overview.
4. **The "Required deliverables" / "Submission" / "Confidentiality" sections** — these are brief-side instructions, not project documentation. **Cut entirely.** They belong in the brief, not in the candidate's thinking document.

> **SM resolution on the brief.** The user-task brief floated retaining a "Brief & deliverable scope" section that includes the original assignment. **Locked: do NOT include the original brief text inline.** Reasons:
>
> 1. The brief is the panel's own document; reproducing it inside the candidate's deliverable reads as not understanding what the README is for.
> 2. The brief lives in git history at `cefb5e2 Update README.md` and earlier commits. Anyone who needs to see what was asked can `git log` or read it through the planning artifacts.
> 3. The candidate's README must be a *thinking document* — its job is to explain decisions, not restate the assignment.
> 4. Cross-link to the planning artifacts (`docs/planning-artifacts/`) for the panel's reference; that's where the formal "what was asked" lives in canonical form.
>
> If the panel needs the brief at hand, they can `git show HEAD~N:README.md` or visit the original fork. **Do not** paste the brief into the new README.

### `START_HERE.md` — separate question, separate decision

The brief mentions `START_HERE.md` as a separate deliverable. **This story does NOT create `START_HERE.md`.** That file is out of scope here. The new README's "Quick start" section serves that purpose for now; if the panel later asks for `START_HERE.md` specifically, it's a follow-up story. Do not pre-emptively create it.

> **SM rationale.** The user-task brief for Story 4.4 listed sections to write but did not include `START_HERE.md`. The brief at the repo root mentions it, but that's the panel's wording in the assignment — it's a "would be nice" deliverable, not part of Story 4.4's locked sections. Keeping scope tight: this story produces the README. Period.

### `docs/implementation-artifacts/ai-usage.md` — keep AND link

The user-task brief asked: "Update `docs/implementation-artifacts/ai-usage.md` if it's a separate template, OR fold its content into the README's AI section — defer to architecture's intent."

**Locked: keep `ai-usage.md` as the canonical, detailed AI report. Fill it in. Link to it from the README's AI usage section.** The README gets a *summary* (1–3 paragraphs + 2–3 concrete examples); the full report (three "AI was wrong" examples, three "AI worked well" prompts) lives in `ai-usage.md`. Reasons:

1. The brief lists `docs/implementation-artifacts/ai-usage.md` as a required deliverable; deleting or merging it loses a discoverable artifact reviewers expect to find at that path.
2. The README's AI section becomes manageable (≤500 words) instead of 1500.
3. The detailed report's structure (template-driven) is the right format for honest, sectioned answers; flowing prose in the README would dilute it.

The README links into `docs/implementation-artifacts/ai-usage.md` with anchor links to the most signal-rich subsection.

### Locked README structure (top to bottom)

```markdown
# Conway's Game of Life — a take-home build

> One-line tagline: a Conway's Game of Life web app built end-to-end through the BMAD agentic workflow, shipping the MVP floor (Epics 1–4) with a transparent trail of architecture decisions, AI usage, and deliberate skips.

## 1. Quick start
## 2. What this app does (and what it doesn't)
## 3. Architecture & module map
## 4. Trade-offs and conscious deviations
## 5. What I deliberately skipped (and what I'd build next)
## 6. AI usage — how this was actually built
## 7. What I'm not happy with
## 8. Where to read more

(End of file. No "License," no "Contributing," no "Confidentiality" — those are brief-side or template noise.)
```

Each section's locked content brief:

#### 1. Quick start

Five commands, one screen. Locked shape:

```bash
pnpm install
pnpm nx run @cgol-scaffold/web:dev      # http://localhost:3000
pnpm nx test sim                          # unit tests for the simulation core
pnpm nx test web                          # unit + integration tests for the UI
pnpm nx e2e @cgol-scaffold/web-e2e        # Playwright happy-path + keyboard + responsive
```

Plus a one-line note: prereqs are Node LTS and pnpm. Don't pad with "open your browser at ...".

#### 2. What this app does (and what it doesn't)

Two short paragraphs:
- **What ships:** size a grid (5–200), paint cells, Play/Pause/Step/Clear/Randomize, generation counter, speed slider with mid-run rate change, responsive at 375px portrait, keyboard-reachable controls.
- **What's not in:** stretch tier (pattern library, Web Worker performance tier, NestJS persistence, pluggable rule sets). See §5 for the deferred-list.

This is *not* the brief's "Required Functionality" line copy-pasted. It's the candidate's plain-English summary.

#### 3. Architecture & module map

One paragraph each on `apps/web`, `libs/sim`, `apps/web-e2e`. Plus a one-paragraph "why these boundaries" callout that:
- Names the locked stack (Next.js, TypeScript strict, Nx, Jest, Playwright, CSS Modules, `useReducer`).
- Calls out the boundary enforcement: the `@nx/enforce-module-boundaries` rule + the deliberate-violation demonstration committed under `docs/implementation-artifacts/` (Story 1.2). Cite the specific demonstration file by path.
- Links to the full architecture: `docs/planning-artifacts/architecture.md`.
- Does NOT recap Conway's rules. Reviewers know them.

#### 4. Trade-offs and conscious deviations

This is the section that earns the "thinking document" label. Locked items, each ~3–5 sentences, in this order:

1. **Workspace scope is `@cgol-scaffold/*`, not `@conways-game-of-life/*`.** Story 1.1's `create-nx-workspace --preset=next` generator prompt cleared the scope to `cgol-scaffold` (default Nx behavior on a fresh workspace named `conways-game-of-life`). Renaming the scope post-scaffold would have meant either editing the first commit (violates the "first commit is raw scaffolding" hard rule) or doing a sweeping commit that changes every import in the repo (poor reviewability). Decision: keep the scope, document the deviation. Project-context rule #20 still holds in spirit (always use the alias, never relative paths) — only the alias name differs.
2. **CSS Modules over Tailwind.** Architecture and `docs/project-context.md` §2 both list Tailwind. Reality: the Nx Next.js preset that landed in Story 1.1 ships with CSS Modules by default; setting up Tailwind would have been a second-commit change, viable but not visibly worth the time given the small surface area (4 components, ~5 .module.css files). Decision: ship CSS Modules; do not framework-hop mid-build. Brief calls out framework-hopping as a fail signal.
3. **`<meta name="viewport">` is provided via Next.js App Router's typed `viewport` export, not a manual `<meta>` tag.** Story 4.3 uses the canonical Next.js 13.2+ idiom. Same emitted HTML, slightly more typed.
4. **RuleSet abstraction (Epic 8) deferred. Conway's B3/S23 is hardwired in `libs/sim`.** The interface scaffolding (one line in `libs/types`) was tempting; resisted. Brief asks for "a polished MVP, not ten things half-built." A `RuleSet` interface with one implementation is decoration, not architecture.
5. **Web Worker / OffscreenCanvas (Epic 6) deferred.** Performance at 30×30 default and up through ~100×100 is acceptable on the targeted hardware; the rAF + accumulator hits the perf budget without offloading. Architecture §5.3 documents the upgrade path.
6. **NestJS API + persistence (Epic 7) deferred — stretch tier.** Same reason. The `libs/api-client` lib was *not* scaffolded as an empty barrel (project-context rule #13's recommendation), since it's not even used in MVP. If the panel asks why, the answer is: scaffolding an empty lib eight days early is yak-shaving when the stretch tier wasn't actually attempted. Document the rule, document the deviation.
7. **Pattern library (Epic 5) deferred — stretch tier.** Glider/blinker/Gosper gun would have been ~half a day; the spend goes to README polish + a11y audit instead. Brief: signal density over feature count.
8. **No density slider on Randomize.** PRD locks density at 0.3 by default. A density slider would be one more control on a small UI; the locked-default reading is "ship the spec, don't gold-plate."
9. **Loom walkthrough is a separate, out-of-repo deliverable.** Brief asks for it; not part of this PR.

#### 5. What I deliberately skipped (and what I'd build next)

A priority-ordered list of the stretch epics, with one sentence per "if I had another day" prioritization:

1. **Epic 5 — Pattern library** (highest signal-per-hour for the user; a glider visibly demonstrates the rules engine works).
2. **Epic 6 — Web Worker + OffscreenCanvas** (lifts the `200×200 @ 60fps` ceiling and shows the perf-tiering muscle).
3. **Epic 8 — Pluggable rule engine** (clean interface change; demonstrates the boundary discipline on a feature axis).
4. **Epic 7 — NestJS persistence** (highest cost, lowest UX win for a single-session toy; would only attempt with day 5).

Link to `docs/planning-artifacts/epics.md` for the full breakdown.

#### 6. AI usage — how this was actually built

This section is the heart of the thinking document. Required content (locked):

- **Process:** This build was orchestrated by the BMAD Master agent invoking SM (Scrum Master), Dev, and Code Review subagents per story. Each story file in `docs/implementation-artifacts/N-N-…md` was drafted by an SM subagent reading `docs/planning-artifacts/`, then a Dev subagent implemented against that story file in a fresh context, then a Code Review subagent gave a fresh-context read before merge to `main`. The repository's `.claude/`, `.cursor/`, `.opencode/`, and `_bmad/` directories are committed and capture the agent configs and slash commands used.

- **Concrete artifacts to cite:**
  - `_bmad/_config/manifest.yaml` — BMAD Method v6.0.2 install.
  - `.claude/commands/` — 43 BMAD slash commands available in Claude Code.
  - `docs/planning-artifacts/epics.md` — drafted by the BMM PM agent.
  - `docs/planning-artifacts/architecture.md` — drafted by the BMM Architect agent.
  - `docs/implementation-artifacts/*.md` — all 19 story files (Stories 1.1 → 4.4).

- **At least one "AI helped" example.** Locked: the SM subagent for Story 2.3 caught an AC mis-statement before it shipped — the original AC for "all-alive 3×3 → step()" said the corners die. The candidate had read this and accepted it. The SM subagent, while drafting the story file, hand-computed the canonical Conway expectation and noted that on an all-alive 3×3 grid, the four corner cells each have 3 live neighbors and *survive* (rule 2: 2–3 neighbors → live), not die. The story file was rewritten to assert the actually-correct cell-by-cell expected output. This is the kind of correction that's easy to miss in a hand-review and easy for an AI to catch when it's *forced* to enumerate the assertion.

- **At least one "I pushed back on AI" example.** Locked: the Code Review agent for Epic 1 flagged a typecheck-target gap — the CI workflow was running `pnpm nx affected -t lint` and `pnpm nx affected -t test` but was missing a `typecheck` target on `apps/web` because the Nx generator didn't emit one. The agent's first suggestion was to add a custom `typecheck` target by hand to every `project.json`. The candidate pushed back: a per-project edit drifts from the Nx default and creates a maintenance burden. The actual fix was to use `pnpm tsc --noEmit -p apps/web` directly in CI for typechecking, scoped via a single workflow step rather than per-project config. Same coverage, less custom config. The README walks through this trade-off so reviewers see the judgment, not just the outcome.

- **A second "I pushed back on AI" example, locked:** the Code Review agent for Epic 3 flagged a CI failure caused by the `next-env.d.ts` file. Next.js 16 / Turbopack regenerates this file on `next dev` and `next build`. The agent's first suggestion was to commit the regenerated file to fix CI. The candidate pushed back: the file is auto-generated (Next.js documents it as such) and committing the regenerated version would mean re-regenerating it the next time anyone ran the dev server. The actual fix was to add `next-env.d.ts` to `.gitignore`. The README cites this as a small but representative AI-output review: AI suggested the surface-level fix, the candidate found the underlying issue.

- **Link to the full report:** `docs/implementation-artifacts/ai-usage.md` for three more "AI was wrong" examples and three "AI worked well" prompts.

- **Format note:** keep this section to ~500 words. Detail lives in `ai-usage.md`. The brief evaluates "honesty about AI usage" — that means specifics, not adjectives.

#### 7. What I'm not happy with

Honest, brief, ~3 bullets:

- **The CSS Module deviation from Tailwind isn't a clean win** — Tailwind would have produced visibly more polished spacing/typography in the same time. Future-self note: budget 30 minutes to set up Tailwind in the scaffolding commit's follow-up if it slips by default.
- **Test coverage on `useSimulationLoop` is integration-flavored, not unit-pure** — the rAF + accumulator hook is tested by counting tick calls under fake timers, which is correct, but a reviewer who wanted to see explicit accumulator-arithmetic unit tests (e.g., "given dt=33ms and interval=100ms, after 4 frames the accumulator value is X") wouldn't find them. The current tests assert the right user-visible behavior; they don't dissect the math.
- **No deployed preview.** Brief says "welcome but not required." A Vercel deploy would have been ~20 minutes; deferred to keep the PR diff focused.

#### 8. Where to read more

A small linked-list of `docs/planning-artifacts/*.md` and `docs/implementation-artifacts/*.md` paths. Group as:

- **Planning artifacts** (canonical "what good looks like"): `product-brief.md`, `prd.md`, `architecture.md`, `epics.md`.
- **Implementation artifacts** (what was actually built, per story): list the 19 story files chronologically by epic.
- **AI artifacts:** `_bmad/`, `.claude/commands/`, `.cursor/commands/`, `.opencode/`. Mention they are committed deliverables (NFR9 / AR4).

### Word/length budget

- Total README target: **1200–2000 words.** Long enough to be a thinking document, short enough to read in 5 minutes.
- §6 (AI usage): **≤500 words** in the README itself; detail lives in `ai-usage.md`.
- §4 (Trade-offs): **the largest section.** Each item is 3–5 sentences. Don't pad; don't truncate.

---

## Test plan

This is a documentation story. There are no Jest or Playwright assertions. The "test" is the README being structurally complete and accurate.

### Self-review checklist (Dev runs before opening the PR)

- [ ] All eight sections from "Locked README structure" are present in order.
- [ ] §1 Quick start lists the three Nx commands actually used in this workspace (`pnpm nx run @cgol-scaffold/web:dev`, `pnpm nx test sim`, `pnpm nx test web`, `pnpm nx e2e @cgol-scaffold/web-e2e`). Verify by `pnpm nx show project @cgol-scaffold/web` if uncertain.
- [ ] §3 mentions and links to the boundary-violation demonstration captured under `docs/implementation-artifacts/` from Story 1.2. Verify the file actually exists at that path before linking.
- [ ] §4 includes all nine locked trade-off items (workspace scope, CSS Modules, viewport export, RuleSet, Web Worker, NestJS, pattern library, density slider, Loom).
- [ ] §6 includes the three concrete AI examples: SM caught Story 2.3 corner-survival mis-AC; Code Review caught Epic 1 typecheck gap; Code Review caught Epic 3 `next-env.d.ts` CI break.
- [ ] §6 links to `docs/implementation-artifacts/ai-usage.md`.
- [ ] §6 confirms `.claude/`, `.cursor/`, `.opencode/`, `_bmad/` are committed (AC-2). State this fact directly.
- [ ] §7 includes at least three honest "not happy with" items, no marketing language.
- [ ] §8 cross-references all 19 story files (or links to the directory if listing them all is unwieldy).
- [ ] No emojis (project-context conventions).
- [ ] No "Confidentiality and ownership," "Submission," or "Required deliverables" sections. Those belonged to the brief, not to the candidate's deliverable.
- [ ] No reproduction of the original brief's text. Cross-references are sufficient.
- [ ] Word count in target range (1200–2000 words).
- [ ] Renders cleanly on GitHub (check headings, code fences, links).

### `docs/implementation-artifacts/ai-usage.md` — fill it in (Definition of Done dependency)

The template at `docs/implementation-artifacts/ai-usage.md` is mostly empty. **This story fills it in.** Locked content:

- **Tools and agents used:** Claude Code with BMAD Method v6.0.2; BMAD subagents (SM, Dev, Code Review, Architect, PM, BMad Master). List specific slash commands actually invoked: `/bmad-bmm-create-story`, `/bmad-bmm-dev-story`, `/bmad-bmm-code-review`, `/bmad-bmm-create-architecture`, `/bmad-bmm-create-prd`, `/bmad-bmm-create-epics-and-stories`. (Confirm by skimming the chronological story files; only list commands that were actually used.)
- **Three prompts that worked well:** locked candidates — (1) SM drafting Story 2.2 (Conway rules + canonical patterns) where the AC's enumeration of rule-by-rule tests was robust enough that Dev needed zero clarifications; (2) Architect drafting the rAF + accumulator pseudocode in `architecture.md` §5.2 — the pseudocode was good enough to copy with minimal edits into Story 3.3's hook implementation; (3) Code Review on Story 3.5 verifying that `useSimulationLoop.ts` was *not* modified — the agent flagged the file as untouched, exactly the constraint the story imposed.
- **Three times AI was wrong:** locked — (1) Story 2.3 corner-survival AC mis-statement, caught by SM (already covered in README §6); (2) Epic 1 typecheck gap, caught by Code Review (covered in §6); (3) Epic 3 `next-env.d.ts` CI break, caught by Code Review (covered in §6). Add detail beyond the README's ~3 sentences each — actual prompt phrasing, what AI said, what the candidate did instead.
- **Where AI was most valuable:** drafting structured story files with locked technical decisions. Each story file is 250–400 lines of *constraint-shaped* prose; an SM subagent producing that to spec, in 30 seconds, beats hand-typing.
- **Where AI was least valuable:** rote code-style fixes (it tried). The candidate handles those by hand because the round-trip cost of "ask AI to lint" beats running `pnpm nx lint web --fix` directly.
- **If I started over:** lock the workspace scope name (`@conways-game-of-life/*`) at the generator-prompt stage so it doesn't drift to `@cgol-scaffold/*`. Or, on the next take-home, accept the scope mismatch and stop relitigating.

The README's §6 cross-links to `ai-usage.md` for these.

---

## Dev notes

### Hard rules

- **Only this story is allowed to touch `README.md` at the repo root.** Stories 4.1, 4.2, 4.3 must not.
- **Do not** include the original brief verbatim in the new README.
- **Do not** create `START_HERE.md`. Out of scope for 4.4.
- **Do not** create or modify any code file. README + `ai-usage.md` only.
- **Do not** modify `libs/sim/`, `apps/web/`, `apps/web-e2e/`, `_bmad/`, `.claude/`, `.cursor/`, `.opencode/`, `AGENTS.md`, `CLAUDE.md`.
- **Do not** add emojis.
- **No marketing language.** "blazing fast," "production-ready," "enterprise-grade" — none of that. Plain engineering English.
- **No screenshots / GIFs.** Brittle; the panel reads code.

### Cross-story coordination

- **Builds on every prior story.** This is the last MVP story.
- **Builds on Story 1.2** — the boundary-violation demonstration committed at `docs/implementation-artifacts/branch-protection.md` (or wherever Story 1.2 captured it). Verify the file path before linking.
- **Builds on Story 4.1, 4.2, 4.3** — Quick start commands include `pnpm nx e2e @cgol-scaffold/web-e2e`, which exercises all three E2E specs.

### Cross-link integrity

Before merging, Dev verifies:
- Every `docs/planning-artifacts/*.md` link resolves.
- Every `docs/implementation-artifacts/*.md` link resolves (19 stories listed).
- The boundary-violation demonstration file referenced in §3 actually exists.
- `_bmad/`, `.claude/`, `.cursor/`, `.opencode/` exist and are not gitignored. (`git check-ignore _bmad` should report nothing.)

### What NOT to do here

- **Do not** include a "License" or "Contributing" section. Out of scope.
- **Do not** include any "Confidentiality" or "Submission" content from the original README. That was the brief's voice.
- **Do not** include a "Loom walkthrough" link unless one exists. The Loom is an out-of-repo deliverable.
- **Do not** include code examples beyond the five-line Quick Start command list. The README explains; planning artifacts spec.
- **Do not** include performance benchmarks. NFR4 is "≥30 gen/sec at 50×50" — a casual local check; not a benchmark suite.
- **Do not** restructure `docs/planning-artifacts/` or `docs/implementation-artifacts/`. Read-only.
- **Do not** overwrite `docs/implementation-artifacts/ai-usage.md` with prose that duplicates the README. Each section in the template gets its own concrete fill.
- **Do not** invoke the Loom-prep deliverable from this story.

---

## Definition of done

- [ ] `README.md` at the repo root is replaced with the locked structure (8 sections, in order, per the layout above).
- [ ] §1 Quick Start lists the actual Nx commands working in this workspace.
- [ ] §3 links to `docs/planning-artifacts/architecture.md` and to the Story 1.2 boundary-violation demonstration file.
- [ ] §4 contains all 9 locked trade-off items.
- [ ] §6 contains the three locked concrete AI examples (Story 2.3 AC fix, Epic 1 typecheck, Epic 3 `next-env.d.ts`) plus the BMAD orchestration paragraph.
- [ ] §6 links to `docs/implementation-artifacts/ai-usage.md`.
- [ ] §6 explicitly confirms `.claude/`, `.cursor/`, `.opencode/`, `_bmad/` are committed and references their location (AC-2).
- [ ] §7 contains at least three "not happy with" items, honest in tone.
- [ ] §8 cross-references all 19 story files (chronologically, or links to the directory).
- [ ] `docs/implementation-artifacts/ai-usage.md` is filled out per the locked content above (no empty sections).
- [ ] No emojis. No marketing copy.
- [ ] Word count between 1200 and 2000 for the README (use `wc -w README.md` to verify).
- [ ] All cross-links resolve (Dev clicks each link in a Markdown preview before merging).
- [ ] No file outside `README.md` and `docs/implementation-artifacts/ai-usage.md` is modified.
- [ ] Sprint-status will be updated by the orchestrator.

---

## Out of scope

- `START_HERE.md` — not in Story 4.4. If reviewers later ask for it, it's a follow-up.
- Loom walkthrough — out-of-repo deliverable.
- Vercel / Netlify deploy — brief says "welcome but not required." Out of scope for MVP PR.
- Performance benchmark write-up — NFR4 is a casual budget; benchmark suite would be its own story.
- Screenshot or GIF of the running app — brittle, out of scope.
- "License" or "Code of Conduct" sections.
- Migrating `docs/implementation-artifacts/ai-usage.md` to a different format. Keep the template structure; just fill it in.
- Editing planning artifacts (`docs/planning-artifacts/*.md`). Read-only.
- Modifying `_bmad/`, `.claude/`, `.cursor/`, `.opencode/`. Frozen.

---

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `README.md` | replaced — new thinking document per locked structure |
| `docs/implementation-artifacts/ai-usage.md` | modified — fill in all template sections per locked content |

No file outside these two is created or modified. **Critically: no source code under `apps/`, `libs/`, `_bmad/`, `.claude/`, `.cursor/`, `.opencode/`, `AGENTS.md`, or `CLAUDE.md` is touched.**

---

## References

- `docs/planning-artifacts/epics.md` — Story 4.4 ACs (mirrored verbatim)
- `docs/planning-artifacts/architecture.md` §8 (trade-offs section the README §4 mirrors), §10 (open questions resolved)
- `docs/planning-artifacts/prd.md` NFR9 (AI artifacts committed; substantive use), AR4 (artifacts not gitignored), AR5 (README is a thinking document)
- `docs/project-context.md` rule #16 (README is a thinking document, not a setup guide — required sections enumerated)
- `README.md` (current state, the brief) — read top to bottom; preserve only factual setup info, cut everything else
- `docs/implementation-artifacts/ai-usage.md` — template to fill out
- `docs/implementation-artifacts/branch-protection.md` — Story 1.2's boundary-violation demonstration (verify path before linking)
- All 19 prior story files under `docs/implementation-artifacts/` — chronological cross-reference in §8
