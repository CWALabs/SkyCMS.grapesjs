# Upstream Sync And Release

This guide explains how to keep the SkyCMS fork aligned with upstream and merge updates into the SkyCMS customization branch.

## Branch Model

- `dev`: mirror of upstream source branch
- `automation/upstream-master-sync`: temporary conflict-resolution branch
- `skycms/main`: SkyCMS customization branch

## Required Remotes

- `origin`: your SkyCMS fork
- `upstream`: GrapesJS source repository

If missing:

```bash
git remote add upstream <upstream-repo-url>
```

## Status Check

```bash
cd integrations/skycms
pnpm run sync:status
```

Validates:

- clean working tree
- expected remotes and branches
- ahead/behind state

## Full Sync (No Merge Into skycms/main)

```bash
pnpm run sync:full
```

This runs:

1. `sync-upstream`
2. `prepare-sync-branch`

## Full Sync Including Merge Into skycms/main

```bash
pnpm run sync:audit:merge
```

This uses the PowerShell orchestrator and writes logs for each phase.

## Audit Logs

Log path:

- `integrations/skycms/logs/upstream-sync/<timestamp>/`

Includes:

- per-phase `.log` files
- `run-summary.txt`

## Manual Step Commands

- `pnpm run sync:upstream`
- `pnpm run sync:prepare`
- `pnpm run sync:merge`

Use manual steps when you want to inspect each phase before continuing.

## Release Checklist

1. Ensure sync branch is merged into `skycms/main`
2. Run `pnpm run lint`
3. Run `pnpm run build`
4. Run `pnpm run deploy` if release target is local SkyCMS host
5. Create PR with sync details and conflict notes
