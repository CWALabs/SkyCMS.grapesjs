# Developer Docs Index

This file is the repo-level entry point for developers working on the SkyCMS GrapesJS fork.

## Primary Guides

- SkyCMS docs hub: `integrations/skycms/docs/README.md`
- Quick start: `integrations/skycms/docs/01-quick-start.md`
- Architecture: `integrations/skycms/docs/02-architecture.md`
- Development workflow: `integrations/skycms/docs/03-development-workflow.md`
- Sync and release: `integrations/skycms/docs/04-sync-and-release.md`
- Troubleshooting: `integrations/skycms/docs/05-troubleshooting.md`
- Maintainer checklist: `integrations/skycms/docs/06-maintainer-checklist.md`

## Repo Structure

- `packages/`: upstream GrapesJS packages
- `integrations/skycms/`: SkyCMS-specific integration package
- `docs/`: upstream and project documentation assets
- `scripts/`: repo-level helper scripts

## Use This Index When

- onboarding a new developer
- locating SkyCMS-specific workflows
- finding the correct sync/release process
- determining whether a change belongs in upstream package code or the SkyCMS integration layer

## Rule Of Thumb

If the change is specific to SkyCMS hosting, plugin composition, deployment, or theming, start in `integrations/skycms/` and use the integration docs first.
