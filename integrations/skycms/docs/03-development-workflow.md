# Development Workflow

Use this workflow for day-to-day feature work and fixes.

## 1. Start From Correct Branch

Use the customization branch for SkyCMS-specific changes.

Example:

```bash
git checkout skycms/main
git pull
```

## 2. Install and Run

```bash
cd integrations/skycms
pnpm install
pnpm run dev
```

## 3. Implement Change

Typical change areas:

- Plugin wiring (`src/skycms-plugins.js`)
- Initialization/runtime behavior (`playground/main.js`)
- SkyCMS visual style (`playground/skycms-theme.css` and related CSS)

## 4. Validate Locally

```bash
pnpm run lint
pnpm run build
pnpm run preview
```

## 5. Deploy Test Artifacts To SkyCMS (Optional)

```bash
pnpm run deploy
```

Use this when validating behavior in the real SkyCMS host context.

## 6. Commit Strategy

- Keep commits focused (single concern per commit)
- Separate sync/merge commits from custom feature commits
- Include context in commit message (for example: bootstrap5 block compatibility, panel theming, plugin option fix)

## 7. Pull Request Guidelines

- Describe user-visible behavior changes
- Include before/after screenshots for UI updates
- Include exact validation commands run
- Call out any expected merge hotspots with upstream dev
