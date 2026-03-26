/**
 * Reusable utility for attaching read-only debug hooks to the browser global scope.
 *
 * Why this exists:
 * - We often need temporary/introspective runtime hooks during integration work.
 * - Repeating ad-hoc `window.someHook = ...` patterns makes cleanup and discovery harder.
 * - A shared helper keeps the pattern consistent and self-documenting.
 *
 * How it works:
 * - Registers a function at `globalThis[hookName]` that returns a snapshot from `getState`.
 * - Stores hook metadata in `globalThis.__skycmsDebugHooks` so active hooks are discoverable.
 * - Registration is idempotent: if a hook with the same name already exists, it is reused.
 */

const DEBUG_HOOK_REGISTRY_KEY = '__skycmsDebugHooks';

/**
 * Returns (and initializes if needed) the shared debug hook registry.
 *
 * @returns {Record<string, { description: string, registeredAt: string }>}
 */
function getDebugHookRegistry() {
  const registry = globalThis[DEBUG_HOOK_REGISTRY_KEY] || {};
  globalThis[DEBUG_HOOK_REGISTRY_KEY] = registry;
  return registry;
}

/**
 * Registers a globally accessible debug hook.
 *
 * @param {string} hookName Global function name to expose (for example: `__getMyFeatureDebug`).
 * @param {() => unknown} getState Callback returning the current debug snapshot.
 * @param {string} [description=''] Optional human-readable description stored in a registry.
 * @returns {() => unknown} The registered hook function.
 */
export function registerGlobalDebugHook(hookName, getState, description = '') {
  if (typeof hookName !== 'string' || !hookName.trim()) {
    throw new Error('registerGlobalDebugHook requires a non-empty hookName.');
  }

  if (typeof getState !== 'function') {
    throw new Error('registerGlobalDebugHook requires getState to be a function.');
  }

  const existingHook = globalThis[hookName];

  if (typeof existingHook === 'function') {
    return existingHook;
  }

  const hook = () => getState();
  globalThis[hookName] = hook;

  const registry = getDebugHookRegistry();
  registry[hookName] = {
    description,
    registeredAt: new Date().toISOString(),
  };

  return hook;
}
