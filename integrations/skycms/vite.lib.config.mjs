import { defineConfig } from 'vite';

export default defineConfig( {
    build: {
        lib: {
            entry: 'src/skycms-plugins.js',
            name: 'SkyCmsGrapesPlugins',
            fileName: 'skycms-grapes-plugins',
            formats: [ 'iife' ]
        },
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            external: [ 'grapesjs' ],
            output: {
                globals: {
                    grapesjs: 'grapesjs'
                }
            }
        }
    }
} );
