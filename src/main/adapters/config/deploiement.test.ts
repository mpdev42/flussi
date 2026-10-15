import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resoudreConfiguration } from './resolution';

// Garde des paquets de configuration Intune (deploiement/intune/*/config.json) : une faute de
// frappe dans une clé serait sinon découverte au démarrage du poste (refus de démarrer).
// Ces fichiers ne contiennent ni secret ni donnée AC056.

const DOSSIER_PAQUETS = fileURLToPath(new URL('../../../../deploiement/intune', import.meta.url));

const paquets = readdirSync(DOSSIER_PAQUETS, { withFileTypes: true })
  .filter((entree) => entree.isDirectory())
  .map((entree) => entree.name);

// Même enchaînement que chargerInstallee (lecture.ts) : BOM retiré, JSON.parse, objet attendu.
function resoudrePaquet(nom: string) {
  const fichier = join(DOSSIER_PAQUETS, nom, 'config.json');
  const contenu: unknown = JSON.parse(readFileSync(fichier, 'utf8').replace(/^﻿/, ''));
  if (typeof contenu !== 'object' || contenu === null || Array.isArray(contenu)) {
    throw new Error(`${fichier} : un objet JSON de clés à plat est attendu.`);
  }
  return resoudreConfiguration({
    contexte: 'installee',
    fichier,
    valeursFichier: contenu as Record<string, unknown>,
  });
}

describe('paquets de configuration Intune', () => {
  it('au moins un paquet est présent', () => {
    expect(paquets).toContain('config-recette');
  });

  it.each(paquets)('%s : la configuration se résout en contexte installée', (nom) => {
    const resultat = resoudrePaquet(nom);
    if (!resultat.ok) {
      throw new Error(`refus : ${JSON.stringify(resultat.erreurs)}`);
    }
  });

  it('config-recette : le mode résolu est recette', () => {
    const resultat = resoudrePaquet('config-recette');
    if (!resultat.ok) throw new Error(`refus : ${JSON.stringify(resultat.erreurs)}`);
    expect(resultat.configuration.mode).toEqual('recette');
  });
});
