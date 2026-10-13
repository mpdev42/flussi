// Aide aux tests du domaine AC056 : comptage des rattachements des lignes à la hiérarchie.
import type { FichierAc056 } from '@shared/domain/ac056/modele';

/** Indices de `lignes` rattachés à la hiérarchie, avec leur nombre d'occurrences. */
export function compterRattachements(fichier: FichierAc056): number[] {
  const comptes = new Array<number>(fichier.lignes.length).fill(0);
  const compter = (indice: number | null) => {
    if (indice !== null) comptes[indice] = (comptes[indice] ?? 0) + 1;
  };
  compter(fichier.e000);
  for (const dossier of fichier.dossiers) {
    compter(dossier.e001);
    for (const evt of dossier.evenements) {
      compter(evt.e100);
      [evt.e110, evt.e115, evt.e120, evt.e130, evt.e135, evt.e155, evt.e180].forEach(compter);
      evt.e125.forEach(compter);
      for (const benef of evt.beneficiaires) {
        compter(benef.e400);
        [benef.e405, benef.e410, benef.e411, benef.e800].forEach(compter);
        benef.e485.forEach(compter);
        benef.e490.forEach(compter);
        benef.e700.forEach(compter);
      }
      compter(evt.e990);
    }
    compter(dossier.e995);
  }
  compter(fichier.e999);
  return comptes;
}
