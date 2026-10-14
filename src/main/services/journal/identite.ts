import { hostname, userInfo } from 'node:os';

/** Compte Windows de la session : `userInfo`, puis `USERNAME`, puis `inconnu`. */
export function lireCompteWindows(): string {
  try {
    const nom = userInfo().username;
    if (nom) return nom;
  } catch {
    // userInfo échoue si le compte n'a pas d'entrée résolue : repli sur l'environnement
  }
  return process.env.USERNAME || 'inconnu';
}

/** Nom du poste (`inconnu` si l'appel échoue). */
export function lirePoste(): string {
  try {
    return hostname() || 'inconnu';
  } catch {
    return 'inconnu';
  }
}
