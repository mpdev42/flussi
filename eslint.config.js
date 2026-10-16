import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  // Sorties de build, artefacts de test et sources gérées par les skills (design figé, docs, .claude)
  globalIgnores([
    'out/',
    'dist/',
    'release/',
    'playwright-report/',
    'test-results/',
    'e2e/qa-runs/',
    '.claude/',
    'docs/',
    'design/',
  ]),
  tseslint.configs.recommended,
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Le chiffrement DPAPI et l'API Windows d'élévation restent dans le main
    // (src/main/adapters/config/dpapi.ts et api-windows.ts)
    files: ['src/renderer/**/*.{ts,tsx}', 'src/preload/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@primno/dpapi',
              message:
                'DPAPI reste dans le processus principal (src/main/adapters/config/dpapi.ts).',
            },
            {
              name: 'koffi',
              message:
                "L'API Windows (koffi) reste dans le processus principal (src/main/adapters/config/api-windows.ts).",
            },
          ],
        },
      ],
    },
  },
  prettier,
]);
