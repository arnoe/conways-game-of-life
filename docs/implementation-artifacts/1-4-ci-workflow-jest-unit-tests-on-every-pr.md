---
title: CI workflow — Jest unit tests on every PR
storyId: '1.4'
epic: 1
status: ready-for-dev
priority: MVP
estimatedEffort: S
frNfrCoverage: [NFR7, NFR3]
---

# Story 1.4 — CI workflow: Jest unit tests on every PR

## User story

As the candidate,
I want the same workflow to run Jest across affected projects,
So that simulation rule regressions cannot merge.

## Acceptance criteria

Copied verbatim from `docs/planning-artifacts/epics.md` Story 1.4 with AC-N IDs.

**AC-1.** **Given** `.github/workflows/ci.yml` has a `test` job, **when** a PR is opened or updated, **then** the job runs `pnpm nx affected -t test --base=origin/main --parallel=3` and reports a check status. **And** test output (pass/fail counts, failure messages) is visible in the GitHub Actions logs.

**AC-2.** **Given** a PR introduces a failing Jest test in any affected project, **when** CI runs, **then** the `test` check fails and blocks merge.

> **Story-1.4 implementation note:** This story **appends a single `test` job to the `ci.yml` Story 1.3 created**. It does NOT rewrite the workflow file. Reuse the same triggers, `concurrency` block, runner, Node/pnpm versions, and setup-step shape Story 1.3 established. Story 1.5 will append the `e2e` job similarly.

## Locked technical decisions

These are decisions Dev does **not** need to relitigate. Defer to architecture.md / project-context.md if anything below appears ambiguous.

### Workflow file

- **Path:** `.github/workflows/ci.yml` (already exists post-Story-1.3).
- **Action in this story:** **append** a new `test` job to the existing `jobs:` map. Do not modify the existing `lint` or `typecheck` jobs. Do not change the file header / triggers / concurrency block.

### Job structure

A third top-level job named exactly `test`, parallel to `lint` and `typecheck`. Same runner, same Node/pnpm pins, same checkout/setup-step shape Story 1.3 established.

Job name is load-bearing — Story 1.6's branch-protection runbook lists `test` as a required check by name. Do not rename to `unit-test`, `jest`, etc.

### Target to invoke

```
pnpm nx affected -t test --base=origin/main --parallel=3
```

`test` is the inferred Nx target from `@nx/jest/plugin` (registered in `nx.json` `plugins` with `targetName: 'test'`). It runs Jest on every project that has a `jest.config.*` file. Today that is `apps/web` and `libs/sim`; Story 1.5+ adds `apps/web-e2e` (Playwright) which will NOT be picked up by the `test` target — it has its own `e2e` target. So the `test` job covers Jest only, by design.

`affected --base=origin/main` matches Story 1.3's pattern. On the first PR or any PR that touches a root config, `affected` runs every project's `test` target — which is the correct behavior; the bootstrap run exercises the full suite.

### Coverage

**Architecture §7.2 does NOT require a coverage flag, and the README explicitly flags coverage-padding as a fail signal.** Run Jest in default (no-coverage) mode in CI. Do **not** add `--coverage`, `--coverageThreshold`, or upload coverage artifacts. Behavior over coverage % is the explicit philosophy (project-context.md rule 10).

If Dev wants ad-hoc local coverage during sim development, that's a personal local-only invocation (`pnpm nx test sim --coverage`); CI does not collect or assert it.

### Setup steps

Identical shape to Story 1.3's `lint` and `typecheck` jobs:

```yaml
test:
  name: test
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
    - run: pnpm nx affected -t test --base=origin/main --parallel=3
```

### Pinned versions (must match Story 1.3 exactly)

- Node: **20** (`node-version: 20`).
- pnpm: **9** (`pnpm/action-setup@v4` `version: 9`).
- Runner: `ubuntu-latest`.
- Checkout: `actions/checkout@v4` with `fetch-depth: 0`.
- Cache: `actions/setup-node@v4`'s `cache: pnpm`.

Drift between `lint`/`typecheck`/`test` job pins is a footgun — `affected` could resolve differently, the lockfile-install behavior could differ, or one job could pass while another silently misbehaves. Keep all three jobs identical except for the final `pnpm nx ...` line.

### Concurrency

The workflow-level `concurrency` block from Story 1.3 already covers all jobs. Do not add a second `concurrency` block.

## Dev notes

- **Test runtime budget:** project-context.md NFR3 says the sim suite must complete in under 10 seconds. The aggregate `test` target across `apps/web` (component tests) + `libs/sim` (rules tests) should sit well under a minute on `ubuntu-latest`. If Dev sees the `test` job exceeding 5 minutes, something is wrong (likely a leaked async handle); investigate before merging.
- **Test environment:** `apps/web` uses `jest-environment-jsdom` (per repo `devDependencies`); `libs/sim` uses `jest-environment-node`. Each project's `jest.config.*` already sets the right environment. CI does nothing environment-specific.
- **No coverage upload:** intentional. Do not add `actions/upload-artifact` for coverage reports. The brief calls out coverage-padding as a tell, and CI artifacts of unused coverage data send the wrong signal.
- **Failure signal:** Jest's default reporter is fine; GitHub Actions captures stdout/stderr, which gives Dev the failing-test name and stack trace inline. No `--verbose` needed; no JUnit XML reporter needed.
- **First-PR self-test:** introduce a deliberately failing assertion in `libs/sim/src/lib/sim.spec.ts` (or whichever spec exists post-1.2) on a throwaway commit, push, confirm the `test` check fails with the failing assertion name visible in the Actions log. Revert before merging the workflow PR.
- **Commit cadence:** one commit appending the `test` job. Do not bundle unrelated workflow tweaks.
- **Path-alias resolution in tests:** the existing `jest.config.cts` files in `apps/web` and `libs/sim` are scaffold output and already wire up `@swc/jest`. Tests that import via `@cgol-scaffold/sim` should resolve through `tsconfig.base.json` `paths` — verify locally with `pnpm nx test sim` and `pnpm nx test web` before pushing the workflow change. If a path alias misfires in a test, that's a separate bug, not a CI-config problem.

## Definition of done

- [ ] `.github/workflows/ci.yml` now contains three jobs: `lint`, `typecheck`, `test` (the first two from Story 1.3, this story adds the third).
- [ ] The `test` job's setup steps are byte-identical to `lint`/`typecheck` except for the final `run` line.
- [ ] The final `run` line is exactly `pnpm nx affected -t test --base=origin/main --parallel=3`.
- [ ] No `--coverage` flag, no coverage-threshold flag, no coverage-artifact upload.
- [ ] PR opened; the `test` check appears in the PR Checks tab alongside `lint` and `typecheck` and reports `success`.
- [ ] (Self-test, then revert) A deliberately failing test on a throwaway commit causes the `test` check to fail with the failing test name visible in Actions logs.
- [ ] No edits to the existing `lint` or `typecheck` jobs, no edits to the workflow header/triggers/concurrency block.
- [ ] Sprint-status update is performed by the orchestrator.

## Out of scope

- The `e2e` job (Story 1.5).
- The `auto-approve.yml` workflow (Story 1.6).
- Branch protection settings on `main` (Story 1.6).
- Coverage thresholds, coverage uploads, coverage badges (explicitly excluded — see Locked decisions).
- Any new test files (Stories 2.1–2.4 own the sim tests; Story 3.x owns app integration tests).
- Splitting `ci.yml` into multiple workflow files (architecture §7.2 specifies one).

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `.github/workflows/ci.yml` | **modified** — append a `test` job after the `typecheck` job; no other edits |
