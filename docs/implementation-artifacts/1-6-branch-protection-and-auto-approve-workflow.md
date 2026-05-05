---
title: Branch protection and auto-approve workflow
storyId: '1.6'
epic: 1
status: ready-for-dev
priority: MVP
estimatedEffort: S
frNfrCoverage: [NFR7, AR2, AR3]
---

# Story 1.6 — Branch protection and auto-approve workflow

## User story

As the candidate,
I want `main` protected with the four required checks plus the auto-approve workflow firing on green,
So that AR2 and AR3 are demonstrably configured per the brief.

## Acceptance criteria

Copied verbatim from `docs/planning-artifacts/epics.md` Story 1.6 with AC-N IDs.

**AC-1.** **Given** repository settings for `main`, **when** I configure branch protection, **then** the four CI checks (`lint`, `typecheck`, `test`, `e2e`) are listed as required, at least one approving review is required, direct pushes are blocked, and the configuration is captured (screenshot or settings export) under `docs/implementation-artifacts/`.

**AC-2.** **Given** `.github/workflows/auto-approve.yml` is configured, **when** a PR's four required checks all conclude `success`, **then** the workflow uses `hmarr/auto-approve-action@v4` (or equivalent) to post an approving review from `github-actions[bot]`. **And** the PR shows the auto-approval and is mergeable per branch-protection rules.

**AC-3.** **Given** a PR has at least one failing check, **when** the auto-approve workflow runs, **then** it does not approve the PR.

> **Story-1.6 implementation note — read carefully.** This story is **two parallel deliverables that cannot fully live inside the repo:**
>
> 1. **In-repo, automatable:** `.github/workflows/auto-approve.yml` (a workflow file Dev authors and commits) + `docs/implementation-artifacts/branch-protection.md` (a runbook Dev authors). These cover AC-2, AC-3, and the "captured under `docs/implementation-artifacts/`" half of AC-1.
> 2. **Out-of-repo, manual:** the actual branch-protection rule on `main` — a GitHub repo *setting* configured through the GitHub UI or a one-shot `gh api` command **by the repo owner (Arnoe)**. Dev cannot configure branch protection from a PR; it requires repo-admin permissions and is not expressible in committed code. The runbook in `docs/implementation-artifacts/branch-protection.md` is what the owner follows. **The story is "complete" when the runbook is committed and Arnoe has run it (or equivalent) against the fork.**
>
> Make this distinction crystal clear in the README per Story 4.4 — branch protection is documented as a runbook step the candidate executed, not an automated artifact.

## Locked technical decisions

These are decisions Dev does **not** need to relitigate. Defer to architecture.md / project-context.md if anything below appears ambiguous.

### Required checks (must match Stories 1.3–1.5 job names exactly)

The four required check names — these are the exact `job.name` (or `job.<id>` if no `name` is set) values from `.github/workflows/ci.yml`:

1. `lint`
2. `typecheck`
3. `test`
4. `e2e`

If any job in `ci.yml` is renamed in the future, branch protection must be re-configured to match. Keep the runbook in sync.

### Branch protection settings (the runbook)

A new file `docs/implementation-artifacts/branch-protection.md` documents the exact settings the repo owner applies on `main`. The runbook covers both the GitHub UI path (Settings → Branches → Branch protection rules → Add rule) AND the equivalent `gh api` one-shot for reproducibility. Required fields:

| Setting | Value | Why |
| --- | --- | --- |
| Branch name pattern | `main` | The protected branch. |
| Require a pull request before merging | enabled | Brief mandate (AR2) — direct pushes blocked. |
| Require approvals | enabled, **1** | AR2 — at least one approving review. |
| Dismiss stale pull request approvals when new commits are pushed | optional, recommended off | The auto-approve workflow re-fires on each push, so dismissing approvals adds churn. |
| Require status checks to pass before merging | enabled | The four CI gates (NFR7). |
| Require branches to be up to date before merging | recommended on | Catches stale-branch test gaps. Adds rebase/merge friction; acceptable. |
| Required status checks (search box, pick exact names) | `lint`, `typecheck`, `test`, `e2e` | Names must match `ci.yml` job names verbatim. |
| Require conversation resolution before merging | optional | Useful but not required by brief. |
| Require linear history | optional | Style preference; not required. |
| Do not allow bypassing the above settings | enabled | Includes admins — the brief's "all work flows through PRs" rule. |
| Restrict pushes that create matching branches | leave default | N/A on a single-`main` repo. |
| Allow force pushes | disabled | Default; keep. |
| Allow deletions | disabled | Default; keep. |

### `gh api` one-shot for reproducibility

Include in the runbook (and exact-paste-able):

```bash
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  /repos/{owner}/{repo}/branches/main/protection \
  -f required_status_checks[strict]=true \
  -f 'required_status_checks[contexts][]=lint' \
  -f 'required_status_checks[contexts][]=typecheck' \
  -f 'required_status_checks[contexts][]=test' \
  -f 'required_status_checks[contexts][]=e2e' \
  -f enforce_admins=true \
  -F 'required_pull_request_reviews[required_approving_review_count]=1' \
  -f restrictions=
```

(The `-f restrictions=` empty value is required by the API to indicate "no user/team restrictions on push.")

The runbook explicitly notes that `{owner}/{repo}` is filled in based on Arnoe's fork URL, and that the command requires `repo` admin scope on the `gh` token.

### Capturing evidence (the AC-1 "screenshot or settings export" clause)

Two acceptable forms, runbook documents both:

1. **Screenshot.** Open Settings → Branches → branch protection rule for `main`, capture the full rule page. Save as `docs/implementation-artifacts/branch-protection-screenshot.png`.
2. **Settings export.** `gh api /repos/{owner}/{repo}/branches/main/protection > docs/implementation-artifacts/branch-protection.json` (the JSON Truth from the API). Either is sufficient; the JSON export is more durable and grep-able.

The runbook (`branch-protection.md`) cross-references whichever evidence file Dev/Arnoe produces.

### Auto-approve workflow file

- **Path:** `.github/workflows/auto-approve.yml`.
- **New file** (separate from `ci.yml`). Auto-approve is a different concern with different triggers and permissions; do not attempt to fold it into `ci.yml`.

### Auto-approve trigger and gating

The workflow must approve **only** when all four required CI checks have concluded `success` AND must not approve when any check failed (AC-3). The cleanest gate is the `workflow_run` trigger:

```yaml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
```

`workflow_run` fires once after the `CI` workflow (the file from Stories 1.3–1.5, named `CI` per its top-level `name:`) completes. The triggering event's `workflow_run.conclusion` is `success` only when **every job** in `ci.yml` succeeded — so a job-level failure cleanly prevents auto-approval (AC-3).

### Auto-approve action

Use **`hmarr/auto-approve-action@v4`** as named in AC-2. It is the canonical, well-vetted action for this. It posts an approving review as `github-actions[bot]`.

### Permissions

`hmarr/auto-approve-action@v4` requires `pull-requests: write`. Set it explicitly at the workflow level (default `GITHUB_TOKEN` permissions are read-only on hardened repos):

```yaml
permissions:
  pull-requests: write
```

The workflow uses `${{ secrets.GITHUB_TOKEN }}` — no PAT needed.

### `workflow_run` and the PR reference

`workflow_run` events do not natively expose the PR number. The action handles this by inspecting `workflow_run.pull_requests` (populated when the triggering workflow ran on a PR, which `ci.yml` does on `pull_request` events). On forked-repo PRs, `pull_requests` may be empty — that's a known GitHub limitation. For this take-home (Arnoe's own fork, no external contributors), it's a non-issue. **Document this caveat in the workflow file as a comment** — if the panel tests with a fork-of-fork PR, the auto-approve will silently skip; that's fine, it just won't auto-approve.

### Reference workflow (to commit verbatim, with the comment)

```yaml
name: Auto-approve

on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]

permissions:
  pull-requests: write

# Approves PRs only when the CI workflow concluded "success" — i.e., all four
# required jobs (lint, typecheck, test, e2e) passed. A failed job in ci.yml
# makes workflow_run.conclusion non-"success", so the gating step skips and
# AC-3 is satisfied.
#
# Caveat: workflow_run does not surface PR refs for cross-fork PRs. For this
# repo (single fork, single contributor) that is acceptable. If panel testers
# open a PR from a different fork, the auto-approve silently no-ops — branch
# protection still gates the merge on the four CI checks, so this is safe.

jobs:
  approve:
    if: ${{ github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.event == 'pull_request' }}
    runs-on: ubuntu-latest
    steps:
      - uses: hmarr/auto-approve-action@v4
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          pull-request-number: ${{ github.event.workflow_run.pull_requests[0].number }}
```

The `if:` gate has two clauses — `conclusion == 'success'` (covers AC-3) and `event == 'pull_request'` (skips on `push` to `main` runs of `CI`, which don't produce a PR to approve).

### What the runbook (`branch-protection.md`) covers — full outline

```markdown
# Branch protection runbook (Story 1.6)

## Why this is a runbook, not a workflow

Branch protection is a GitHub *repository setting*, configured by an admin
through the UI or via `gh api`. It cannot be expressed in committed code.
This file is the canonical record of how it was applied to this fork.

## Settings (UI path)

Settings → Branches → Branch protection rules → Add rule for `main`. Apply:

- Require a pull request before merging
- Require 1 approving review
- Require status checks to pass before merging
- Required status checks: `lint`, `typecheck`, `test`, `e2e`
- Require branches to be up to date before merging
- Do not allow bypassing the above settings (enforce on admins)
- Allow force pushes: off
- Allow deletions: off

## Equivalent `gh api` command

(paste the `gh api PUT /repos/{owner}/{repo}/branches/main/protection` block
 from this story's "Locked technical decisions" section, with {owner}/{repo}
 filled in for the fork)

## Evidence

- Screenshot of the configured rule: `branch-protection-screenshot.png`
  (or)
- API export: `branch-protection.json`

## Verification

Open a throwaway PR. Confirm:
1. Merge button is greyed out until all four checks pass.
2. After all four checks pass, the auto-approve workflow posts an approving
   review from github-actions[bot].
3. Direct push to `main` is rejected: `git push origin main` returns
   "remote: error: GH006: Protected branch update failed".

## Auto-approve workflow

The companion workflow lives at `.github/workflows/auto-approve.yml`. It uses
hmarr/auto-approve-action@v4 and gates on workflow_run.conclusion == 'success'
for the CI workflow. See the workflow file's header comment for the
cross-fork PR caveat.
```

## Dev notes

- **Bootstrap chicken-and-egg:** branch protection cannot be applied until `ci.yml` exists with the four named jobs. Stories 1.3, 1.4, 1.5 must merge first. This story is the closer for Epic 1.
- **Auto-approve does NOT bypass the "1 approving review" rule.** GitHub treats `github-actions[bot]` reviews the same as human reviews for the purpose of branch protection's review-count gate. So the approval flow is: PR opens → `ci.yml` runs → all four jobs green → `auto-approve.yml` fires → approval posted → PR is now mergeable. This is exactly the flow the brief calls "PRs with all green checks should auto-approve."
- **CODEOWNERS not required.** The brief doesn't ask for a CODEOWNERS file, and adding one would complicate the auto-approve flow. Skip.
- **`pull_request_target` vs `pull_request`:** the `ci.yml` workflow uses `pull_request` (Story 1.3). Do NOT switch to `pull_request_target` for auto-approve enablement — `pull_request_target` runs against the base ref with elevated permissions, which is the wrong threat model. The `workflow_run` chained trigger from this story's reference workflow is the correct pattern.
- **Testing the gate:** after committing both files and applying branch protection, open a throwaway PR with a deliberately failing test (or lint error). Confirm: the failing check is visible, the merge button is blocked, the auto-approve workflow runs but the gating `if:` skips the approve step. Then push a fix; all four checks go green; auto-approve posts the bot review; PR becomes mergeable. **Document this verification in the runbook** with PR links so the panel can replay it.
- **Repo owner action required.** The branch-protection setting itself must be applied by Arnoe (the repo owner) — Dev cannot do this from a PR. The story is delivered when the runbook + workflow are committed AND Arnoe confirms (in the PR description or a follow-up commit to the runbook) that branch protection has been applied per the runbook, with evidence file linked.
- **Commit cadence:** one commit for `auto-approve.yml`, one commit for `branch-protection.md` runbook, one commit (by Arnoe) appending evidence (screenshot or JSON export) to `docs/implementation-artifacts/`. Each commit summarizable in one sentence.
- **README cross-reference:** Story 4.4 (README as thinking document) will reference the runbook. Do not pre-empt that link from this story.

## Definition of done

- [ ] `.github/workflows/auto-approve.yml` exists, uses `hmarr/auto-approve-action@v4`, triggers on `workflow_run` of the `CI` workflow, gates on `conclusion == 'success' && event == 'pull_request'`, and declares `permissions: pull-requests: write`.
- [ ] The auto-approve workflow contains the cross-fork PR caveat as a header comment.
- [ ] `docs/implementation-artifacts/branch-protection.md` runbook exists and contains: the four required-check names verbatim, the GitHub UI settings checklist, the equivalent `gh api` command, and a Verification section.
- [ ] Branch protection applied on `main` per the runbook (by Arnoe; this is the manual half of AC-1).
- [ ] Evidence committed under `docs/implementation-artifacts/` — either `branch-protection-screenshot.png` or `branch-protection.json` (`gh api` export). Runbook references the evidence file.
- [ ] Verification PR demonstrates the full flow: failing check blocks merge → all green triggers auto-approval → PR becomes mergeable. Verification result noted in the runbook.
- [ ] Direct `git push origin main` is rejected by GitHub (verified once, noted in the runbook).
- [ ] Sprint-status update is performed by the orchestrator.

## Out of scope

- The `CI` workflow itself (`ci.yml`) and its four jobs — owned by Stories 1.3, 1.4, 1.5.
- README cross-reference to the runbook — Story 4.4.
- A CODEOWNERS file — not required by brief, not needed by auto-approve.
- Deploy / preview workflows (e.g., Vercel preview) — orthogonal to branch protection.
- Repository-wide settings beyond branch protection (Discussions, Wiki toggles, etc.) — not in scope.
- Auto-merge (`gh pr merge --auto`) — the brief asks for auto-approve, not auto-merge. Auto-merge would bypass human eyes on the diff; keep that gate.
- Configuring branch protection on stretch branches (`develop`, `staging`, etc.) — there is no such branch.
- Cross-fork PR support beyond the documented caveat.

## Files expected to be created or modified

| File | Action |
| --- | --- |
| `.github/workflows/auto-approve.yml` | **created** — `workflow_run`-triggered, gated on CI success, posts `hmarr/auto-approve-action@v4` review |
| `docs/implementation-artifacts/branch-protection.md` | **created** — runbook covering UI path, `gh api` one-shot, evidence-capture options, verification steps |
| `docs/implementation-artifacts/branch-protection-screenshot.png` *or* `branch-protection.json` | **created by Arnoe post-runbook execution** — evidence per AC-1 |
