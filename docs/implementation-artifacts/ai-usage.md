# AI Usage Report

This is the long-form companion to the README's §6 (AI usage). The README summarises the orchestration model and three concrete examples; this file fills in the prompts that worked, the misses that mattered, and a short retrospective on how I'd direct AI on the next take-home.

## Tools and agents used

- **Claude Code** — primary harness. Both the human-in-the-loop CLI and orchestrated subagents (BMAD Master, SM, Architect, PM, Dev, Code Review). All four agentic personas ran inside Claude Code.
- **BMAD Method v6.0.2** — installed at the repo root (`_bmad/_config/manifest.yaml`). Provides the workflow definitions under `_bmad/bmm/workflows/` and `_bmad/core/workflows/` plus the per-persona slash commands mirrored across `.claude/commands/`, `.cursor/commands/`, and `.opencode/`.
- **BMAD slash commands actually invoked during this build:**
  - `/bmad-bmm-create-product-brief`, `/bmad-bmm-create-prd`, `/bmad-bmm-create-architecture`, `/bmad-bmm-create-epics-and-stories` — the staged planning chain.
  - `/bmad-bmm-create-story`, `/bmad-bmm-dev-story`, `/bmad-bmm-quick-dev` — per-story drafting and implementation.
  - `/bmad-bmm-code-review` — fresh-context review pass before merge.
  - `/bmad-bmm-sprint-status`, `/bmad-bmm-sprint-planning` — keeping `sprint-status.yaml` truthful.
  - `/bmad-agent-bmad-master`, `/bmad-agent-bmm-{sm,dev,architect,pm}` — persona switches when a workflow step needed a different vantage.

GitHub Copilot was deliberately not used. Cursor was installed but not the primary harness.

## Three prompts that worked well

### 1. SM drafting Story 2.2 (Conway rules + canonical patterns)

Prompt shape: "Draft the story file for the rules engine `step()` implementation. Include rule-by-rule unit tests, plus canonical patterns (block, blinker, glider) as separate `it()` blocks. Each AC must specify the expected output cell-by-cell so Dev cannot interpret it loosely. Reference `docs/planning-artifacts/architecture.md` §5.2."

What landed: a story file whose ACs were explicit enough that the Dev subagent implemented `step()` and the full test suite from the story file in one pass with zero clarifying questions. Net cost: ~30 seconds of LLM time vs. an hour of hand-typing the same scaffold. The leverage was the *structure* — by spelling out "rule-by-rule" and "cell-by-cell," the resulting tests were genuinely constraint-shaped instead of pattern-matchy.

### 2. Architect drafting the rAF + accumulator pseudocode

Prompt shape: "Draft architecture §5.2 for the simulation loop. Constraints: must run on rAF (no `setInterval`), must support changing the `genPerSec` mid-run *without* cancelling the loop, must accumulate `dt` so a slow tab catches up gracefully on resume. Show the pseudocode."

What landed: pseudocode in `architecture.md` §5.2 that became the literal shape of `apps/web/src/hooks/useSimulationLoop.ts` in Story 3.5. The accumulator-arithmetic part needed almost no tweaking; the React-side wrapping (refs for the latest `genPerSec` to avoid stale-closure bugs) was the human delta. Without the pseudocode the implementation would have started from "rAF + setInterval combo" or some other wrong start.

### 3. Code Review on Story 3.5 verifying `useSimulationLoop` was *not* modified

Prompt shape: "Code review for Story 3.5 (speed slider). Constraint: the rAF loop in `useSimulationLoop.ts` must not be cancel-and-restarted when the user drags the slider. Verify by reading the diff and confirming no edit to `useSimulationLoop.ts` itself."

What landed: the agent flagged the file as untouched and explicitly listed the slider-change path through the reducer and the `genPerSec` ref. That's exactly the constraint the story imposed. This is the kind of fresh-context check that humans skim past on PR review because the diff "looks fine."

## Three times AI was wrong, and what you did

### 1. Story 2.3 corner-survival AC mis-statement (caught by SM, before code)

The original AC text I had in front of me said "given a 3×3 all-alive grid, after `step()` the four corner cells are dead." When the SM subagent drafted the story file, it hand-walked Conway's rules: each corner of a 3×3 has exactly 3 live neighbors (the two adjacent edge cells + the centre), and rule 2 (a live cell with 2–3 live neighbors stays alive) means corners *survive*. The AC was wrong in the source brief.

Correction: the story file under `docs/implementation-artifacts/2-3-edge-case-and-boundary-tests-for-step.md` was rewritten to assert the actually-correct cell-by-cell expected output. The Dev subagent then implemented `step()` against the corrected AC and the test passed first time.

If the SM hadn't enumerated, Dev would have implemented to the wrong AC, the test would have passed, and a real-Conway reviewer would have caught the bug days later. AI saved a real round-trip here.

### 2. Epic 1 typecheck-target gap (caught by Code Review, AI's first fix was wrong)

Code Review for Epic 1 (CI workflow) flagged that the workflow ran `pnpm nx affected -t lint` and `-t test` but had no `typecheck` target on `apps/web` — the `@nx/next` generator emitted `lint` and `test` but no `typecheck` target. CI would silently let type errors through.

The agent's first proposed fix: add a custom `typecheck` target to every `project.json` by hand. I pushed back: per-project hand-edited targets drift from the Nx default, mean every new project needs the same hand-edit forever, and become a code-review burden every time someone touches a `project.json`.

The actual fix (commit `d957465`, "fix(epic-1): close apps/web typecheck gap and runbook polish"): wire `tsc --noEmit` through the CI workflow as a single step, scoped through Nx's `typecheck` plugin once it landed in Epic 3. Same coverage, less custom config, and the next contributor doesn't inherit the maintenance debt.

### 3. Epic 3 `next-env.d.ts` CI break (caught by Code Review, AI's first fix was wrong)

Code Review for Epic 3 flagged that CI's `typecheck` step was failing with "Cannot find module '@cgol-scaffold/sim'" or similar route-types errors. Cause: `apps/web/next-env.d.ts` references `./.next/types/routes.d.ts`, which Turbopack regenerates inside the `.next/dev/types/...` subdirectory the first time `next dev` runs. CI never ran `next dev`, so the file referenced a path that didn't exist.

The agent's first proposed fix: commit the regenerated `next-env.d.ts`. I pushed back on two grounds: (a) Next.js documents the file as auto-generated and explicitly says "should not be edited" inside the file itself, and (b) committing one specific generated state means the next time anyone runs `next dev` the file will drift again — git status will show a modified `next-env.d.ts` on every dev session.

The actual fix (commit `624582b`, "fix(epic-3): make apps/web typecheck depend on build for CI"): make the `typecheck` target depend on `build` so `.next/types/...` exists when `tsc` runs. (Adding `next-env.d.ts` to `.gitignore` is the natural next step — flagged for follow-up.)

## Where AI was most valuable

Drafting structured story files with locked technical decisions. Each story file is 250–400 lines of constraint-shaped prose: AC list with stable IDs, "locked technical decisions" section that pre-empts Dev relitigation, file layout, dev notes, definition of done. An SM subagent producing that to spec in 30 seconds — faithfully cross-referencing the planning artifacts, not paraphrasing — beats hand-typing the same scaffold by an order of magnitude. The story file is also the contract the Dev subagent honors, so quality at this layer compounds downstream.

Second-most-valuable: Code Review subagents giving fresh-context reads. The agent has no memory of the implementation conversation, only the diff and the story file. That's the right shape for catching "implementation drift" — places where the Dev subagent solved a different problem than the story specified.

## Where AI was least valuable, or actively harmful

Rote code-style fixes (it tries; the round-trip cost is worse than `pnpm nx lint web --fix`). And anything that needs cross-file reasoning across more than ~5 files at once — context-window constraints push the agent toward plausible-but-incorrect proposals. The mitigation is to scope each story file tightly enough that the Dev subagent only needs 3–6 files in context.

The other failure mode worth naming: an agent reading a story file with a baked-in error (Story 2.3's corner-survival AC, before SM caught it). If the *story file* is wrong, the Dev subagent will faithfully implement the wrong thing. The Code Review subagent is the second line of defence — but only if the constraint it checks against is the actual user-visible requirement, not the (wrong) story file.

## If you started over, what would you do differently with AI?

Three things.

First, **lock the workspace scope name (`@cgol-scaffold` vs. `@conways-game-of-life`) at the generator-prompt stage** so the deviation in trade-off #1 doesn't exist to document. Or, on the next take-home, accept the scope mismatch immediately and stop relitigating it.

Second, **commit the gitignore for `next-env.d.ts` in the same commit that introduces Next.js**, not retroactively. The Epic 3 break was a self-inflicted delay; a 30-second prompt in Story 1.1 ("anything Next.js auto-generates that we should gitignore?") would have caught it.

Third, **use `/bmad-bmm-code-review` more aggressively earlier in each epic, not just at the end**. A mid-epic fresh-context review catches drift before three more stories build on the wrong foundation. The cost is a few minutes; the savings on Epic 3 alone would have been ~an hour.
