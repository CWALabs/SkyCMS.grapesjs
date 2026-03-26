import { defineConfig } from 'vite';

export default defineConfig( {
    root: 'playground',
    server: {
        port: 5175,
        open: true
    },
    build: {
        outDir: '../playground-dist',
        emptyOutDir: true
    }
} );
