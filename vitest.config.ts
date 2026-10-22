import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Mode corpus (npm run test:corpus) : seuls les tests *.corpus.test.ts sont lancés et le corpus
  // AC056 devient obligatoire. Seules les variables AC056_ du .env sont chargées (jamais les secrets).
  const corpus = mode === 'corpus';
  // Mode bilan (npm run bilan:rejets) : seul l'outil *.bilan.ts est lancé (lecture de OUT en
  // production, rapport masqué dans le dossier temporaire). Jamais pris par npm test ni corpus.
  const bilan = mode === 'bilan';
  const env = loadEnv(mode, __dirname, 'AC056_');
  if (corpus) env.AC056_CORPUS_OBLIGATOIRE = '1';

  const include = bilan
    ? ['src/**/*.bilan.ts']
    : corpus
      ? ['src/**/*.corpus.test.ts']
      : ['src/**/*.{test,spec}.{ts,tsx}'];
  const testTimeout = bilan ? 600_000 : corpus ? 120_000 : undefined;

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
      include,
      passWithNoTests: !corpus && !bilan,
      // Corpus et bilan sur P: (bibliothèque SharePoint synchronisée) : lectures lentes, délai de
      // 2 minutes (corpus) ou 10 minutes (bilan) par test au lieu des 5 secondes par défaut. Mode
      // normal inchangé.
      ...(testTimeout !== undefined && { testTimeout }),
      env,
    },
  };
});
