# Flussi

Logiciel d'échange de fichiers entre notre logiciel de gestion métier VEOS et notre partenaire MSP.

## Dev

```bash
npm run dev           # Lancer en dev — electron-vite dev (encapsulé par scripts/dev.mjs)
npm test              # Tests unitaires — vitest run
npm run test:e2e      # Tests e2e Playwright — après npm run build (encapsulé par scripts/e2e.mjs)
npm run build         # Build production — electron-vite build
npm run package       # Installeur Windows NSIS pour Intune — electron-vite build && electron-builder --win nsis
npm run typecheck     # Vérification des types — tsc --noEmit
npm run lint          # Lint check — eslint .
npm run lint:fix      # Lint fix auto — eslint . --fix
npm run format        # Formatter — prettier --write .
```

Les tests e2e se lancent uniquement depuis la racine du projet, via `npm run test:e2e`, après au moins un `npm run build`.
