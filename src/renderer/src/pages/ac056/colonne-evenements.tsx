import { memo, useId, useState } from 'react';
import { CircleAlert, FileText, User, UserX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CountBadge } from '@/components/ui/status-badge';
import { pluralize } from '@/lib/pluralize';
import { cn } from '@/lib/utils';

import { TAILLE_TRANCHE } from './format-ac056';
import {
  libelleBeneficiaire,
  type ResumeBeneficiaire,
  type ResumeEvenement,
} from './resumes-ac056';
import { LIGNE_SELECTIONNABLE, etatLigne } from './styles-navigation';
import { LIBELLE_BENEFICIAIRE_ABSENT } from './textes-ac056';

/** Icône, N° dossier, N° évènement, N° contrat (passe à la ligne), code évènement, compteur. */
const GRILLE_EVENEMENT =
  'grid grid-cols-[1rem_4.25rem_1.75rem_minmax(0,1fr)_1.75rem_1.5rem] items-center gap-2 px-2';

/** Icône, lien, rang, nom et prénom (une ligne, tronquée), compteur. */
const GRILLE_BENEFICIAIRE =
  'grid grid-cols-[1rem_3.5rem_1.5rem_minmax(0,1fr)_1.5rem] items-center gap-2 px-2';

const MOT_EVENEMENT: [string, string] = ['évènement', 'évènements'];

interface LigneEvenementProps {
  position: number;
  resume: ResumeEvenement;
  compteur: number;
  noun: [string, string];
  selectionne: boolean;
  onChoisir: (position: number) => void;
}

/** Une ligne de la liste des évènements (mémorisée : seules les lignes qui changent se re-rendent). */
const LigneEvenement = memo(function LigneEvenement({
  position,
  resume,
  compteur,
  noun,
  selectionne,
  onChoisir,
}: LigneEvenementProps) {
  const enErreur = compteur > 0;
  const Icone = enErreur ? CircleAlert : FileText;
  return (
    <button
      type="button"
      aria-current={selectionne || undefined}
      onClick={() => onChoisir(position)}
      className={cn(
        LIGNE_SELECTIONNABLE,
        etatLigne(selectionne, enErreur),
        GRILLE_EVENEMENT,
        'min-h-8 py-1 font-mono text-data tabular-nums',
      )}
    >
      <Icone
        className="pointer-events-none shrink-0"
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span>
        <span className="sr-only">Dossier </span>
        {resume.dossier}
      </span>
      <span>
        <span className="sr-only">Évènement </span>
        {resume.numEvt}
      </span>
      <span className="break-all">
        <span className="sr-only">Contrat </span>
        {resume.contrat}
      </span>
      <span>
        <span className="sr-only">Code </span>
        {resume.codeEvt}
      </span>
      <span className="pointer-events-none justify-self-end">
        <CountBadge count={compteur} noun={noun} />
      </span>
    </button>
  );
});

interface LigneBeneficiaireProps {
  position: number;
  resume: ResumeBeneficiaire;
  compteur: number;
  noun: [string, string];
  selectionne: boolean;
  onChoisir: (position: number) => void;
}

const LigneBeneficiaire = memo(function LigneBeneficiaire({
  position,
  resume,
  compteur,
  noun,
  selectionne,
  onChoisir,
}: LigneBeneficiaireProps) {
  if (resume.implicite) {
    // Bénéficiaire implicite d'un rejet : atténué même avec des lignes rejetées (le compteur, lui,
    // reste rouge), sélectionnable pour atteindre ses garanties
    return (
      <button
        type="button"
        aria-current={selectionne || undefined}
        onClick={() => onChoisir(position)}
        className={cn(
          LIGNE_SELECTIONNABLE,
          etatLigne(selectionne, false),
          GRILLE_BENEFICIAIRE,
          'min-h-8 py-1 text-sm text-neutral-600',
        )}
      >
        <UserX
          className="pointer-events-none shrink-0"
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span className="col-span-3 min-w-0 truncate">{LIBELLE_BENEFICIAIRE_ABSENT}</span>
        <span className="pointer-events-none justify-self-end">
          <CountBadge count={compteur} noun={noun} />
        </span>
      </button>
    );
  }
  const enErreur = compteur > 0;
  const Icone = enErreur ? CircleAlert : User;
  return (
    <button
      type="button"
      aria-current={selectionne || undefined}
      onClick={() => onChoisir(position)}
      className={cn(
        LIGNE_SELECTIONNABLE,
        etatLigne(selectionne, enErreur),
        GRILLE_BENEFICIAIRE,
        'min-h-8 py-1 text-sm',
      )}
    >
      <Icone
        className="pointer-events-none shrink-0"
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="font-mono text-data">{resume.lien}</span>
      <span className="font-mono text-data tabular-nums">{resume.rang}</span>
      {/* Une seule ligne, tronquée : le nom est modifiable, sa longueur ne doit pas changer la hauteur de la liste */}
      <span className="min-w-0 truncate" title={libelleBeneficiaire(resume)}>
        {libelleBeneficiaire(resume)}
      </span>
      <span className="pointer-events-none justify-self-end">
        <CountBadge count={compteur} noun={noun} />
      </span>
    </button>
  );
});

export interface ColonneEvenementsProps {
  /** Un résumé par évènement, dans l'ordre du fichier. */
  evenements: readonly ResumeEvenement[];
  /** Erreurs bloquantes (ou lignes rejetées) de chaque évènement (`CompteursAc056.parEvenement`). */
  compteurs: readonly number[];
  /** Nom accessible des compteurs : « erreur » pour un fichier VEOS, « ligne rejetée » pour un rejet. */
  noun: [string, string];
  selection: number;
  onChoisir: (evenement: number) => void;
  /** Bénéficiaires de l'évènement sélectionné, sous sa ligne ; null : liste masquée. */
  beneficiaires: {
    resumes: readonly ResumeBeneficiaire[];
    /** Erreurs bloquantes (ou lignes rejetées) de chaque bénéficiaire. */
    compteurs: readonly number[];
    selection: number;
    onChoisir: (beneficiaire: number) => void;
  } | null;
}

/**
 * Colonne de gauche : liste des évènements (N° dossier, N° évènement, N° contrat, code), par tranches
 * de `TAILLE_TRANCHE`, et sous l'évènement sélectionné la liste de ses bénéficiaires quand l'onglet
 * Bénéficiaires est actif. Pas de défilement horizontal : le n° de contrat passe à la ligne.
 */
export function ColonneEvenements({
  evenements,
  compteurs,
  noun,
  selection,
  onChoisir,
  beneficiaires,
}: ColonneEvenementsProps) {
  const titreId = useId();
  const [affiches, setAffiches] = useState(TAILLE_TRANCHE);
  // Jusqu'à l'évènement sélectionné au moins (ouverture sur une erreur, saut depuis une liste)
  const nombre = Math.min(evenements.length, Math.max(affiches, selection + 1));
  const total = evenements.length;

  return (
    <section
      aria-labelledby={titreId}
      className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card"
    >
      <div className="flex shrink-0 flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-border px-4 py-3">
        <h2 id={titreId} className="m-0 text-base font-semibold text-navy-700">
          Évènements
        </h2>
        <span className="text-xs tracking-caption text-neutral-600">
          {total} {pluralize(total, MOT_EVENEMENT[0], MOT_EVENEMENT[1])}
        </span>
      </div>
      <div
        aria-hidden="true"
        className={cn(
          GRILLE_EVENEMENT,
          'shrink-0 border-b border-border bg-muted py-2 pl-3.5 pr-3 text-xs font-medium text-neutral-600',
        )}
      >
        <span />
        <span>Dossier</span>
        <span>N°</span>
        <span>Contrat</span>
        <span>Code</span>
        <span />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-fin">
        <ul className="m-0 list-none p-1">
          {evenements.slice(0, nombre).map((resume, position) => (
            <li key={position}>
              <LigneEvenement
                position={position}
                resume={resume}
                compteur={compteurs[position] ?? 0}
                noun={noun}
                selectionne={position === selection}
                onChoisir={onChoisir}
              />
              {position === selection && beneficiaires && (
                <ListeBeneficiaires {...beneficiaires} noun={noun} />
              )}
            </li>
          ))}
        </ul>
        {total > nombre && (
          <div className="flex items-center justify-center gap-3 border-t border-border px-4 py-3">
            <span className="text-xs tabular-nums text-neutral-600">
              {nombre} sur {total}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAffiches(nombre + TAILLE_TRANCHE)}
            >
              Afficher les évènements suivants
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function ListeBeneficiaires({
  resumes,
  compteurs,
  noun,
  selection,
  onChoisir,
}: NonNullable<ColonneEvenementsProps['beneficiaires']> & Pick<ColonneEvenementsProps, 'noun'>) {
  const titreId = useId();
  return (
    <div className="pb-2 pl-4 pt-1">
      <h3 id={titreId} className="m-0 px-2 py-1 text-xs font-medium text-neutral-600">
        Bénéficiaires
      </h3>
      <div
        aria-hidden="true"
        className={cn(GRILLE_BENEFICIAIRE, 'pb-1 pl-2.5 text-xs font-medium text-neutral-600')}
      >
        <span />
        <span>Lien</span>
        <span>Rang</span>
        <span>Nom et prénom</span>
        <span />
      </div>
      <ul aria-labelledby={titreId} className="m-0 list-none p-0">
        {resumes.map((resume, position) => (
          <li key={position}>
            <LigneBeneficiaire
              position={position}
              resume={resume}
              compteur={compteurs[position] ?? 0}
              noun={noun}
              selectionne={position === selection}
              onChoisir={onChoisir}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
