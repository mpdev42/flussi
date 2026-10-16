import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { EtatSecrets, StatutSecret } from '@shared/types';
import { SecretsVue, type SecretsVueProps } from './secrets-vue';

// Valeurs fictives
const FTP = 'iga-ftp-mot-de-passe';
const SFTP = 'msp-sftp-mot-de-passe';
const CLE = 'msp-sftp-cle-privee';

function etatDe(surcharge: Partial<EtatSecrets> = {}): EtatSecrets {
  return {
    source: 'secrets-bin',
    modifiable: true,
    anomalie: null,
    secrets: {
      [FTP]: { etat: 'non-renseigne' },
      [SFTP]: { etat: 'non-renseigne' },
      [CLE]: { etat: 'non-renseigne' },
    },
    ...surcharge,
  };
}

function secretsDe(
  ftp: StatutSecret,
  sftp: StatutSecret,
  cle: StatutSecret,
): EtatSecrets['secrets'] {
  return { [FTP]: ftp, [SFTP]: sftp, [CLE]: cle };
}

const ETAT_DEV = etatDe({
  source: 'env',
  modifiable: false,
  secrets: secretsDe({ etat: 'env' }, { etat: 'non-renseigne' }, { etat: 'env' }),
});
const ETAT_INSTALLEE = etatDe({
  secrets: secretsDe(
    { etat: 'renseigne', date: '2026-10-02' },
    { etat: 'renseigne', date: '2026-10-02' },
    { etat: 'renseigne', date: '2026-10-03' },
  ),
});

// Rendu statique en environnement node : React insère <!-- --> entre deux nœuds texte adjacents.
// L'apostrophe droite est rendue `&#x27;`.
function rendre(props: Partial<SecretsVueProps> = {}): string {
  return renderToStaticMarkup(
    <SecretsVue
      etat={etatDe()}
      erreurChargement={null}
      deverrouille={false}
      clePrete={null}
      refusCle={null}
      enCours={null}
      retour={null}
      deverrouiller={vi.fn()}
      annuler={vi.fn()}
      choisirCle={vi.fn()}
      enregistrer={vi.fn()}
      {...props}
    />,
  )
    .replaceAll('<!-- -->', '')
    .replaceAll('&#x27;', "'");
}

/** Rendu du formulaire déverrouillé. */
function rendreDeverrouille(props: Partial<SecretsVueProps> = {}): string {
  return rendre({ deverrouille: true, ...props });
}

function compter(html: string, motif: string): number {
  return html.split(motif).length - 1;
}

/** Texte brut du balisage, balises retirées. */
function texte(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

interface Bouton {
  attributs: string;
  contenu: string;
}

function boutons(html: string): Bouton[] {
  return [...html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/g)].map((m) => ({
    attributs: m[1],
    contenu: m[2],
  }));
}

function champs(html: string): string[] {
  return [...html.matchAll(/<input\b([^>]*)>/g)].map((m) => m[1]);
}

function titres(html: string, niveau: 'h2' | 'h3'): string[] {
  return [...html.matchAll(new RegExp(`<${niveau}[^>]*>(.*?)</${niveau}>`, 'g'))].map((m) => m[1]);
}

/** Valeur d'un attribut dans une balise ouvrante, ou `null`. */
function attribut(balise: string, nom: string): string | null {
  const motif = new RegExp(`\\s${nom}="([^"]*)"`, 'i');
  return motif.exec(balise)?.[1] ?? null;
}

/** Espace insécable (U+00A0) avant les deux-points. */
const DESCRIPTION_DEV = 'Mode développement : valeurs lues dans le fichier .env.';
const DESCRIPTION_MODIFIABLE =
  "La modification demande l'identifiant et le mot de passe d'un compte administrateur, dans une fenêtre Windows, au moment d'enregistrer.";

describe('SecretsVue — structure', () => {
  it('affiche le h2 « Secrets techniques » et trois h3 dans l’ordre FTP IGA, SFTP MSP, clé privée', () => {
    const html = rendre();
    expect(titres(html, 'h2')).toEqual(['Secrets techniques']);
    expect(titres(html, 'h3')).toEqual([
      'Mot de passe FTP IGA',
      'Mot de passe SFTP MSP',
      'Clé privée SFTP MSP',
    ]);
  });

  it('garde la même structure une fois le formulaire déverrouillé', () => {
    const html = rendreDeverrouille();
    expect(titres(html, 'h2')).toEqual(['Secrets techniques']);
    expect(titres(html, 'h3')).toHaveLength(3);
  });

  it('relie chaque ligne à son h3 par aria-labelledby', () => {
    const html = rendre();
    const lignes = [...html.matchAll(/<li\b[^>]*aria-labelledby="([^"]+)"/g)].map((m) => m[1]);
    expect(lignes).toHaveLength(3);
    for (const id of lignes) expect(html).toMatch(new RegExp(`<h3[^>]*id="${id}"`));
  });
});

describe('SecretsVue — mode développement (.env)', () => {
  const html = rendre({ etat: ETAT_DEV });

  it('affiche la description avec une espace insécable avant les deux-points', () => {
    expect(html).toContain(`>${DESCRIPTION_DEV}</p>`);
    expect(html).not.toContain(DESCRIPTION_MODIFIABLE);
  });

  it('affiche « Renseigné dans le .env » deux fois et « Non renseigné » une fois', () => {
    expect(compter(html, 'Renseigné dans le .env')).toBe(2);
    expect(compter(html, 'Non renseigné')).toBe(1);
  });

  it('place chaque statut sur le secret correspondant', () => {
    const lignes = [...html.matchAll(/<li\b.*?<\/li>/g)].map((m) => texte(m[0]));
    expect(lignes).toHaveLength(3);
    expect(lignes[0]).toContain('Mot de passe FTP IGA Renseigné dans le .env');
    expect(lignes[1]).toContain('Mot de passe SFTP MSP Non renseigné');
    expect(lignes[2]).toContain('Clé privée SFTP MSP Renseigné dans le .env');
  });

  it('n’affiche ni bouton (« Modifier les secrets » compris), ni champ, ni formulaire, ni alerte', () => {
    expect(html).not.toContain('<button');
    expect(html).not.toContain('Modifier les secrets');
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('role="note"');
  });

  it('n’ouvre pas le formulaire même si « deverrouille » est vrai', () => {
    const deverrouille = rendreDeverrouille({ etat: ETAT_DEV });
    expect(deverrouille).not.toContain('<form');
    expect(deverrouille).not.toContain('<input');
    expect(deverrouille).not.toContain('<button');
  });
});

describe('SecretsVue — application installée, verrouillée, modifiable', () => {
  const html = rendre({ etat: ETAT_INSTALLEE });

  it('affiche la description de la demande d’identifiants administrateur', () => {
    expect(html).toContain(`>${DESCRIPTION_MODIFIABLE}</p>`);
    expect(html).not.toContain('Mode développement');
  });

  it('affiche un seul bouton « Modifier les secrets », actif', () => {
    const tous = boutons(html);
    expect(tous).toHaveLength(1);
    expect(tous[0].contenu).toContain('Modifier les secrets');
    expect(attribut(tous[0].attributs, 'type')).toBe('button');
    expect(tous[0].attributs).not.toContain('disabled=""');
  });

  it('n’affiche aucun champ ni formulaire ni « Enregistrer »', () => {
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('Enregistrer');
    expect(html).not.toContain('Choisir la clé');
  });

  it('affiche la date de chaque secret au format JJ/MM/AAAA', () => {
    expect(compter(html, 'Renseigné le 02/10/2026')).toBe(2);
    expect(compter(html, 'Renseigné le 03/10/2026')).toBe(1);
    expect(html).not.toContain('Non renseigné');
  });

  it('affiche « Renseigné le 02/10/2026 » pour une date 2026-10-02 et « Non renseigné » ailleurs', () => {
    const unSeul = rendre({
      etat: etatDe({
        secrets: secretsDe(
          { etat: 'renseigne', date: '2026-10-02' },
          { etat: 'non-renseigne' },
          { etat: 'non-renseigne' },
        ),
      }),
    });
    expect(compter(unSeul, 'Renseigné le 02/10/2026')).toBe(1);
    expect(compter(unSeul, 'Non renseigné')).toBe(2);
  });

  it('affiche le même bouton quand rien n’est renseigné', () => {
    expect(boutons(rendre())).toHaveLength(1);
  });
});

describe('SecretsVue — non modifiable', () => {
  it('affiche l’anomalie de DPAPI sans bouton ni description', () => {
    const html = rendre({
      etat: etatDe({ modifiable: false, anomalie: 'DPAPI indisponible sur ce poste.' }),
    });
    expect(html).toContain('DPAPI indisponible sur ce poste.');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('Modifier les secrets');
    expect(html).not.toContain(DESCRIPTION_MODIFIABLE);
    expect(html).not.toContain('<form');
  });

  it('affiche l’anomalie d’une lecture en erreur sans bouton', () => {
    const html = rendre({
      etat: etatDe({
        modifiable: false,
        anomalie: "Le fichier des secrets n'a pas pu être lu (EBUSY). Réessayez.",
      }),
    });
    expect(html).toContain("Le fichier des secrets n'a pas pu être lu (EBUSY). Réessayez.");
    expect(html).not.toContain('<button');
  });

  it('ne rend pas le formulaire même déverrouillé', () => {
    const html = rendreDeverrouille({
      etat: etatDe({ modifiable: false, anomalie: 'DPAPI indisponible sur ce poste.' }),
    });
    expect(html).not.toContain('<form');
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<button');
  });

  it('n’affiche ni anomalie ni bouton quand le poste est simplement non modifiable', () => {
    const html = rendre({ etat: etatDe({ modifiable: false }) });
    expect(html).not.toContain('<button');
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('role="note"');
  });

  it('affiche l’anomalie en alerte tout en gardant le bouton quand le poste reste modifiable', () => {
    const html = rendre({
      etat: etatDe({ anomalie: 'Fichier des secrets illisible sur ce poste : il est recréé.' }),
    });
    expect(html).toContain('Fichier des secrets illisible sur ce poste : il est recréé.');
    expect(boutons(html)).toHaveLength(1);
  });
});

describe('SecretsVue — formulaire déverrouillé', () => {
  const html = rendreDeverrouille();

  it('affiche un seul formulaire nommé « Modifier les secrets techniques »', () => {
    const formulaires = [...html.matchAll(/<form\b([^>]*)>/g)].map((m) =>
      attribut(m[1], 'aria-label'),
    );
    expect(formulaires).toEqual(['Modifier les secrets techniques']);
  });

  it('n’affiche plus le bouton « Modifier les secrets »', () => {
    expect(boutons(html).some((b) => b.contenu.includes('Modifier les secrets'))).toBe(false);
  });

  it('affiche deux champs mot de passe sécurisés, reliés à leur libellé et à leur aide', () => {
    const tous = champs(html);
    expect(tous).toHaveLength(2);
    for (const champ of tous) {
      expect(attribut(champ, 'type')).toBe('password');
      expect(attribut(champ, 'autocomplete')).toBe('new-password');
      expect(attribut(champ, 'maxlength')).toBe('256');
      const id = attribut(champ, 'id');
      expect(id).toBeTruthy();
      expect(html).toMatch(new RegExp(`<label[^>]*for="${id}"[^>]*>Nouveau mot de passe</label>`));
      const aideId = attribut(champ, 'aria-describedby');
      expect(aideId).toBeTruthy();
      expect(html).toMatch(
        new RegExp(`<p[^>]*id="${aideId}"[^>]*>Laisser vide pour ne pas changer\\.</p>`),
      );
    }
    expect(compter(html, '>Nouveau mot de passe</label>')).toBe(2);
  });

  it('ne pré-remplit aucun champ', () => {
    for (const champ of champs(html)) expect(attribut(champ, 'value') ?? '').toBe('');
  });

  it('place les champs sous les mots de passe et le choix de clé sous la clé privée', () => {
    const lignes = [...html.matchAll(/<li\b.*?<\/li>/g)].map((m) => m[0]);
    expect(lignes).toHaveLength(3);
    expect(lignes[0]).toContain('<input');
    expect(lignes[1]).toContain('<input');
    expect(lignes[2]).not.toContain('<input');
    expect(lignes[2]).toContain('Choisir la clé…');
  });

  it('affiche « Choisir la clé… » actif, relié à l’aide par aria-describedby', () => {
    const choisir = boutons(html).filter((b) => b.contenu.includes('Choisir la clé…'));
    expect(choisir).toHaveLength(1);
    expect(choisir[0].attributs).not.toContain('disabled=""');
    expect(attribut(choisir[0].attributs, 'type')).toBe('button');
    const aideId = attribut(choisir[0].attributs, 'aria-describedby');
    expect(aideId).toBeTruthy();
    expect(html).toMatch(
      new RegExp(`<p[^>]*id="${aideId}"[^>]*>PPK version 2 ou OpenSSH, sans phrase secrète\\.</p>`),
    );
  });

  it('désactive « Enregistrer » tant que rien n’est rempli et qu’aucune clé n’est prête', () => {
    const enregistrer = boutons(html).filter((b) => b.contenu.includes('Enregistrer'));
    expect(enregistrer).toHaveLength(1);
    expect(attribut(enregistrer[0].attributs, 'type')).toBe('submit');
    expect(enregistrer[0].attributs).toContain('disabled=""');
  });

  it('affiche « Annuler » actif', () => {
    const annuler = boutons(html).filter((b) => b.contenu.includes('Annuler'));
    expect(annuler).toHaveLength(1);
    expect(attribut(annuler[0].attributs, 'type')).toBe('button');
    expect(annuler[0].attributs).not.toContain('disabled=""');
  });

  it('affiche exactement trois boutons : Choisir la clé, Enregistrer, Annuler', () => {
    expect(boutons(html)).toHaveLength(3);
  });

  it('n’affiche ni clé prête ni refus de clé par défaut', () => {
    expect(html).not.toContain('Clé prête');
    expect(html).not.toContain('role="alert"');
  });
});

describe('SecretsVue — clé préparée ou refusée', () => {
  it('affiche « Clé prête (PPK version 2) » et active « Enregistrer »', () => {
    const html = rendreDeverrouille({ clePrete: 'PPK version 2' });
    expect(html).toContain('Clé prête (PPK version 2)');
    const enregistrer = boutons(html).find((b) => b.contenu.includes('Enregistrer'));
    expect(enregistrer).toBeDefined();
    expect(enregistrer?.attributs).not.toContain('disabled=""');
  });

  it('affiche le refus de clé en alerte d’erreur', () => {
    const html = rendreDeverrouille({
      refusCle: 'Clé au format PPK version 3, non prise en charge.',
    });
    expect(compter(html, 'role="alert"')).toBe(1);
    expect(html).toContain('Clé au format PPK version 3, non prise en charge.');
    expect(html).not.toContain('Clé prête');
  });

  it('garde « Enregistrer » désactivé après un refus de clé sans autre changement', () => {
    const html = rendreDeverrouille({ refusCle: 'Refus simulé.' });
    const enregistrer = boutons(html).find((b) => b.contenu.includes('Enregistrer'));
    expect(enregistrer?.attributs).toContain('disabled=""');
  });
});

describe('SecretsVue — action en cours', () => {
  it('contrôle de la clé : « Contrôle de la clé… » avec spinner, tous les boutons désactivés', () => {
    const html = rendreDeverrouille({ enCours: 'cle' });
    const controle = boutons(html).find((b) => b.contenu.includes('Contrôle de la clé…'));
    expect(controle).toBeDefined();
    expect(controle?.contenu).toContain('<svg');
    expect(html).not.toContain('Choisir la clé…');
    expect(html).not.toContain('Enregistrement…');
    for (const bouton of boutons(html)) expect(bouton.attributs).toContain('disabled=""');
    for (const champ of champs(html)) expect(champ).toContain('disabled=""');
  });

  it('enregistrement : « Enregistrement… » avec spinner, champs et boutons désactivés', () => {
    const html = rendreDeverrouille({ enCours: 'enregistrement', clePrete: 'PPK version 2' });
    const enregistrement = boutons(html).find((b) => b.contenu.includes('Enregistrement…'));
    expect(enregistrement).toBeDefined();
    expect(enregistrement?.contenu).toContain('<svg');
    expect(html).not.toContain('Contrôle de la clé…');
    expect(boutons(html)).toHaveLength(3);
    for (const bouton of boutons(html)) expect(bouton.attributs).toContain('disabled=""');
    expect(champs(html)).toHaveLength(2);
    for (const champ of champs(html)) expect(champ).toContain('disabled=""');
  });

  it('n’affiche aucun indicateur d’attente quand rien n’est en cours', () => {
    const html = rendreDeverrouille();
    expect(html).not.toContain('Enregistrement…');
    expect(html).not.toContain('Contrôle de la clé…');
    for (const champ of champs(html)) expect(champ).not.toContain('disabled=""');
  });
});

describe('SecretsVue — retours', () => {
  it('affiche un succès en role="status" avec le message, sans alerte', () => {
    const html = rendre({
      retour: { ton: 'succes', message: 'Secrets enregistrés : Mot de passe FTP IGA.' },
    });
    expect(html).toMatch(/<div\b[^>]*role="status"[^>]*>.*Secrets enregistrés : Mot de passe/);
    expect(compter(html, 'role="status"')).toBe(1);
    expect(html).not.toContain('role="alert"');
  });

  it('affiche une information en role="status" avec le message, sans alerte', () => {
    const html = rendre({
      retour: { ton: 'info', message: 'Enregistrement annulé : fenêtre fermée.' },
    });
    expect(html).toMatch(/<div\b[^>]*role="status"[^>]*>.*Enregistrement annulé/);
    expect(compter(html, 'role="status"')).toBe(1);
    expect(html).not.toContain('role="alert"');
  });

  it('affiche une erreur en role="alert" avec le message', () => {
    const html = rendre({ retour: { ton: 'erreur', message: 'Refus simulé du service.' } });
    expect(compter(html, 'role="alert"')).toBe(1);
    expect(html).toContain('Refus simulé du service.');
    expect(html).not.toContain('role="status"');
  });

  it('affiche le retour aussi quand le formulaire est déverrouillé', () => {
    const html = rendreDeverrouille({ retour: { ton: 'erreur', message: 'Refus simulé.' } });
    expect(compter(html, 'role="alert"')).toBe(1);
    expect(html).toContain('<form');
  });

  it('n’affiche aucun retour quand il n’y en a pas', () => {
    const html = rendre();
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('role="alert"');
  });
});

describe('SecretsVue — chargement', () => {
  it('affiche « Chargement… » tant que l’état est inconnu, sans liste ni titre de secret', () => {
    const html = rendre({ etat: null });
    expect(html).toContain('>Chargement…</p>');
    expect(titres(html, 'h2')).toEqual(['Secrets techniques']);
    expect(titres(html, 'h3')).toEqual([]);
    expect(html).not.toContain('<ul');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('role="alert"');
  });

  it('affiche « Les secrets n’ont pas pu être lus : {cause} » en role="alert" sans « Chargement… »', () => {
    const html = rendre({ etat: null, erreurChargement: 'Canal indisponible (simulé)' });
    expect(compter(html, 'role="alert"')).toBe(1);
    expect(html).toContain("Les secrets n'ont pas pu être lus : Canal indisponible (simulé)");
    expect(html).not.toContain('Chargement…');
    expect(html).not.toContain('<button');
  });
});

describe('SecretsVue — aucune valeur rendue', () => {
  it('ne rend aucun attribut value non vide, verrouillée ou déverrouillée', () => {
    for (const html of [
      rendre({ etat: ETAT_INSTALLEE }),
      rendre({ etat: ETAT_DEV }),
      rendreDeverrouille({ etat: ETAT_INSTALLEE, clePrete: 'PPK version 2' }),
    ]) {
      expect(html).not.toMatch(/\svalue="[^"]+"/);
    }
  });
});
