---
title: Configure Nx tags and prove module boundaries fire
storyId: '1.2'
epic: 1
status: ready-for-dev
priority: MVP
estimatedEffort: M
frNfrCoverage: [NFR8]
---

# Story 1.2 — Configure Nx tags and prove module boundaries fire

## User story

As the candidate,
I want the Nx tag taxonomy plus `@nx/enforce-module-boundaries` configured and demonstrably failing on a deliberate violation,
So that NFR8 is a real, evaluated deliverable rather than a hand-wave.

## Acceptance criteria

The ACs below are copied verbatim from `docs/planning-artifacts/epics.md` Story 1.2, given AC-N IDs. The story is scoped to the projects that exist *today* (`apps/web`, `apps/web-e2e`, plus the new `libs/sim`); the broader 7-project taxonomy referenced in AC-1 is locked in architecture §5.6 and will be applied to libs as they are created in subsequent stories.

**AC-1.** **Given** the Nx workspace exists with `apps/web`, `apps/web-e2e`, `libs/sim`, `libs/types`, `libs/ui`, `libs/api-client` (and stretch `apps/api`), **when** I configure each project's `tags` in `project.json` per the architecture §5.6 taxonomy (`scope:app`, `scope:e2e`, `scope:server`, `scope:sim`, `scope:ui`, `scope:api-client`, `scope:types`), **then** the root ESLint config has `@nx/enforce-module-boundaries` with the depConstraints from architecture §5.6 and `pnpm nx lint` passes on the empty workspace.

> **Story-1.2 scope clarification:** AC-1 references the full 7-project taxonomy. In this story Dev only creates `libs/sim` and tags `apps/web`, `apps/web-e2e`, and `libs/sim`. The full `depConstraints` block from architecture §5.6 (covering all seven scope tags, including those whose projects do not yet exist) is committed in the root ESLint config as-is — unmatched `sourceTag` entries are inert until their project is created in later stories. This is intentional and lets later stories add libs without re-touching the ESLint config.

**AC-2.** **Given** the boundary rules are configured, **when** I add a deliberately violating import — `import * as React from 'react'` in `libs/sim/src/index.ts` — on a throwaway branch, **then** `pnpm nx lint sim` fails with an `@nx/enforce-module-boundaries` error.

> **Story-1.2 implementation note:** `import * as React from 'react'` is a *bare-package* import, not a cross-lib import. The `@nx/enforce-module-boundaries` rule itself will not catch it (the rule fires on workspace-aliased imports between tagged projects, not on external npm packages — see architecture §9 R2). Use a *cross-lib* fixture instead to actually exercise the rule: have `libs/sim/src/index.ts` import from `@cgol-scaffold/web` (i.e., `scope:sim` → `scope:app`, which the matrix forbids). Capture the lint output. The `react`-import variant is covered later by the per-project `no-restricted-imports` rule that ships with Story 2.1; do not pre-empt that here.

**AC-3.** **And** the failure output is captured as a screenshot or log paste committed under `docs/implementation-artifacts/` and referenced from the README per NFR8.

> **Story-1.2 scope clarification:** README cross-reference lands in Story 4.4 (README as thinking document). For this story, capture the failure output verbatim in the **Evidence** section of this very file. That satisfies the "captured under `docs/implementation-artifacts/`" half of the AC; the README cross-reference is deferred.

**AC-4.** **Given** the demonstration is captured, **when** I revert the violation, **then** `pnpm nx lint sim` passes again and the violating import is not present in any merged commit.

## Locked technical decisions

These are decisions Dev does **not** need to relitigate. Defer to architecture.md / project-context.md if anything below appears ambiguous; nothing should.

### Lib path and structure

- **Path:** `libs/sim` (architecture §6 repository tree).
- **Public barrel:** `libs/sim/src/index.ts`. Empty / placeholder export only. Real sim code is Epic 2 (Stories 2.1–2.4).

### Generator command (Nx 22 syntax)

```bash
pnpm nx g @nx/js:library sim \
  --directory=libs/sim \
  --bundler=tsc \
  --unitTestRunner=jest \
  --linter=eslint \
  --tags=scope:sim,type:lib
```

Architecture §3 specifies `--bundler=tsc` for `libs/sim` (so build emits a real `dist/`); keep it. Nx 22 may prompt about `--useProjectJson` — accept the workspace default (whichever the scaffold already uses; the existing apps use `package.json`-embedded `nx` blocks, so libs should match for consistency).

If the generator finishes by adding entries to `tsconfig.base.json` `paths` (e.g., `@cgol-scaffold/sim` → `libs/sim/src/index.ts`), leave them as-is. That is the alias the violation fixture and all future imports will use.

### Tag scheme (locked, per architecture §5.6)

Apply tags via the `nx.tags` array inside each project's `package.json` (Nx 22 inferred-config style — the existing `apps/web/package.json` and `apps/web-e2e/package.json` have no `tags` yet; add an `nx` block where one is missing).

| Project | File | Tags |
| --- | --- | --- |
| `apps/web` | `apps/web/package.json` | `["scope:app", "type:app"]` |
| `apps/web-e2e` | `apps/web-e2e/package.json` | `["scope:e2e", "type:e2e"]` |
| `libs/sim` | `libs/sim/package.json` (or `libs/sim/project.json` if generator emits one) | `["scope:sim", "type:lib"]` |

Notes:
- The generator command above passes `--tags=scope:sim,type:lib` so the `libs/sim` tags arrive pre-populated. Verify post-generate.
- `apps/web-e2e/package.json` already has an `nx.implicitDependencies` block — add a sibling `tags` array inside the same `nx` object.
- `apps/web/package.json` has no `nx` block; add one: `"nx": { "tags": ["scope:app", "type:app"] }`.

### ESLint rule snippet (ready-to-paste into `eslint.config.mjs`)

The current `eslint.config.mjs` has a placeholder `depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }]` block. **Replace the entire `depConstraints` array** with the snippet below (architecture §5.6 verbatim). Leave `enforceBuildableLibDependency: true` and the `allow` array as-is.

```js
depConstraints: [
  {
    sourceTag: 'scope:app',
    onlyDependOnLibsWithTags: ['scope:sim', 'scope:ui', 'scope:api-client', 'scope:types'],
  },
  {
    sourceTag: 'scope:server',
    onlyDependOnLibsWithTags: ['scope:sim', 'scope:types'],
  },
  {
    sourceTag: 'scope:api-client',
    onlyDependOnLibsWithTags: ['scope:types'],
  },
  {
    sourceTag: 'scope:ui',
    onlyDependOnLibsWithTags: ['scope:types'],
  },
  {
    sourceTag: 'scope:sim',
    onlyDependOnLibsWithTags: ['scope:types'],
  },
  {
    sourceTag: 'scope:types',
    onlyDependOnLibsWithTags: [],
  },
  {
    sourceTag: 'scope:e2e',
    onlyDependOnLibsWithTags: ['scope:app', 'scope:types'],
  },
],
```

The seven `sourceTag` entries cover the full architecture §5.6 taxonomy. Entries whose projects do not yet exist (`scope:server`, `scope:api-client`, `scope:ui`, `scope:types`) are inert until those libs land in later stories — this is deliberate so the file is not re-touched repeatedly.

### "Prove it fires" approach (transient-fixture method)

The committed code MUST NOT contain the broken import. Instead:

1. Dev creates `libs/sim` and configures tags + ESLint rule, pushes that as the working PR.
2. Locally, **on the same branch**, Dev temporarily edits `libs/sim/src/index.ts` to add a forbidden cross-lib import:
   ```ts
   // TRANSIENT FIXTURE — do not commit
   // Importing scope:app from scope:sim violates the matrix; lint should fail.
   import '@cgol-scaffold/web';
   ```
   (Adjust the package name to match whatever `tsconfig.base.json` `paths` actually defines for `apps/web` post-scaffold; most likely `@cgol-scaffold/web` per the existing scaffold.)
3. Run `pnpm nx lint sim` and copy the failing output verbatim into the **Evidence** section of this story file.
4. Revert the fixture (`git checkout libs/sim/src/index.ts` or delete the line). Re-run `pnpm nx lint sim` and confirm it passes again.
5. Commit only the configured boundary + evidence section. The fixture itself is **never** in any committed diff.

This approach is preferred over a "must-fail" test fixture because it keeps the commit history clean, satisfies AC-3 with concrete log output, and doesn't require any test runner integration.

## Dev notes

- **`@nx/eslint-plugin` install check:** Nx 22 typically pulls this in via the `--ci=github` Next preset. Verify with `grep '@nx/eslint-plugin' package.json` before adding. If it's missing, install via `pnpm add -D -w @nx/eslint-plugin@$(node -p "require('./package.json').devDependencies.nx")` (match the Nx version exactly to avoid resolver mismatches).
- **`libs/sim/src/index.ts` content:** keep it empty or export only a placeholder type/const, e.g.:
  ```ts
  // libs/sim — public barrel. Real exports land in Epic 2 (Stories 2.1–2.4).
  export {};
  ```
  Do **not** stub `Grid`, `step`, `createGrid`, or any other Epic-2 surface. That is Story 2.1's deliverable.
- **Project.json vs package.json:** the existing scaffold uses `package.json`-embedded `nx` blocks (Nx 22 inferred config). The `@nx/js:library` generator may emit either `project.json` or extend `package.json` depending on workspace defaults — accept whatever the generator produces for `libs/sim` and add the `tags` array there. Do not re-shape one to match the other; consistency loss inside `libs/sim` is acceptable as long as the tags resolve.
- **Verify Nx sees both projects:** after config, run `pnpm nx graph --file=tmp/graph.json` to confirm Nx infers `apps/web`, `apps/web-e2e`, and `libs/sim` with their tags. **Do NOT commit `tmp/graph.json`** — add `tmp/` to `.gitignore` if it isn't already, or just delete the file post-verification.
- **Lint scope:** `pnpm nx lint sim` lints only the sim project; `pnpm nx run-many -t lint` lints everything. Use the former for the AC-2/3 demonstration (it's the literal command in the AC); use the latter as a final pre-PR sanity check.
- **Commit cadence:** one commit for the lib generator output, one commit for the ESLint config + project tags, one commit appending the evidence to this story file. Per project-context.md rule 3, each commit is summarizable in one sentence.

## Definition of done

- [ ] `libs/sim` exists with `scope:sim,type:lib` tags and an empty/placeholder `src/index.ts`.
- [ ] `apps/web` has `scope:app,type:app` tags; `apps/web-e2e` has `scope:e2e,type:e2e` tags.
- [ ] `eslint.config.mjs` contains the architecture §5.6 `depConstraints` block (replacing the wildcard placeholder).
- [ ] `pnpm nx lint` (or `pnpm nx run-many -t lint`) passes cleanly on the working tree.
- [ ] Evidence section below contains the verbatim failing output of `pnpm nx lint sim` from a transient cross-lib violation, demonstrating the `@nx/enforce-module-boundaries` rule fires.
- [ ] No transient fixture import is present in any committed diff (verifiable via `git log -p libs/sim/src/index.ts`).
- [ ] PR is small, focused, and the commit subject lines each summarize in one sentence.
- [ ] Sprint-status will be updated by the orchestrator (not by Dev as part of this story).

## Out of scope

- Any actual simulation code in `libs/sim` (Stories 2.1–2.4).
- The `libs/types`, `libs/ui`, `libs/api-client` libs (created in their respective owning stories; the seven-tag `depConstraints` block is committed now so those stories don't re-touch the ESLint config).
- The `apps/api` NestJS app (stretch, Story 7.1).
- The CI workflow that runs `nx lint` on every PR (Story 1.3).
- The README cross-reference to this evidence (Story 4.4).
- The per-project `no-restricted-imports` rule in `libs/sim/.eslintrc.json` that bans `react`, `next`, `@nestjs/*`, `fetch` (Story 2.1, per architecture §9 R2).

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `libs/sim/**` (entire tree) | created by `@nx/js:library` generator |
| `libs/sim/src/index.ts` | edited to empty/placeholder per Dev notes |
| `eslint.config.mjs` | modified — replace wildcard `depConstraints` with architecture §5.6 block |
| `apps/web/package.json` | modified — add `nx.tags: ["scope:app", "type:app"]` |
| `apps/web-e2e/package.json` | modified — add `nx.tags: ["scope:e2e", "type:e2e"]` (sibling to existing `nx.implicitDependencies`) |
| `tsconfig.base.json` | likely auto-modified by generator — Nx adds `@cgol-scaffold/sim` path mapping |
| `package.json` / `pnpm-lock.yaml` | possibly modified by generator (new dev-deps for `@nx/js`) |
| `docs/implementation-artifacts/1-2-configure-nx-tags-and-prove-module-boundaries-fire.md` | this file — Dev appends Evidence section |

## Evidence

Verbatim failing output of `pnpm nx lint @cgol-scaffold/sim` against the transient cross-lib violation fixture (a `@cgol-scaffold/web` import added to `libs/sim/src/lib/sim.ts`, plus a temporary `exports` field added to `apps/web/package.json` so Nx's project-graph resolver could match the import to the `apps/web` project — without it, Nx 22 silently skips the rule because `apps/web` does not yet expose an entry point):

```
> nx run @cgol-scaffold/sim:lint

> eslint .


/Users/arnoe/workspace-designpickle/conways-game-of-life/.claude/worktrees/inspiring-euler-bb0ed0/libs/sim/jest.config.cts
  1:1  warning  Unused eslint-disable directive (no problems were reported)

/Users/arnoe/workspace-designpickle/conways-game-of-life/.claude/worktrees/inspiring-euler-bb0ed0/libs/sim/package.json
  24:3  error  The "@cgol-scaffold/sim" project uses the following packages, but they are missing from "dependencies":
    - @cgol-scaffold/web  @nx/dependency-checks

/Users/arnoe/workspace-designpickle/conways-game-of-life/.claude/worktrees/inspiring-euler-bb0ed0/libs/sim/src/lib/sim.ts
  4:1  error  A project tagged with "scope:sim" can only depend on libs tagged with "scope:types"  @nx/enforce-module-boundaries

✖ 3 problems (2 errors, 1 warning)
  1 error and 1 warning potentially fixable with the `--fix` option.

Warning: command "eslint ." exited with non-zero status code


 NX   Running target lint for project @cgol-scaffold/sim failed

Failed tasks:

- @cgol-scaffold/sim:lint
```

The architecture §5.6 matrix permits `scope:sim → scope:types` only; the fixture's `scope:sim → scope:app` import is correctly rejected by `@nx/enforce-module-boundaries`. The companion `@nx/dependency-checks` error (missing `dependencies` entry) is incidental — the boundary rule itself is the load-bearing failure for this evidence.

**Forbidden import used (reverted before commit):**
`import * as web from '@cgol-scaffold/web';` in `libs/sim/src/lib/sim.ts`

**Companion transient edit (also reverted before commit):** added `"exports": { ".": "./src/app/page.tsx" }` to `apps/web/package.json` so Nx's `target-project-locator` could resolve the import to the `apps/web` project node. Without it the Nx 22 graph resolver returns `null` and the rule never fires (verified during the demonstration).

**Confirmation of revert:**
- `libs/sim/src/lib/sim.ts` is back to its generator-default contents (`export function sim(): string { return 'sim'; }`).
- `apps/web/package.json` no longer contains the `exports` field.
- `pnpm nx lint @cgol-scaffold/sim` passes (1 unrelated `Unused eslint-disable directive` warning in `jest.config.cts`, no errors).
- `pnpm nx run-many -t lint` succeeds across all 3 projects.
