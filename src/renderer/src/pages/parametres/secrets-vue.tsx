import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, KeyRound, Pencil, TriangleAlert } from 'lucide-react';
import {
  DESIGNATIONS_SECRET,
  LONGUEUR_MAX_MOT_DE_PASSE,
  MOTS_DE_PASSE,
  SECRETS_TECHNIQUES,
} from '@shared/schemas/parametres';
import type {
  EtatSecrets,
  MotDePasseTechnique,
  SecretTechnique,
  StatutSecret,
} from '@shared/types';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ToneBadge } from '@/components/ui/status-badge';
import { useVerrouNavigation } from '@/components/verrou-navigation';
import type { RetourSecrets, Secrets } from '@/hooks/use-secrets';
import { formaterDate } from '@/lib/dates';

import {
  AIDE_CLE,
  AIDE_MOT_DE_PASSE,
  DESCRIPTION_DEV,
  DESCRIPTION_MODIFIABLE,
  LIBELLE_ANNULER,
  LIBELLE_CHOISIR_CLE,
  LIBELLE_CONTROLE_CLE,
  LIBELLE_ENREGISTREMENT,
  LIBELLE_ENREGISTRER,
  LIBELLE_FORMULAIRE,
  LIBELLE_MODIFIER,
  LIBELLE_NOUVEAU_MOT_DE_PASSE,
  MESSAGE_CHARGEMENT,
  NOM_CHAMP_MOT_DE_PASSE,
  PREFIXE_ERREUR_CHARGEMENT,
  STATUT_ENV,
  STATUT_NON_RENSEIGNE,
  TITRE_SECRETS,
  prefixeClePrete,
  prefixeStatutRenseigne,
} from './textes-secrets';

/** Les props de la vue sont l'état et les actions du hook `useSecrets`, tels quels. */
export type SecretsVueProps = Secrets;

const CLASSE_DESCRIPTION = 'm-0 text-sm text-muted-foreground';

type MotsDePasseSaisis = Record<MotDePasseTechnique, string>;

const MOTS_DE_PASSE_VIDES: MotsDePasseSaisis = {
  'iga-ftp-mot-de-passe': '',
  'msp-sftp-mot-de-passe': '',
};

/** Statut d'un secret : icône + mots, jamais la couleur seule, jamais la valeur. */
function StatutBadge({ statut }: { statut: StatutSecret }) {
  if (statut.etat === 'non-renseigne') {
    return (
      <ToneBadge tone="warning" icon={TriangleAlert}>
        {STATUT_NON_RENSEIGNE}
      </ToneBadge>
    );
  }
  return (
    <ToneBadge tone="success" icon={CircleCheck}>
      {statut.etat === 'env' ? STATUT_ENV : prefixeStatutRenseigne(formaterDate(statut.date))}
    </ToneBadge>
  );
}

interface ListeSecretsProps {
  etat: EtatSecrets;
  /** Contrôles de saisie sous le statut d'un secret (formulaire déverrouillé seulement). */
  saisie?: (secret: SecretTechnique) => ReactNode;
}

function LigneSecret({ secret, etat, saisie }: ListeSecretsProps & { secret: SecretTechnique }) {
  const titreId = useId();
  return (
    <li
      aria-labelledby={titreId}
      className="flex flex-col gap-3 border-t py-4 first:border-t-0 first:pt-0 last:pb-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 id={titreId} className="m-0 text-sm font-semibold text-navy-700">
          {DESIGNATIONS_SECRET[secret]}
        </h3>
        <StatutBadge statut={etat.secrets[secret]} />
      </div>
      {saisie?.(secret)}
    </li>
  );
}

function ListeSecrets({ etat, saisie }: ListeSecretsProps) {
  return (
    <ul className="m-0 list-none p-0">
      {SECRETS_TECHNIQUES.map((secret) => (
        <LigneSecret key={secret} secret={secret} etat={etat} saisie={saisie} />
      ))}
    </ul>
  );
}

function RetourAlerte({ retour }: { retour: RetourSecrets }) {
  if (retour.ton === 'succes') {
    return (
      <Alert variant="success" role="status">
        <CircleCheck aria-hidden="true" />
        <AlertDescription>{retour.message}</AlertDescription>
      </Alert>
    );
  }
  if (retour.ton === 'info') {
    return (
      <Alert variant="info" role="status">
        <Info aria-hidden="true" />
        <AlertDescription>{retour.message}</AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant="error">
      <CircleAlert aria-hidden="true" />
      <AlertDescription>{retour.message}</AlertDescription>
    </Alert>
  );
}

type FormulaireProps = Pick<
  Secrets,
  'clePrete' | 'refusCle' | 'enCours' | 'annuler' | 'choisirCle' | 'enregistrer'
> & { etat: EtatSecrets };

/**
 * Seul endroit où la valeur d'un mot de passe existe côté écran : état local des champs, vidé après
 * un enregistrement réussi ou une annulation (sinon l'administrateur corrige sans tout ressaisir).
 */
function FormulaireSecrets({
  etat,
  clePrete,
  refusCle,
  enCours,
  annuler,
  choisirCle,
  enregistrer,
}: FormulaireProps) {
  const aideCleId = useId();
  const [saisies, setSaisies] = useState<MotsDePasseSaisis>(MOTS_DE_PASSE_VIDES);
  const enregistrement = enCours === 'enregistrement';
  const controleCle = enCours === 'cle';
  // L'enregistrement ne doit pas être quitté : la navigation principale reste inactive.
  useVerrouNavigation(enregistrement);
  const auMoinsUnChangement = MOTS_DE_PASSE.some((cle) => saisies[cle] !== '') || clePrete !== null;

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    if (!auMoinsUnChangement || enCours !== null) return;
    if (await enregistrer(saisies)) setSaisies(MOTS_DE_PASSE_VIDES);
  }

  function abandonner() {
    setSaisies(MOTS_DE_PASSE_VIDES);
    annuler();
  }

  return (
    <form
      noValidate
      aria-label={LIBELLE_FORMULAIRE}
      onSubmit={soumettre}
      className="flex flex-col gap-4"
    >
      <ListeSecrets
        etat={etat}
        saisie={(secret) =>
          secret === 'msp-sftp-cle-privee' ? (
            <div className="flex flex-col items-start gap-2">
              <Button
                type="button"
                variant="outline"
                aria-describedby={aideCleId}
                disabled={enCours !== null}
                onClick={choisirCle}
              >
                {controleCle ? <Spinner size={16} label={null} /> : <KeyRound aria-hidden="true" />}
                {controleCle ? LIBELLE_CONTROLE_CLE : LIBELLE_CHOISIR_CLE}
              </Button>
              <p id={aideCleId} className="m-0 text-xs tracking-caption text-muted-foreground">
                {AIDE_CLE}
              </p>
              {clePrete !== null && (
                <ToneBadge tone="success" icon={CircleCheck}>
                  {prefixeClePrete(clePrete)}
                </ToneBadge>
              )}
              {refusCle !== null && (
                <Alert variant="error">
                  <CircleAlert aria-hidden="true" />
                  <AlertDescription>{refusCle}</AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <Field
              label={LIBELLE_NOUVEAU_MOT_DE_PASSE}
              hint={AIDE_MOT_DE_PASSE}
              disabled={enCours !== null}
              className="w-72 max-w-full"
            >
              {(controle) => (
                <Input
                  {...controle}
                  aria-label={NOM_CHAMP_MOT_DE_PASSE[secret]}
                  type="password"
                  autoComplete="new-password"
                  maxLength={LONGUEUR_MAX_MOT_DE_PASSE}
                  value={saisies[secret]}
                  onChange={(evenement) =>
                    setSaisies((precedentes) => ({
                      ...precedentes,
                      [secret]: evenement.target.value,
                    }))
                  }
                />
              )}
            </Field>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!auMoinsUnChangement || enCours !== null}>
          {enregistrement && <Spinner size={16} label={null} />}
          {enregistrement ? LIBELLE_ENREGISTREMENT : LIBELLE_ENREGISTRER}
        </Button>
        <Button type="button" variant="outline" disabled={enCours !== null} onClick={abandonner}>
          {LIBELLE_ANNULER}
        </Button>
      </div>
    </form>
  );
}

function descriptionDe(etat: EtatSecrets): string | null {
  if (etat.source === 'env') return DESCRIPTION_DEV;
  return etat.modifiable ? DESCRIPTION_MODIFIABLE : null;
}

/**
 * Section « Secrets techniques » de l'écran Paramètres : statut des trois secrets et, hors dev,
 * un seul formulaire déverrouillé par « Modifier les secrets » pour tout changer d'un coup.
 * Aucune valeur n'est lue.
 */
export function SecretsVue({
  etat,
  erreurChargement,
  deverrouille,
  clePrete,
  refusCle,
  enCours,
  retour,
  deverrouiller,
  annuler,
  choisirCle,
  enregistrer,
}: SecretsVueProps) {
  const description = etat ? descriptionDe(etat) : null;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-navy-700">{TITRE_SECRETS}</h2>
        {description && <p className={CLASSE_DESCRIPTION}>{description}</p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {erreurChargement !== null && (
          <Alert variant="error">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>
              {PREFIXE_ERREUR_CHARGEMENT} {erreurChargement}
            </AlertDescription>
          </Alert>
        )}

        {erreurChargement === null && etat === null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner label={null} brand />
            <p role="status" className="m-0">
              {MESSAGE_CHARGEMENT}
            </p>
          </div>
        )}

        {etat?.anomalie && (
          <Alert variant="warning">
            <TriangleAlert aria-hidden="true" />
            <AlertDescription>{etat.anomalie}</AlertDescription>
          </Alert>
        )}

        {retour && <RetourAlerte retour={retour} />}

        {etat && etat.modifiable && deverrouille && (
          <FormulaireSecrets
            etat={etat}
            clePrete={clePrete}
            refusCle={refusCle}
            enCours={enCours}
            annuler={annuler}
            choisirCle={choisirCle}
            enregistrer={enregistrer}
          />
        )}

        {etat && !(etat.modifiable && deverrouille) && (
          <>
            <ListeSecrets etat={etat} />
            {etat.modifiable && (
              <div>
                <Button type="button" variant="outline" onClick={deverrouiller}>
                  <Pencil aria-hidden="true" />
                  {LIBELLE_MODIFIER}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
