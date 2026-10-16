import {
  LIBELLES_FORMAT_CLE,
  MESSAGES_REFUS_CLE,
  analyserClePrivee,
  type FormatClePrivee,
} from '../../adapters/config/cle-privee';
import type { CoffreSecrets, EcritureSecrets, LectureFichierCle } from '../../adapters/config';
import { DESIGNATIONS_SECRET, SECRETS_TECHNIQUES } from '@shared/schemas/parametres';
import type {
  DemandeEnregistrementSecrets,
  EtatSecrets,
  ResultatPreparationCle,
  ResultatSecret,
  SecretTechnique,
  StatutSecret,
} from '@shared/types';
import type { SessionEcriture } from '../journal';

// Service des secrets techniques : saisis dans Paramètres, chiffrés par DPAPI au niveau de la
// machine, puis écrits dans `%ProgramData%\Flussi` par Flussi relancé en administrateur (une invite
// UAC). Aucune
// valeur de secret, aucun contenu ni chemin de clé dans une réponse, un message d'erreur ou le
// journal : seulement des statuts, des désignations et des messages fixes.

export interface DependancesSecrets {
  /** Présence des secrets dans le .env (dev) : booléens, jamais les valeurs. */
  presenceEnv: Record<SecretTechnique, boolean>;
  /** null en dev : secrets.bin n'est jamais lu ni écrit en dev (garde-fou structurel). */
  coffre: CoffreSecrets | null;
  /** Sélecteur natif ouvert par le main ; null si annulé. Le chemin ne vient jamais de l'écran. */
  choisirFichierCle: () => Promise<string | null>;
  lireFichierCle: (chemin: string) => Promise<LectureFichierCle>;
  journal: Pick<SessionEcriture, 'ajouter'>;
  maintenant: () => Date;
}

export interface ServiceSecrets {
  /** Ne lève jamais pour un état attendu (fichier absent, illisible). */
  etat(): Promise<EtatSecrets>;
  /** Ouvre le sélecteur, lit et contrôle la clé, la garde en mémoire jusqu'à l'enregistrement ou l'abandon. */
  preparerCle(): Promise<ResultatPreparationCle>;
  /** Oublie la clé préparée (bouton « Annuler » de l'écran). */
  abandonnerCle(): void;
  /** Un seul enregistrement, donc une seule invite UAC, pour tous les changements. */
  enregistrer(demande: DemandeEnregistrementSecrets): Promise<ResultatSecret>;
}

const MESSAGE_DEV =
  'Les secrets ne sont pas modifiables en développement : ils sont lus dans le fichier .env.';

const MESSAGE_FICHIER_ILLISIBLE_JOURNAL =
  'Fichier des secrets illisible sur ce poste : il est recréé, les autres secrets sont à saisir de nouveau.';

const MESSAGE_CLE_NON_CHOISIE = "Aucune clé choisie : choisissez d'abord le fichier de la clé.";

const MESSAGE_AUCUN_CHANGEMENT = 'Aucun changement à enregistrer.';

const messageDpapiIndisponible = (cause: string): string =>
  `Le chiffrement Windows (DPAPI) n'est pas disponible : les secrets ne peuvent être ni lus ni enregistrés. Contactez le service informatique. Détail : ${cause}`;

const messageLectureEchouee = (code: string): string =>
  `Le fichier des secrets n'a pas pu être lu (${code}). Réessayez.`;

const messageFichierIllisible = (fichier: string, cause: string): string =>
  `Le fichier des secrets (${fichier}) ne peut pas être déchiffré sur ce poste : il a été copié depuis un autre poste ou il est endommagé. Les secrets sont à saisir de nouveau par un administrateur. Détail : ${cause}`;

function messageEcritureEchouee(
  echec: Exclude<EcritureSecrets, { ok: true } | { raison: 'annule' }>,
  dossier: string,
): string {
  switch (echec.raison) {
    case 'chiffrement':
      return `Le chiffrement Windows (DPAPI) a échoué : ${echec.detail}.`;
    case 'elevation':
      return `L'écriture du fichier des secrets dans ${dossier} a échoué (${echec.detail}).`;
    case 'verification':
      return `Le fichier des secrets n'a pas été mis à jour dans ${dossier} (${echec.detail}). Réessayez.`;
  }
}

/** Date locale du poste, AAAA-MM-JJ, d'une date ISO stockée. */
function dateLocale(iso: string): string {
  const date = new Date(iso);
  const deux = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}`;
}

function secretsUniformes(statut: StatutSecret): Record<SecretTechnique, StatutSecret> {
  return {
    'iga-ftp-mot-de-passe': statut,
    'msp-sftp-mot-de-passe': statut,
    'msp-sftp-cle-privee': statut,
  };
}

/** Clé privée contrôlée, gardée en mémoire dans le main entre sa préparation et l'enregistrement. */
interface ClePreparee {
  texte: string;
  format: FormatClePrivee;
}

export function creerServiceSecrets(dependances: DependancesSecrets): ServiceSecrets {
  const { presenceEnv, coffre, choisirFichierCle, lireFichierCle, journal, maintenant } =
    dependances;

  let clePreparee: ClePreparee | null = null;

  /** File des écritures : jamais deux séquences lecture-modification-écriture entrelacées. */
  let file: Promise<unknown> = Promise.resolve();
  function enFile<T>(tache: () => Promise<T>): Promise<T> {
    const resultat = file.then(tache, tache);
    file = resultat.catch(() => undefined);
    return resultat;
  }

  async function etat(): Promise<EtatSecrets> {
    if (coffre === null) {
      const secrets = {} as Record<SecretTechnique, StatutSecret>;
      for (const secret of SECRETS_TECHNIQUES) {
        secrets[secret] = presenceEnv[secret] ? { etat: 'env' } : { etat: 'non-renseigne' };
      }
      return { source: 'env', modifiable: false, anomalie: null, secrets };
    }

    const vides = secretsUniformes({ etat: 'non-renseigne' });

    const indisponibilite = coffre.indisponibilite();
    if (indisponibilite !== null) {
      return {
        source: 'secrets-bin',
        modifiable: false,
        anomalie: messageDpapiIndisponible(indisponibilite),
        secrets: vides,
      };
    }

    const lecture = await coffre.lire();
    if (lecture.etat === 'erreur') {
      return {
        source: 'secrets-bin',
        modifiable: false,
        anomalie: messageLectureEchouee(lecture.code),
        secrets: vides,
      };
    }

    if (lecture.etat === 'illisible') {
      return {
        source: 'secrets-bin',
        modifiable: true,
        anomalie: messageFichierIllisible(coffre.fichier, lecture.cause),
        secrets: vides,
      };
    }

    const secrets = secretsUniformes({ etat: 'non-renseigne' });
    if (lecture.etat === 'lisible') {
      for (const secret of SECRETS_TECHNIQUES) {
        const present = Object.hasOwn(lecture.secrets, secret)
          ? lecture.secrets[secret]
          : undefined;
        if (present) secrets[secret] = { etat: 'renseigne', date: dateLocale(present.date) };
      }
    }
    return { source: 'secrets-bin', modifiable: true, anomalie: null, secrets };
  }

  async function preparerCle(): Promise<ResultatPreparationCle> {
    if (coffre === null) return { statut: 'refuse', message: MESSAGE_DEV };

    const chemin = await choisirFichierCle();
    if (chemin === null) return { statut: 'annule' };

    const fichier = await lireFichierCle(chemin);
    if (!fichier.ok) {
      return {
        statut: 'refuse',
        message:
          'refus' in fichier
            ? MESSAGES_REFUS_CLE['trop-volumineux']
            : `Le fichier de clé n'a pas pu être lu (${fichier.code}).`,
      };
    }

    const analyse = analyserClePrivee(fichier.octets);
    if (!analyse.ok) {
      void journal.ajouter(
        'ERREUR',
        `Secret refusé : ${DESIGNATIONS_SECRET['msp-sftp-cle-privee']}. ${analyse.message}`,
      );
      return { statut: 'refuse', message: analyse.message };
    }

    clePreparee = { texte: analyse.texte, format: analyse.format };
    return { statut: 'preparee', format: LIBELLES_FORMAT_CLE[analyse.format] };
  }

  /** Désignations, dans l'ordre de `SECRETS_TECHNIQUES`, des secrets que la demande modifie. */
  function designationsDemandees(demande: DemandeEnregistrementSecrets): string {
    return SECRETS_TECHNIQUES.filter((secret) =>
      secret === 'msp-sftp-cle-privee' ? demande.cle : demande.motsDePasse[secret] !== undefined,
    )
      .map((secret) => DESIGNATIONS_SECRET[secret])
      .join(', ');
  }

  function refuserEtTracer(demande: DemandeEnregistrementSecrets, message: string): ResultatSecret {
    void journal.ajouter(
      'ERREUR',
      `Secrets non enregistrés : ${designationsDemandees(demande)}. ${message}`,
    );
    return { statut: 'refuse', message };
  }

  function enregistrer(demande: DemandeEnregistrementSecrets): Promise<ResultatSecret> {
    return enFile(async () => {
      if (coffre === null) return { statut: 'refuse', message: MESSAGE_DEV };

      const indisponibilite = coffre.indisponibilite();
      if (indisponibilite !== null) {
        return refuserEtTracer(demande, messageDpapiIndisponible(indisponibilite));
      }

      // Changements : mots de passe présents, clé préparée si demandée
      const cle = demande.cle ? clePreparee : null;
      if (demande.cle && cle === null) {
        return { statut: 'refuse', message: MESSAGE_CLE_NON_CHOISIE };
      }
      const valeurs = new Map<SecretTechnique, { valeur: string; suffixe: string }>();
      for (const secret of SECRETS_TECHNIQUES) {
        if (secret === 'msp-sftp-cle-privee') {
          if (cle !== null) {
            valeurs.set(secret, {
              valeur: cle.texte,
              suffixe: ` (${LIBELLES_FORMAT_CLE[cle.format]})`,
            });
          }
        } else {
          const motDePasse = demande.motsDePasse[secret];
          if (motDePasse !== undefined) valeurs.set(secret, { valeur: motDePasse, suffixe: '' });
        }
      }
      if (valeurs.size === 0) return { statut: 'refuse', message: MESSAGE_AUCUN_CHANGEMENT };

      const lecture = await coffre.lire();
      if (lecture.etat === 'erreur') {
        return refuserEtTracer(demande, messageLectureEchouee(lecture.code));
      }
      if (lecture.etat === 'illisible') {
        void journal.ajouter('INFO', MESSAGE_FICHIER_ILLISIBLE_JOURNAL);
      }
      // Fichier absent ou illisible : on repart de zéro. Sinon, les autres secrets (et les
      // identifiants inconnus d'une version plus récente) sont conservés.
      const existants = lecture.etat === 'lisible' ? lecture.secrets : {};

      const date = maintenant().toISOString();
      const fusion = { ...existants };
      for (const [secret, { valeur }] of valeurs) fusion[secret] = { valeur, date };

      const ecriture = await coffre.ecrire(fusion);
      if (!ecriture.ok) {
        // Invite UAC fermée ou refusée : rien au journal, la clé préparée est conservée
        if (ecriture.raison === 'annule') return { statut: 'annule' };
        return refuserEtTracer(demande, messageEcritureEchouee(ecriture, coffre.dossier));
      }

      for (const [secret, { suffixe }] of valeurs) {
        const verbe = Object.hasOwn(existants, secret) ? 'Secret remplacé' : 'Secret renseigné';
        void journal.ajouter('SUCCES', `${verbe} : ${DESIGNATIONS_SECRET[secret]}${suffixe}`);
      }
      clePreparee = null;
      return { statut: 'enregistre', etat: await etat() };
    });
  }

  return {
    etat,
    preparerCle,
    abandonnerCle() {
      clePreparee = null;
    },
    enregistrer,
  };
}
