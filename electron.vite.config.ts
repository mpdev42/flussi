import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Domaine AC056 et types partagés entre main, preload et renderer
const aliasShared = { '@shared': resolve(__dirname, 'src/shared') };

export default defineConfig({
  main: {
    resolve: {
      alias: aliasShared,
    },
    build: {
      outDir: 'out/main',
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: 'index.cjs',
        },
      },
    },
  },
  preload: {
    resolve: {
      alias: aliasShared,
    },
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        output: {
          // .cjs et non .js : Electron 44 (Node 24) applique "type": "module" au preload
          format: 'cjs',
          entryFileNames: 'index.cjs',
        },
      },
    },
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src'),
        ...aliasShared,
      },
    },
  },
});
