# Maintainer Checklist

Use this checklist before merging substantial changes.

## Daily Maintenance

1. Run `pnpm run sync:status` and check branch health.
2. Confirm working tree is clean before sync operations.
3. Review recent logs under `logs/upstream-sync` when automation was used.

## Before Opening PR

1. Rebase or merge latest target branch.
2. Run `pnpm run lint`.
3. Run `pnpm run build`.
4. Validate in playground (`pnpm run dev` or `pnpm run preview`).
5. Validate in SkyCMS host if behavior is host-specific.

## During Upstream Sync

1. Run `pnpm run sync:audit` for logged sync and prepare steps.
2. Resolve conflicts in `automation/upstream-master-sync` if any.
3. Run `pnpm run sync:audit:merge` or `pnpm run sync:merge` after review.
4. Capture notable conflict decisions in PR description.

## Release Readiness

1. Ensure expected dist artifacts are generated.
2. Run `pnpm run deploy` if release target is local SkyCMS web root.
3. Validate editor startup, plugin behavior, and panel/theme visuals.
4. Publish PR with test evidence and screenshots where relevant.
