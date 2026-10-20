import { useRef, useState, type ChangeEvent, type FocusEvent } from 'react';
import type { AnomalieAc056, CibleChamp, DescriptionChamp, Octets } from '@shared/domain/ac056';

import { Field } from '@/components/ui/field';
import { TextInput } from '@/components/ui/text-input';
import type { ErreurSaisie } from '@/hooks/use-fichier-ac056';

import {
  champModifiable,
  messageChamp,
  presentationChamp,
  texteChampAffiche,
} from './presentation-champ';
import { useSortieChamp } from './sortie-champ';

export interface ChampAc056Props {
  champ: DescriptionChamp;
  /** Numéro de ligne d'origine : désigne le champ pour la saisie. */
  ligne: number;
  /** Valeur de la ligne, en octets. */
  valeur: Octets;
  /** Anomalies bloquantes de ce champ (celles de la ligne dont `champ` est le nom du champ). */
  anomalies: readonly AnomalieAc056[];
  /** Champ déjà corrigé pendant la session : il reste modifiable (décision 3). */
  corrige: boolean;
  /** Faux si le fichier a une anomalie de structure : tout est en lecture seule (décision 4). */
  fichierModifiable: boolean;
  /** Applique la saisie ; renvoie l'erreur du domaine si elle est refusée. */
  onSaisir: (cible: CibleChamp, texte: string) => ErreurSaisie | null;
}

/**
 * Un champ d'une fiche : libellé, valeur et, sous le champ, ce qui ne va pas (DESIGN.md §9.2 :
 * bordure rouge, icône, message, `aria-invalid`). Lecture seule, sauf un champ modifiable en erreur
 * ou déjà corrigé. La saisie reste locale jusqu'à la sortie du champ : elle n'est appliquée que si
 * l'utilisateur a frappé (parité `Modified` de Lazarus), même si le texte final est inchangé. Un
 * refus du domaine garde le texte saisi et s'affiche sous le champ. Listes et dates sont affichées
 * comme du texte, en lecture seule.
 */
export function ChampAc056({
  champ,
  ligne,
  valeur,
  anomalies,
  corrige,
  fichierModifiable,
  onSaisir,
}: ChampAc056Props) {
  const { mono, largeurCaracteres } = presentationChamp(champ);
  const affiche = texteChampAffiche(champ, valeur);
  const modifiable = champModifiable(champ, anomalies, corrige, fichierModifiable);

  const [texte, setTexte] = useState(affiche);
  const [afficheVu, setAfficheVu] = useState(affiche);
  const [refus, setRefus] = useState<string | null>(null);
  const frappe = useRef(false);
  const sortir = useSortieChamp();

  // La valeur de la ligne a changé (saisie appliquée) : le texte local se recale dessus
  if (affiche !== afficheVu) {
    setAfficheVu(affiche);
    setTexte(affiche);
  }

  function surChangement(evenement: ChangeEvent<HTMLInputElement>) {
    frappe.current = true;
    setTexte(evenement.target.value);
  }

  function surSortie(evenement: FocusEvent<HTMLInputElement>) {
    if (!frappe.current) return;
    frappe.current = false;
    const cible = { ligne, champ: champ.nom };
    const saisi = evenement.currentTarget.value;
    // À la souris, la saisie attend le relâchement du bouton (voir `sortie-champ.ts`)
    sortir(() => {
      const erreur = onSaisir(cible, saisi);
      setRefus(erreur?.message ?? null);
    });
  }

  const message = refus ?? messageChamp(anomalies, champ.modifiable && !fichierModifiable);

  return (
    <Field label={champ.libelle ?? champ.nom} error={message}>
      {(controle) =>
        modifiable ? (
          <TextInput
            {...controle}
            mono={mono}
            largeurCaracteres={largeurCaracteres}
            maxLength={champ.maxLength ?? champ.longueur}
            value={texte}
            onChange={surChangement}
            onBlur={surSortie}
          />
        ) : (
          <TextInput
            {...controle}
            readOnly
            mono={mono}
            largeurCaracteres={largeurCaracteres}
            value={affiche}
          />
        )
      }
    </Field>
  );
}
