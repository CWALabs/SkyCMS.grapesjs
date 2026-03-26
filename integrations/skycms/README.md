# SkyCMS GrapesJS Integration

This package provides a stable SkyCMS workflow around local GrapesJS source:

- Build stock GrapesJS from local workspace source
- Run a local playground for baseline verification
- Deploy built GrapesJS artifacts into SkyCMS editor static assets

## Developer Documentation

Use the full documentation hub for onboarding and maintenance workflows:

- `integrations/skycms/docs/README.md`

Direct links:

- `integrations/skycms/docs/01-quick-start.md`
- `integrations/skycms/docs/02-architecture.md`
- `integrations/skycms/docs/03-development-workflow.md`
- `integrations/skycms/docs/04-sync-and-release.md`
- `integrations/skycms/docs/05-troubleshooting.md`
- `integrations/skycms/docs/06-maintainer-checklist.md`

## Commands

- `pnpm -C integrations/skycms install`
- `pnpm -C integrations/skycms build:stock`
- `pnpm -C integrations/skycms build:lib`
- `pnpm -C integrations/skycms build:all`
- `pnpm -C integrations/skycms dev`
- `pnpm -C integrations/skycms deploy:skycms`
- `pnpm -C integrations/skycms sync:status`
- `pnpm -C integrations/skycms sync:upstream`
- `pnpm -C integrations/skycms sync:prepare`
- `pnpm -C integrations/skycms sync:merge`
- `pnpm -C integrations/skycms sync:full`
- `pnpm -C integrations/skycms sync:audit`
- `pnpm -C integrations/skycms sync:audit:merge`
- `pnpm -C integrations/skycms sync:audit:status`

## Upstream Sync Workflow

This repo follows a three-branch sync model:

- Mirror branch: `dev`
- Conflict-resolution branch: `automation/upstream-master-sync`
- SkyCMS customization branch: `skycms/main`

The sync helper script is:

- `integrations/skycms/scripts/upstream-sync-workflow.mjs`

### Standard sequence

1. Check status:
   - `pnpm -C integrations/skycms sync:status`
2. Sync mirror branch from upstream source:
   - `pnpm -C integrations/skycms sync:upstream`
3. Recreate/update automation branch from mirror branch:
   - `pnpm -C integrations/skycms sync:prepare`
4. Resolve any conflicts/adjustments on `automation/upstream-master-sync`
5. Merge automation branch into SkyCMS custom branch:
   - `pnpm -C integrations/skycms sync:merge`

### Remote assumptions

By default, the script reads from `upstream/dev`. If you sync from `origin/dev` instead, pass overrides:

- `pnpm -C integrations/skycms sync:upstream -- --source-remote origin --source-branch dev`
- `pnpm -C integrations/skycms sync:prepare -- --source-remote origin --source-branch dev`

### Optional push

Each mutating command accepts `--push`:

- `pnpm -C integrations/skycms sync:upstream -- --push`
- `pnpm -C integrations/skycms sync:prepare -- --push`
- `pnpm -C integrations/skycms sync:merge -- --push`

### Full automation command

Run the whole sequence in one command:

- `pnpm -C integrations/skycms sync:full`

By default this runs:

1. `sync-upstream`
2. `prepare-sync-branch`

To also merge into `skycms/main`, add `--merge`:

- `pnpm -C integrations/skycms sync:full -- --merge`

### Safety checks

Mutating commands require a clean working tree and fail fast if required refs/remotes are missing.

## PowerShell Audit Wrapper

For CI-friendly and repeatable audit logs, use the PowerShell wrapper:

- `integrations/skycms/scripts/upstream-sync-workflow.ps1`

It writes timestamped logs under:

- `integrations/skycms/logs/upstream-sync/<yyyyMMdd_HHmmss>/`

Each run includes:

- Per-phase logs (`sync-upstream.log`, `prepare-sync-branch.log`, `merge-into-skycms.log` when used)
- A summary file (`run-summary.txt`) with phase status and log paths

Examples:

- `pnpm -C integrations/skycms sync:audit`
- `pnpm -C integrations/skycms sync:audit:merge`
- `powershell -ExecutionPolicy Bypass -File integrations/skycms/scripts/upstream-sync-workflow.ps1 -Command run-all -SourceRemote origin -SourceBranch dev -Merge -Push`

## Layout Plugin Testing In Playground

The playground can mirror SkyCMS layout-based plugin selection via URL query.

1. Start dev server:
   - `pnpm -C integrations/skycms dev`
2. Open one of these URLs:
   - Default mode (basic/forms fallback): `http://localhost:5175/`
   - Bootstrap 5 mode: `http://localhost:5175/?layout=bootstrap5`
   - Bootstrap 4 mode: `http://localhost:5175/?layout=bootstrap4`
   - Tailwind mode: `http://localhost:5175/?layout=tailwind`

This enables quick local verification of the two layout-specific block sets (Bootstrap and Tailwind) before deploying assets into SkyCMS.

## CKEditor-Only RTE Integration

The integration now registers a custom GrapesJS RTE plugin (`ckeditorRtePlugin`) which makes CKEditor the only rich text editor for editable text content when the host provides:

- `window.createCkEditor` (preferred)
- or `window.ccms___createEditor` (fallback)

This is compatible with dropped `CKEditor` blocks from `ckeditorBlockPlugin` and with the standard editable text components that GrapesJS routes through the custom RTE hook.

If those host functions are not available, rich text editing is intentionally left disabled instead of falling back to GrapesJS native contenteditable behavior.

## Deploy target

Artifacts are copied to:

- `../SkyCMS/Editor/wwwroot/lib/grapesjs/grapes.min.js`
- `../SkyCMS/Editor/wwwroot/lib/grapesjs/grapes.mjs`
- `../SkyCMS/Editor/wwwroot/lib/grapesjs/css/grapes.min.css`
- `../SkyCMS/Editor/wwwroot/lib/grapesjs/skycms-grapes-plugins.js`
