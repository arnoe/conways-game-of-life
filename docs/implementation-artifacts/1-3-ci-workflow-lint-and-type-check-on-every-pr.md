---
title: CI workflow — lint and type-check on every PR
storyId: '1.3'
epic: 1
status: ready-for-dev
priority: MVP
estimatedEffort: S
frNfrCoverage: [NFR7]
---

# Story 1.3 — CI workflow: lint and type-check on every PR

## User story

As the candidate,
I want a GitHub Actions workflow that runs lint and type-check on every PR into `main`,
So that style and TypeScript regressions cannot merge.

## Acceptance criteria

Copied verbatim from `docs/planning-artifacts/epics.md` Story 1.3 with AC-N IDs.

**AC-1.** **Given** `.github/workflows/ci.yml` is configured to trigger on `pull_request` into `main`, **when** a PR is opened or updated, **then** the `lint` job runs `pnpm install --frozen-lockfile` followed by `pnpm nx affected -t lint --base=origin/main` and reports a check status. **And** the `typecheck` job runs `pnpm nx affected -t typecheck --base=origin/main` (or per-project `tsc --noEmit`) and reports a check status.

**AC-2.** **Given** a PR introduces a TypeScript error or a lint violation, **when** CI runs, **then** the corresponding check fails and the failure is visible in the PR's checks tab.

> **Story-1.3 implementation note:** The architecture §7.2 / §10.10 lists four jobs in a single `ci.yml` (lint, typecheck, test, e2e). This story creates `ci.yml` with **only the `lint` and `typecheck` jobs**. Story 1.4 appends `test`. Story 1.5 appends `e2e`. Each story adds one chunk; none of them rewrites the file from scratch. Keep job names exactly `lint`, `typecheck` so Story 1.6's branch-protection runbook can list them as required checks by name.

## Locked technical decisions

These are decisions Dev does **not** need to relitigate. Defer to architecture.md / project-context.md if anything below appears ambiguous.

### Workflow file location

- **Path:** `.github/workflows/ci.yml` (architecture §7.2).
- **Single file**, accumulating jobs across Stories 1.3 → 1.4 → 1.5. Do not split into multiple workflow files.

### Triggers

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
```

`pull_request` is the AC-1 trigger. `push` to `main` is added so the post-merge run is the baseline that future `nx affected --base=origin/main` comparisons resolve against, and so the `main`-branch status badges (if added later) reflect reality.

### Runner & toolchain pins

- **Runner:** `ubuntu-latest`.
- **Node version:** **20** (Node 20 LTS). Architecture §3 says "Node LTS, ES2022 target"; `package.json` `devDependencies` pins `@types/node@20.19.9`. Lock to Node 20 to match the type targets.
- **pnpm version:** **9** (latest stable in the v9 line). The repo's `pnpm-lock.yaml` is `lockfileVersion: '9.0'`, which is pnpm 9's lockfile format.

### Setup steps (canonical order)

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # nx affected --base=origin/main needs full history
- uses: pnpm/action-setup@v4
  with:
    version: 9
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm  # built-in pnpm-store cache keyed on pnpm-lock.yaml
- run: pnpm install --frozen-lockfile
```

`actions/setup-node@v4` with `cache: pnpm` is the simplest correct cache for the pnpm store; no separate `actions/cache` step is needed. The cache key is keyed on `pnpm-lock.yaml` automatically.

`fetch-depth: 0` is **required** — `nx affected --base=origin/main` walks the git history to compute the affected project graph. Without full history, `affected` will fall back to running everything on the first PR push, which is slower and noisier. Once the history is fetched, the standard `origin/main` ref is already populated by `actions/checkout`.

### Targets to invoke

- **Lint:** `pnpm nx affected -t lint --base=origin/main --parallel=3`
- **Type-check:** `pnpm nx affected -t typecheck --base=origin/main --parallel=3`

`typecheck` IS a real Nx target — `nx.json` registers `@nx/js/typescript` with `typecheck.targetName: 'typecheck'`, so every TS project gets a `typecheck` target inferred. Verify with `pnpm nx show project @cgol-scaffold/sim` (look for `typecheck` in the targets list) before opening the PR. **Do not** add per-project `tsc --noEmit` scripts; the inferred plugin target is the canonical path. The "(or per-project `tsc --noEmit`)" alternative in AC-1 is the architecture's fallback wording for workspaces where `typecheck` does not exist as a target — that fallback does not apply here.

`--parallel=3` matches the architecture §7.2 / §10.10 `test` job example and is a sane default for a 2-vCPU GitHub-hosted runner.

`affected --base=origin/main` is preferred over `run-many` because architecture §7.2 specifies it, and it scales correctly as the workspace grows. On the first PR (no diff vs `main`), `affected` lints/typechecks everything anyway, so there is no risk of skipping work.

### Job structure (two parallel jobs, one workflow)

Two jobs in the same `ci.yml`: `lint` and `typecheck`. Run them as **separate jobs** (not as steps inside a single job) so:
- They run in parallel — total wall-clock is `max(lint, typecheck)`, not `lint + typecheck`.
- They appear as **two distinct check names** in the PR Checks tab and in branch-protection's "required checks" list (Story 1.6 needs them named individually).
- A failure in one does not skip the other — Dev sees both failures on the same push.

### Concurrency control (avoid wasted runs on rapid pushes)

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

When Dev force-pushes a fix, the in-flight run for the previous SHA is cancelled. Saves CI minutes, faster feedback. Does **not** cancel runs on `main` (different ref).

### Reference workflow shape (to paste into `ci.yml`, with `test` and `e2e` jobs added later)

```yaml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm nx affected -t lint --base=origin/main --parallel=3

  typecheck:
    name: typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm nx affected -t typecheck --base=origin/main --parallel=3
```

The duplication of setup steps between jobs is acceptable in this scope; a reusable workflow / composite action is over-engineering for a 6–8h take-home. If 1.4 and 1.5 add more jobs and the duplication grows, Dev MAY refactor to a composite action (`.github/actions/setup/action.yml`) — but Story 1.5 is the natural moment, not 1.3.

## Dev notes

- **`nx affected` resolves to `nx run-many` semantics on the first PR.** When the PR diff vs `main` is empty (e.g., the first PR after this workflow lands), `nx affected` falls back to running all projects. That is the desired behavior — there's no skipping of CI on the bootstrap PR.
- **Verify locally before opening the PR:** `pnpm nx affected -t lint --base=HEAD~1` and `pnpm nx affected -t typecheck --base=HEAD~1` should both succeed against the current working tree.
- **Frozen-lockfile is non-negotiable.** `pnpm install --frozen-lockfile` fails CI if the lockfile is out of sync — this is what enforces "no surprise dep changes." Do not use `pnpm install` alone in CI.
- **Do not pin Node to a `.nvmrc` file in this story.** No `.nvmrc` exists today; adding one is out of scope. The Node version lives in the workflow `node-version: 20` literal. If Dev wants to add `.nvmrc` later, that's a separate one-line PR.
- **Do not add `nx-cloud` or DTE.** Architecture §10.10 explicitly excludes Nx Cloud (account-coupling, out of scope for take-home). The workflow runs Nx locally on each runner.
- **Target naming hygiene.** Job names `lint` and `typecheck` are load-bearing — Story 1.6 references them by name in the branch-protection required-checks list. Renaming them later would silently break branch protection. Keep the names.
- **`actions/setup-node@v4` `cache: pnpm`** automatically restores the pnpm store between runs. No `actions/cache@v4` step is needed. If for some reason `setup-node`'s pnpm cache misbehaves, the architecture-§7.2 fallback is `actions/cache@v4` keyed on `~/.pnpm-store` + `hashFiles('**/pnpm-lock.yaml')` — but try the built-in path first.
- **Commit cadence:** one commit for the workflow file. Do not bundle unrelated changes.

## Definition of done

- [ ] `.github/workflows/ci.yml` exists with `name: CI`, the two triggers (`pull_request` into `main`, `push` to `main`), and the `concurrency` block.
- [ ] Two jobs are defined, named exactly `lint` and `typecheck`, both running on `ubuntu-latest` with Node 20 and pnpm 9.
- [ ] `lint` job runs `pnpm nx affected -t lint --base=origin/main --parallel=3` after a `pnpm install --frozen-lockfile`.
- [ ] `typecheck` job runs `pnpm nx affected -t typecheck --base=origin/main --parallel=3` after a `pnpm install --frozen-lockfile`.
- [ ] Both jobs check out with `fetch-depth: 0`.
- [ ] Both jobs use `pnpm/action-setup@v4` (version `9`) and `actions/setup-node@v4` (`node-version: 20`, `cache: pnpm`).
- [ ] PR opened against `main`; both `lint` and `typecheck` checks appear in the PR Checks tab and report `success`.
- [ ] (Self-test) Locally introduce a deliberate lint or TS error on a throwaway commit, push, confirm the corresponding check fails. Revert before merging the PR.
- [ ] Sprint-status update is performed by the orchestrator, not by Dev as part of this story.

## Out of scope

- The `test` job (Story 1.4 — appends to this same `ci.yml`).
- The `e2e` job (Story 1.5 — appends to this same `ci.yml`).
- The `auto-approve.yml` workflow (Story 1.6).
- Branch protection settings on `main` (Story 1.6 — repo-settings runbook).
- A `.nvmrc` file or `engines` field in `package.json` (orthogonal; no story owns this).
- Nx Cloud / DTE / remote caching (architecture §10.10 explicitly excludes).
- Any per-project `tsc --noEmit` script additions — `typecheck` is already an inferred Nx target via `@nx/js/typescript`.

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `.github/workflows/ci.yml` | **created** — contains `lint` and `typecheck` jobs only; `test` and `e2e` jobs land in Stories 1.4 and 1.5 |
