import { FileText, FileWarning } from 'lucide-react';
import type { Provenance } from '@shared/domain/ac056';

import { ToneBadge } from '@/components/ui/status-badge';

/** Type d'un fichier AC056 : « VEOS » (neutre) ou « Rejet » (avertissement). */
export function BadgeType({ provenance }: { provenance: Provenance }) {
  return provenance === 'rejet' ? (
    <ToneBadge tone="warning" icon={FileWarning}>
      Rejet
    </ToneBadge>
  ) : (
    <ToneBadge tone="neutral" icon={FileText}>
      VEOS
    </ToneBadge>
  );
}
