import { describe, expect, it } from 'vitest';
import {
  LIBELLES_FORMAT_CLE,
  MESSAGES_REFUS_CLE,
  TAILLE_MAX_CLE_PRIVEE,
  analyserClePrivee,
  messageTypePpk,
  type AnalyseClePrivee,
  type RefusClePrivee,
} from './cle-privee';

// Données fictives uniquement : aucune vraie clé, tout est fabriqué ici.
const TEMOIN = 'TEMOIN-SECRET-42';

const encoder = new TextEncoder();
const octets = (texte: string) => encoder.encode(texte);
const analyser = (texte: string) => analyserClePrivee(octets(texte));

function refusDe(analyse: AnalyseClePrivee): RefusClePrivee {
  if (analyse.ok) throw new Error(`acceptation inattendue : ${analyse.format}`);
  return analyse.refus;
}

function messageDe(analyse: AnalyseClePrivee): string {
  if (analyse.ok) throw new Error('acceptation inattendue');
  return analyse.message;
}

/** Corps OpenSSH synthétique : préfixe, longueur gros-boutiste, chiffrement, octets quelconques. */
function corpsOpenssh(
  chiffrement: string,
  options: { prefixe?: string; longueur?: number; reste?: Buffer } = {},
): Buffer {
  const nom = Buffer.from(chiffrement, 'latin1');
  const longueur = Buffer.alloc(4);
  longueur.writeUInt32BE(options.longueur ?? nom.length);
  return Buffer.concat([
    Buffer.from(options.prefixe ?? 'openssh-key-v1\0', 'latin1'),
    longueur,
    nom,
    options.reste ?? Buffer.from(TEMOIN, 'latin1'),
  ]);
}

function enveloppeOpenssh(corps: Buffer, eol = '\n'): string {
  const base64 = corps.toString('base64');
  const lignes = base64.match(/.{1,70}/g) ?? [];
  return [
    '-----BEGIN OPENSSH PRIVATE KEY-----',
    ...lignes,
    '-----END OPENSSH PRIVATE KEY-----',
    '',
  ].join(eol);
}

const opensshNone = () => enveloppeOpenssh(corpsOpenssh('none'));

function ppkV2(options: { type?: string; chiffrement?: string; mac?: boolean } = {}): string {
  const { type = 'ssh-rsa', chiffrement = 'none', mac = true } = options;
  return [
    `PuTTY-User-Key-File-2: ${type}`,
    `Encryption: ${chiffrement}`,
    `Comment: ${TEMOIN}`,
    'Public-Lines: 2',
    'AAAAB3NzaC1yc2EAAAADAQAB',
    'AAAAgQC3',
    'Private-Lines: 1',
    'AAAAgBvUc3',
    ...(mac ? ['Private-MAC: 00112233445566778899aabbccddeeff00112233'] : []),
    '',
  ].join('\n');
}

const pem = (type: string, entetes: string[] = []) =>
  [
    `-----BEGIN ${type} PRIVATE KEY-----`,
    ...entetes,
    'MIIBFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE',
    'AAAAFAKE',
    `-----END ${type} PRIVATE KEY-----`,
    '',
  ].join('\n');

describe('constantes et libellés', () => {
  it('limite la taille à 64 Ko', () => {
    expect(TAILLE_MAX_CLE_PRIVEE).toBe(65536);
  });

  it('fournit un libellé par format accepté', () => {
    expect(LIBELLES_FORMAT_CLE).toEqual({
      'ppk-v2': 'PPK version 2',
      openssh: 'OpenSSH',
      pem: 'PEM (OpenSSH, ancien format)',
    });
  });

  it('fournit les messages de refus exacts', () => {
    expect(MESSAGES_REFUS_CLE).toEqual({
      'ppk-v3':
        'Clé au format PPK version 3, non prise en charge. Convertissez-la en version 2 avec PuTTYgen.',
      'phrase-secrete': 'Clé protégée par une phrase secrète, non prise en charge.',
      pkcs8:
        'Clé au format PKCS#8, non prise en charge. Exportez-la au format OpenSSH avec PuTTYgen (menu Conversions).',
      'cle-publique':
        'Ce fichier contient une clé publique. Choisissez le fichier de la clé privée.',
      'trop-volumineux': 'Fichier trop volumineux pour une clé privée (plus de 64 Ko).',
      'non-reconnu':
        'Fichier non reconnu comme clé privée. Formats acceptés : PPK version 2 ou OpenSSH, sans phrase secrète.',
    });
  });
});

describe('messageTypePpk', () => {
  it('insère le type conforme au motif', () => {
    expect(messageTypePpk('ssh-ed25519')).toBe(
      'Clé PPK de type ssh-ed25519, non prise en charge. Exportez-la au format OpenSSH avec PuTTYgen (menu Conversions).',
    );
  });

  it('accepte les caractères @ . - et chiffres', () => {
    expect(messageTypePpk('sk-ssh-ed25519@openssh.com')).toContain(
      'de type sk-ssh-ed25519@openssh.com,',
    );
  });

  it('remplace par inconnu un type hors motif contenant la valeur témoin', () => {
    const message = messageTypePpk(TEMOIN);
    expect(message).toContain('de type inconnu,');
    expect(message).not.toContain(TEMOIN);
  });

  it('remplace par inconnu un type vide ou trop long', () => {
    expect(messageTypePpk('')).toContain('de type inconnu,');
    expect(messageTypePpk('a'.repeat(41))).toContain('de type inconnu,');
    expect(messageTypePpk('a'.repeat(40))).toContain(`de type ${'a'.repeat(40)},`);
  });

  it('remplace par inconnu un type avec espace ou retour à la ligne', () => {
    expect(messageTypePpk('ssh rsa')).toContain('de type inconnu,');
    expect(messageTypePpk('ssh-rsa\nPrivate')).toContain('de type inconnu,');
  });
});

describe('analyserClePrivee — taille et décodage', () => {
  it('refuse un fichier vide comme non reconnu', () => {
    const analyse = analyserClePrivee(new Uint8Array(0));
    expect(refusDe(analyse)).toBe('non-reconnu');
    expect(messageDe(analyse)).toBe(MESSAGES_REFUS_CLE['non-reconnu']);
  });

  it('refuse plus de 64 Ko comme trop volumineux', () => {
    const analyse = analyserClePrivee(new Uint8Array(TAILLE_MAX_CLE_PRIVEE + 1).fill(97));
    expect(refusDe(analyse)).toBe('trop-volumineux');
    expect(messageDe(analyse)).toBe(MESSAGES_REFUS_CLE['trop-volumineux']);
  });

  it('contrôle la taille avant le décodage', () => {
    const analyse = analyserClePrivee(new Uint8Array(TAILLE_MAX_CLE_PRIVEE + 1));
    expect(refusDe(analyse)).toBe('trop-volumineux');
  });

  it('ne refuse pas pour la taille un fichier de exactement 64 Ko', () => {
    const analyse = analyserClePrivee(new Uint8Array(TAILLE_MAX_CLE_PRIVEE).fill(97));
    expect(refusDe(analyse)).toBe('non-reconnu');
  });

  it('refuse des octets qui ne sont pas de l UTF-8 valide (binaire)', () => {
    const analyse = analyserClePrivee(Uint8Array.from([0xff, 0xfe, 0xfd, 0x80, 0x81]));
    expect(refusDe(analyse)).toBe('non-reconnu');
  });

  it('refuse un texte valide contenant un caractère nul', () => {
    const analyse = analyser(`${opensshNone()}\0`);
    expect(refusDe(analyse)).toBe('non-reconnu');
  });

  it('refuse un texte quelconque', () => {
    const analyse = analyser('Bonjour, ceci n est pas une clé.\nDeuxième ligne.\n');
    expect(refusDe(analyse)).toBe('non-reconnu');
    expect(messageDe(analyse)).toBe(MESSAGES_REFUS_CLE['non-reconnu']);
  });

  it('refuse un texte fait uniquement de lignes vides', () => {
    expect(refusDe(analyser('\n\n  \r\n'))).toBe('non-reconnu');
  });
});

describe('analyserClePrivee — texte, BOM, CRLF, lignes vides', () => {
  it('retire le BOM du texte renvoyé', () => {
    const texte = ppkV2();
    const avecBom = Uint8Array.from([0xef, 0xbb, 0xbf, ...octets(texte)]);
    const analyse = analyserClePrivee(avecBom);
    expect(analyse).toEqual({ ok: true, format: 'ppk-v2', texte });
  });

  it('conserve les CRLF dans le texte renvoyé', () => {
    const texte = enveloppeOpenssh(corpsOpenssh('none'), '\r\n');
    const analyse = analyser(texte);
    expect(analyse).toEqual({ ok: true, format: 'openssh', texte });
    if (analyse.ok) expect(analyse.texte).toContain('\r\n');
  });

  it('accepte une PPK v2 en CRLF', () => {
    const texte = ppkV2().replace(/\n/g, '\r\n');
    expect(analyser(texte)).toEqual({ ok: true, format: 'ppk-v2', texte });
  });

  it('tolère des lignes vides en tête', () => {
    const texte = `\n  \r\n\n${opensshNone()}`;
    expect(analyser(texte)).toEqual({ ok: true, format: 'openssh', texte });
  });

  it('tolère des espaces en fin de ligne', () => {
    const texte = ppkV2().replace(/\n/g, '   \n');
    expect(analyser(texte)).toEqual({ ok: true, format: 'ppk-v2', texte });
  });
});

describe('analyserClePrivee — PPK', () => {
  it('accepte une PPK v2 ssh-rsa sans chiffrement', () => {
    const texte = ppkV2();
    expect(analyser(texte)).toEqual({ ok: true, format: 'ppk-v2', texte });
  });

  it('accepte une PPK v2 ssh-dss sans chiffrement', () => {
    const texte = ppkV2({ type: 'ssh-dss' });
    expect(analyser(texte)).toEqual({ ok: true, format: 'ppk-v2', texte });
  });

  it('tolère une ligne vide entre l en-tête et Encryption', () => {
    const texte = ppkV2().replace('\nEncryption', '\n\nEncryption');
    expect(analyser(texte)).toEqual({ ok: true, format: 'ppk-v2', texte });
  });

  it('refuse la version 3', () => {
    const texte = ppkV2().replace('File-2', 'File-3');
    const analyse = analyser(texte);
    expect(refusDe(analyse)).toBe('ppk-v3');
    expect(messageDe(analyse)).toBe(MESSAGES_REFUS_CLE['ppk-v3']);
  });

  it('refuse les autres versions comme non reconnues', () => {
    expect(refusDe(analyser(ppkV2().replace('File-2', 'File-1')))).toBe('non-reconnu');
    expect(refusDe(analyser(ppkV2().replace('File-2', 'File-4')))).toBe('non-reconnu');
  });

  it('refuse une v2 dont la deuxième ligne non vide n est pas Encryption', () => {
    const texte = ppkV2().replace('Encryption: none\nComment', 'Comment');
    expect(refusDe(analyser(texte))).toBe('non-reconnu');
  });

  it('refuse une v2 sans aucune ligne après l en-tête', () => {
    expect(refusDe(analyser('PuTTY-User-Key-File-2: ssh-rsa\n'))).toBe('non-reconnu');
  });

  it('refuse un type ssh-ed25519 avec type-ppk', () => {
    const analyse = analyser(ppkV2({ type: 'ssh-ed25519' }));
    expect(refusDe(analyse)).toBe('type-ppk');
    expect(messageDe(analyse)).toBe(messageTypePpk('ssh-ed25519'));
  });

  it('refuse un type ecdsa avec type-ppk', () => {
    const analyse = analyser(ppkV2({ type: 'ecdsa-sha2-nistp256' }));
    expect(refusDe(analyse)).toBe('type-ppk');
    expect(messageDe(analyse)).toBe(messageTypePpk('ecdsa-sha2-nistp256'));
  });

  it('contrôle le type avant le chiffrement', () => {
    const analyse = analyser(ppkV2({ type: 'ssh-ed25519', chiffrement: 'aes256-cbc' }));
    expect(refusDe(analyse)).toBe('type-ppk');
  });

  it('refuse une clé chiffrée par une phrase secrète', () => {
    const analyse = analyser(ppkV2({ chiffrement: 'aes256-cbc' }));
    expect(refusDe(analyse)).toBe('phrase-secrete');
    expect(messageDe(analyse)).toBe(MESSAGES_REFUS_CLE['phrase-secrete']);
  });

  it('refuse une v2 sans ligne Private-MAC', () => {
    const analyse = analyser(ppkV2({ mac: false }));
    expect(refusDe(analyse)).toBe('non-reconnu');
  });

  it('n accepte pas un Private-MAC qui n est pas en début de ligne', () => {
    const texte = ppkV2({ mac: false }) + 'x Private-MAC: 00\n';
    expect(refusDe(analyser(texte))).toBe('non-reconnu');
  });
});

describe('analyserClePrivee — OpenSSH', () => {
  it('accepte une clé OpenSSH sans chiffrement', () => {
    const texte = opensshNone();
    expect(analyser(texte)).toEqual({ ok: true, format: 'openssh', texte });
  });

  it('accepte un corps dont la longueur du chiffrement atteint exactement la fin', () => {
    const corps = corpsOpenssh('none', { reste: Buffer.alloc(0) });
    expect(corps.length).toBe(19 + 4);
    const texte = enveloppeOpenssh(corps);
    expect(analyser(texte)).toEqual({ ok: true, format: 'openssh', texte });
  });

  it('refuse un chiffrement aes256-ctr comme phrase secrète', () => {
    const analyse = analyser(enveloppeOpenssh(corpsOpenssh('aes256-ctr')));
    expect(refusDe(analyse)).toBe('phrase-secrete');
    expect(messageDe(analyse)).toBe(MESSAGES_REFUS_CLE['phrase-secrete']);
  });

  it('refuse une clé sans ligne de fin', () => {
    const texte = opensshNone().replace('-----END OPENSSH PRIVATE KEY-----\n', '');
    expect(refusDe(analyser(texte))).toBe('non-reconnu');
  });

  it('refuse un corps qui n est pas du base64', () => {
    const texte = [
      '-----BEGIN OPENSSH PRIVATE KEY-----',
      'AAAA!AAA',
      '-----END OPENSSH PRIVATE KEY-----',
    ].join('\n');
    expect(refusDe(analyser(texte))).toBe('non-reconnu');
  });

  it('refuse un corps vide', () => {
    const texte = '-----BEGIN OPENSSH PRIVATE KEY-----\n-----END OPENSSH PRIVATE KEY-----\n';
    expect(refusDe(analyser(texte))).toBe('non-reconnu');
  });

  it('refuse un base64 dont la longueur n est pas multiple de 4', () => {
    const texte = [
      '-----BEGIN OPENSSH PRIVATE KEY-----',
      'b3BlbnNzaC1rZXktdjEAAAAABG5vbmU',
      '-----END OPENSSH PRIVATE KEY-----',
    ].join('\n');
    expect(refusDe(analyser(texte))).toBe('non-reconnu');
  });

  it('refuse un mauvais préfixe', () => {
    const corps = corpsOpenssh('none', { prefixe: 'openssh-key-v2\0' });
    expect(refusDe(analyser(enveloppeOpenssh(corps)))).toBe('non-reconnu');
  });

  it('refuse un préfixe sans octet nul final', () => {
    const corps = corpsOpenssh('none', { prefixe: 'openssh-key-v1X' });
    expect(refusDe(analyser(enveloppeOpenssh(corps)))).toBe('non-reconnu');
  });

  it('refuse une longueur de chiffrement qui déborde du corps', () => {
    const corps = corpsOpenssh('none', { longueur: 1000 });
    expect(refusDe(analyser(enveloppeOpenssh(corps)))).toBe('non-reconnu');
  });

  it('refuse une longueur qui dépasse d un seul octet', () => {
    const corps = corpsOpenssh('none', { longueur: 5, reste: Buffer.alloc(0) });
    expect(refusDe(analyser(enveloppeOpenssh(corps)))).toBe('non-reconnu');
  });

  it('refuse un corps trop court (moins de 19 octets)', () => {
    const corps = Buffer.concat([
      Buffer.from('openssh-key-v1\0', 'latin1'),
      Buffer.from([0, 0, 0]),
    ]);
    expect(corps.length).toBe(18);
    expect(refusDe(analyser(enveloppeOpenssh(corps)))).toBe('non-reconnu');
  });

  it('refuse un corps plus court que le préfixe', () => {
    const corps = Buffer.from('openssh', 'latin1');
    expect(refusDe(analyser(enveloppeOpenssh(corps)))).toBe('non-reconnu');
  });
});

describe('analyserClePrivee — PEM', () => {
  it.each(['RSA', 'DSA', 'EC'])('accepte une clé PEM %s sans chiffrement', (type) => {
    const texte = pem(type);
    expect(analyser(texte)).toEqual({ ok: true, format: 'pem', texte });
  });

  it('refuse un PEM avec Proc-Type ENCRYPTED comme phrase secrète', () => {
    const analyse = analyser(pem('RSA', ['Proc-Type: 4,ENCRYPTED', 'DEK-Info: AES-128-CBC,00AA']));
    expect(refusDe(analyse)).toBe('phrase-secrete');
    expect(messageDe(analyse)).toBe(MESSAGES_REFUS_CLE['phrase-secrete']);
  });

  it('refuse un PEM avec seulement DEK-Info comme phrase secrète', () => {
    expect(refusDe(analyser(pem('EC', ['DEK-Info: AES-128-CBC,00AA'])))).toBe('phrase-secrete');
  });

  it('refuse un PEM sans ligne de fin', () => {
    const texte = pem('RSA').replace('-----END RSA PRIVATE KEY-----\n', '');
    expect(refusDe(analyser(texte))).toBe('non-reconnu');
  });

  it('refuse un PEM dont la ligne de fin est d un autre type', () => {
    const texte = pem('RSA').replace('END RSA PRIVATE', 'END DSA PRIVATE');
    expect(refusDe(analyser(texte))).toBe('non-reconnu');
  });

  it('refuse ENCRYPTED PRIVATE KEY comme phrase secrète', () => {
    const texte = [
      '-----BEGIN ENCRYPTED PRIVATE KEY-----',
      'MIIFAKEFAKEFAKE',
      '-----END ENCRYPTED PRIVATE KEY-----',
    ].join('\n');
    expect(refusDe(analyser(texte))).toBe('phrase-secrete');
  });

  it('refuse PRIVATE KEY (PKCS#8)', () => {
    const texte = [
      '-----BEGIN PRIVATE KEY-----',
      'MIIFAKEFAKEFAKE',
      '-----END PRIVATE KEY-----',
    ].join('\n');
    const analyse = analyser(texte);
    expect(refusDe(analyse)).toBe('pkcs8');
    expect(messageDe(analyse)).toBe(MESSAGES_REFUS_CLE.pkcs8);
  });
});

describe('analyserClePrivee — clés publiques', () => {
  it.each([
    ['ssh-ed25519', 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFAKE commentaire'],
    ['ssh-rsa', 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABFAKE=='],
    ['ecdsa', 'ecdsa-sha2-nistp256 AAAAE2VjZHNhFAKE utilisateur@poste'],
    ['sk', 'sk-ssh-ed25519@openssh.com AAAAGnNrLXNzaFAKE'],
  ])('refuse une clé publique OpenSSH (%s)', (_nom, ligne) => {
    const analyse = analyser(`${ligne}\n`);
    expect(refusDe(analyse)).toBe('cle-publique');
    expect(messageDe(analyse)).toBe(MESSAGES_REFUS_CLE['cle-publique']);
  });

  it('refuse une clé publique OpenSSH sans fin de ligne ni commentaire', () => {
    expect(refusDe(analyser('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFAKE'))).toBe('cle-publique');
  });

  it('refuse une clé publique au format SSH2 (RFC 4716)', () => {
    const texte = [
      '---- BEGIN SSH2 PUBLIC KEY ----',
      'Comment: "fictif"',
      'AAAAB3NzaC1yc2EAAAADAQABFAKE',
      '---- END SSH2 PUBLIC KEY ----',
    ].join('\n');
    expect(refusDe(analyser(texte))).toBe('cle-publique');
  });

  it.each(['-----BEGIN PUBLIC KEY-----', '-----BEGIN RSA PUBLIC KEY-----'])(
    'refuse une clé publique PEM (%s)',
    (entete) => {
      const texte = [entete, 'MIIBIjANFAKE', entete.replace('BEGIN', 'END')].join('\n');
      expect(refusDe(analyser(texte))).toBe('cle-publique');
    },
  );
});

describe('analyserClePrivee — confidentialité', () => {
  const cas: Array<[RefusClePrivee, string]> = [
    ['ppk-v3', ppkV2().replace('File-2', 'File-3')],
    ['phrase-secrete', ppkV2({ chiffrement: 'aes256-cbc' })],
    ['type-ppk', ppkV2({ type: 'ssh-ed25519' })],
    ['type-ppk', ppkV2({ type: TEMOIN })],
    ['pkcs8', `-----BEGIN PRIVATE KEY-----\n${TEMOIN}\n-----END PRIVATE KEY-----\n`],
    ['cle-publique', `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFAKE ${TEMOIN}\n`],
    ['trop-volumineux', `${TEMOIN}${'a'.repeat(TAILLE_MAX_CLE_PRIVEE)}`],
    ['non-reconnu', `${TEMOIN}\nComment: ${TEMOIN}\n`],
    ['non-reconnu', ppkV2({ mac: false })],
    ['non-reconnu', ppkV2().replace('File-2', 'File-4')],
    ['non-reconnu', enveloppeOpenssh(corpsOpenssh('none', { longueur: 1000 }))],
    [
      'non-reconnu',
      `-----BEGIN OPENSSH PRIVATE KEY-----\n${TEMOIN}!\n-----END OPENSSH PRIVATE KEY-----\n`,
    ],
    ['phrase-secrete', enveloppeOpenssh(corpsOpenssh('aes256-ctr'))],
    ['phrase-secrete', pem('RSA', ['Proc-Type: 4,ENCRYPTED', `DEK-Info: ${TEMOIN}`])],
    ['non-reconnu', pem('RSA').replace('END RSA PRIVATE', 'END DSA PRIVATE')],
  ];

  it.each(cas)('le refus %s ne reprend aucune valeur du fichier', (refus, texte) => {
    const analyse = analyser(texte);
    expect(refusDe(analyse)).toBe(refus);
    expect(messageDe(analyse)).not.toContain(TEMOIN);
    expect(JSON.stringify(analyse)).not.toContain(TEMOIN);
  });

  it('un type PPK hors motif donne le type inconnu dans le message', () => {
    const analyse = analyser(ppkV2({ type: TEMOIN }));
    expect(messageDe(analyse)).toBe(messageTypePpk('inconnu'));
  });
});
