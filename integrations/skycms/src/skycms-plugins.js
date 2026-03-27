import * as gjsBlocksBasicModule from 'grapesjs-blocks-basic';
import * as gjsFormsModule from 'grapesjs-plugin-forms';
import * as gjsPresetWebpageModule from 'grapesjs-preset-webpage';
import * as gjsCountdownModule from 'grapesjs-component-countdown';
import * as gjsExportModule from 'grapesjs-plugin-export';
import * as gjsTabsModule from 'grapesjs-tabs';
import * as gjsCustomCodeModule from 'grapesjs-custom-code';
import * as gjsTouchModule from 'grapesjs-touch';
import * as gjsParserPostCssModule from 'grapesjs-parser-postcss';
import * as gjsTooltipModule from 'grapesjs-tooltip';
import * as gjsTuiImageEditorModule from 'grapesjs-tui-image-editor';
import * as gjsTypedModule from 'grapesjs-typed';
import * as gjsStyleBgModule from 'grapesjs-style-bg';
import * as gjsNavbarModule from 'grapesjs-navbar';
import { articleBlockPlugin } from './custom/articleblockplugin.js';
import { ckeditorBlockPlugin } from './custom/ckeditorblockplugin.js';
import { cosmosImageWidgetPlugin } from './custom/imagecontainerplugin.js';
import { generateGUID } from './custom/generateguid.js';
import { ccmsArticleTitleHTML, ckeditorBLockComponentHTML } from './custom/component-constants.js';

function normalizePlugin(pluginModule) {
  return pluginModule.default || pluginModule;
}

const pluginRegistry = {
  'gjs-blocks-basic': normalizePlugin(gjsBlocksBasicModule),
  'grapesjs-plugin-forms': normalizePlugin(gjsFormsModule),
  'grapesjs-preset-webpage': normalizePlugin(gjsPresetWebpageModule),
  'grapesjs-component-countdown': normalizePlugin(gjsCountdownModule),
  'grapesjs-plugin-export': normalizePlugin(gjsExportModule),
  'grapesjs-tabs': normalizePlugin(gjsTabsModule),
  'grapesjs-custom-code': normalizePlugin(gjsCustomCodeModule),
  'grapesjs-touch': normalizePlugin(gjsTouchModule),
  'grapesjs-parser-postcss': normalizePlugin(gjsParserPostCssModule),
  'grapesjs-tooltip': normalizePlugin(gjsTooltipModule),
  'grapesjs-tui-image-editor': normalizePlugin(gjsTuiImageEditorModule),
  'grapesjs-typed': normalizePlugin(gjsTypedModule),
  'grapesjs-style-bg': normalizePlugin(gjsStyleBgModule),
  'grapesjs-navbar': normalizePlugin(gjsNavbarModule),
};

Object.entries(pluginRegistry).forEach(([key, plugin]) => {
  globalThis[key] = plugin;
});

globalThis.ckeditorBlockPlugin = ckeditorBlockPlugin;
globalThis.articleBlockPlugin = articleBlockPlugin;
globalThis.cosmosImageWidgetPlugin = cosmosImageWidgetPlugin;
globalThis.generateGUID = generateGUID;
globalThis.ccmsArticleTitleHTML = ccmsArticleTitleHTML;
globalThis.ckeditorBLockComponentHTML = ckeditorBLockComponentHTML;
