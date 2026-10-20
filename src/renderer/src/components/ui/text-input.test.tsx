// @vitest-environment jsdom
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { monter, quitter, saisir, type Monture } from '@/test/dom';
import { Field } from './field';
import { TextInput } from './text-input';

let monture: Monture | null = null;

afterEach(async () => {
  await monture?.demonter();
  monture = null;
});

function champ(): HTMLInputElement {
  const input = document.querySelector('input');
  if (!input) throw new Error('<input> introuvable');
  return input;
}

function conteneur(): HTMLElement {
  const parent = champ().parentElement;
  if (!parent) throw new Error('Conteneur introuvable');
  return parent;
}

function classes(element: Element): string[] {
  return element.className.split(' ');
}

describe('TextInput — champ par défaut', () => {
  it('rend un input texte natif aux couleurs de la charte, sans correcteur', async () => {
    monture = await monter(<TextInput defaultValue="DUPONT" />);
    expect(champ().type).toBe('text');
    expect(champ().getAttribute('spellcheck')).toBe('false');
    expect(classes(champ())).toEqual(
      expect.arrayContaining(['h-control-md', 'border-input', 'bg-white', 'pl-3', 'pr-3']),
    );
    expect(classes(champ())).toEqual(
      expect.arrayContaining([
        'focus:border-blue-500',
        'focus-visible:shadow-focus',
        'focus-visible:outline-none',
      ]),
    );
    expect(classes(conteneur())).toContain('w-full');
    expect(document.querySelector('svg')).toBeNull();
  });

  it('transmet la référence, les attributs et les évènements à l’input', async () => {
    const ref = createRef<HTMLInputElement>();
    const onChange = vi.fn();
    const onBlur = vi.fn();
    monture = await monter(
      <TextInput ref={ref} value="" maxLength={5} onChange={onChange} onBlur={onBlur} />,
    );
    expect(ref.current).toBe(champ());
    expect(champ().maxLength).toBe(5);
    await saisir(champ(), 'ABC');
    expect(onChange).toHaveBeenCalledTimes(1);
    await quitter(champ());
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('pose className sur le conteneur', async () => {
    monture = await monter(<TextInput className="max-w-xs" />);
    expect(classes(conteneur())).toContain('max-w-xs');
    expect(classes(champ())).not.toContain('max-w-xs');
  });

  it('accepte de réactiver le correcteur', async () => {
    monture = await monter(<TextInput spellCheck />);
    expect(champ().getAttribute('spellcheck')).toBe('true');
  });

  it('accepte un autre type', async () => {
    monture = await monter(<TextInput type="search" />);
    expect(champ().type).toBe('search');
  });

  it('n’allume l’anneau de focus qu’au focus visible (DESIGN.md §9.6)', async () => {
    monture = await monter(<TextInput />);
    expect(classes(champ()).filter((classe) => classe.startsWith('focus:'))).toEqual([
      'focus:border-blue-500',
    ]);
  });
});

describe('TextInput — aria-invalid à faux', () => {
  it.each([false, 'false'] as const)('aria-invalid=%s : champ non marqué', async (valeur) => {
    monture = await monter(<TextInput aria-invalid={valeur} defaultValue="75001" />);
    expect(classes(champ())).toEqual(expect.arrayContaining(['border-input', 'pr-3']));
    expect(classes(champ())).not.toContain('border-error-solid');
    expect(classes(champ())).not.toContain('pr-9');
    expect(classes(champ())).not.toContain('focus-visible:shadow-focus-error');
    expect(conteneur().querySelector('svg')).toBeNull();
  });
});

describe('TextInput — lecture seule', () => {
  it('prend le fond de page et la bordure discrète, sans survol', async () => {
    monture = await monter(<TextInput readOnly value="100 - Adhésion" />);
    expect(champ().readOnly).toBe(true);
    expect(classes(champ())).toEqual(expect.arrayContaining(['bg-neutral-50', 'border-border']));
    expect(classes(champ())).not.toContain('bg-white');
    expect(classes(champ())).not.toContain('hover:border-neutral-500');
    expect(classes(champ())).toContain('focus-visible:shadow-focus');
  });

  it('désactivé en plus : style désactivé, pas celui de la lecture seule', async () => {
    monture = await monter(<TextInput readOnly disabled value="100 - Adhésion" />);
    expect(champ().readOnly).toBe(true);
    expect(champ().disabled).toBe(true);
    expect(classes(champ())).toEqual(
      expect.arrayContaining(['disabled:bg-muted', 'disabled:border-border']),
    );
    expect(classes(champ())).not.toContain('bg-neutral-50');
  });
});

describe('TextInput — en erreur', () => {
  it('aria-invalid : bordure rouge, fond blanc, icône à droite, anneau rouge', async () => {
    monture = await monter(<TextInput aria-invalid="true" defaultValue="75O01" />);
    expect(classes(champ())).toEqual(
      expect.arrayContaining([
        'border-error-solid',
        'bg-white',
        'pr-9',
        'focus-visible:shadow-focus-error',
      ]),
    );
    expect(classes(champ())).not.toContain('border-input');
    expect(classes(champ())).not.toContain('pr-3');
    const icone = conteneur().querySelector('svg');
    expect(icone?.getAttribute('aria-hidden')).toBe('true');
    expect(icone?.getAttribute('width')).toBe('16');
    expect(icone?.getAttribute('class')).toContain('text-error-text');
    expect(icone?.getAttribute('class')).toContain('right-3');
  });

  it('reste rouge et blanc en lecture seule (erreur non corrigeable à l’écran)', async () => {
    monture = await monter(<TextInput readOnly aria-invalid value="REDAX" />);
    expect(classes(champ())).toEqual(expect.arrayContaining(['border-error-solid', 'bg-white']));
    expect(classes(champ())).not.toContain('bg-neutral-50');
    expect(conteneur().querySelector('svg')).not.toBeNull();
  });

  it('se câble sur Field : id, aria-invalid et aria-describedby vers le message', async () => {
    monture = await monter(
      <Field label="Code postal" error="Le code postal compte 5 chiffres.">
        {(control) => <TextInput {...control} defaultValue="7500" />}
      </Field>,
    );
    const input = champ();
    expect(document.querySelector('label')?.htmlFor).toBe(input.id);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const message = document.getElementById(input.getAttribute('aria-describedby') ?? '');
    expect(message?.textContent).toBe('Le code postal compte 5 chiffres.');
    expect(conteneur().querySelector('svg')).not.toBeNull();
  });
});

describe('TextInput — mono et largeur en caractères', () => {
  it('mono : police à chasse fixe sur l’input et le conteneur', async () => {
    monture = await monter(<TextInput mono defaultValue="100" />);
    expect(classes(champ())).toEqual(
      expect.arrayContaining(['font-mono', 'text-data', 'tabular-nums']),
    );
    expect(classes(champ())).not.toContain('font-sans');
    expect(classes(conteneur())).toContain('font-mono');
  });

  it('ajuste la largeur aux caractères, marges et bordures comprises, plafonnée', async () => {
    monture = await monter(<TextInput mono largeurCaracteres={5} defaultValue="75001" />);
    expect(conteneur().style.width).toBe('calc(5ch + 2px + 1.5rem)');
    expect(classes(conteneur())).toContain('max-w-full');
    expect(classes(conteneur())).not.toContain('w-full');
  });

  it('ajoute la place de l’icône quand le champ est en erreur', async () => {
    monture = await monter(
      <TextInput mono largeurCaracteres={5} aria-invalid defaultValue="7500" />,
    );
    expect(conteneur().style.width).toBe('calc(5ch + 2px + 3rem)');
  });
});
