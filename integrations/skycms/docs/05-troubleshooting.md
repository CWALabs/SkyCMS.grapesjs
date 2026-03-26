# Troubleshooting

## Sync Scripts Fail With Dirty Working Tree

Symptom:

- Sync command exits before fetch/merge.

Cause:

- Safety checks block operation when there are uncommitted changes.

Fix:

1. Commit or stash local work.
2. Re-run `pnpm run sync:status`.
3. Execute sync command again.

## Missing `upstream` Remote

Symptom:

- Status or sync command reports missing `upstream`.

Fix:

```bash
git remote add upstream <upstream-repo-url>
git remote -v
```

## Missing Sync Branch

Symptom:

- Prepare/merge stage fails because `automation/upstream-master-sync` does not exist.

Fix:

1. Run `pnpm run sync:prepare`.
2. If needed, create branch manually from updated `dev`.

## Theme Color Changes Not Applying

Symptom:

- Icon/text/panel colors do not match intended SkyCMS theme.

Cause:

- Override order or specificity issue.

Fix:

1. Confirm update exists in SkyCMS theme CSS.
2. Check for competing runtime styles.
3. Use targeted selector specificity and `!important` only when required to override runtime styles.

## Bootstrap5 Blocks Missing Or Incorrect

Symptom:

- Expected block set not visible when using bootstrap5 mode.

Cause:

- Compatibility wrapper/fallback path did not load as expected.

Fix:

1. Check `playground/main.js` layout mode and compatibility conditions.
2. Validate plugin list in `src/skycms-plugins.js`.
3. Test with both bootstrap5 mode and fallback mode.

## Deploy Command Completes But SkyCMS Does Not Reflect Changes

Symptom:

- Built files exist but UI remains unchanged.

Cause:

- Files copied to unexpected location or host cache is stale.

Fix:

1. Verify deploy script destination path.
2. Confirm generated `dist` timestamps changed.
3. Hard refresh browser and clear relevant cache/CDN layer.
