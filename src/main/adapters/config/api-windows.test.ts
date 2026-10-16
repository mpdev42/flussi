import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { creerApiElevationWindows, creerApiShellWindows } from './api-windows';

// SÉCURITÉ : le verbe `runas` n'est JAMAIS exercé pour de bon. Les cas `runas` visent un exécutable
// inexistant et vérifient seulement le garde-fou « refusé sous Vitest » (aucun appel natif). Le verbe
// `open` réel n'est utilisé que sur Node (`process.execPath`) avec la fixture `sortie-7.cjs`, et sur
// un fichier inexistant (échec sans boîte de dialogue : `SEE_MASK_FLAG_NO_UI`).

const INEXISTANT = 'C:\\inexistant\\flussi-test.exe';
const FIXTURE = join(__dirname, '__fixtures__', 'sortie-7.cjs');

describe.runIf(process.platform === 'win32')('creerApiShellWindows — verbe open', () => {
  it('lance Node sur la fixture et attend son code de sortie (7)', async () => {
    const api = creerApiShellWindows();

    const lancement = api.lancer('open', process.execPath, `"${FIXTURE}"`);

    expect(lancement.ok).toBe(true);
    if (!lancement.ok) return;
    expect(await api.attendreFin(lancement.processus)).toBe(7);
  });

  it('deux lancements successifs donnent chacun 7', async () => {
    const api = creerApiShellWindows();

    for (let i = 0; i < 2; i++) {
      const lancement = api.lancer('open', process.execPath, `"${FIXTURE}"`);
      expect(lancement.ok).toBe(true);
      if (!lancement.ok) return;
      expect(await api.attendreFin(lancement.processus)).toBe(7);
    }
  });

  it('exécutable inexistant : échec sans boîte de dialogue, code 2 (fichier introuvable)', () => {
    const api = creerApiShellWindows();

    expect(api.lancer('open', INEXISTANT, '')).toEqual({ ok: false, code: 2 });
  });
});

describe.runIf(process.platform === 'win32')('garde-fous sous Vitest', () => {
  it('creerApiShellWindows().lancer("runas") est refusé sans appel natif (code -1)', () => {
    expect(creerApiShellWindows().lancer('runas', INEXISTANT, '')).toEqual({
      ok: false,
      code: -1,
    });
  });

  it('creerApiElevationWindows().lancerEleve est refusé (code -1)', () => {
    expect(creerApiElevationWindows().lancerEleve(INEXISTANT, '')).toEqual({
      ok: false,
      code: -1,
    });
  });

  it('creerApiElevationWindows().attendreFin rejette', async () => {
    await expect(creerApiElevationWindows().attendreFin(null)).rejects.toThrow();
  });
});
