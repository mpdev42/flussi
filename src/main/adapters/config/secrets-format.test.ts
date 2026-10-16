import { describe, expect, it } from 'vitest';
import { decoderSecrets, encoderSecrets, type ContenuSecrets } from './secrets-format';

// Valeurs fictives uniquement.
const DATE = '2026-10-16T08:30:00.000Z';
const encoder = new TextEncoder();
const octets = (texte: string) => encoder.encode(texte);
const json = (valeur: unknown) => octets(JSON.stringify(valeur));

describe('encoderSecrets', () => {
  it('produit le JSON attendu, en UTF-8 sans BOM', () => {
    const secrets: ContenuSecrets = { MSP_SFTP_PASSWORD: { valeur: 'fictif', date: DATE } };
    const resultat = encoderSecrets(secrets);
    expect(resultat).toBeInstanceOf(Uint8Array);
    expect(Array.from(resultat.slice(0, 3))).not.toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder('utf-8', { ignoreBOM: true }).decode(resultat)).toBe(
      JSON.stringify({ format: 1, secrets }),
    );
  });

  it('encode un contenu vide', () => {
    expect(new TextDecoder().decode(encoderSecrets({}))).toBe('{"format":1,"secrets":{}}');
  });

  it('encode les caractères non ASCII en UTF-8', () => {
    const resultat = encoderSecrets({ A: { valeur: 'é', date: DATE } });
    expect(Array.from(resultat)).toContain(0xc3);
  });
});

describe('decoderSecrets — aller-retour', () => {
  it.each([
    ['simple', 'motdepasse-fictif'],
    ['accents', 'Éléphant àçùœ'],
    ['guillemets', 'il a dit "oui" et \'non\' \\ fin'],
    ['retours à la ligne', 'ligne 1\nligne 2\r\nligne 3\t tab'],
    ['emoji', 'clé 🔑 fictive 😀'],
    ['chaîne vide', ''],
  ])('restitue à l identique une valeur avec %s', (_nom, valeur) => {
    const secrets: ContenuSecrets = { MSP_SFTP_PASSWORD: { valeur, date: DATE } };
    expect(decoderSecrets(encoderSecrets(secrets))).toEqual({ ok: true, secrets });
  });

  it('restitue plusieurs secrets avec leur date', () => {
    const secrets: ContenuSecrets = {
      IGA_FTP_PASSWORD: { valeur: 'a', date: '2026-01-02T03:04:05.678Z' },
      MSP_SFTP_PASSWORD: { valeur: 'b', date: DATE },
    };
    expect(decoderSecrets(encoderSecrets(secrets))).toEqual({ ok: true, secrets });
  });

  it('accepte un objet secrets vide', () => {
    expect(decoderSecrets(json({ format: 1, secrets: {} }))).toEqual({ ok: true, secrets: {} });
  });

  it('conserve un identifiant de secret inconnu', () => {
    const secrets: ContenuSecrets = {
      IDENTIFIANT_INCONNU: { valeur: 'garde', date: DATE },
      MSP_SFTP_PASSWORD: { valeur: 'b', date: DATE },
    };
    expect(decoderSecrets(json({ format: 1, secrets }))).toEqual({ ok: true, secrets });
  });

  it('ignore les clés de premier niveau en plus', () => {
    const secrets: ContenuSecrets = { A: { valeur: 'x', date: DATE } };
    const resultat = decoderSecrets(json({ format: 1, secrets, extra: 'ignoré' }));
    expect(resultat).toEqual({ ok: true, secrets });
  });
});

describe('decoderSecrets — refus', () => {
  const entree = { valeur: 'x', date: DATE };

  it.each([
    ['format 2', { format: 2, secrets: {} }],
    ['format en chaîne', { format: '1', secrets: {} }],
    ['format absent', { secrets: {} }],
    ['secrets absent', { format: 1 }],
    ['secrets null', { format: 1, secrets: null }],
    ['secrets tableau', { format: 1, secrets: [] }],
    ['secrets chaîne', { format: 1, secrets: 'x' }],
    ['entrée sans date', { format: 1, secrets: { A: { valeur: 'x' } } }],
    ['entrée sans valeur', { format: 1, secrets: { A: { date: DATE } } }],
    ['valeur non chaîne', { format: 1, secrets: { A: { valeur: 12, date: DATE } } }],
    ['date non ISO', { format: 1, secrets: { A: { valeur: 'x', date: '16/10/2026' } } }],
    ['date texte libre', { format: 1, secrets: { A: { valeur: 'x', date: 'hier' } } }],
    ['date vide', { format: 1, secrets: { A: { valeur: 'x', date: '' } } }],
    ['date numérique', { format: 1, secrets: { A: { valeur: 'x', date: 1760603400000 } } }],
    ['propriété en plus dans une entrée', { format: 1, secrets: { A: { ...entree, extra: 1 } } }],
    ['entrée non objet', { format: 1, secrets: { A: 'x' } }],
    ['une entrée invalide parmi des valides', { format: 1, secrets: { A: entree, B: {} } }],
    ['racine tableau', []],
    ['racine null', null],
    ['racine chaîne', 'x'],
  ])('refuse %s', (_nom, contenu) => {
    expect(decoderSecrets(json(contenu))).toEqual({ ok: false });
  });

  it('refuse un JSON invalide sans rien révéler du texte', () => {
    const resultat = decoderSecrets(octets('{"format":1,"secrets":{"A":{"valeur":"VALEUR-TEMOIN"'));
    expect(JSON.stringify(resultat)).toBe('{"ok":false}');
  });

  it('ne révèle aucune valeur quand le schéma est refusé', () => {
    const resultat = decoderSecrets(
      json({ format: 2, secrets: { A: { valeur: 'VALEUR-TEMOIN', date: DATE } } }),
    );
    expect(JSON.stringify(resultat)).toBe('{"ok":false}');
  });

  it('refuse des octets vides', () => {
    expect(decoderSecrets(new Uint8Array(0))).toEqual({ ok: false });
  });

  it('refuse des octets UTF-8 invalides', () => {
    const valide = octets('{"format":1,"secrets":{}}');
    const invalide = Uint8Array.from([...valide.slice(0, -1), 0xff, 0xfe, ...valide.slice(-1)]);
    expect(decoderSecrets(invalide)).toEqual({ ok: false });
    expect(decoderSecrets(Uint8Array.from([0xff, 0xfe, 0xfd]))).toEqual({ ok: false });
  });
});
