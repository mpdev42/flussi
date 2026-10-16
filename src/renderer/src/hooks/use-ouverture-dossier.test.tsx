// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResultatOuvertureDossier } from '@shared/types';
import { differe, monterHook, vider, type MontureHook } from '@/test/dom';
import { useOuvertureDossier, type OuvertureDossier } from './use-ouverture-dossier';

vi.mock('@/services/parametres', () => ({
  ouvrirDossier: vi.fn(),
}));

import { ouvrirDossier } from '@/services/parametres';

let hook: MontureHook<OuvertureDossier> | null = null;

afterEach(async () => {
  await hook?.demonter();
  hook = null;
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

async function monterOuverture(): Promise<MontureHook<OuvertureDossier>> {
  hook = await monterHook(useOuvertureDossier);
  return hook;
}

async function ouvrir(
  monture: MontureHook<OuvertureDossier>,
  dossier: Parameters<OuvertureDossier['ouvrir']>[0],
): Promise<void> {
  await act(async () => {
    monture.lire().ouvrir(dossier);
  });
}

describe('useOuvertureDossier', () => {
  it('démarre sans ouverture en cours ni erreur', async () => {
    const monture = await monterOuverture();

    expect(monture.lire().enCours).toBeNull();
    expect(monture.lire().erreur).toBeNull();
    expect(ouvrirDossier).not.toHaveBeenCalled();
  });

  it('enCours vaut le dossier pendant l’ouverture, puis null au succès', async () => {
    const reponse = differe<ResultatOuvertureDossier>();
    vi.mocked(ouvrirDossier).mockReturnValue(reponse.promesse);
    const monture = await monterOuverture();

    await ouvrir(monture, 'in');
    expect(ouvrirDossier).toHaveBeenCalledTimes(1);
    expect(ouvrirDossier).toHaveBeenCalledWith('in');
    expect(monture.lire().enCours).toBe('in');
    expect(monture.lire().erreur).toBeNull();

    reponse.resoudre({ ok: true });
    await vider();
    expect(monture.lire().enCours).toBeNull();
    expect(monture.lire().erreur).toBeNull();
  });

  it('un second clic pendant une ouverture est ignoré (un seul appel)', async () => {
    const reponse = differe<ResultatOuvertureDossier>();
    vi.mocked(ouvrirDossier).mockReturnValue(reponse.promesse);
    const monture = await monterOuverture();

    await ouvrir(monture, 'in');
    await ouvrir(monture, 'out');

    expect(ouvrirDossier).toHaveBeenCalledTimes(1);
    expect(ouvrirDossier).toHaveBeenCalledWith('in');
    expect(monture.lire().enCours).toBe('in');

    reponse.resoudre({ ok: true });
    await vider();
  });

  it('deux clics dans le même rendu : un seul appel (verrou synchrone)', async () => {
    vi.mocked(ouvrirDossier).mockResolvedValue({ ok: true });
    const monture = await monterOuverture();

    await act(async () => {
      const { ouvrir: ouvrirDossierEcran } = monture.lire();
      ouvrirDossierEcran('journal');
      ouvrirDossierEcran('travail');
    });
    await vider();

    expect(ouvrirDossier).toHaveBeenCalledTimes(1);
    expect(ouvrirDossier).toHaveBeenCalledWith('journal');
  });

  it('autorise une nouvelle ouverture une fois la précédente terminée', async () => {
    vi.mocked(ouvrirDossier).mockResolvedValue({ ok: true });
    const monture = await monterOuverture();

    await ouvrir(monture, 'in');
    await vider();
    await ouvrir(monture, 'out');
    await vider();

    expect(ouvrirDossier).toHaveBeenCalledTimes(2);
    expect(ouvrirDossier).toHaveBeenLastCalledWith('out');
    expect(monture.lire().enCours).toBeNull();
  });

  it('échec typé : erreur = message du résultat, enCours libéré', async () => {
    vi.mocked(ouvrirDossier).mockResolvedValue({ ok: false, message: 'Accès refusé (simulé)' });
    const monture = await monterOuverture();

    await ouvrir(monture, 'out');
    await vider();

    expect(monture.lire().erreur).toBe('Accès refusé (simulé)');
    expect(monture.lire().enCours).toBeNull();
  });

  it('rejet IPC : erreur = message de l’Error', async () => {
    vi.mocked(ouvrirDossier).mockRejectedValue(new Error('Canal indisponible (simulé)'));
    const monture = await monterOuverture();

    await ouvrir(monture, 'in');
    await vider();

    expect(monture.lire().erreur).toBe('Canal indisponible (simulé)');
    expect(monture.lire().enCours).toBeNull();
  });

  it('rejet qui n’est pas une Error : erreur = texte du rejet', async () => {
    vi.mocked(ouvrirDossier).mockRejectedValue('échec brut');
    const monture = await monterOuverture();

    await ouvrir(monture, 'in');
    await vider();

    expect(monture.lire().erreur).toBe('échec brut');
  });

  it('efface l’erreur à l’ouverture suivante', async () => {
    vi.mocked(ouvrirDossier).mockResolvedValueOnce({ ok: false, message: 'Échec simulé' });
    const monture = await monterOuverture();
    await ouvrir(monture, 'in');
    await vider();
    expect(monture.lire().erreur).toBe('Échec simulé');

    const reponse = differe<ResultatOuvertureDossier>();
    vi.mocked(ouvrirDossier).mockReturnValue(reponse.promesse);
    await ouvrir(monture, 'in');
    expect(monture.lire().erreur).toBeNull();

    reponse.resoudre({ ok: true });
    await vider();
    expect(monture.lire().erreur).toBeNull();
  });

  it('libère le verrou après un échec : une nouvelle ouverture part', async () => {
    vi.mocked(ouvrirDossier).mockRejectedValueOnce(new Error('Échec simulé'));
    vi.mocked(ouvrirDossier).mockResolvedValueOnce({ ok: true });
    const monture = await monterOuverture();

    await ouvrir(monture, 'in');
    await vider();
    await ouvrir(monture, 'in');
    await vider();

    expect(ouvrirDossier).toHaveBeenCalledTimes(2);
    expect(monture.lire().erreur).toBeNull();
  });

  it('ne met rien à jour si le démontage précède la fin de l’ouverture', async () => {
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reponse = differe<ResultatOuvertureDossier>();
    vi.mocked(ouvrirDossier).mockReturnValue(reponse.promesse);
    const monture = await monterOuverture();

    await ouvrir(monture, 'in');
    expect(monture.lire().enCours).toBe('in');

    await monture.demonter();
    reponse.resoudre({ ok: false, message: 'Échec tardif' });
    await vider();

    // Dernier état observé avant le démontage : rien n'a été validé depuis
    expect(monture.lire().enCours).toBe('in');
    expect(monture.lire().erreur).toBeNull();
    expect(erreurs).not.toHaveBeenCalled();
  });

  it('ne met rien à jour si le démontage précède le rejet de l’ouverture', async () => {
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reponse = differe<ResultatOuvertureDossier>();
    vi.mocked(ouvrirDossier).mockReturnValue(reponse.promesse);
    const monture = await monterOuverture();

    await ouvrir(monture, 'out');
    await monture.demonter();
    reponse.rejeter(new Error('Rejet tardif'));
    await vider();

    expect(monture.lire().erreur).toBeNull();
    expect(erreurs).not.toHaveBeenCalled();
  });
});
