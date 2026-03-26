import { ccmsArticleTitleHTML, ckeditorBLockComponentHTML } from './component-constants.js';
import { generateGUID } from './generateguid.js';

const articleBlockMedia =
  '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M3 4h18v2H3V4zm0 4h18v2H3V8zm0 4h10v2H3v-2zm0 4h10v2H3v-2zm12-4h6v6h-6v-6z"/></svg>';
const articleBlockType = 'ArticleBlock';

export const articleBlockPlugin = (editor) => {
  editor.DomComponents.addType(articleBlockType, {
    isComponent: (el) => el.classList?.contains('ccms--article--block'),
    model: {
      init() {
        if (!this.getAttributes()['data-ccms-ceid']) {
          this.addAttributes({ 'data-ccms-ceid': generateGUID() });
        }
      },
      defaults: {
        name: 'Article Block',
        droppable: false,
        attributes: {
          class: 'ccms--article--block',
        },
        components: ccmsArticleTitleHTML + ckeditorBLockComponentHTML,
      },
    },
  });

  editor.Blocks.add(articleBlockType, {
    label: 'Article Block',
    category: 'Sky CMS',
    media: articleBlockMedia,
    content: {
      type: articleBlockType,
    },
  });
};
