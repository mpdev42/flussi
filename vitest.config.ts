import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Mode corpus (npm run test:corpus) : seuls les tests *.corpus.test.ts sont lancés et le corpus
  // AC056 devient obligatoire. Seules les variables AC056_ du .env sont chargées (jamais les secrets).
  const corpus = mode === 'corpus';
  const env = loadEnv(mode, __dirname, 'AC056_');
  if (corpus) env.AC056_CORPUS_OBLIGATOIRE = '1';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src'),
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    test: {
      // Environnement par défaut `node` (domaine et corpus, zone la plus testée).
      // Un test du renderer déclare `// @vitest-environment jsdom` en tête de fichier.
      environment: 'node',
      // Tests unitaires à côté du code ; e2e/ appartient à Playwright
      include: corpus ? ['src/**/*.corpus.test.ts'] : ['src/**/*.{test,spec}.{ts,tsx}'],
      passWithNoTests: !corpus,
      env,
    },
  };
});
