// Contrôle pur d'une clé privée SFTP avant import : format reconnu, sans phrase secrète. Seul
// l'en-tête est analysé (ssh2 n'est ajouté qu'en v0.5.0). Aucun message ne cite le contenu du fichier.

/** Au-delà, ce n'est pas une clé privée. */
export const TAILLE_MAX_CLE_PRIVEE = 64 * 1024;

export type FormatClePrivee = 'ppk-v2' | 'openssh' | 'pem';

export type RefusClePrivee =
  | 'ppk-v3'
  | 'phrase-secrete'
  | 'type-ppk'
  | 'pkcs8'
  | 'cle-publique'
  | 'trop-volumineux'
  | 'non-reconnu';

export type AnalyseClePrivee =
  /** `texte` : texte décodé, BOM retiré, sinon inchangé (fins de ligne conservées). */
  | { ok: true; format: FormatClePrivee; texte: string }
  | { ok: false; refus: RefusClePrivee; message: string };

export const LIBELLES_FORMAT_CLE: Record<FormatClePrivee, string> = {
  'ppk-v2': 'PPK version 2',
  openssh: 'OpenSSH',
  pem: 'PEM (OpenSSH, ancien format)',
};

const SUITE_PUTTYGEN = 'Exportez-la au format OpenSSH avec PuTTYgen (menu Conversions).';

export const MESSAGES_REFUS_CLE: Record<Exclude<RefusClePrivee, 'type-ppk'>, string> = {
  'ppk-v3':
    'Clé au format PPK version 3, non prise en charge. Convertissez-la en version 2 avec PuTTYgen.',
  'phrase-secrete': 'Clé protégée par une phrase secrète, non prise en charge.',
  pkcs8: `Clé au format PKCS#8, non prise en charge. ${SUITE_PUTTYGEN}`,
  'cle-publique': 'Ce fichier contient une clé publique. Choisissez le fichier de la clé privée.',
  'trop-volumineux': 'Fichier trop volumineux pour une clé privée (plus de 64 Ko).',
  'non-reconnu':
    'Fichier non reconnu comme clé privée. Formats acceptés : PPK version 2 ou OpenSSH, sans phrase secrète.',
};

/** Le type vient du fichier : il n'est repris dans le message que s'il a la forme d'un type de clé. */
export function messageTypePpk(type: string): string {
  const affiche = /^[a-z0-9@.-]{1,40}$/.test(type) ? type : 'inconnu';
  return `Clé PPK de type ${affiche}, non prise en charge. ${SUITE_PUTTYGEN}`;
}

function refus(motif: Exclude<RefusClePrivee, 'type-ppk'>): AnalyseClePrivee {
  return { ok: false, refus: motif, message: MESSAGES_REFUS_CLE[motif] };
}

const TYPES_PPK_ACCEPTES = ['ssh-rsa', 'ssh-dss'];
const EN_TETE_PPK = /^PuTTY-User-Key-File-(\d+):\s*(.*)$/;
const CHIFFREMENT_PPK = /^Encryption:\s*(.*)$/;
const EN_TETE_PEM = /^-----BEGIN (RSA|DSA|EC) PRIVATE KEY-----$/;
const CORPS_BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const CLE_PUBLIQUE_OPENSSH =
  /^(ssh-[a-z0-9-]+|ecdsa-sha2-[a-z0-9-]+|sk-[a-z0-9@.-]+)\s+[A-Za-z0-9+/]+={0,2}(\s|$)/;
const CLE_PUBLIQUE_PEM = /^-----BEGIN (RSA )?PUBLIC KEY-----$/;
const CLE_PUBLIQUE_SSH2 = '---- BEGIN SSH2 PUBLIC KEY ----';

const MAGIE_OPENSSH = Buffer.from('openssh-key-v1\0', 'latin1');
/** Magie (15 octets), puis la longueur uint32 du nom du chiffrement. */
const DEBUT_NOM_CHIFFREMENT_OPENSSH = MAGIE_OPENSSH.length + 4;

function analyserPpk(lignes: string[], enTete: RegExpMatchArray, texte: string): AnalyseClePrivee {
  const version = enTete[1];
  if (version === '3') return refus('ppk-v3');
  if (version !== '2') return refus('non-reconnu');

  // La ligne qui suit l'en-tête (hors lignes vides) doit être « Encryption: »
  const index = lignes.findIndex((ligne) => ligne.trim() !== '');
  const suivante = lignes.slice(index + 1).find((ligne) => ligne.trim() !== '');
  const chiffrement = suivante === undefined ? null : CHIFFREMENT_PPK.exec(suivante.trim());
  if (chiffrement === null) return refus('non-reconnu');

  // Le type est contrôlé avant le chiffrement
  const type = (enTete[2] ?? '').trim();
  if (!TYPES_PPK_ACCEPTES.includes(type)) {
    return { ok: false, refus: 'type-ppk', message: messageTypePpk(type) };
  }
  if ((chiffrement[1] ?? '').trim() !== 'none') return refus('phrase-secrete');
  if (!lignes.some((ligne) => ligne.startsWith('Private-MAC:'))) return refus('non-reconnu');

  return { ok: true, format: 'ppk-v2', texte };
}

function analyserOpenssh(lignes: string[], texte: string): AnalyseClePrivee {
  const debut = lignes.findIndex((ligne) => ligne.trim() === '-----BEGIN OPENSSH PRIVATE KEY-----');
  const fin = lignes.findIndex(
    (ligne, i) => i > debut && ligne.trim() === '-----END OPENSSH PRIVATE KEY-----',
  );
  if (fin === -1) return refus('non-reconnu');

  const corps = lignes
    .slice(debut + 1, fin)
    .map((ligne) => ligne.trim())
    .join('');
  if (!CORPS_BASE64.test(corps) || corps.length % 4 !== 0) return refus('non-reconnu');

  const octets = Buffer.from(corps, 'base64');
  if (octets.length < DEBUT_NOM_CHIFFREMENT_OPENSSH) return refus('non-reconnu');
  if (!octets.subarray(0, MAGIE_OPENSSH.length).equals(MAGIE_OPENSSH)) return refus('non-reconnu');

  const longueur = octets.readUInt32BE(MAGIE_OPENSSH.length);
  const finNom = DEBUT_NOM_CHIFFREMENT_OPENSSH + longueur;
  if (finNom > octets.length) return refus('non-reconnu');

  const chiffrement = octets.toString('ascii', DEBUT_NOM_CHIFFREMENT_OPENSSH, finNom);
  return chiffrement === 'none' ? { ok: true, format: 'openssh', texte } : refus('phrase-secrete');
}

function analyserPem(lignes: string[], type: string, texte: string): AnalyseClePrivee {
  const fin = `-----END ${type} PRIVATE KEY-----`;
  if (!lignes.some((ligne) => ligne.trim() === fin)) return refus('non-reconnu');

  const chiffree = lignes.some(
    (ligne) => ligne.startsWith('Proc-Type: 4,ENCRYPTED') || ligne.startsWith('DEK-Info:'),
  );
  return chiffree ? refus('phrase-secrete') : { ok: true, format: 'pem', texte };
}

function estClePublique(enTete: string): boolean {
  return (
    CLE_PUBLIQUE_OPENSSH.test(enTete) ||
    enTete === CLE_PUBLIQUE_SSH2 ||
    CLE_PUBLIQUE_PEM.test(enTete)
  );
}

/** Analyse le contenu d'un fichier de clé privée. Pure, ne lève jamais. */
export function analyserClePrivee(octets: Uint8Array): AnalyseClePrivee {
  if (octets.length === 0) return refus('non-reconnu');
  if (octets.length > TAILLE_MAX_CLE_PRIVEE) return refus('trop-volumineux');

  let decode: string;
  try {
    decode = new TextDecoder('utf-8', { fatal: true }).decode(octets);
  } catch {
    return refus('non-reconnu');
  }
  if (decode.includes('\0')) return refus('non-reconnu');
  const texte = decode.startsWith('﻿') ? decode.slice(1) : decode;

  const lignes = texte.split(/\r?\n/).map((ligne) => ligne.trimEnd());
  const premiere = lignes.find((ligne) => ligne.trim() !== '');
  if (premiere === undefined) return refus('non-reconnu');
  const enTete = premiere.trim();

  const ppk = EN_TETE_PPK.exec(enTete);
  if (ppk) return analyserPpk(lignes, ppk, texte);

  if (enTete === '-----BEGIN OPENSSH PRIVATE KEY-----') return analyserOpenssh(lignes, texte);

  const pem = EN_TETE_PEM.exec(enTete);
  if (pem?.[1]) return analyserPem(lignes, pem[1], texte);

  if (enTete === '-----BEGIN ENCRYPTED PRIVATE KEY-----') return refus('phrase-secrete');
  if (enTete === '-----BEGIN PRIVATE KEY-----') return refus('pkcs8');
  if (estClePublique(enTete)) return refus('cle-publique');

  return refus('non-reconnu');
}
