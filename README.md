# SkyCMS GrapesJS Fork

This repository is a SkyCMS-focused fork of the GrapesJS monorepo.

It serves two purposes:

1. Track upstream GrapesJS source and packages
2. Maintain the SkyCMS integration, theming, deployment flow, and fork-sync workflow

## Where To Start

- Upstream GrapesJS package documentation: `packages/core/README.md`
- SkyCMS developer entry point: `DEVELOPER-DOCS.md`
- SkyCMS integration docs hub: `integrations/skycms/docs/README.md`

## SkyCMS Developer Work

Most SkyCMS-specific work happens under:

- `integrations/skycms/`

That package contains:

- local playground bootstrap
- SkyCMS plugin registration
- build and deploy scripts
- upstream sync automation
- troubleshooting and maintainer docs

## Common Workflows

- Start integration development: `pnpm -C integrations/skycms dev`
- Build integration assets: `pnpm -C integrations/skycms build`
- Deploy assets into SkyCMS: `pnpm -C integrations/skycms deploy`
- Check sync state: `pnpm -C integrations/skycms sync:status`
- Show SkyCMS doc entry points: `pnpm docs:skycms`
