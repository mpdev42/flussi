// Bilan des messages de rejet MSP de 2026 (`npm run bilan:rejets`, mode Vitest `bilan`) : lit les
// fichiers de rejet du dossier OUT de production et écrit un rapport Markdown masqué dans le
// dossier temporaire du poste.
//
// Données personnelles réelles : aucun message n'est affiché ni comparé par `expect`. La console
// ne reçoit que des nombres et le chemin du rapport ; le rapport ne contient que des messages
// masqués (`masquerMots`), relus par l'utilisateur seul avant tout autre usage. Un fichier
// illisible est cité par son chemin relatif à OUT, jamais par le texte de l'erreur. Les autres
// fichiers ne sont comptés que par extension, les retenus par sous-dossier (chemin du dossier).
// Les noms des sous-dossiers et des fichiers illisibles ne sont pas masqués.
//
// Garde-fou (`verifierLancementBilan`) : refus de s'exécuter hors de `npm run bilan:rejets`
// (`npm test -- --mode bilan`, `npx vitest --mode bilan`), avant toute lecture de P:.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { expect, it } from 'vitest';
import { DOSSIER_TRAVAIL_PROD } from '../../main/adapters/config/resolution';
import { lireAc056, provenanceDepuisNom } from '../domain/ac056';
import {
  ENTITE_INCONNUE,
  NIVEAU_FICHIER,
  anneeRejet,
  compterDoublons,
  ligneDoublons,
  ligneMessagesDistincts,
  regrouperAnomalies,
  regrouperRejets,
  repartir,
  tableauBilan,
  verifierLancementBilan,
  type EntreeAnomalie,
  type EntreeRejet,
  type FichierRetenu,
} from './bilan-rejets';

const ANNEE = 2026;
const DOSSIER_OUT = join(DOSSIER_TRAVAIL_PROD, 'OUT');
/** Lecture de P: (bibliothèque SharePoint synchronisée) : lente, délai de 10 minutes. */
const DELAI = 600_000;

function deuxChiffres(n: number): string {
  return String(n).padStart(2, '0');
}

/** Horodatage du nom du rapport : AAAAMMJJ-HHMMSS (heure locale). */
function horodatage(date: Date): string {
  const jour = `${date.getFullYear()}${deuxChiffres(date.getMonth() + 1)}${deuxChiffres(date.getDate())}`;
  const heure = `${deuxChiffres(date.getHours())}${deuxChiffres(date.getMinutes())}${deuxChiffres(date.getSeconds())}`;
  return `${jour}-${heure}`;
}

/** Libellé du dossier lu lui-même dans la répartition par sous-dossier. */
const RACINE = '(racine)';
const SANS_EXTENSION = '(sans extension)';

/** Fichier vu : dossier relatif à OUT, chemin Windows (`2026`, `2026\03`), `''` pour OUT. */
type FichierVu = FichierRetenu;

interface Inventaire {
  readonly fichiers: FichierVu[];
  readonly sousDossiers: number;
  readonly sousDossiersIllisibles: number;
}

/**
 * Fichiers de OUT et de tous ses sous-dossiers (parcours en profondeur, ordre des noms). OUT
 * inaccessible : erreur avec son chemin. Sous-dossier impossible à lister : compté, non parcouru.
 */
function inventorier(racine: string): Inventaire {
  const fichiers: FichierVu[] = [];
  let sousDossiers = 0;
  let sousDossiersIllisibles = 0;

  const parcourir = (relatif: string): void => {
    let entrees;
    try {
      entrees = readdirSync(join(racine, relatif), { withFileTypes: true });
    } catch {
      if (relatif === '') throw new Error(`Dossier des rejets inaccessible : ${racine}`);
      sousDossiersIllisibles++;
      return;
    }
    for (const entree of entrees.sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (entree.isFile()) fichiers.push({ dossier: relatif, nom: entree.name });
      else if (entree.isDirectory()) {
        sousDossiers++;
        parcourir(join(relatif, entree.name));
      }
    }
  };

  parcourir('');
  return { fichiers, sousDossiers, sousDossiersIllisibles };
}

function estRejetTxt(nom: string): boolean {
  return provenanceDepuisNom(nom) === 'rejet' && extname(nom).toLowerCase() === '.txt';
}

it(
  'bilan des messages de rejet MSP de 2026',
  () => {
    verifierLancementBilan(process.env.npm_lifecycle_event);
    const inventaire = inventorier(DOSSIER_OUT);
    const rejetsTxt = inventaire.fichiers.filter(({ nom }) => estRejetTxt(nom));
    const nonRejets = repartir(
      inventaire.fichiers
        .filter(({ nom }) => !estRejetTxt(nom))
        .map(({ nom }) => extname(nom).toLowerCase() || SANS_EXTENSION),
    );

    let retenusParNom = 0;
    let retenusParModification = 0;
    const retenus: FichierVu[] = [];
    let ecartes = 0;
    const illisibles: string[] = [];
    let lignes = 0;
    let lignesAvecMessage = 0;
    const messages: EntreeRejet[] = [];
    const anomalies: EntreeAnomalie[] = [];

    for (const fichierVu of rejetsTxt) {
      const { dossier, nom: nomFichier } = fichierVu;
      // Chemin relatif à OUT : identifiant du fichier (deux années peuvent avoir le même nom).
      const nom = join(dossier, nomFichier);
      const chemin = join(DOSSIER_OUT, nom);
      try {
        // Date de modification lue en repli seulement : un fichier d'une autre année d'après son
        // nom n'est jamais interrogé, ni compté illisible.
        const { annee, source } = anneeRejet(nomFichier, () => statSync(chemin).mtime);
        if (annee !== ANNEE) {
          ecartes++;
          continue;
        }
        const { fichier, anomalies: anomaliesFichier } = lireAc056(readFileSync(chemin), 'rejet');
        if (source === 'nom') retenusParNom++;
        else retenusParModification++;
        retenus.push(fichierVu);

        const entites = new Map<number, string>();
        for (const ligne of fichier.lignes) {
          const entite = ligne.code ?? ENTITE_INCONNUE;
          entites.set(ligne.numero, entite);
          lignes++;
          if (ligne.rejet === undefined) continue;
          lignesAvecMessage++;
          messages.push({
            fichier: nom,
            entite,
            message: ligne.rejet.message,
            code: ligne.rejet.code,
          });
        }
        for (const anomalie of anomaliesFichier) {
          anomalies.push({
            fichier: nom,
            code: anomalie.code,
            entite:
              anomalie.ligne === null
                ? NIVEAU_FICHIER
                : (entites.get(anomalie.ligne) ?? ENTITE_INCONNUE),
          });
        }
      } catch {
        // Chemin relatif seul : le texte d'une erreur pourrait citer un contenu.
        illisibles.push(nom);
      }
    }

    const groupes = regrouperRejets(messages);
    const doublons = compterDoublons(retenus);
    const groupesAnomalies = regrouperAnomalies(anomalies);
    const maintenant = new Date();
    const rapport = join(tmpdir(), `flussi-bilan-rejets-${horodatage(maintenant)}.md`);
    const document = tableauBilan(
      groupes,
      {
        dossier: DOSSIER_OUT,
        annee: ANNEE,
        sousDossiers: inventaire.sousDossiers,
        sousDossiersIllisibles: inventaire.sousDossiersIllisibles,
        fichiersVus: inventaire.fichiers.length,
        nonRejets,
        retenusParSousDossier: repartir(retenus.map(({ dossier }) => dossier || RACINE)),
        retenusParNom,
        retenusParModification,
        doublons,
        ecartes,
        illisibles,
        lignes,
        lignesAvecMessage,
        anomalies: groupesAnomalies,
      },
      maintenant,
    );
    writeFileSync(rapport, document, 'utf8');

    console.log(
      [
        `Sous-dossiers parcourus : ${inventaire.sousDossiers} (${inventaire.sousDossiersIllisibles} impossibles à lister)`,
        `Fichiers vus : ${inventaire.fichiers.length}, dont ${inventaire.fichiers.length - rejetsTxt.length} écartés (pas un rejet .txt)`,
        `Fichiers de rejet ${ANNEE} retenus : ${retenusParNom + retenusParModification} (${retenusParNom} par le nom, ${retenusParModification} par la date de modification)`,
        ligneDoublons(doublons),
        `Fichiers écartés (autre année) : ${ecartes}`,
        `Fichiers illisibles : ${illisibles.length}`,
        `Lignes lues : ${lignes}, dont ${lignesAvecMessage} avec un message MSP`,
        ligneMessagesDistincts(groupes),
        `Anomalies de lecture : ${anomalies.length} (${groupesAnomalies.length} couples anomalie-entité)`,
        `Rapport : ${rapport}`,
      ].join('\n'),
    );

    // Contrôle sans valeur : au moins un fichier retenu, sinon le bilan est vide.
    expect(retenusParNom + retenusParModification).toBeGreaterThan(0);
  },
  DELAI,
);
