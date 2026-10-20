// Parité des fiches de l'écran avec la fiche Lazarus `fmain.lfm` (copie conforme, UTF-8, CRLF),
// sans corpus : le fichier ne contient que l'écran (libellés, listes, tailles), aucune donnée
// personnelle.
//
// Pour chaque fiche, l'onglet `tsEntiteNNN` est lu et comparé à `FICHES` et à `ENTITES` :
// - contrôles de saisie (`TEdit`, `TComboBox`, `TDateTimePicker`) ↔ champs `affiche` de l'entité,
//   par la table explicite `CONTROLES_LFM` (nom du contrôle → `entité:champ` Flussi) ;
// - type du contrôle ↔ type du champ (`TEdit` texte, `TComboBox` liste, `TDateTimePicker` date) ;
// - ordre vertical (`Top`) ↔ `FICHES[code].champs` ;
// - `Caption` du `TLabel` associé ↔ `libelle`, hors `CORRECTIONS_LIBELLES` ;
// - `MaxLength` ↔ `maxLength` ; `Items.Strings` ↔ `valeursAutorisees` (format `CODE - Libellé`,
//   ordre et doublons d'origine compris) ; présence d'un `OnExit` ↔ `modifiable` ;
// - `Caption` de `lblNNNTitre` ↔ `FICHES[code].titre` (700 et 411 : pas de titre dans Lazarus).
//
// Règle d'association d'un libellé : le `TLabel` de l'onglet qui a le même `Top` que le contrôle
// et qui est entièrement à sa gauche (`Left + Width <= Left` du contrôle). Il doit être unique.
// Les noms ne suffisent pas (`lbl400CodeDepartementTarifaire` / `cbb400DepartementTarifaire`,
// `lbl115RangPersonne` / `edt115RangPesonne`). Les étiquettes d'erreur (`lblNNNErreurValeur`…)
// sont à droite de la colonne des libellés, au même `Left` que les contrôles : jamais retenues.
import { describe, expect, it } from 'vitest';
import {
  lireLfm,
  proprieteChaine,
  proprieteChaines,
  proprieteNombre,
  trouverObjet,
  type ObjetLfm,
} from '@shared/test/source-lazarus';
import { CODES_FICHE, ENTITES, FICHES, type CodeFiche, type DescriptionChamp } from './index';

/** Contrôle Lazarus → `entité:champ` Flussi (d'après les affectations `.Text`, `.Date` et `SetComboIndex` de `fmain.pas`, 1912-2286). */
const CONTROLES_LFM: Readonly<Record<string, `${CodeFiche}:${string}`>> = {
  // 100 (fmain.pas:1912-1926)
  cbb100TypeContrat: '100:typeContrat',
  edt100NumContratIndiv: '100:numContratIndiv',
  edt100NumContratColl: '100:numContratCollectif',
  edt100CodeGroupeAssures: '100:codeGroupeAssures',
  edt100CodeEntiteRatt: '100:codeEntiteRattachement',
  dtp100DateEffetActe: '100:dateEffetActe',
  dtp100DateEffetCotisation: '100:dateEffetCotisation',
  dtp100DateVente: '100:dateVente',
  dtp100DateDemande: '100:dateDemande',
  edt100CodeOffre: '100:codeOffre',
  edt100CodeReseau: '100:codeReseau',
  edt100EcheancePrinc: '100:echPrinc',
  edt100GroupeGestion: '100:groupeGestion',
  edt100CentreGestion: '100:centreGestion',
  cbb100CodeContexte: '100:codeContexte',
  // 110 (fmain.pas:1943-1944)
  dtp110DateEffetPremSouscr: '110:dateEffet',
  dtp110DateAncienneteContrat: '110:ancienContrat',
  // 115 (fmain.pas:1964-1968)
  edt115RangPesonne: '115:rangPersonne',
  cbb115CodeCivilite: '115:codeCivilite',
  edt115Nom: '115:nom',
  edt115Prenom: '115:prenom1',
  edt115Insee: '115:numInsee',
  // 120 (fmain.pas:1994-2004)
  edt120ComplementGeo: '120:complementGeographique',
  edt120NumeroVoie: '120:numeroVoie',
  cbb120CodeBtq: '120:codeBtq',
  cbb120CodeNatureVoie: '120:codeNatureVoie',
  edt120LibelleVoie: '120:libelleVoie',
  edt120LieuDit: '120:lieuDit',
  edt120CodePostal: '120:codePostalLocalite',
  edt120LibelleLocalite: '120:libelleLocalite',
  cbb120CodeDepartement: '120:codeDepartement',
  cbb120CodePays: '120:codePays',
  cbb120CodeTypeAdresse: '120:codeTypeAdresse',
  // 125 (fmain.pas:2022-2024)
  cbb125Type: '125:codeTypeCoordonnee',
  cbb125Nature: '125:codeNatureCommunication',
  edt125Valeur: '125:valeurCoordonneeCommunication',
  // 130 (fmain.pas:2046-2052)
  edt130CodeBanque: '130:codeBanque',
  edt130CodeGuichet: '130:codeGuichet',
  edt130NumeroCompte: '130:numeroCompte',
  edt130CleCompte: '130:cleControle',
  edt130Titulaire: '130:titulaireCompte',
  cbb130Pays: '130:codePays',
  cbb130Devise: '130:codeDevise',
  // 135, 155, 180 (fmain.pas:2068, 2085-2086, 2103-2104)
  edt135RangPesonne: '135:rangPersonne',
  edt155RangPesonne: '155:rangPersonne',
  dtp155DateDebutPrelevement: '155:debutPrelevement',
  edt180RangPesonne: '180:rangPersonne',
  cbb180ModePaiement: '180:modePaiement',
  // 400 (fmain.pas:2131-2142)
  dtp400DateAncienneteAssure: '400:dateAnciennete',
  edt400RangBeneficiaire: '400:rang',
  edt400RangPersonne: '400:rangPersonne',
  cbb400TypeAssure: '400:typeAssure',
  cbb400CodePaysTarifaire: '400:codePays',
  cbb400DepartementTarifaire: '400:codeDepartement',
  cbb400SituationFamille: '400:situationFamille',
  cbb400CodeSexe: '400:codeSexe',
  dtp400DateNaissance: '400:dateNaissance',
  cbb400CategorieSociale: '400:categorieSociale',
  edt400CodeInsee: '400:codeInsee',
  edt400CleInsee: '400:cleInsee',
  // 405 (fmain.pas:2163-2168)
  edt405RangBeneficiaire: '405:rang',
  cbb405CodeCivilite: '405:codeCivilite',
  edt405Nom: '405:nom',
  edt405Prenom: '405:prenom1',
  edt405NumeroInsee: '405:numInsee',
  edt405NomJeuneFille: '405:nomJeuneFille',
  // 410 (fmain.pas:2191-2198)
  edt410RangBeneficiaire: '410:rang',
  dtp410DateNaissance: '410:dateNaissance',
  edt410RangNaissance: '410:rangNaissance',
  edt410NumeroRo: '410:numeroRo',
  edt410CleRo: '410:cleRo',
  edt410CodeGrandRegime: '410:codeGrandRegime',
  edt410CodeCaisse: '410:codeCaisseRo',
  edt410CodeCentrePaiement: '410:codeCentrePaiement',
  // 485, 490 (fmain.pas:2216-2218, 2233-2235)
  edt485RangBeneficiaire: '485:rang',
  edt485Code: '485:code',
  edt485Valeur: '485:valeur',
  edt490RangBeneficiaire: '490:rang',
  edt490Code: '490:code',
  edt490Valeur: '490:valeur',
  // 700 (fmain.pas:2257-2266)
  edt700RangBeneficiaire: '700:rang',
  edt700CodeAssureur: '700:codeAssureur',
  edt700CodeProduit: '700:codeProduit',
  edt700CodeGarantie: '700:codeGarantie',
  edt700CodeConditionVente: '700:codeConditionVente',
  dtp700DateAncienneteGarantie: '700:ancienneteGarantieSouscr',
  edt700DerogerDateStage: '700:appliquerStageCv',
  dtp700DateFinStage: '700:dateFinStage1',
  edt700CodeStage: '700:codeStage1',
  edt700TypeGarantie: '700:typeGarantieAssemblee',
  // 800 (fmain.pas:2284-2286)
  edt800RangBeneficiaire: '800:rang',
  edt800RangPersonne: '800:rangPersonne',
  edt800ReferenceExterne: '800:refExterne',
};

/** Libellés Flussi qui diffèrent du `Caption` de Lazarus (décision 7 de l'item 2 de la v0.3.0). */
const CORRECTIONS_LIBELLES: Readonly<
  Record<string, { readonly caption: string; readonly libelle: string; readonly raison: string }>
> = {
  '100:codeOffre': {
    caption: "Code l'offre",
    libelle: "Code de l'offre",
    raison: 'coquille de Lazarus (mot manquant)',
  },
  '100:echPrinc': {
    caption: 'Echéance principale',
    libelle: 'Échéance principale',
    raison: 'majuscule accentuée, comme « Évènement »',
  },
  '115:codeCivilite': {
    caption: 'Code Civilité',
    libelle: 'Code civilité',
    raison: 'majuscule fautive (les autres libellés n’ont de majuscule qu’au premier mot)',
  },
  '485:valeur': {
    caption: 'Code assureur',
    libelle: 'Valeur',
    raison: 'copier-coller fautif du libellé de la 700 : le champ est la valeur du critère',
  },
  '490:valeur': {
    caption: 'Code assureur',
    libelle: 'Valeur',
    raison: 'copier-coller fautif du libellé de la 700 : le champ est la valeur de la variable',
  },
};

/** Fiches sans titre dans Lazarus (pas de `lblNNNTitre`). */
const SANS_TITRE_LAZARUS: readonly CodeFiche[] = ['411', '700'];

const TYPES_CONTROLE = ['TEdit', 'TComboBox', 'TDateTimePicker'] as const;
type TypeControle = (typeof TYPES_CONTROLE)[number];

const RACINE = lireLfm();

/** Onglet Lazarus de la fiche. */
const onglet = (code: CodeFiche): ObjetLfm => trouverObjet(RACINE, `tsEntite${code}`);

const estControle = (objet: ObjetLfm): boolean =>
  (TYPES_CONTROLE as readonly string[]).includes(objet.type);

/** Contrôles de saisie de l'onglet, du haut vers le bas (`Top`, puis `Left`). */
function controles(code: CodeFiche): ObjetLfm[] {
  return onglet(code)
    .enfants.filter(estControle)
    .sort((a, b) => nombre(a, 'Top') - nombre(b, 'Top') || nombre(a, 'Left') - nombre(b, 'Left'));
}

function nombre(objet: ObjetLfm, propriete: string): number {
  const valeur = proprieteNombre(objet, propriete);
  if (valeur === undefined) throw new Error(`${objet.nom} : ${propriete} absent`);
  return valeur;
}

/** `TLabel` associé à un contrôle (règle en tête de fichier), ou une erreur explicite. */
function etiquette(code: CodeFiche, controle: ObjetLfm): ObjetLfm {
  const candidats = onglet(code).enfants.filter(
    (objet) =>
      objet.type === 'TLabel' &&
      nombre(objet, 'Top') === nombre(controle, 'Top') &&
      nombre(objet, 'Left') + nombre(objet, 'Width') <= nombre(controle, 'Left'),
  );
  if (candidats.length !== 1) {
    throw new Error(`${controle.nom} : ${candidats.length} libellé(s) associé(s), 1 attendu`);
  }
  return candidats[0]!;
}

/** `Caption` sans le « : » final ni les espaces de fin. */
const sansDeuxPoints = (caption: string): string => caption.replace(/\s*:?\s*$/, '');

function champ(cle: string): DescriptionChamp {
  const [code, nom] = cle.split(':') as [CodeFiche, string];
  const trouve = ENTITES[code].champs.find((c) => c.nom === nom);
  if (trouve === undefined) throw new Error(`${cle} : champ inconnu`);
  return trouve;
}

function cleDe(controle: ObjetLfm): string {
  const cle = CONTROLES_LFM[controle.nom];
  if (cle === undefined) throw new Error(`${controle.nom} : contrôle absent de CONTROLES_LFM`);
  return cle;
}

function typeAttendu(c: DescriptionChamp): TypeControle {
  if (c.type === 'date') return 'TDateTimePicker';
  return c.valeursAutorisees === undefined ? 'TEdit' : 'TComboBox';
}

/** Une entrée de liste au format de `Items.Strings` (l'entrée vide reste vide). */
const enTexte = (v: { code: string; libelle: string }): string =>
  v.code === '' && v.libelle === '' ? '' : `${v.code} - ${v.libelle}`;

describe('Analyse de fmain.lfm', () => {
  it('trouve les 17 onglets de fiche', () => {
    expect(CODES_FICHE).toHaveLength(17);
    for (const code of CODES_FICHE) expect(onglet(code).type).toBe('TTabSheet');
  });

  it('trouve les 93 contrôles de saisie, tous dans CONTROLES_LFM', () => {
    const tous = CODES_FICHE.flatMap((code) => controles(code).map((c) => c.nom));
    expect(tous).toHaveLength(93);
    expect([...tous].sort()).toEqual(Object.keys(CONTROLES_LFM).sort());
  });

  it('lit les chaînes : apostrophe doublée et caractère non ASCII', () => {
    const groupe = trouverObjet(RACINE, 'lbl100CodeGroupeAssures');
    expect(proprieteChaine(groupe, 'Caption')).toBe("Groupe d'assurés :");
    expect(proprieteChaine(trouverObjet(RACINE, 'lbl400Titre'), 'Caption')).toBe(
      'Identification de l’assuré',
    );
  });

  it('lit les listes Items.Strings, entrée vide comprise', () => {
    const items = proprieteChaines(trouverObjet(RACINE, 'cbb400SituationFamille'), 'Items.Strings');
    expect(items?.[0]).toBe('');
    expect(items?.length).toBe(8);
  });

  it('ne laisse aucun contrôle de saisie hors des onglets de fiche', () => {
    const dansFiches = new Set(CODES_FICHE.flatMap((code) => controles(code).map((c) => c.nom)));
    const pile: ObjetLfm[] = [RACINE];
    const hors: string[] = [];
    while (pile.length > 0) {
      const objet = pile.pop()!;
      if (estControle(objet) && !dansFiches.has(objet.nom)) hors.push(objet.nom);
      pile.push(...objet.enfants);
    }
    expect(hors).toEqual([]);
  });
});

describe.each(CODES_FICHE.map((code) => [code] as const))('Fiche %s', (code) => {
  it('a pour contrôles exactement les champs affichés de l’entité', () => {
    const obtenu = controles(code).map((c) => cleDe(c).split(':')[1]);
    const attendu = ENTITES[code].champs.filter((c) => c.affiche).map((c) => c.nom);
    expect(controles(code).every((c) => cleDe(c).startsWith(`${code}:`))).toBe(true);
    expect([...obtenu].sort()).toEqual([...attendu].sort());
  });

  it('range ses champs dans l’ordre vertical de l’écran Lazarus', () => {
    expect(controles(code).map((c) => cleDe(c).split(':')[1])).toEqual(FICHES[code].champs);
  });

  it('a le titre de la fiche Lazarus', () => {
    if (SANS_TITRE_LAZARUS.includes(code)) {
      expect(onglet(code).enfants.some((o) => o.nom === `lbl${code}Titre`)).toBe(false);
      return;
    }
    expect(FICHES[code].titre).toBe(
      proprieteChaine(trouverObjet(RACINE, `lbl${code}Titre`), 'Caption'),
    );
  });

  it('reprend type, libellé, MaxLength, liste et OnExit de chaque contrôle', () => {
    const ecarts: string[] = [];
    for (const controle of controles(code)) {
      const cle = cleDe(controle);
      const c = champ(cle);
      const ecart = (quoi: string, attendu: unknown, obtenu: unknown) => {
        if (JSON.stringify(attendu) !== JSON.stringify(obtenu)) {
          ecarts.push(
            `${controle.nom} (${cle}) : ${quoi} Lazarus ${JSON.stringify(attendu)}, Flussi ${JSON.stringify(obtenu)}`,
          );
        }
      };

      ecart('type', controle.type, typeAttendu(c));

      const caption = sansDeuxPoints(proprieteChaine(etiquette(code, controle), 'Caption') ?? '');
      const correction = CORRECTIONS_LIBELLES[cle];
      if (correction === undefined) {
        ecart('libellé', caption, c.libelle);
      } else {
        ecart('libellé corrigé (Caption)', correction.caption, caption);
        ecart('libellé corrigé', correction.libelle, c.libelle);
      }

      ecart('MaxLength', proprieteNombre(controle, 'MaxLength'), c.maxLength);
      const items = proprieteChaines(controle, 'Items.Strings');
      const valeurs = c.valeursAutorisees?.map(enTexte);
      if (items === undefined || valeurs === undefined) {
        ecart('présence de Items', items !== undefined, valeurs !== undefined);
      } else {
        // Première entrée différente seulement : les listes longues comptent jusqu'à 239 entrées.
        const i = items.findIndex((item, n) => item !== valeurs[n]);
        if (i >= 0 || items.length !== valeurs.length) {
          const n = i >= 0 ? i : Math.min(items.length, valeurs.length);
          ecarts.push(
            `${controle.nom} (${cle}) : Items, ${items.length} entrées Lazarus, ${valeurs.length} Flussi ; ` +
              `entrée ${n + 1} Lazarus ${JSON.stringify(items[n])}, Flussi ${JSON.stringify(valeurs[n])}`,
          );
        }
      }
      ecart('OnExit', controle.proprietes.has('OnExit'), c.modifiable);
    }
    expect(ecarts).toEqual([]);
  });
});

describe('Corrections des libellés', () => {
  it('ne porte que sur des contrôles connus', () => {
    const connues = new Set(Object.values(CONTROLES_LFM));
    const inconnues = Object.keys(CORRECTIONS_LIBELLES).filter(
      (cle) => !connues.has(cle as `${CodeFiche}:${string}`),
    );
    expect(inconnues).toEqual([]);
  });

  it('donne une raison à chaque correction', () => {
    for (const correction of Object.values(CORRECTIONS_LIBELLES)) {
      expect(correction.raison.length).toBeGreaterThan(0);
      expect(correction.libelle).not.toBe(correction.caption);
    }
  });
});
