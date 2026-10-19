import type { ReactNode } from 'react';
import { CircleAlert, FolderOpen } from 'lucide-react';
import { DESIGNATIONS_DOSSIER } from '@shared/schemas/parametres';
import type { ConfigurationPublique, DossierTravail, OrigineValeur } from '@shared/types';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { EnvironmentBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

export interface ParametresVueProps {
  configuration: ConfigurationPublique;
  /** Dossier dont l'ouverture est en cours : les boutons sont désactivés. */
  enCours: DossierTravail | null;
  /** Cause du dernier échec d'ouverture, ou `null`. */
  erreur: string | null;
  onOuvrir: (dossier: DossierTravail) => void;
  /** Section « Secrets techniques », rendue sous la carte « Configuration ». */
  secrets: ReactNode;
}

const LEGENDE_SOUS_DOSSIER = 'Sous-dossier du dossier de travail';

/** « Source : » avec espace insécable avant les deux-points (typographie française). */
const PREFIXE_SOURCE = 'Source :';

function Chemin({ children }: { children: ReactNode }) {
  return <span className="font-mono text-data">{children}</span>;
}

/** Légende « Source : … » d'une valeur. L'espace avant les deux-points est insécable. */
function LegendeSource({ origine, fichier }: { origine: OrigineValeur; fichier: string }) {
  let source: ReactNode;
  if (origine === 'defaut') {
    source = 'valeur par défaut (production)';
  } else if (origine === 'config') {
    source = (
      <>
        config.json · <Chemin>{fichier}</Chemin>
      </>
    );
  } else {
    source = (
      <>
        fichier .env (développement) · <Chemin>{fichier}</Chemin>
      </>
    );
  }
  return (
    <Legende>
      {PREFIXE_SOURCE} {source}
    </Legende>
  );
}

function Legende({ children }: { children: ReactNode }) {
  return <p className="m-0 text-xs text-neutral-600">{children}</p>;
}

/** Cellule de valeur (`dd`) : mêmes styles que la `DataList`. */
function Cellule({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dd
      className={cn(
        'm-0 min-w-0 text-sm tabular-nums text-foreground [overflow-wrap:anywhere]',
        className,
      )}
    >
      {children}
    </dd>
  );
}

interface EntreeProps {
  libelle: string;
  valeur: ReactNode;
  /** Bouton d'action, dans la colonne alignée sur celle des autres entrées. */
  action?: ReactNode;
  /** Légende, sur sa propre ligne sous la valeur. */
  legende?: ReactNode;
}

/**
 * Une entrée de la liste. Elle reprend les trois colonnes de la liste (libellé, valeur, action)
 * par `grid-cols-subgrid` : les boutons de toutes les entrées s'alignent donc dans la même
 * colonne, juste après la valeur la plus longue. La légende, sur la ligne suivante, ne compte pas
 * dans la largeur de la colonne des valeurs.
 */
function Entree({ libelle, valeur, action, legende }: EntreeProps) {
  return (
    <div className="col-span-3 grid grid-cols-subgrid items-center gap-y-1">
      <dt className="text-body-sm leading-5 text-muted-foreground">{libelle}</dt>
      <Cellule className="flex items-center">{valeur}</Cellule>
      {action && <Cellule className="justify-self-start">{action}</Cellule>}
      {legende && <Cellule className="col-span-2 col-start-2 row-start-2">{legende}</Cellule>}
    </div>
  );
}

interface EntreeDossierProps {
  libelle: string;
  dossier: DossierTravail;
  chemin: string;
  legende: ReactNode;
  enCours: DossierTravail | null;
  onOuvrir: (dossier: DossierTravail) => void;
}

function EntreeDossier({
  libelle,
  dossier,
  chemin,
  legende,
  enCours,
  onOuvrir,
}: EntreeDossierProps) {
  return (
    <Entree
      libelle={libelle}
      valeur={<Chemin>{chemin}</Chemin>}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          // Le nom accessible commence par le texte visible (WCAG 2.5.3)
          aria-label={`Ouvrir dans l'Explorateur le dossier ${DESIGNATIONS_DOSSIER[dossier]}`}
          disabled={enCours !== null}
          onClick={() => onOuvrir(dossier)}
        >
          {enCours === dossier ? (
            <Spinner size={16} label={null} />
          ) : (
            <FolderOpen aria-hidden="true" />
          )}
          Ouvrir dans l&apos;Explorateur
        </Button>
      }
      legende={legende}
    />
  );
}

/** Écran Paramètres en lecture seule : mode, dossiers de travail et version, avec leur origine. */
export function ParametresVue({
  configuration,
  enCours,
  erreur,
  onOuvrir,
  secrets,
}: ParametresVueProps) {
  const { mode, dossiers, version, origines } = configuration;
  const sousDossier = <Legende>{LEGENDE_SOUS_DOSSIER}</Legende>;
  const actions = { enCours, onOuvrir };

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-6 px-10 py-8">
      <h1 className="text-2xl font-semibold tracking-heading text-navy-700">Paramètres</h1>

      {erreur && (
        <Alert variant="error">
          <CircleAlert className="size-4" aria-hidden="true" />
          <AlertTitle as="h2">Le dossier n&apos;a pas pu être ouvert</AlertTitle>
          <AlertDescription>{erreur}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-navy-700">Configuration</h2>
        </CardHeader>
        <CardContent>
          <dl className="m-0 grid grid-cols-[max-content_minmax(0,max-content)_1fr] gap-x-6 gap-y-2">
            <Entree
              libelle="Mode"
              valeur={mode === 'recette' ? <EnvironmentBadge /> : 'Production'}
              legende={<LegendeSource origine={origines.mode} fichier={origines.fichier} />}
            />
            <EntreeDossier
              libelle="Dossier de travail"
              dossier="travail"
              chemin={dossiers.travail}
              legende={<LegendeSource origine={origines.travail} fichier={origines.fichier} />}
              {...actions}
            />
            <EntreeDossier
              libelle="IN"
              dossier="in"
              chemin={dossiers.in}
              legende={sousDossier}
              {...actions}
            />
            <EntreeDossier
              libelle="OUT"
              dossier="out"
              chemin={dossiers.out}
              legende={sousDossier}
              {...actions}
            />
            <EntreeDossier
              libelle="Journal"
              dossier="journal"
              chemin={dossiers.journal}
              legende={sousDossier}
              {...actions}
            />
            <Entree libelle="Version" valeur={<Chemin>{version}</Chemin>} />
          </dl>
        </CardContent>
      </Card>

      {secrets}
    </div>
  );
}
