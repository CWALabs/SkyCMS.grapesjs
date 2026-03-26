import { registerGlobalDebugHook } from './globalDebugHook.js';

const DEBUG_KEY = '__skyPageEditorDriverStub';
const DEBUG_HOOK_NAME = '__getSkyPageEditorDriverStubDebug';
const DEBUG_MODE_PROPERTY = '__skyPageEditorDriverStubDebugMode';
const CKEDITOR_INIT_PROMISE_PROP = '__ccmsSkyPageEditorInitPromise';

function createDebugStore() {
    return {
        debug: Boolean( globalThis[ DEBUG_MODE_PROPERTY ] ),
        counters: {
            create: 0,
            enable: 0,
            blur: 0,
            destroy: 0,
            getContent: 0
        },
        traces: [],
        setDebug( enabled ) {
            this.debug = Boolean( enabled );
            globalThis[ DEBUG_MODE_PROPERTY ] = this.debug;
            return this.debug;
        },
        enableDebug() {
            return this.setDebug( true );
        },
        disableDebug() {
            return this.setDebug( false );
        },
        toggleDebug() {
            return this.setDebug( !this.debug );
        },
        reset() {
            Object.keys( this.counters ).forEach( key => {
                this.counters[ key ] = 0;
            } );
            this.traces.length = 0;
        }
    };
}

/**
 * Returns the mutable debug store for this driver.
 *
 * Store shape:
 * - `counters`: coarse lifecycle counters useful for quick assertions.
 * - `traces`: ordered timeline for debugging event/lifecycle sequencing.
 *
 * @returns {{ counters: Record<string, number>, traces: Array<Record<string, unknown>> }}
 */
function getDebugStore() {
    const globalStore = globalThis[ DEBUG_KEY ] || createDebugStore();
    const defaults = createDebugStore();

    if ( typeof globalThis[ DEBUG_MODE_PROPERTY ] === 'boolean' ) {
        globalStore.debug = globalThis[ DEBUG_MODE_PROPERTY ];
    }

    if ( typeof globalStore.debug !== 'boolean' ) {
        globalStore.debug = defaults.debug;
    }

    if ( !globalStore.counters ) {
        globalStore.counters = defaults.counters;
    }

    if ( !Array.isArray( globalStore.traces ) ) {
        globalStore.traces = [];
    }

    if ( typeof globalStore.setDebug !== 'function' ) {
        globalStore.setDebug = defaults.setDebug;
    }

    if ( typeof globalStore.enableDebug !== 'function' ) {
        globalStore.enableDebug = defaults.enableDebug;
    }

    if ( typeof globalStore.disableDebug !== 'function' ) {
        globalStore.disableDebug = defaults.disableDebug;
    }

    if ( typeof globalStore.toggleDebug !== 'function' ) {
        globalStore.toggleDebug = defaults.toggleDebug;
    }

    if ( typeof globalStore.reset !== 'function' ) {
        globalStore.reset = defaults.reset;
    }

    globalThis[ DEBUG_KEY ] = globalStore;
    return globalStore;
}

// Keep debug hook available even if plugin lifecycle has not initialized yet.
registerGlobalDebugHook(
    DEBUG_HOOK_NAME,
    () => getDebugStore(),
    'Returns Sky Page Editor driver counters and trace history.'
);

/**
 * Appends a trace entry to the debug store and keeps history bounded.
 *
 * @param {string} action Lifecycle action name.
 * @param {any} component GrapesJS component instance.
 * @param {Record<string, unknown>} [extra={}] Additional debug fields.
 */
function trace( action, component, extra = {} ) {
    const debugStore = getDebugStore();
    const entry = {
        action,
        componentId: component?.getId?.() || component?.cid || 'unknown',
        timestamp: new Date().toISOString(),
        ...extra
    };

    debugStore.traces.push( entry );

    // Keep diagnostics bounded while still useful for debugging lifecycle order.
    if ( debugStore.traces.length > 200 ) {
        debugStore.traces.shift();
    }

    if ( debugStore.debug || Boolean( globalThis[ DEBUG_MODE_PROPERTY ] ) ) {
        console.debug( '[SkyPageEditorDriverStub]', entry );
    }
}

/**
 * Determines whether a component should be managed by this driver.
 *
 * This intentionally supports both legacy and current markers so the hook
 * remains stable as the component naming evolves.
 *
 * @param {any} component GrapesJS component instance.
 * @returns {boolean}
 */
function isSkyPageEditorComponent( component ) {
    if ( !component ) {
        return false;
    }

    if ( component?.is?.( 'CKEditor' ) ) {
        return true;
    }

    const attrs = component.getAttributes?.() || {};
    const className = attrs.class || '';
    const configName = attrs[ 'data-editor-config' ]?.toLowerCase?.() || '';

    return className.includes( 'ck-content' ) || configName === 'ckeditor' || configName === 'skycms';
}

/**
 * Returns the DOM element backing the component, if available.
 *
 * @param {any} component GrapesJS component instance.
 * @returns {HTMLElement | null}
 */
function getComponentEl( component ) {
    const el = component?.getEl?.();
    return el && typeof el === 'object' ? el : null;
}

function focusEditorInstance( el, editorInstance ) {
    const ownerWindow = el?.ownerDocument?.defaultView;

    ownerWindow?.frameElement?.focus?.();
    ownerWindow?.focus?.();

    if ( editorInstance?.editing?.view?.focus ) {
        editorInstance.editing.view.focus();
        return;
    }

    if ( editorInstance?.focus ) {
        editorInstance.focus();
        return;
    }

    el?.focus?.();
}

function focusEditorStably( el, editorInstance ) {
    focusEditorInstance( el, editorInstance );

    setTimeout( () => {
        focusEditorInstance( el, editorInstance );
    }, 0 );

    setTimeout( () => {
        focusEditorInstance( el, editorInstance );
    }, 40 );
}

function pickCkEditorFactoryFromWindow( candidateWindow ) {
    if ( !candidateWindow ) {
        return null;
    }

    const bridged = candidateWindow?.frameElement?.__ccmsCreateCkEditor;

    if ( typeof bridged === 'function' ) {
        return bridged;
    }

    const direct = candidateWindow.createCkEditor || candidateWindow.ccms___createEditor;

    if ( typeof direct === 'function' ) {
        return direct;
    }

    return null;
}

function getFactoryWindowCandidates( el ) {
    const canvasWindow = el?.ownerDocument?.defaultView;
    const globalWindow = globalThis;
    const candidates = [ canvasWindow, globalWindow ];

    try {
        candidates.push( canvasWindow?.parent );
    } catch {
        // Ignore cross-origin parent access errors.
    }

    try {
        candidates.push( globalWindow?.parent );
    } catch {
        // Ignore cross-origin parent access errors.
    }

    try {
        candidates.push( globalWindow?.top );
    } catch {
        // Ignore cross-origin top access errors.
    }

    return Array.from( new Set( candidates.filter( Boolean ) ) );
}

async function resolveHostFactory( el, timeoutMs = 2500 ) {
    const pollDelayMs = 50;
    const started = Date.now();

    while ( Date.now() - started < timeoutMs ) {
        const candidates = getFactoryWindowCandidates( el );

        for ( const candidateWindow of candidates ) {
            const factory = pickCkEditorFactoryFromWindow( candidateWindow );

            if ( factory ) {
                return factory;
            }
        }

        await new Promise( resolve => setTimeout( resolve, pollDelayMs ) );
    }

    return null;
}

async function waitForEditorInstanceOnElement( el, timeoutMs = 2000 ) {
    const pollDelayMs = 25;
    const started = Date.now();

    while ( Date.now() - started < timeoutMs ) {
        if ( el?.ckeditorInstance ) {
            return el.ckeditorInstance;
        }

        await new Promise( resolve => setTimeout( resolve, pollDelayMs ) );
    }

    return el?.ckeditorInstance || null;
}

async function createEditorInstance( el ) {
    if ( !el ) {
        return null;
    }

    if ( el.ckeditorInstance ) {
        return el.ckeditorInstance;
    }

    if ( el[ CKEDITOR_INIT_PROMISE_PROP ] ) {
        return el[ CKEDITOR_INIT_PROMISE_PROP ];
    }

    const createCkEditor = await resolveHostFactory( el );

    if ( typeof createCkEditor !== 'function' ) {
        return null;
    }

    const initPromise = Promise
        .resolve( createCkEditor( el ) )
        .then( created => created || waitForEditorInstanceOnElement( el ) )
        .catch( error => {
            console.warn( 'Unable to initialize CKEditor instance for Sky Page Editor block.', error );
            return null;
        } )
        .finally( () => {
            if ( el[ CKEDITOR_INIT_PROMISE_PROP ] === initPromise ) {
                el[ CKEDITOR_INIT_PROMISE_PROP ] = null;
            }
        } );

    el[ CKEDITOR_INIT_PROMISE_PROP ] = initPromise;
    return initPromise;
}

async function destroyEditorInstance( instance ) {
    if ( !instance || typeof instance.destroy !== 'function' ) {
        return;
    }

    try {
        await instance.destroy();
    } catch ( error ) {
        console.warn( 'Unable to destroy CKEditor instance for removed block.', error );
    }
}

/**
 * Lifecycle driver for Sky Page Editor block instances.
 *
 * Behavior:
 * - tracks instance lifecycle per component via a WeakMap
 * - creates CKEditor instances through host-provided factory hooks
 * - toggles contentEditable and focus/blur semantics
 * - destroys CKEditor instances when component is removed
 * - records lifecycle counters + traces for manual validation
 *
 * @param {any} editor GrapesJS editor instance.
 * @returns {{
 *   isApplicable: (component: any) => boolean,
 *   enable: (component: any, event?: unknown) => { lastHtml: string, active: boolean, createdAt: number } | null,
 *   blur: (component: any) => void,
 *   destroy: (component: any) => void,
 *   getContent: (component: any) => string
 * }}
 */
export function createSkyPageEditorDriverStub( editor ) {
    const instances = new WeakMap();

    function ensureInstance( component ) {
        let instance = instances.get( component );

        if ( instance ) {
            return instance;
        }

        instance = {
            lastHtml: '',
            active: false,
            createdAt: Date.now(),
            editorInstance: null,
            initPromise: null,
            destroyPromise: null
        };

        instances.set( component, instance );
        getDebugStore().counters.create += 1;
        trace( 'create', component );
        return instance;
    }

    function focusComponent( component, event ) {
        if ( !component?.get?.( 'editable' ) ) {
            return;
        }

        const view = component.getCurrentView?.() || component.getView?.();

        if ( view?.onActive ) {
            try {
                view.onActive( event );
            } catch ( error ) {
                console.warn( 'Sky Page Editor driver could not activate view.', error );
            }
        }

        component.em?.setEditing?.( view || true );
        component.trigger( 'active', event );
        component.getEl?.()?.focus?.();
    }

    function getContent( component ) {
        const instance = ensureInstance( component );
        const el = getComponentEl( component );

        if ( instance.editorInstance?.getData ) {
            instance.lastHtml = instance.editorInstance.getData();
        }

        if ( el && !instance.lastHtml ) {
            instance.lastHtml = el.innerHTML;
        }

        getDebugStore().counters.getContent += 1;
        trace( 'getContent', component, { length: instance.lastHtml.length } );
        return instance.lastHtml;
    }

    function enable( component, event ) {
        if ( !isSkyPageEditorComponent( component ) ) {
            return null;
        }

        const instance = ensureInstance( component );
        const el = getComponentEl( component );

        if ( el ) {
            el.contentEditable = true;
        }

        focusComponent( component, event );
        instance.active = true;

        getDebugStore().counters.enable += 1;
        trace( 'enable', component );

        if ( el && !instance.initPromise ) {
            instance.initPromise = Promise
                .resolve( createEditorInstance( el ) )
                .then( createdInstance => {
                    instance.editorInstance = createdInstance || el.ckeditorInstance || null;

                    if ( instance.editorInstance ) {
                        focusEditorStably( el, instance.editorInstance );
                    }

                    return instance.editorInstance;
                } )
                .finally( () => {
                    instance.initPromise = null;
                } );
        }

        return instance;
    }

    function blur( component ) {
        const instance = instances.get( component );

        if ( !instance ) {
            return;
        }

        const el = getComponentEl( component );
        const editorInstance = instance.editorInstance || el?.ckeditorInstance || null;

        if ( editorInstance?.getData ) {
            instance.lastHtml = editorInstance.getData();
        }

        if ( el ) {
            if ( !instance.lastHtml ) {
                instance.lastHtml = el.innerHTML;
            }

            el.blur?.();
            el.contentEditable = false;
        }

        instance.active = false;

        getDebugStore().counters.blur += 1;
        trace( 'blur', component, { length: instance.lastHtml.length } );
    }

    function destroy( component ) {
        const instance = instances.get( component );

        if ( !instance ) {
            return;
        }

        blur( component );

        const el = getComponentEl( component );
        const teardown = async () => {
            if ( instance.initPromise ) {
                await instance.initPromise;
            }

            const editorInstance = instance.editorInstance || el?.ckeditorInstance || null;
            await destroyEditorInstance( editorInstance );

            if ( el?.ckeditorInstance ) {
                el.ckeditorInstance = null;
            }
        };

        if ( !instance.destroyPromise ) {
            instance.destroyPromise = teardown().finally( () => {
                instance.destroyPromise = null;
            } );
        }

        instances.delete( component );

        getDebugStore().counters.destroy += 1;
        trace( 'destroy', component );
    }

    // Keep this hook to avoid accidental dead-code removals in tests and confirm editor wiring.
    if ( !editor ) {
        console.warn( 'Sky Page Editor driver initialized without editor instance.' );
    }

    return {
        isApplicable: isSkyPageEditorComponent,
        enable,
        blur,
        destroy,
        getContent
    };
}
