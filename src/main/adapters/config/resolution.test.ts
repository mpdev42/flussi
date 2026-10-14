import { describe, expect, it } from 'vitest';
import {
  CLES_CONFIGURATION,
  CLES_DEV,
  CLES_SECRETES,
  configurationSchema,
} from '@shared/schemas/config';
import { formaterErreurs } from './lecture';
import {
  DOSSIER_TRAVAIL_PROD,
  resoudreConfiguration,
  type ErreurConfiguration,
  type ResultatConfiguration,
} from './resolution';

// Valeurs fictives uniquement. DOSSIER_TRAVAIL_PROD est la seule valeur de production citée.
const CONFIG_JSON = 'C:\\ProgramData\\Flussi\\config.json';
const DOT_ENV = 'C:\\Dev\\flussi\\.env';
const RACINE = 'D:\\Travail\\Flussi';
const SECRET_FICTIF = 'secret-fictif-ne-pas-divulguer';

const installee = (valeursFichier: Record<string, unknown>) =>
  resoudreConfiguration({ contexte: 'installee', fichier: CONFIG_JSON, valeursFichier });

const dev = (valeursFichier: Record<string, unknown>) =>
  resoudreConfiguration({ contexte: 'dev', fichier: DOT_ENV, valeursFichier });

function configurationDe(resultat: ResultatConfiguration) {
  if (!resultat.ok) throw new Error(`refus inattendu : ${JSON.stringify(resultat.erreurs)}`);
  return resultat.configuration;
}

function erreursDe(resultat: ResultatConfiguration): ErreurConfiguration[] {
  if (resultat.ok) throw new Error('acceptation inattendue');
  return resultat.erreurs;
}

describe('resoudreConfiguration — application installée', () => {
  it('dérive IN, OUT et Journal de la racine par défaut pour un config.json réduit à prod', () => {
    const configuration = configurationDe(installee({ FLUSSI_ENV: 'prod' }));
    expect(configuration).toEqual({
      mode: 'prod',
      dossiers: {
        travail: DOSSIER_TRAVAIL_PROD,
        in: `${DOSSIER_TRAVAIL_PROD}\\IN`,
        out: `${DOSSIER_TRAVAIL_PROD}\\OUT`,
        journal: `${DOSSIER_TRAVAIL_PROD}\\Journal`,
      },
    });
  });

  it('refuse la recette sans aucun dossier de travail (manquant)', () => {
    const erreurs = erreursDe(installee({ FLUSSI_ENV: 'recette' }));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]?.source).toBe(CONFIG_JSON);
    expect(erreurs[0]?.message).toContain('STOCKAGE_DOSSIER_TRAVAIL manquant');
  });

  it('dérive les dossiers de la racine en recette', () => {
    const configuration = configurationDe(
      installee({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: RACINE }),
    );
    expect(configuration.mode).toBe('recette');
    expect(configuration.dossiers).toEqual({
      travail: RACINE,
      in: `${RACINE}\\IN`,
      out: `${RACINE}\\OUT`,
      journal: `${RACINE}\\Journal`,
    });
  });

  it('normalise une racine terminée par une barre oblique inverse', () => {
    const configuration = configurationDe(
      installee({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: `${RACINE}\\` }),
    );
    expect(configuration.dossiers.in).toBe(`${RACINE}\\IN`);
  });

  it('accepte les trois dossiers sans racine (travail à null)', () => {
    const configuration = configurationDe(
      installee({
        FLUSSI_ENV: 'recette',
        STOCKAGE_DOSSIER_IN: 'D:\\a\\entrees',
        STOCKAGE_DOSSIER_OUT: 'D:\\b\\sorties',
        STOCKAGE_DOSSIER_JOURNAL: 'D:\\c\\journal',
      }),
    );
    expect(configuration.dossiers).toEqual({
      travail: null,
      in: 'D:\\a\\entrees',
      out: 'D:\\b\\sorties',
      journal: 'D:\\c\\journal',
    });
  });

  it('refuse la recette avec seulement deux dossiers sur trois et pas de racine', () => {
    const erreurs = erreursDe(
      installee({
        FLUSSI_ENV: 'recette',
        STOCKAGE_DOSSIER_IN: 'D:\\a',
        STOCKAGE_DOSSIER_OUT: 'D:\\b',
      }),
    );
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]?.message).toContain('manquant');
  });

  it("la surcharge d'un seul dossier l'emporte sur la dérivation", () => {
    const configuration = configurationDe(
      installee({
        FLUSSI_ENV: 'recette',
        STOCKAGE_DOSSIER_TRAVAIL: RACINE,
        STOCKAGE_DOSSIER_OUT: 'E:\\Autre\\Sorties',
      }),
    );
    expect(configuration.dossiers.in).toBe(`${RACINE}\\IN`);
    expect(configuration.dossiers.out).toBe('E:\\Autre\\Sorties');
    expect(configuration.dossiers.journal).toBe(`${RACINE}\\Journal`);
  });

  it('une racine explicite en prod remplace la racine par défaut', () => {
    const configuration = configurationDe(
      installee({ FLUSSI_ENV: 'prod', STOCKAGE_DOSSIER_TRAVAIL: RACINE }),
    );
    expect(configuration.dossiers.travail).toBe(RACINE);
    expect(configuration.dossiers.journal).toBe(`${RACINE}\\Journal`);
  });

  it('accepte un chemin réseau UNC', () => {
    const configuration = configurationDe(
      installee({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: '\\\\serveur\\partage\\x' }),
    );
    expect(configuration.dossiers.in).toBe('\\\\serveur\\partage\\x\\IN');
    expect(configuration.dossiers.journal).toBe('\\\\serveur\\partage\\x\\Journal');
  });

  it('accepte les clés de service connues (non résolues) et les ignore dans le résultat', () => {
    const configuration = configurationDe(
      installee({
        FLUSSI_ENV: 'prod',
        VEOS_URL: 'https://veos.exemple.test',
        MSP_SFTP_PORT: '10022',
      }),
    );
    expect(Object.keys(configuration)).toEqual(['mode', 'dossiers']);
  });
});

describe('resoudreConfiguration — FLUSSI_ENV', () => {
  it('refuse FLUSSI_ENV absent, sans citer de valeur', () => {
    const erreurs = erreursDe(installee({ STOCKAGE_DOSSIER_TRAVAIL: RACINE }));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ source: CONFIG_JSON, cle: 'FLUSSI_ENV' });
    expect(erreurs[0]?.message).toContain('absent ou vide');
  });

  it('refuse FLUSSI_ENV vide', () => {
    const erreurs = erreursDe(installee({ FLUSSI_ENV: '', STOCKAGE_DOSSIER_TRAVAIL: RACINE }));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ cle: 'FLUSSI_ENV' });
    expect(erreurs[0]?.message).toContain('absent ou vide');
  });

  it.each(['Prod', 'production', ' recette', 'RECETTE', 'prod '])(
    'refuse la valeur %j, citée dans le message',
    (valeur) => {
      const erreurs = erreursDe(
        installee({ FLUSSI_ENV: valeur, STOCKAGE_DOSSIER_TRAVAIL: RACINE }),
      );
      expect(erreurs).toHaveLength(1);
      expect(erreurs[0]).toMatchObject({ source: CONFIG_JSON, cle: 'FLUSSI_ENV' });
      expect(erreurs[0]?.message).toContain(`« ${valeur} » reçu`);
    },
  );

  it('refuse un FLUSSI_ENV non textuel', () => {
    const erreurs = erreursDe(installee({ FLUSSI_ENV: true, STOCKAGE_DOSSIER_TRAVAIL: RACINE }));
    expect(erreurs).toEqual([
      { source: CONFIG_JSON, cle: 'FLUSSI_ENV', message: 'texte attendu.' },
    ]);
  });
});

describe('resoudreConfiguration — clés refusées', () => {
  it('refuse une clé inconnue (faute de frappe)', () => {
    const erreurs = erreursDe(
      installee({
        FLUSSI_ENV: 'recette',
        STOCKAGE_DOSSIER_TRAVAIL: RACINE,
        STOCKAGE_DOSIER_IN: 'D:\\x',
      }),
    );
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ source: CONFIG_JSON, cle: 'STOCKAGE_DOSIER_IN' });
    expect(erreurs[0]?.message).toContain('clé inconnue');
  });

  it('une faute de frappe sur un dossier ne laisse pas passer la valeur par défaut en prod', () => {
    const erreurs = erreursDe(installee({ FLUSSI_ENV: 'prod', STOCKAGE_DOSIER_IN: 'D:\\x' }));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]?.cle).toBe('STOCKAGE_DOSIER_IN');
  });

  it('traite AC056_CORPUS_DIR comme une clé inconnue dans config.json', () => {
    const erreurs = erreursDe(
      installee({ FLUSSI_ENV: 'prod', AC056_CORPUS_DIR: 'P:\\corpus-fictif' }),
    );
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ cle: 'AC056_CORPUS_DIR' });
    expect(erreurs[0]?.message).toContain('clé inconnue');
  });

  it.each(CLES_SECRETES)(
    'refuse le secret %s dans config.json sans jamais divulguer sa valeur',
    (cle) => {
      const resultat = installee({ FLUSSI_ENV: 'prod', [cle]: SECRET_FICTIF });
      const erreurs = erreursDe(resultat);
      expect(erreurs).toHaveLength(1);
      expect(erreurs[0]).toMatchObject({ source: CONFIG_JSON, cle });
      expect(erreurs[0]?.message).toContain('secret');
      expect(JSON.stringify(erreurs)).not.toContain(SECRET_FICTIF);
      expect(formaterErreurs(erreurs)).not.toContain(SECRET_FICTIF);
    },
  );

  it('refuse une valeur non textuelle (MSP_SFTP_PORT numérique)', () => {
    const erreurs = erreursDe(installee({ FLUSSI_ENV: 'prod', MSP_SFTP_PORT: 10022 }));
    expect(erreurs).toEqual([
      { source: CONFIG_JSON, cle: 'MSP_SFTP_PORT', message: 'texte attendu.' },
    ]);
  });

  it.each([
    ['chemin relatif', 'RECETTE'],
    ['barres obliques', 'C:/x'],
    ['lecteur sans barre', 'C:x'],
    ['UNC incomplet', '\\\\hote-fictif'],
  ])('refuse un dossier de travail invalide (%s), sans citer la valeur', (_nom, valeur) => {
    const erreurs = erreursDe(
      installee({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: valeur }),
    );
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ source: CONFIG_JSON, cle: 'STOCKAGE_DOSSIER_TRAVAIL' });
    expect(erreurs[0]?.message).toContain('chemin absolu attendu');
    expect(erreurs[0]?.message).not.toContain(valeur);
  });

  it('refuse un chemin relatif sur un dossier individuel, sans erreur de dossier manquant', () => {
    const erreurs = erreursDe(
      installee({
        FLUSSI_ENV: 'recette',
        STOCKAGE_DOSSIER_TRAVAIL: RACINE,
        STOCKAGE_DOSSIER_JOURNAL: 'valeur-sentinelle',
      }),
    );
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ cle: 'STOCKAGE_DOSSIER_JOURNAL' });
    expect(erreurs[0]?.message).not.toContain('valeur-sentinelle');
  });

  it('refuse un chemin relatif en prod sans retomber sur la valeur par défaut', () => {
    const erreurs = erreursDe(
      installee({ FLUSSI_ENV: 'prod', STOCKAGE_DOSSIER_TRAVAIL: 'relatif' }),
    );
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]?.cle).toBe('STOCKAGE_DOSSIER_TRAVAIL');
  });

  it('collecte toutes les erreurs en une seule fois', () => {
    const erreurs = erreursDe(
      installee({
        FLUSSI_ENV: 'production',
        STOCKAGE_DOSIER_IN: 'D:\\x',
        MSP_SFTP_PASSWORD: SECRET_FICTIF,
        STOCKAGE_DOSSIER_OUT: 'RELATIF',
      }),
    );
    expect(erreurs.map((e) => e.cle).sort()).toEqual([
      'FLUSSI_ENV',
      'MSP_SFTP_PASSWORD',
      'STOCKAGE_DOSIER_IN',
      'STOCKAGE_DOSSIER_OUT',
    ]);
    expect(formaterErreurs(erreurs)).not.toContain(SECRET_FICTIF);
  });
});

describe('resoudreConfiguration — développement', () => {
  it('refuse FLUSSI_ENV=prod du .env, avec le .env pour source', () => {
    const erreurs = erreursDe(dev({ FLUSSI_ENV: 'prod' }));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ source: DOT_ENV, cle: 'FLUSSI_ENV' });
    expect(erreurs[0]?.message).toContain('prod est refusé en développement');
  });

  it('cite la source du .env pour une valeur de mode invalide venant du .env', () => {
    const erreurs = erreursDe(dev({ FLUSSI_ENV: 'Recette', STOCKAGE_DOSSIER_TRAVAIL: RACINE }));
    expect(erreurs[0]).toMatchObject({ source: DOT_ENV, cle: 'FLUSSI_ENV' });
  });

  it('traite une valeur vide du .env (CLE=) comme absente', () => {
    const erreurs = erreursDe(dev({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: '' }));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]?.message).toContain('manquant');
  });

  it('accepte les clés de service vides du .env (comme .env.example)', () => {
    const configuration = configurationDe(
      dev({
        FLUSSI_ENV: 'recette',
        STOCKAGE_DOSSIER_TRAVAIL: RACINE,
        VEOS_URL: '',
        MSP_SFTP_PORT: '',
      }),
    );
    expect(configuration.mode).toBe('recette');
  });

  it('accepte secrets et AC056_CORPUS_DIR dans le .env, sans les résoudre', () => {
    const valeursFichier: Record<string, unknown> = {
      FLUSSI_ENV: 'recette',
      STOCKAGE_DOSSIER_TRAVAIL: RACINE,
      AC056_CORPUS_DIR: 'P:\\corpus-fictif',
    };
    for (const cle of CLES_SECRETES) valeursFichier[cle] = SECRET_FICTIF;

    const configuration = configurationDe(dev(valeursFichier));
    expect(Object.keys(configuration)).toEqual(['mode', 'dossiers']);
    expect(JSON.stringify(configuration)).not.toContain(SECRET_FICTIF);
    expect(JSON.stringify(configuration)).not.toContain('corpus-fictif');
  });

  it('une clé inconnue du .env est refusée aussi en développement', () => {
    const erreurs = erreursDe(
      dev({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: RACINE, STOCKAGE_DOSIER_IN: 'x' }),
    );
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ source: DOT_ENV, cle: 'STOCKAGE_DOSIER_IN' });
  });

  it('FLUSSI_ENV absent du .env (ou .env sans clé) est refusé', () => {
    const erreurs = erreursDe(dev({}));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ source: DOT_ENV, cle: 'FLUSSI_ENV' });
  });
});

describe('resoudreConfiguration — configuration résolue', () => {
  it('valide configurationSchema et ne contient aucune clé secrète', () => {
    const resultats = [
      installee({ FLUSSI_ENV: 'prod' }),
      installee({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: RACINE }),
      dev({
        FLUSSI_ENV: 'recette',
        STOCKAGE_DOSSIER_TRAVAIL: RACINE,
        IGA_FTP_PASSWORD: SECRET_FICTIF,
      }),
    ];
    const cleInterdites = [...CLES_SECRETES, ...CLES_DEV];
    for (const resultat of resultats) {
      const configuration = configurationDe(resultat);
      expect(configurationSchema.safeParse(configuration).success).toBe(true);
      const json = JSON.stringify(configuration);
      for (const cle of cleInterdites) expect(json).not.toContain(cle);
      expect(json).not.toContain(SECRET_FICTIF);
    }
  });

  it('ne partage aucune clé entre clés de configuration, secrets et clés de développement', () => {
    const toutes = [...CLES_CONFIGURATION, ...CLES_SECRETES, ...CLES_DEV];
    expect(new Set(toutes).size).toBe(toutes.length);
  });
});
