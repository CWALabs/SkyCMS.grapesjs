import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import './skycms-theme.css';
import '../src/skycms-plugins.js';
import { ckeditorBlockPlugin } from '../src/custom/ckeditorblockplugin.js';
import { cosmosImageWidgetPlugin } from '../src/custom/imagecontainerplugin.js';
import { articleBlockPlugin } from '../src/custom/articleblockplugin.js';

const SKY_PAGE_DEBUG_PROPERTY = '__skyPageEditorDriverStubDebugMode';
const SKY_PAGE_DEBUG_STORAGE_KEY = 'skycms:skyPageEditorDriverStubDebugMode';
const DEFAULT_SKY_PAGE_DEBUG_MODE = true;

function getStoredSkyPageDebugMode() {
  try {
    const storedValue = globalThis.localStorage?.getItem(SKY_PAGE_DEBUG_STORAGE_KEY);

    if (storedValue === 'true') {
      return true;
    }

    if (storedValue === 'false') {
      return false;
    }
  } catch {
    // Ignore storage access failures.
  }

  return DEFAULT_SKY_PAGE_DEBUG_MODE;
}

function setSkyPageDebugMode(enabled) {
  const nextValue = Boolean(enabled);
  globalThis[SKY_PAGE_DEBUG_PROPERTY] = nextValue;

  try {
    globalThis.localStorage?.setItem(SKY_PAGE_DEBUG_STORAGE_KEY, String(nextValue));
  } catch {
    // Ignore storage access failures.
  }

  return nextValue;
}

function addSkyPageDebugToggle() {
  const root = document.createElement('div');
  root.className = 'sky-debug-toggle';
  root.innerHTML = `
      <label class="sky-debug-toggle__label" title="Toggle Sky Page Editor lifecycle console tracing">
        <input class="sky-debug-toggle__input" type="checkbox" />
        <span>Sky Debug</span>
      </label>
    `;

  const input = root.querySelector('.sky-debug-toggle__input');

  if (!input) {
    return;
  }

  input.checked = setSkyPageDebugMode(getStoredSkyPageDebugMode());
  input.addEventListener('change', (event) => {
    const checked = event?.target?.checked;
    setSkyPageDebugMode(checked);
  });

  document.body.appendChild(root);
}

function normalizePlugin(pluginModule) {
  return pluginModule.default || pluginModule;
}

function getPrototypeDescriptor(object, propertyName) {
  let current = Object.getPrototypeOf(object);

  while (current) {
    const descriptor = Object.getOwnPropertyDescriptor(current, propertyName);

    if (descriptor) {
      return descriptor;
    }

    current = Object.getPrototypeOf(current);
  }

  return undefined;
}

function makeDefaultsWritable(modelPrototype) {
  if (!modelPrototype) {
    return;
  }

  const ownDescriptor = Object.getOwnPropertyDescriptor(modelPrototype, 'defaults');

  if (ownDescriptor?.writable) {
    return;
  }

  const inheritedDescriptor = ownDescriptor ? undefined : getPrototypeDescriptor(modelPrototype, 'defaults');
  const descriptor = ownDescriptor || inheritedDescriptor;

  if (!descriptor) {
    return;
  }

  if (ownDescriptor && !ownDescriptor.configurable && !ownDescriptor.writable) {
    return;
  }

  if (!ownDescriptor && descriptor.get === undefined && descriptor.set === undefined && descriptor.writable) {
    return;
  }

  const currentDefaults = modelPrototype.defaults;

  Object.defineProperty(modelPrototype, 'defaults', {
    configurable: true,
    enumerable: descriptor.enumerable ?? true,
    writable: true,
    value: currentDefaults,
  });
}

function prepareLegacyPluginDefaults(editor) {
  const componentTypes = editor?.DomComponents?.getTypes?.() || [];

  componentTypes.forEach((componentType) => {
    makeDefaultsWritable(componentType?.model?.prototype);
  });
}

function withLegacyDefaultsCompat(plugin) {
  return (editor, options = {}) => {
    // Some legacy plugins mutate `model.prototype.defaults` directly.
    prepareLegacyPluginDefaults(editor);

    try {
      return plugin(editor, options);
    } catch (error) {
      console.error('Layout plugin failed to initialize. Falling back to shared/default blocks only.', error);
      return undefined;
    }
  };
}

const sharedPlugins = [
  ckeditorBlockPlugin,
  cosmosImageWidgetPlugin,
  articleBlockPlugin,
  'grapesjs-component-countdown',
  'grapesjs-plugin-export',
  'grapesjs-tabs',
  'grapesjs-custom-code',
  'grapesjs-touch',
  'grapesjs-parser-postcss',
  'grapesjs-tooltip',
  'grapesjs-tui-image-editor',
  'grapesjs-typed',
  'grapesjs-style-bg',
  'grapesjs-preset-webpage',
  'grapesjs-navbar',
];

const sharedPluginOptions = {
  'gjs-blocks-basic': { flexGrid: true },
  'grapesjs-tabs': {
    tabsBlock: { category: 'Extra' },
  },
  'grapesjs-typed': {
    block: {
      category: 'Extra',
      content: {
        type: 'typed',
        'type-speed': 40,
        strings: ['Text row one', 'Text row two', 'Text row three'],
      },
    },
  },
  'grapesjs-preset-webpage': {
    modalImportTitle: 'Import Template',
    modalImportLabel:
      '<div style="margin-bottom: 10px; font-size: 13px;">Paste here your HTML/CSS and click Import</div>',
    modalImportContent: (editor) => editor.getHtml() + '<style>' + editor.getCss() + '</style>',
  },
  'grapesjs-navbar': {},
};

async function getLayoutPlugins() {
  const mode = (new URLSearchParams(window.location.search).get('layout') || 'default').toLowerCase();

  if (mode === 'bootstrap5') {
    const bootstrap5Module = await import('grapesjs-blocks-bootstrap5/dist/grapesjs-blocks-bootstrap5.min.js');

    if (bootstrap5Module?.default) {
      globalThis['grapesjs-blocks-bootstrap5'] = withLegacyDefaultsCompat(normalizePlugin(bootstrap5Module));
    }

    return {
      mode,
      plugins: ['grapesjs-blocks-bootstrap5'],
      options: {
        'grapesjs-blocks-bootstrap5': {
          blocks: {},
          blockCategories: {},
          labels: {},
          gridDevicesPanel: true,
          formPredefinedActions: [
            { name: 'Contact', value: '/contact' },
            { name: 'landing', value: '/landing' },
          ],
        },
      },
    };
  }

  if (mode === 'bootstrap4') {
    const bootstrap4Module = await import('grapesjs-blocks-bootstrap4');
    globalThis['grapesjs-blocks-bootstrap4'] = normalizePlugin(bootstrap4Module);

    return {
      mode,
      plugins: ['grapesjs-blocks-bootstrap4'],
      options: {
        'grapesjs-blocks-bootstrap4': {
          blocks: {},
          blockCategories: {},
          labels: {},
          gridDevicesPanel: true,
          formPredefinedActions: [
            { name: 'Contact', value: '/contact' },
            { name: 'landing', value: '/landing' },
          ],
        },
      },
    };
  }

  if (mode === 'tailwind') {
    const tailwindModule = await import('grapesjs-tailwind');
    globalThis['grapesjs-tailwind'] = normalizePlugin(tailwindModule);

    return {
      mode,
      plugins: ['grapesjs-tailwind'],
      options: {
        'grapesjs-tailwind': {},
      },
    };
  }

  return {
    mode,
    plugins: ['gjs-blocks-basic', 'grapesjs-plugin-forms'],
    options: {
      'gjs-blocks-basic': { flexGrid: true },
    },
  };
}

function hasBootstrapBlocks(editor) {
  const expectedBlockIds = ['container', 'row', 'column', 'alert', 'badge', 'card', 'form'];
  return expectedBlockIds.some((id) => editor.Blocks.get(id));
}

async function fallbackBootstrap5Blocks(editor) {
  if (hasBootstrapBlocks(editor)) {
    return;
  }

  const bootstrap4Module = await import('grapesjs-blocks-bootstrap4');
  const bootstrap4Plugin = withLegacyDefaultsCompat(normalizePlugin(bootstrap4Module));

  bootstrap4Plugin(editor, {
    blocks: {},
    blockCategories: {},
    labels: {},
    gridDevicesPanel: true,
    formPredefinedActions: [
      { name: 'Contact', value: '/contact' },
      { name: 'landing', value: '/landing' },
    ],
  });

  console.warn('Bootstrap5 blocks did not register. Loaded bootstrap fallback blocks for playground validation.');
}

async function start() {
  addSkyPageDebugToggle();

  const layoutPlugins = await getLayoutPlugins();

  const editor = grapesjs.init({
    container: '#gjs',
    height: '100vh',
    fromElement: false,
    storageManager: false,
    plugins: [...sharedPlugins, ...layoutPlugins.plugins],
    pluginsOpts: {
      ...sharedPluginOptions,
      ...layoutPlugins.options,
    },
    components:
      '<section style="padding:24px"><h1>SkyCMS GrapesJS Playground</h1><p>Mode: ' +
      layoutPlugins.mode +
      '. Use ?layout=bootstrap5, ?layout=bootstrap4, ?layout=tailwind, or omit for default.</p></section>',
  });

  if (layoutPlugins.mode === 'bootstrap5') {
    await fallbackBootstrap5Blocks(editor);
  }
}

start();
