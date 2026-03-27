const skyPageEditorMedia = [
  '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">',
  '<path fill="currentColor" d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm2 4h12V6H6v1Zm0 4h8v-1H6v1Zm0 4h8v-1H6v1Zm10.85-1.15-1.7 1.7 2.6 2.6 1.7-1.7a.5.5 0 0 0 0-.71l-1.89-1.89a.5.5 0 0 0-.71 0ZM14.6 15.8 14 18l2.2-.6-1.6-1.6Z"/>',
  '</svg>',
].join('');
const ckeditorBlockType = 'CKEditor';
const skyPageEditorClassName = 'sky-page-editor';
const plainTextEditorConfig = 'plain-text';
const skyPageEditorCanvasMinHeight = '200px';
const skyPageEditorTooltip = 'Switch to the Visual Editor for richer text editing features for this block.';

function isSkyPageEditorComponent(component) {
  if (!component) {
    return false;
  }

  if (component?.is?.(ckeditorBlockType)) {
    return true;
  }

  const attrs = component.getAttributes?.() || {};
  const className = attrs.class || '';
  return className.includes(skyPageEditorClassName);
}

function getComponentEl(component) {
  const el = component?.getEl?.();
  return el && typeof el === 'object' ? el : null;
}

function applyCanvasOnlySkyPageEditorDecorations(el) {
  if (!el) {
    return;
  }

  if (!el.style.minHeight) {
    el.style.minHeight = skyPageEditorCanvasMinHeight;
  }

  el.title = skyPageEditorTooltip;
}

export const ckeditorBlockPlugin = (editor) => {
  editor.DomComponents.addType(ckeditorBlockType, {
    extend: 'text',
    isComponent: (el) => el.classList?.contains(skyPageEditorClassName),
    model: {
      defaults: {
        name: 'Visual Editor Area',
        editable: true,
        textable: true,
        attributes: {
          class: skyPageEditorClassName,
          'data-editor-config': plainTextEditorConfig,
          'data-ccms-new': 'true',
        },
        style: {
          'min-height': '60px',
          width: '100%',
        },
        content: 'Your content here.',
        droppable: false,
      },
    },
    view: {
      onRender() {
        applyCanvasOnlySkyPageEditorDecorations(this.el);
      },
    },
  });

  editor.on('component:selected', (component) => {
    if (isSkyPageEditorComponent(component)) {
      applyCanvasOnlySkyPageEditorDecorations(getComponentEl(component));
    }
  });

  editor.Blocks.add(ckeditorBlockType, {
    label: 'Visual Editor Area',
    category: 'Sky CMS',
    media: skyPageEditorMedia,
    content: {
      type: ckeditorBlockType,
    },
  });
};
