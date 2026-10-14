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

  it('refuse la recette sans dossier de travail, avec une erreur rattachée à la clé', () => {
    const erreurs = erreursDe(installee({ FLUSSI_ENV: 'recette' }));
    expect(erreurs).toEqual([
      {
        source: CONFIG_JSON,
        cle: 'STOCKAGE_DOSSIER_TRAVAIL',
        message:
          'manquant : chemin absolu du dossier de travail attendu (il contient IN, OUT et Journal).',
      },
    ]);
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

  it('une racine explicite en prod remplace la racine par défaut, et les dossiers en dérivent', () => {
    const configuration = configurationDe(
      installee({ FLUSSI_ENV: 'prod', STOCKAGE_DOSSIER_TRAVAIL: RACINE }),
    );
    expect(configuration.dossiers).toEqual({
      travail: RACINE,
      in: `${RACINE}\\IN`,
      out: `${RACINE}\\OUT`,
      journal: `${RACINE}\\Journal`,
    });
  });

  it('en prod avec une racine vide, applique la racine par défaut et en dérive les dossiers', () => {
    const configuration = configurationDe(
      installee({ FLUSSI_ENV: 'prod', STOCKAGE_DOSSIER_TRAVAIL: '' }),
    );
    expect(configuration.dossiers).toEqual({
      travail: DOSSIER_TRAVAIL_PROD,
      in: `${DOSSIER_TRAVAIL_PROD}\\IN`,
      out: `${DOSSIER_TRAVAIL_PROD}\\OUT`,
      journal: `${DOSSIER_TRAVAIL_PROD}\\Journal`,
    });
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

  it('n’ajoute pas d’erreur « manquant » tant que FLUSSI_ENV est absent ou invalide', () => {
    for (const valeurs of [{}, { FLUSSI_ENV: '' }, { FLUSSI_ENV: 'Prod' }, { FLUSSI_ENV: true }]) {
      for (const resultat of [installee(valeurs), dev(valeurs)]) {
        const erreurs = erreursDe(resultat);
        expect(erreurs).toHaveLength(1);
        expect(erreurs[0]?.cle).toBe('FLUSSI_ENV');
        expect(JSON.stringify(erreurs)).not.toContain('manquant');
      }
    }
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

  it.each(['STOCKAGE_DOSSIER_IN', 'STOCKAGE_DOSSIER_OUT', 'STOCKAGE_DOSSIER_JOURNAL'])(
    'refuse la clé retirée %s comme clé inconnue, en installée, sans citer la valeur',
    (cle) => {
      const erreurs = erreursDe(
        installee({
          FLUSSI_ENV: 'recette',
          STOCKAGE_DOSSIER_TRAVAIL: RACINE,
          [cle]: 'D:\\valeur-sentinelle',
        }),
      );
      expect(erreurs).toEqual([
        { source: CONFIG_JSON, cle, message: 'clé inconnue (faute de frappe ?).' },
      ]);
      expect(JSON.stringify(erreurs)).not.toContain('valeur-sentinelle');
    },
  );

  it.each(['STOCKAGE_DOSSIER_IN', 'STOCKAGE_DOSSIER_OUT', 'STOCKAGE_DOSSIER_JOURNAL'])(
    'refuse la clé retirée %s comme clé inconnue, en dev, sans citer la valeur',
    (cle) => {
      const erreurs = erreursDe(
        dev({
          FLUSSI_ENV: 'recette',
          STOCKAGE_DOSSIER_TRAVAIL: RACINE,
          [cle]: 'D:\\valeur-sentinelle',
        }),
      );
      expect(erreurs).toEqual([
        { source: DOT_ENV, cle, message: 'clé inconnue (faute de frappe ?).' },
      ]);
      expect(JSON.stringify(erreurs)).not.toContain('valeur-sentinelle');
    },
  );

  it('refuse une clé retirée même sans racine, avec l’erreur « manquant » en plus', () => {
    const erreurs = erreursDe(installee({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_IN: 'D:\\a' }));
    expect(erreurs.map((e) => e.cle).sort()).toEqual([
      'STOCKAGE_DOSSIER_IN',
      'STOCKAGE_DOSSIER_TRAVAIL',
    ]);
  });

  it('une racine en erreur (chemin relatif) donne une seule erreur, sans « manquant »', () => {
    for (const resultat of [
      installee({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: 'relatif' }),
      dev({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: 'relatif' }),
    ]) {
      const erreurs = erreursDe(resultat);
      expect(erreurs).toHaveLength(1);
      expect(erreurs[0]?.cle).toBe('STOCKAGE_DOSSIER_TRAVAIL');
      expect(erreurs[0]?.message).toContain('chemin absolu attendu');
      expect(erreurs[0]?.message).not.toContain('manquant');
    }
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

describe('resoudreConfiguration — caractère de contrôle dans un chemin', () => {
  const MESSAGE_DEV =
    "caractère de contrôle dans le chemin (saut de ligne ?) : dans le .env, n'entourez pas le chemin de guillemets doubles.";
  const MESSAGE_INSTALLEE =
    'caractère de contrôle dans le chemin (saut de ligne ?) : dans config.json, chaque barre oblique inverse doit être doublée (\\\\).';
  // « \n » issu d'une barre oblique inverse non doublée (\nouveau) dans un config.json
  const AVEC_SAUT = 'C:\\Dev\nouveau-fictif';

  it('donne le message dédié en installée, sans citer la valeur', () => {
    const erreurs = erreursDe(
      installee({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: AVEC_SAUT }),
    );
    expect(erreurs).toEqual([
      { source: CONFIG_JSON, cle: 'STOCKAGE_DOSSIER_TRAVAIL', message: MESSAGE_INSTALLEE },
    ]);
    expect(erreurs[0]?.message).not.toContain('nouveau-fictif');
  });

  it('donne le message dédié en dev, sans citer la valeur', () => {
    const erreurs = erreursDe(dev({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: AVEC_SAUT }));
    expect(erreurs).toEqual([
      { source: DOT_ENV, cle: 'STOCKAGE_DOSSIER_TRAVAIL', message: MESSAGE_DEV },
    ]);
    expect(erreurs[0]?.message).not.toContain('nouveau-fictif');
  });

  it('ne retombe pas sur la racine par défaut en prod', () => {
    const erreurs = erreursDe(
      installee({ FLUSSI_ENV: 'prod', STOCKAGE_DOSSIER_TRAVAIL: AVEC_SAUT }),
    );
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]?.message).toBe(MESSAGE_INSTALLEE);
  });

  it.each([
    ['tabulation', 'D:\\a\tb'],
    ['caractère nul', 'D:\\a\0b'],
    ['saut de ligne final', 'D:\\a\n'],
    ['retour chariot', 'D:\\a\rb'],
  ])('détecte aussi : %s', (_nom, valeur) => {
    const erreurs = erreursDe(dev({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: valeur }));
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]?.message).toBe(MESSAGE_DEV);
  });

  it('ne signale pas en plus un dossier manquant', () => {
    const erreurs = erreursDe(
      installee({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: AVEC_SAUT }),
    );
    expect(erreurs).toHaveLength(1);
  });

  it('garde le message « chemin absolu attendu » pour un chemin relatif sans caractère de contrôle', () => {
    for (const resultat of [
      installee({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: 'relatif' }),
      dev({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: 'relatif' }),
    ]) {
      const erreurs = erreursDe(resultat);
      expect(erreurs).toHaveLength(1);
      expect(erreurs[0]?.message).toContain('chemin absolu attendu');
      expect(erreurs[0]?.message).not.toContain('caractère de contrôle');
    }
  });

  it('émet le message de contrôle avant « chemin absolu » pour un chemin relatif avec saut de ligne', () => {
    const erreurs = erreursDe(
      installee({ FLUSSI_ENV: 'recette', STOCKAGE_DOSSIER_TRAVAIL: 'relatif\nfictif' }),
    );
    expect(erreurs[0]?.message).toBe(MESSAGE_INSTALLEE);
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
