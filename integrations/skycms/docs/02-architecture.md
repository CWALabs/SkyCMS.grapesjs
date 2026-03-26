# Architecture

This document describes the structure and runtime behavior of the SkyCMS GrapesJS integration package.

## Key Folders

- `integrations/skycms/src`: integration source modules
- `integrations/skycms/playground`: local development host and runtime bootstrap
- `integrations/skycms/scripts`: build, deploy, and sync automation scripts
- `integrations/skycms/dist`: build output artifacts
- `integrations/skycms/logs`: sync/audit run logs

## Runtime Entry Points

### Playground Boot

`playground/main.js` initializes GrapesJS with SkyCMS defaults and plugin wiring.

Important responsibilities:

- Resolve layout mode and editor behavior flags
- Load plugin set and plugin options
- Handle bootstrap compatibility behavior (including fallback behavior for older block sets)
- Apply theme overrides and runtime styling settings used by SkyCMS editor hosting

### Plugin Registry

`src/skycms-plugins.js` defines plugin registration and export strategy.

Important responsibilities:

- Centralize plugin imports
- Expose a predictable plugin array for editor initialization
- Maintain custom SkyCMS plugin behavior while allowing upstream plugin updates

## Configuration Model

Runtime configuration is driven by a combination of:

- Explicit plugin options
- Layout mode in the playground
- Theme CSS overrides in SkyCMS-specific stylesheets

When behavior appears inconsistent, verify both JavaScript options and CSS variables/overrides.

## Styling Layers

SkyCMS theming is layered so upstream updates remain possible:

1. Upstream GrapesJS base styles
2. SkyCMS integration theme styles
3. Runtime overrides for host-specific constraints

If a color or panel style does not apply, check specificity and whether runtime inline styles require `!important` in the override layer.

## Build and Output

Build process creates integration assets consumed by SkyCMS:

- JS bundle containing plugin/bootstrap logic
- CSS bundle containing SkyCMS visual customizations

These files are copied by the deploy script into the SkyCMS static path.
