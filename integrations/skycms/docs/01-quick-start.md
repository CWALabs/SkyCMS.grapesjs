# Quick Start

This guide gets you running the SkyCMS GrapesJS integration locally.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Git

## Repository Setup

From repo root:

```bash
pnpm install
```

## Work in the Integration Package

```bash
cd integrations/skycms
pnpm install
```

## Start Local Playground

```bash
pnpm run dev
```

Default dev server URL is printed by Vite (typically `http://localhost:5173`).

## Build Integration

```bash
pnpm run build
```

Outputs:

- `integrations/skycms/dist/skycms-grapesjs.css`
- `integrations/skycms/dist/skycms-grapesjs.js`

## Deploy Integration Artifacts To SkyCMS

```bash
pnpm run deploy
```

This copies built assets into the SkyCMS web root configured by integration scripts.

## Fast Command Reference

- `pnpm run dev`: start playground
- `pnpm run build`: create distributable assets
- `pnpm run preview`: preview build locally
- `pnpm run lint`: run lint checks
- `pnpm run deploy`: publish built assets to SkyCMS target path
