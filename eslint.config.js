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
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  prettier,
]);
