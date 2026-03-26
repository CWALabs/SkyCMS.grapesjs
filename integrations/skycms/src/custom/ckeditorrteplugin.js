function focusEditorInstance(el, editorInstance) {
  const ownerWindow = el?.ownerDocument?.defaultView;
  const ownerDocument = el?.ownerDocument;

  // When the canvas is rendered in an iframe, ensure the frame gets focus first.
  ownerWindow?.frameElement?.focus?.();
  ownerWindow?.focus?.();

  if (editorInstance?.editing?.view?.focus) {
    editorInstance.editing.view.focus();
    const model = editorInstance.model;
    const documentRoot = model?.document?.getRoot?.();

    // Ensure a valid caret exists so keyboard input inserts text immediately.
    if (model && documentRoot && model.document?.selection?.isCollapsed) {
      model.change((writer) => {
        const firstPosition = model.document.selection.getFirstPosition?.();

        if (!firstPosition || firstPosition.root?.rootName !== documentRoot.rootName) {
          writer.setSelection(writer.createPositionAt(documentRoot, 'end'));
        }
      });
    }

    // Also force native DOM focus so browser-level activeElement is the editable root.
    el?.focus?.();

    if (ownerDocument?.getSelection && typeof ownerDocument.createRange === 'function') {
      const selection = ownerDocument.getSelection();

      if (selection) {
        const range = ownerDocument.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    return;
  }

  if (editorInstance?.focus) {
    editorInstance.focus();
    return;
  }

  el.focus();
}

function focusEditorStably(el, editorInstance) {
  focusEditorInstance(el, editorInstance);

  // GrapesJS selection updates can blur right after enable; re-assert focus on next ticks.
  setTimeout(() => {
    focusEditorInstance(el, editorInstance);
  }, 0);

  setTimeout(() => {
    focusEditorInstance(el, editorInstance);
  }, 40);
}

const ckEditorInitPromiseProp = '__ccmsCkEditorInitPromise';
const ckEditorInteractionGuardCleanupProp = '__ccmsCkEditorGuardCleanup';

function hasElementAttributeApi(el) {
  return !!el && typeof el.getAttribute === 'function' && typeof el.setAttribute === 'function';
}

const nonRichTextEditorConfigs = new Set(['image-widget']);
const nonRichTextTags = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON']);

function ensureEditableMarkerAttributes(el) {
  if (!hasElementAttributeApi(el)) {
    return;
  }

  if (!el.getAttribute('data-editor-config')) {
    el.setAttribute('data-editor-config', 'ckeditor');
  }

  if (!el.getAttribute('data-ccms-ceid') && !el.getAttribute('data-ccms-new')) {
    el.setAttribute('data-ccms-new', 'true');
  }
}

function enableEditableSurface(el) {
  if (el) {
    el.contentEditable = 'true';
  }
}

function getEditorToolbarElement(editorInstance) {
  return editorInstance?.ui?.view?.toolbar?.element || null;
}

function mountEditorToolbar(editor, el, editorInstance) {
  const toolbarEl = getEditorToolbarElement(editorInstance);

  if (!toolbarEl) {
    return;
  }

  const grapesToolbar = editor?.RichTextEditor?.getToolbarEl?.();
  const canUseGrapesToolbar = grapesToolbar && grapesToolbar.ownerDocument === toolbarEl.ownerDocument;

  if (canUseGrapesToolbar) {
    Array.from(grapesToolbar.children).forEach((child) => {
      if (child !== toolbarEl && child instanceof HTMLElement) {
        child.style.display = 'none';
      }
    });

    if (toolbarEl.parentNode !== grapesToolbar) {
      grapesToolbar.appendChild(toolbarEl);
    }
  } else {
    const localContainer = el?.parentElement || el?.ownerDocument?.body;

    if (localContainer && toolbarEl.parentNode !== localContainer) {
      localContainer.insertBefore(toolbarEl, el || null);
    }
  }

  toolbarEl.style.display = '';
}

function hideEditorToolbar(editorInstance) {
  const toolbarEl = getEditorToolbarElement(editorInstance);

  if (toolbarEl) {
    toolbarEl.style.display = 'none';
  }
}

function attachEditorInteractionGuards(el, editorInstance) {
  if (!el || typeof el.addEventListener !== 'function') {
    return;
  }

  if (typeof el[ckEditorInteractionGuardCleanupProp] === 'function') {
    return;
  }

  const toolbarEl = getEditorToolbarElement(editorInstance);
  const pointerEvents = ['mousedown', 'pointerdown', 'click'];
  const keyboardBubbleEvents = ['keydown', 'keyup'];
  const stopPropagationHandler = (event) => {
    event?.stopPropagation?.();
  };
  const focusOnInteractionHandler = (event) => {
    focusEditorInstance(el, editorInstance);
  };

  pointerEvents.forEach((eventName) => {
    el.addEventListener(eventName, focusOnInteractionHandler, true);
  });

  // Keep key events local to CKEditor and avoid Grapes/global keymap interception.
  keyboardBubbleEvents.forEach((eventName) => {
    el.addEventListener(eventName, stopPropagationHandler, false);
  });

  if (toolbarEl && toolbarEl !== el) {
    pointerEvents.forEach((eventName) => {
      toolbarEl.addEventListener(eventName, stopPropagationHandler, true);
    });
  }

  el[ckEditorInteractionGuardCleanupProp] = () => {
    pointerEvents.forEach((eventName) => {
      el.removeEventListener(eventName, focusOnInteractionHandler, true);
    });

    keyboardBubbleEvents.forEach((eventName) => {
      el.removeEventListener(eventName, stopPropagationHandler, false);
    });

    if (toolbarEl && toolbarEl !== el) {
      pointerEvents.forEach((eventName) => {
        toolbarEl.removeEventListener(eventName, stopPropagationHandler, true);
      });
    }

    el[ckEditorInteractionGuardCleanupProp] = null;
  };
}

function detachEditorInteractionGuards(el) {
  const cleanup = el?.[ckEditorInteractionGuardCleanupProp];

  if (typeof cleanup === 'function') {
    cleanup();
  }
}

async function waitForEditorInstanceOnElement(el, timeoutMs = 2000) {
  const pollDelayMs = 25;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (el?.ckeditorInstance) {
      return el.ckeditorInstance;
    }

    await new Promise((resolve) => setTimeout(resolve, pollDelayMs));
  }

  return el?.ckeditorInstance || null;
}

async function resolveEditorInstance(el, createCkEditor) {
  const created = await Promise.resolve(createCkEditor(el));

  if (created) {
    return created;
  }

  if (el?.ckeditorInstance) {
    return el.ckeditorInstance;
  }

  return waitForEditorInstanceOnElement(el);
}

function pickCkEditorFactoryFromWindow(candidateWindow) {
  if (!candidateWindow) {
    return null;
  }

  const bridged = candidateWindow?.frameElement?.__ccmsCreateCkEditor;

  if (typeof bridged === 'function') {
    return bridged;
  }

  const direct = candidateWindow.createCkEditor || candidateWindow.ccms___createEditor;

  if (typeof direct === 'function') {
    return direct;
  }

  return null;
}

function getFactoryWindowCandidates(el) {
  const canvasWindow = el?.ownerDocument?.defaultView;
  const globalWindow = globalThis;
  const candidates = [canvasWindow, globalWindow];

  try {
    candidates.push(canvasWindow?.parent);
  } catch {
    // Ignore cross-origin parent access errors.
  }

  try {
    candidates.push(globalWindow?.parent);
  } catch {
    // Ignore cross-origin parent access errors.
  }

  try {
    candidates.push(globalWindow?.top);
  } catch {
    // Ignore cross-origin top access errors.
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

async function resolveHostFactory(el, timeoutMs = 2500) {
  const pollDelayMs = 50;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const candidates = getFactoryWindowCandidates(el);

    for (const candidateWindow of candidates) {
      const factory = pickCkEditorFactoryFromWindow(candidateWindow);

      if (factory) {
        return factory;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, pollDelayMs));
  }

  return null;
}

function createRteHandle(editor, el, editorInstance) {
  return {
    __el: el,
    __instance: editorInstance,
    focus() {
      mountEditorToolbar(editor, el, editorInstance);
      attachEditorInteractionGuards(el, editorInstance);
      focusEditorInstance(el, editorInstance);
    },
    getData() {
      return editorInstance?.getData?.() ?? el?.innerHTML ?? '';
    },
  };
}

function shouldUseSkyCmsCkEditor(el) {
  if (!el || !hasElementAttributeApi(el)) {
    return false;
  }

  if (el.classList?.contains('ck-content')) {
    return true;
  }

  if (nonRichTextTags.has(el.tagName)) {
    return false;
  }

  const editorConfig = el.getAttribute('data-editor-config')?.toLowerCase();

  if (editorConfig && nonRichTextEditorConfigs.has(editorConfig)) {
    return false;
  }

  // Only activate CKEditor for Sky Page Editor components (opt-in via data-editor-config).
  // All other editable components fall back to GrapesJS native contenteditable editing.
  return editorConfig === 'ckeditor' || editorConfig === 'skycms';
}

export const ckeditorRtePlugin = (editor) => {
  if (typeof editor?.setCustomRte !== 'function') {
    return;
  }

  editor.setCustomRte({
    parseContent: false,

    async enable(el, rte) {
      const createCkEditor = await resolveHostFactory(el);

      if (!shouldUseSkyCmsCkEditor(el)) {
        return {
          __el: el,
          __instance: null,
          focus() {
            el?.focus?.();
          },
          getData() {
            return el?.innerHTML ?? '';
          },
        };
      }

      const liveInstance = el.ckeditorInstance || rte?.__el?.ckeditorInstance || rte?.__instance;

      if (liveInstance) {
        enableEditableSurface(el);
        mountEditorToolbar(editor, el, liveInstance);
        attachEditorInteractionGuards(el, liveInstance);
        focusEditorStably(el, liveInstance);

        return createRteHandle(editor, el, liveInstance);
      }

      if (typeof createCkEditor !== 'function') {
        const candidates = getFactoryWindowCandidates(el);
        const diagnostics = candidates.map((candidateWindow, index) => ({
          index,
          hasCreateCkEditor: typeof candidateWindow?.createCkEditor,
          hasCcmsCreateEditor: typeof candidateWindow?.ccms___createEditor,
          href: candidateWindow?.location?.href,
        }));

        console.warn(
          'CKEditor host factory is not available. Rich text editing stays disabled instead of falling back to GrapesJS native RTE.',
          diagnostics,
        );
        el.contentEditable = false;

        return {
          __el: el,
          __instance: null,
          focus() {
            el.focus();
          },
          getData() {
            return el.innerHTML;
          },
        };
      }

      ensureEditableMarkerAttributes(el);
      enableEditableSurface(el);

      if (!el[ckEditorInitPromiseProp]) {
        const initPromise = Promise.resolve(resolveEditorInstance(el, createCkEditor))
          .catch((error) => {
            console.warn('Unable to initialize CKEditor instance in RTE enable.', error);
            return null;
          })
          .finally(() => {
            if (el[ckEditorInitPromiseProp] === initPromise) {
              el[ckEditorInitPromiseProp] = null;
            }
          });

        el[ckEditorInitPromiseProp] = initPromise;
      }

      const createdInstance = await el[ckEditorInitPromiseProp];

      if (createdInstance) {
        mountEditorToolbar(editor, el, createdInstance);
        attachEditorInteractionGuards(el, createdInstance);
        focusEditorStably(el, createdInstance);
        return createRteHandle(editor, el, createdInstance);
      }

      return {
        __el: el,
        __instance: null,
        focus() {
          el.focus();
        },
        getData() {
          return el.innerHTML;
        },
      };
    },

    disable(el, rte) {
      hideEditorToolbar(el?.ckeditorInstance || rte?.__instance || rte?.__el?.ckeditorInstance);
      detachEditorInteractionGuards(el);

      if (el) {
        el.contentEditable = 'false';
      }
    },

    getContent(el, rte) {
      const instance = el.ckeditorInstance || rte?.__instance || rte?.__el?.ckeditorInstance;
      return instance?.getData?.() ?? el.innerHTML;
    },
  });
};
