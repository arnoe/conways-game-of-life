# Branch protection runbook (Story 1.6)

## Why this is a runbook, not a workflow

Branch protection is a GitHub *repository setting*, configured by an admin
through the UI or via `gh api`. It cannot be expressed in committed code.
This file is the canonical record of how it was applied to this fork.

## Required status checks

The four CI checks (job names from `.github/workflows/ci.yml`) that MUST
be required by branch protection on `main`:

1. `lint`
2. `typecheck`
3. `test`
4. `e2e`

If any job in `ci.yml` is renamed in the future, branch protection must be
re-configured to match — keep this runbook in sync.

## Settings (UI path)

GitHub UI: **Settings → Branches → Branch protection rules → Add rule**.
Apply for branch name pattern `main`:

| Setting | Value |
| --- | --- |
| Branch name pattern | `main` |
| Require a pull request before merging | enabled |
| Require approvals | enabled, **1** |
| Dismiss stale pull request approvals when new commits are pushed | off (recommended — auto-approve re-fires on each push) |
| Require status checks to pass before merging | enabled |
| Require branches to be up to date before merging | enabled (recommended) |
| Required status checks (search box, pick exact names) | `lint`, `typecheck`, `test`, `e2e` |
| Require conversation resolution before merging | optional |
| Require linear history | optional |
| Do not allow bypassing the above settings | enabled (includes admins — brief mandate) |
| Allow force pushes | disabled (default) |
| Allow deletions | disabled (default) |

## Equivalent `gh api` command

Reproducible one-shot. Replace `{owner}/{repo}` with the fork's slug
(e.g. `arnoe/conways-game-of-life`). Requires a `gh` token with `repo`
admin scope.

```bash
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  /repos/{owner}/{repo}/branches/main/protection \
  -F 'required_status_checks[strict]=true' \
  -f 'required_status_checks[contexts][]=lint' \
  -f 'required_status_checks[contexts][]=typecheck' \
  -f 'required_status_checks[contexts][]=test' \
  -f 'required_status_checks[contexts][]=e2e' \
  -F enforce_admins=true \
  -F 'required_pull_request_reviews[required_approving_review_count]=1' \
  -f restrictions=
```

The `-f restrictions=` empty value is required by the API to indicate
"no user/team restrictions on push."

## Evidence

After applying, capture one of:

- **Screenshot:** `docs/implementation-artifacts/branch-protection-screenshot.png`
  — full Settings → Branches rule page for `main`.
- **API export:** `docs/implementation-artifacts/branch-protection.json`
  — produced via:
  ```bash
  gh api /repos/{owner}/{repo}/branches/main/protection \
    > docs/implementation-artifacts/branch-protection.json
  ```

The JSON export is more durable and grep-able; either is sufficient.

## Verification

Open a throwaway PR. Confirm:

1. Merge button is greyed out until all four checks pass.
2. After all four checks pass, the auto-approve workflow posts an
   approving review from `github-actions[bot]`.
3. Direct push to `main` is rejected:
   `git push origin main` returns
   `remote: error: GH006: Protected branch update failed`.

Note the PR link(s) used for verification here so the panel can replay it.

## Auto-approve workflow

The companion workflow lives at `.github/workflows/auto-approve.yml`. It
uses `hmarr/auto-approve-action@v4` and gates on
`workflow_run.conclusion == 'success'` for the CI workflow. See the workflow
file's header comment for the cross-fork PR caveat.

**Bot-author caveat.** GitHub does not allow `secrets.GITHUB_TOKEN` to
self-approve a PR authored by the same `github-actions[bot]` actor. PRs
authored by a human (or by Claude Code, committing as `arnoe`) approve
normally. If a future workflow opens PRs as `github-actions[bot]`, swap
in a PAT with `repo` scope to enable approval.
