---
story_id: 1.1
epic: 1
title: Initial Nx scaffolding committed untouched
status: ready-for-dev
priority: MVP
estimated_effort: S
fr_nfr_coverage: [NFR10, NFR2, AR1, AR6]
inputDocuments:
  - docs/planning-artifacts/epics.md
  - docs/planning-artifacts/architecture.md
  - docs/planning-artifacts/prd.md
  - docs/project-context.md
  - README.md
---

# Story 1.1 — Initial Nx scaffolding committed untouched

**Status:** `ready-for-dev`
**Epic:** 1 — Scaffolding, module boundaries, and CI
**Priority:** MVP
**Effort:** S

---

## User story

**As** the candidate (Arnoe),
**I want** the very first commit of authored work on this repo to be the raw output of `npx create-nx-workspace --preset=next`, with zero manual edits mixed in,
**So that** the panel can read `git log` and unambiguously separate what the tool generated from what I authored — satisfying the brief's first-commit purity rule (NFR10, AR1).

---

## Acceptance criteria

Copied verbatim from `docs/planning-artifacts/epics.md` Story 1.1 with stable IDs added.

- **AC-1** — `npx create-nx-workspace@latest conways-game-of-life --preset=next --appName=web --style=css --nextAppDir=true --e2eTestRunner=playwright --packageManager=pnpm --ci=github` is run.
- **AC-2** — The generator output is committed in a single commit titled `Initial Nx scaffolding (raw generator output)` with **zero manual edits** to generated files.
- **AC-3** — No `.claude/`, `.cursor/`, `.opencode/`, `_bmad/`, `docs/`, or planning artifacts are removed by this commit (they are preserved alongside the new scaffold).
- **AC-4** — `pnpm install` and `pnpm nx run web:dev` succeed locally on a freshly cloned working copy.
- **AC-5** — `git log --oneline` shows this as the first commit on the implementation branch (or, where pre-existing planning commits exist, as the first commit on this feature branch — the convention is the first authored-implementation commit on the branch is the raw scaffold).
- **AC-6** — Subsequent generator-only work (NestJS app, libs, Tailwind setup) lands in **separate** follow-up commits on a feature branch behind a PR — **not** folded into this commit. (Story 1.2+ territory.)

---

## Prerequisites

Must be true before Dev starts.

- Working tree at `/Users/arnoe/workspace-designpickle/conways-game-of-life/.claude/worktrees/inspiring-euler-bb0ed0` is clean (no uncommitted local changes).
- Dev is on a feature branch off `main` (NOT directly on `main`). The brief blocks direct pushes; this story produces the scaffold commit on the feature branch and lands via PR.
- `pnpm` is installed and on `PATH` (`pnpm --version` succeeds).
- Node LTS is active (Node 20.x recommended; matches Nx 18+ and Next.js 14+ support matrix per architecture §3 / §4.2).
- `npx` is available (ships with Node).
- The pre-existing top-level files/dirs at the worktree root are intact: `README.md`, `CLAUDE.md`, `AGENTS.md`, `.gitignore`, `.claude/`, `.cursor/`, `.opencode/`, `.github/`, `_bmad/`, `docs/`. **None of these may be removed or moved by this story** (AC-3).

---

## Locked technical decisions

These are NOT Dev's calls — they are pre-decided in `architecture.md` §3 and §4 and `docs/project-context.md` §2. Do not deviate.

| Decision | Locked value | Source |
| --- | --- | --- |
| Nx generator | `npx create-nx-workspace@latest` | architecture §3 |
| Workspace name | `conways-game-of-life` | architecture §3 (matches repo name) |
| Preset | `--preset=next` | architecture §3 |
| App name | `--appName=web` | architecture §3 |
| Style | `--style=css` | architecture §3 (Tailwind comes in a separate later story via `@nx/next:setup-tailwind`) |
| Routing mode | `--nextAppDir=true` (App Router) | architecture §4.1 |
| E2E test runner | `--e2eTestRunner=playwright` | architecture §3, NFR7 |
| Package manager | `--packageManager=pnpm` | architecture §4.11 |
| CI bootstrap | `--ci=github` | architecture §4.10 |
| Node version | LTS (20.x recommended) | architecture §3 (ES2022 target, Node LTS) |
| TypeScript | strict (set by preset) | architecture §4.2; tightening to `noUncheckedIndexedAccess` is a later PR, NOT this one |

### Exact command to run

```bash
npx create-nx-workspace@latest conways-game-of-life \
  --preset=next \
  --appName=web \
  --style=css \
  --nextAppDir=true \
  --e2eTestRunner=playwright \
  --packageManager=pnpm \
  --ci=github
```

(Run with the working directory and merge strategy described under **Dev notes** below — this is non-trivial because the worktree is non-empty.)

---

## Definition of done

This story is **only** done when ALL of the following hold:

1. The command in **Locked technical decisions** has been executed and produced an Nx workspace with `apps/web`, `apps/web-e2e`, `nx.json`, `package.json`, `pnpm-lock.yaml`, `tsconfig.base.json`, `eslint.config.js` (or `.eslintrc.json`), Jest config, Playwright config, and a `.github/workflows/` starter from `--ci=github`.
2. The commit titled exactly **`Initial Nx scaffolding (raw generator output)`** contains **only** the files the generator produced. No README edits. No `.gitignore` tweaks (other than what the generator itself wrote — see Dev notes on `.gitignore` merge). No prettier/format passes. No package-version bumps. No "small fix" to a generated typo. **Nothing.**
3. The pre-existing planning artifacts (`docs/`, `_bmad/`, `.claude/`, `.cursor/`, `.opencode/`, `.github/` if it pre-exists with content, `README.md`, `CLAUDE.md`, `AGENTS.md`) are still present after the commit and have not been altered by this commit (AC-3).
4. From a fresh clone of the branch, `pnpm install` and `pnpm nx run web:dev` succeed (or the equivalent target name the generator produced — see Dev notes; the candidate verifies the actual target name in the generated `apps/web/project.json`).
5. The commit is on a feature branch (not `main`), and a PR is opened against `main`. CI workflow file from `--ci=github` exists in the diff.
6. `git log --oneline` shows this commit as the **first authored-implementation commit** on the feature branch (planning commits on `main` are fine; they predate this).

If ANY of the above is not true, the story is not done.

---

## Out of scope

Explicitly NOT in this story (these belong to later stories — do not do them here):

- **NestJS app generation** (`apps/api`) — Story 1.x follow-up commit; STRETCH backend.
- **Lib generation** (`libs/sim`, `libs/types`, `libs/ui`, `libs/api-client`) — separate follow-up commit per architecture §3 implementation sequence.
- **Tailwind setup** (`@nx/next:setup-tailwind`) — separate follow-up commit.
- **Nx tag configuration** + `@nx/enforce-module-boundaries` ESLint rule — Story 1.2.
- **Deliberate boundary-violation demonstration** — Story 1.2.
- **CI workflow customization** beyond what `--ci=github` produces — Stories 1.3, 1.4, 1.5.
- **Branch protection / auto-approve workflow** — Story 1.6.
- **Tightening `tsconfig.base.json`** to add `noUncheckedIndexedAccess` — separate PR (architecture §4.2 specifies this lives in a follow-up).
- **Any** content edits, formatting passes, README rewrites, or "small fixes" to generator output — these are explicitly forbidden by AC-2 and the brief's first-commit purity rule (project-context rule #1).
- Running `nx migrate` — forbidden post-scaffold per project-context rule #18.

---

## Files / paths expected to be created

The generator output should produce roughly the following (Nx 18+ with the `--preset=next` shape; Dev verifies actual paths against installed Nx version):

```
apps/
  web/
    app/
      layout.tsx
      page.tsx
      global.css
    public/
    next.config.js
    project.json                # tags will be added later in Story 1.2
    tsconfig.json
    jest.config.ts (or .js)
    .eslintrc.json
  web-e2e/
    src/example.spec.ts (or similar starter spec)
    playwright.config.ts
    project.json
    tsconfig.json
.github/
  workflows/
    ci.yml                      # generator-produced starter; will be customized in Stories 1.3-1.5
nx.json
package.json
pnpm-lock.yaml
tsconfig.base.json
eslint.config.js (or .eslintrc.json)
.prettierrc / .prettierignore   # generator default
.gitignore                      # generator-produced (merge with existing — see Dev notes)
jest.config.ts (or .js)
jest.preset.js
README.md                       # generator-produced; see Dev notes — DO NOT overwrite the existing repo README
```

Existing files/dirs that must remain untouched:

```
README.md          # the take-home brief — must NOT be overwritten by the generator
CLAUDE.md
AGENTS.md
.gitignore         # existing repo .gitignore — see Dev notes on merge
.claude/
.cursor/
.opencode/
.github/           # currently exists; merge generator additions WITHOUT overwriting existing files
_bmad/
docs/
```

---

## Dev notes

The single biggest gotcha for this story.

### The worktree is not empty — this complicates `create-nx-workspace`

`create-nx-workspace` is designed to create a NEW directory. Running it from the parent of an existing populated dir, or in-place inside one, has known sharp edges:

- Running it as `npx create-nx-workspace@latest conways-game-of-life ...` from the parent of the worktree would create a **sibling** directory called `conways-game-of-life/` rather than scaffolding into the existing one.
- Running it from inside the worktree with the same workspace name will likely either create a nested `./conways-game-of-life/` subdirectory or refuse to proceed because the working directory is non-empty.
- Forcing it to scaffold in-place may overwrite the existing repo `README.md` (the brief), which is non-negotiable. **Do not let the generator overwrite the brief.**

**Recommended approach (in priority order, pick the first one that works cleanly):**

1. **Scaffold to a sibling temp directory, then merge.** Run `create-nx-workspace` in `/tmp` or in the parent directory under a different name (e.g. `cgol-scaffold-tmp`), so it produces a clean Nx workspace with all the generator output isolated. Then move the generated files INTO the worktree (`mv` the generated `apps/`, `nx.json`, `package.json`, `pnpm-lock.yaml`, `tsconfig.base.json`, `eslint.config.js`/`.eslintrc.json`, `.prettierrc`, `.prettierignore`, `jest.config.ts`, `jest.preset.js`, etc.). For files that conflict with the existing repo:
   - `README.md` — **DO NOT move the generator's README.** Keep the existing repo README (the brief). The generator's README is discarded.
   - `.gitignore` — merge: append any generator-added entries that aren't already in the existing `.gitignore`. This counts as part of the "raw generator output" because the generator itself produces these entries; the merge is mechanical, not authored.
   - `.github/` — merge: keep both. If the generator produces a `.github/workflows/ci.yml` and the existing `.github/` has unrelated content, both can coexist. If there is a name collision, keep the generator's CI file (this story's purpose) and document any displacement.
   This "scaffold-then-merge" approach IS the cleanest way to keep the commit reviewable as "raw generator output" while preserving the existing planning artifacts (AC-3).

2. **`--no-interactive` and let Nx try in-place** — only viable if `create-nx-workspace` exposes a flag to scaffold in a non-empty directory (it generally does not, in current versions). Verify Nx version's flag surface before relying on this.

3. If neither of the above works cleanly, **stop and flag to the orchestrator** before committing anything questionable. Do not invent a workaround that mixes authored edits with generator output.

### Validate the generator's actual target names

After scaffolding, the dev target may be named `dev`, `serve`, or `start` depending on Nx + Next preset version. AC-4 requires `pnpm nx run web:dev` to succeed; if the generator produced `web:serve` or `web:start` instead, **update AC-4 (and the README's local-startup line in a LATER story)** rather than editing generated files to rename the target. The principle stands: do not edit generator output.

### Commit hygiene

- Run the scaffold command, perform the merge as described, then **immediately** `git add -A && git commit -m 'Initial Nx scaffolding (raw generator output)'`. Do not open an editor in between. Do not run prettier. Do not "tidy up."
- If something looks wrong in the generator output (e.g., a typo in the generated README, an outdated dep version), leave it alone for this commit. Address it in a SEPARATE follow-up commit on the same feature branch — that is what AC-6 is about.

### Verification before pushing

Before opening the PR, run from the worktree root:

```bash
pnpm install
pnpm nx run web:dev   # or the actual generator-produced dev target
```

Hit the dev URL Nx prints (typically `http://localhost:3000` or `:4200`). Confirm Next.js's default starter page renders. Then `Ctrl-C`, push the branch, and open the PR.

### What "raw generator output" means in spirit

The reviewer should be able to look at this commit's diff and recognize every file as something `create-nx-workspace --preset=next` would produce on a clean run. Nothing in the diff should look like a human's choice. If it does, it belongs in commit 2.

---

## References

- `docs/planning-artifacts/epics.md` — Story 1.1 ACs (this file mirrors them)
- `docs/planning-artifacts/architecture.md` §3 (starter selection + exact command), §4.1 (App Router), §4.11 (pnpm), §4.10 (CI), §10 (no architectural ambiguity blocks this)
- `docs/planning-artifacts/prd.md` NFR10 (reviewable git history; first commit raw)
- `docs/project-context.md` rule #1 (first commit purity), rule #15 (preserve AI artifacts), rule #18 (no `nx migrate`)
- `README.md` (repo root, the brief) lines around "First commit is raw `nx` scaffolding output, untouched."
