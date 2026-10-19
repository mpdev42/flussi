import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier/flat';
import { builtinModules } from 'node:module';

// Modules natifs réservés au processus principal : interdits dans le renderer, le preload et le
// domaine (embarqué dans le renderer).
const MODULES_NATIFS_MAIN = [
  {
    name: '@primno/dpapi',
    message: 'DPAPI reste dans le processus principal (src/main/adapters/config/dpapi.ts).',
  },
  {
    name: 'koffi',
    message:
      "L'API Windows (koffi) reste dans le processus principal (src/main/adapters/config/api-windows.ts).",
  },
];

const MESSAGE_MODULE_NODE =
  'Le domaine reste pur, sans entrées-sorties : pas de module Node. Les entrées-sorties vont dans les adapters du main (src/main/adapters).';

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
      'no-restricted-imports': ['error', { paths: MODULES_NATIFS_MAIN }],
    },
  },
  {
    // Domaine pur AC056 : aucune entrée-sortie, utilisable tel quel par le main et le renderer.
    // Les tests (*.test.ts, dont *.corpus.test.ts et *.lazarus.test.ts) en sont exclus.
    files: ['src/shared/domain/**/*.ts'],
    ignores: ['src/shared/domain/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // builtinModules contient aussi les sous-chemins (fs/promises…). Les noms nus restent
          // dans `paths` : dans `patterns`, la syntaxe gitignore attraperait `./path`. Les noms
          // préfixés (node:test…) sont couverts par le motif `node:*`.
          paths: [
            ...builtinModules
              .filter((name) => !name.startsWith('node:'))
              .map((name) => ({ name, message: MESSAGE_MODULE_NODE })),
            ...MODULES_NATIFS_MAIN,
          ],
          patterns: [
            // Modules accessibles seulement avec le préfixe (node:test, node:sqlite…)
            { group: ['node:*'], message: MESSAGE_MODULE_NODE },
            {
              group: ['electron', 'electron/*'],
              message:
                "Le domaine reste pur : pas d'Electron. Il est partagé par le main et le renderer.",
            },
            {
              group: ['vitest', 'vitest/*', '@shared/test/*'],
              message:
                'Le domaine reste pur : les outils de test (vitest, @shared/test) ne sont importés que par les fichiers *.test.ts.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression',
          message:
            "Le domaine reste pur : pas d'import dynamique (il contournerait no-restricted-imports).",
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'Buffer',
          message:
            'Le domaine reste pur : pas de Buffer (Node). Utiliser Uint8Array et les aides de octets.ts.',
        },
        {
          name: 'process',
          message:
            "Le domaine reste pur : pas de process (Node). L'environnement est lu par l'adapter config du main.",
        },
      ],
    },
  },
  prettier,
]);
