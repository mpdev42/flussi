import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chargerConfiguration, formaterErreurs, type ParametresChargement } from './lecture';
import type { ErreurConfiguration, ResultatConfiguration } from './resolution';

// Fichiers écrits par les tests dans un dossier temporaire, valeurs fictives uniquement.
const RACINE = 'D:\\Travail\\Flussi';
const SECRET_FICTIF = 'secret-fictif-ne-pas-divulguer';

let base: string;
let programData: string;
let courant: string;

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'flussi-config-'));
  programData = join(base, 'ProgramData');
  courant = join(base, 'courant');
  mkdirSync(join(programData, 'Flussi'), { recursive: true });
  mkdirSync(courant);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(base, { recursive: true, force: true, maxRetries: 5 });
});

const cheminConfigJson = () => join(programData, 'Flussi', 'config.json');
const ecrireConfigJson = (contenu: string) => writeFileSync(cheminConfigJson(), contenu, 'utf8');
const ecrireDotEnv = (contenu: string) => writeFileSync(join(courant, '.env'), contenu, 'utf8');

const parametres = (estInstallee: boolean): ParametresChargement => ({
  estInstallee,
  dossierProgramData: programData,
  dossierCourant: courant,
});

function erreursDe(resultat: ResultatConfiguration): ErreurConfiguration[] {
  if (resultat.ok) throw new Error('acceptation inattendue');
  return resultat.erreurs;
}

describe('chargerConfiguration — application installée', () => {
  it('lit config.json dans {ProgramData}\\Flussi', () => {
    ecrireConfigJson(JSON.stringify({ FLUSSI_ENV: 'prod' }));
    const resultat = chargerConfiguration(parametres(true));
    expect(resultat.ok).toBe(true);
    if (resultat.ok) expect(resultat.configuration.mode).toBe('prod');
  });

  it('refuse un config.json absent (obligatoire), en citant son chemin', () => {
    const erreurs = erreursDe(chargerConfiguration(parametres(true)));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]?.source).toBe(cheminConfigJson());
    expect(erreurs[0]?.message).toContain('obligatoire');
  });

  it('refuse un JSON invalide sans citer son contenu', () => {
    ecrireConfigJson(`{ "FLUSSI_ENV": "${SECRET_FICTIF}" `);
    const erreurs = erreursDe(chargerConfiguration(parametres(true)));
    expect(erreurs).toEqual([{ source: cheminConfigJson(), message: 'JSON invalide.' }]);
  });

  it.each(['[]', '[{"FLUSSI_ENV":"prod"}]', 'null', '"prod"', '42'])(
    'refuse une racine JSON qui n’est pas un objet (%s)',
    (contenu) => {
      ecrireConfigJson(contenu);
      const erreurs = erreursDe(chargerConfiguration(parametres(true)));
      expect(erreurs).toHaveLength(1);
      expect(erreurs[0]?.message).toContain('objet JSON');
    },
  );

  it('refuse un config.json illisible (dossier à la place du fichier)', () => {
    mkdirSync(cheminConfigJson());
    const erreurs = erreursDe(chargerConfiguration(parametres(true)));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]?.source).toBe(cheminConfigJson());
    expect(erreurs[0]?.message).toContain('illisible');
  });

  it('accepte un config.json avec BOM UTF-8', () => {
    ecrireConfigJson('\uFEFF' + JSON.stringify({ FLUSSI_ENV: 'prod' }));
    const resultat = chargerConfiguration(parametres(true));
    expect(resultat.ok).toBe(true);
  });

  it('refuse un secret dans config.json sans en divulguer la valeur', () => {
    ecrireConfigJson(JSON.stringify({ FLUSSI_ENV: 'prod', MSP_SFTP_PASSWORD: SECRET_FICTIF }));
    const erreurs = erreursDe(chargerConfiguration(parametres(true)));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ cle: 'MSP_SFTP_PASSWORD' });
    expect(formaterErreurs(erreurs)).not.toContain(SECRET_FICTIF);
  });

  it('ignore le .env du dossier courant et les variables du processus', () => {
    ecrireConfigJson(JSON.stringify({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: RACINE }));
    ecrireDotEnv('FLUSSI_ENV=prod\nSTOCKAGE_DOSIER_IN=faute\n');
    vi.stubEnv('FLUSSI_ENV', 'prod');
    vi.stubEnv('STOCKAGE_DOSSIER_TRAVAIL', 'D:\\autre');
    const resultat = chargerConfiguration(parametres(true));
    expect(resultat.ok).toBe(true);
    if (resultat.ok) {
      expect(resultat.configuration.mode).toBe('recette');
      expect(resultat.configuration.dossiers.travail).toBe(RACINE);
    }
  });

  it('ne se replie pas sur le .env quand config.json est absent', () => {
    ecrireDotEnv(`FLUSSI_ENV=recette\nSTOCKAGE_DOSSIER_TRAVAIL=${RACINE}\n`);
    const erreurs = erreursDe(chargerConfiguration(parametres(true)));
    expect(erreurs[0]?.message).toContain('obligatoire');
  });
});

describe('chargerConfiguration — développement', () => {
  it('lit le .env du dossier courant', () => {
    ecrireDotEnv(`FLUSSI_ENV=recette\nSTOCKAGE_DOSSIER_TRAVAIL=${RACINE}\n`);
    const resultat = chargerConfiguration(parametres(false));
    expect(resultat.ok).toBe(true);
    if (resultat.ok) {
      expect(resultat.configuration.mode).toBe('recette');
      expect(resultat.configuration.dossiers.in).toBe(`${RACINE}\\IN`);
    }
  });

  it('refuse un .env absent : FLUSSI_ENV manquant, source du .env', () => {
    const erreurs = erreursDe(chargerConfiguration(parametres(false)));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ source: join(courant, '.env'), cle: 'FLUSSI_ENV' });
  });

  it('accepte un .env avec BOM UTF-8 (première clé reconnue)', () => {
    ecrireDotEnv(`\uFEFFFLUSSI_ENV=recette\nSTOCKAGE_DOSSIER_TRAVAIL=${RACINE}\n`);
    const resultat = chargerConfiguration(parametres(false));
    expect(resultat.ok).toBe(true);
  });

  it('ignore les variables du processus : un .env sans FLUSSI_ENV est refusé', () => {
    vi.stubEnv('FLUSSI_ENV', 'recette');
    vi.stubEnv('STOCKAGE_DOSSIER_TRAVAIL', 'C:\\Fictif');
    ecrireDotEnv(`STOCKAGE_DOSSIER_TRAVAIL=${RACINE}\n`);
    const erreurs = erreursDe(chargerConfiguration(parametres(false)));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ source: join(courant, '.env'), cle: 'FLUSSI_ENV' });
    expect(erreurs[0]?.message).toContain('absent ou vide');
  });

  it('ignore les variables du processus : un .env absent est refusé même avec un processus complet', () => {
    vi.stubEnv('FLUSSI_ENV', 'recette');
    vi.stubEnv('STOCKAGE_DOSSIER_TRAVAIL', 'C:\\Fictif');
    const erreurs = erreursDe(chargerConfiguration(parametres(false)));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ cle: 'FLUSSI_ENV' });
  });

  it('le .env l’emporte : prod du .env refusé même si le processus porte recette', () => {
    vi.stubEnv('FLUSSI_ENV', 'recette');
    vi.stubEnv('STOCKAGE_DOSSIER_TRAVAIL', 'C:\\Fictif');
    ecrireDotEnv('FLUSSI_ENV=prod\n');
    const erreurs = erreursDe(chargerConfiguration(parametres(false)));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ source: join(courant, '.env'), cle: 'FLUSSI_ENV' });
    expect(erreurs[0]?.message).toContain('prod est refusé en développement');
  });

  it('les dossiers viennent du .env, pas du processus', () => {
    vi.stubEnv('STOCKAGE_DOSSIER_TRAVAIL', 'C:\\Fictif');
    ecrireDotEnv(`FLUSSI_ENV=recette\nSTOCKAGE_DOSSIER_TRAVAIL=${RACINE}\n`);
    const resultat = chargerConfiguration(parametres(false));
    expect(resultat.ok).toBe(true);
    if (resultat.ok) expect(resultat.configuration.dossiers.travail).toBe(RACINE);
  });

  it('accepte secrets et AC056_CORPUS_DIR du .env sans les résoudre', () => {
    ecrireDotEnv(
      [
        'FLUSSI_ENV=recette',
        `STOCKAGE_DOSSIER_TRAVAIL=${RACINE}`,
        `IGA_FTP_PASSWORD=${SECRET_FICTIF}`,
        'MSP_SFTP_PASSWORD=',
        'AC056_CORPUS_DIR=P:\\corpus-fictif',
        '',
      ].join('\n'),
    );
    const resultat = chargerConfiguration(parametres(false));
    expect(resultat.ok).toBe(true);
    expect(JSON.stringify(resultat)).not.toContain(SECRET_FICTIF);
  });

  it('refuse FLUSSI_ENV=prod du .env', () => {
    ecrireDotEnv('FLUSSI_ENV=prod\n');
    const erreurs = erreursDe(chargerConfiguration(parametres(false)));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ source: join(courant, '.env'), cle: 'FLUSSI_ENV' });
  });

  it('refuse un .env illisible (dossier à la place du fichier)', () => {
    mkdirSync(join(courant, '.env'));
    const erreurs = erreursDe(chargerConfiguration(parametres(false)));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]?.message).toContain('illisible');
  });

  it('ne lit jamais config.json, même présent et valide dans ProgramData', () => {
    ecrireConfigJson(JSON.stringify({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: RACINE }));
    const erreurs = erreursDe(chargerConfiguration(parametres(false)));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ cle: 'FLUSSI_ENV' });
  });

  it('ne reprend pas en silence une clé de config.json absente du .env', () => {
    ecrireConfigJson(JSON.stringify({ FLUSSI_ENV: 'prod' }));
    ecrireDotEnv('FLUSSI_ENV=recette\n');
    const erreurs = erreursDe(chargerConfiguration(parametres(false)));
    // Pas de dossier de travail : la valeur par défaut de prod n'a pas fuité depuis config.json
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]?.message).toContain('manquant');
  });
});

describe('formaterErreurs', () => {
  it('encadre le message : introduction et contact du service informatique', () => {
    const texte = formaterErreurs([{ source: 'C:\\x\\config.json', message: 'JSON invalide.' }]);
    expect(texte.startsWith('La configuration de Flussi est invalide.\n\n')).toBe(true);
    expect(texte.endsWith('\n\nContactez le service informatique.')).toBe(true);
  });

  it('donne le fichier en en-tête et une ligne « - CLE : message » par erreur', () => {
    const texte = formaterErreurs([
      { source: 'C:\\x\\config.json', cle: 'FLUSSI_ENV', message: 'absent ou vide.' },
      { source: 'C:\\x\\config.json', cle: 'MSP_SFTP_PORT', message: 'texte attendu.' },
    ]);
    expect(texte).toContain(
      'Fichier : C:\\x\\config.json\n- FLUSSI_ENV : absent ou vide.\n- MSP_SFTP_PORT : texte attendu.',
    );
    expect(texte.match(/Fichier : /g)).toHaveLength(1);
  });

  it('écrit une ligne sans clé « - message »', () => {
    const texte = formaterErreurs([{ source: 'C:\\x\\.env', message: 'dossier manquant.' }]);
    expect(texte).toContain('Fichier : C:\\x\\.env\n- dossier manquant.');
  });

  it('groupe par source, une ligne vide entre deux sources', () => {
    const texte = formaterErreurs([
      { source: 'C:\\x\\.env', cle: 'A', message: 'm1.' },
      { source: 'C:\\x\\config.json', cle: 'B', message: 'm2.' },
      { source: 'C:\\x\\.env', cle: 'C', message: 'm3.' },
    ]);
    expect(texte).toContain(
      'Fichier : C:\\x\\.env\n- A : m1.\n- C : m3.\n\nFichier : C:\\x\\config.json\n- B : m2.',
    );
  });
});
