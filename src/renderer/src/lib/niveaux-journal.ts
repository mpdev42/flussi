import { CircleAlert, CircleCheck, Heading, Info, type LucideIcon } from 'lucide-react';
import type { NiveauJournal } from '@shared/schemas/journal';

import type { ToneBadgeTone } from '@/components/ui/status-badge';

// Libellés et présentation des niveaux du journal, communs à l'écran Journal (historique) et au
// panneau « Journal de la session » du cadre. Toujours icône + mot : jamais la couleur seule.

export const LIBELLES_NIVEAU: Record<NiveauJournal, string> = {
  TITRE: 'Titre',
  INFO: 'Info',
  SUCCES: 'Succès',
  ERREUR: 'Erreur',
};

export interface PresentationNiveau {
  /** Ton du badge de l'écran Journal. */
  tone: ToneBadgeTone;
  Icone: LucideIcon;
}

export const PRESENTATION_NIVEAU: Record<NiveauJournal, PresentationNiveau> = {
  TITRE: { tone: 'neutral', Icone: Heading },
  INFO: { tone: 'info', Icone: Info },
  SUCCES: { tone: 'success', Icone: CircleCheck },
  ERREUR: { tone: 'error', Icone: CircleAlert },
};
