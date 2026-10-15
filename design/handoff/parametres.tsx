/**
 * Flussi — écran « Paramètres » (diagnostic, rarement visité).
 *
 * Référence stricte : design system Flussi (DESIGN.md + handoff/).
 * Composants réutilisés : Card, Input, Button, Alert, Badge, EnvironmentBadge,
 * EnvironmentBanner, formatDate. Données fictives uniquement.
 *
 * Extensions (aucun style inline) :
 *  - SettingsEntry / grille fl-settings-* : la carte « Configuration » n'utilise pas DataList.
 *    Grille locale à trois colonnes (libellé | valeur | bouton) pour que les boutons « Ouvrir dans
 *    l’Explorateur » forment une colonne alignée juste après le chemin le plus long. Sémantique
 *    <dl> conservée ; espacements et typographie de dt/dd identiques à ceux de DataList.
 *  - SecretStatusBadge : construit sur Badge, comme StatusBadge, pour les trois états
 *    d'un secret (Renseigné le…, Renseigné dans le .env, Non renseigné).
 *  - AppFrame : cadre de l'application, aligné sur le vrai cadre (bandeau Recette, puis un seul
 *    en-tête bleu marine : « Flussi » + badge Recette, navigation principale, environnement et
 *    version à droite).
 *  - EXTENSION_CSS : classes fl-app-* / fl-settings-* / fl-secret-* / fl-preview-* qui n'existent
 *    pas encore dans flussi.css (cadre d'application, en-tête, grille de configuration, lignes de
 *    secrets, barre d'aperçu).
 *    Valeurs = tokens uniquement, plus le token --content-max-width (1600px, DESIGN.md §4), à
 *    reporter dans flussi-tokens.css.
 *
 * Aperçu : il demande les deux feuilles de style flussi-tokens.css et flussi.css de ce dossier,
 * à importer par l'outil d'aperçu (comme indiqué dans index.ts), et la racine fl-root, déjà posée
 * par ParametresPreview.
 *
 * Correspondance Electron : l'écran appelle window.api (preload, contextBridge), le main fait le
 * travail. Remplacer les fonctions mock* par :
 *  - lecture de la configuration : window.api.config.lire() ;
 *  - ouverture d'un dossier : window.api.config.ouvrirDossier(dossier), avec dossier parmi
 *    'travail' | 'in' | 'out' | 'journal'. L'écran envoie un nom de dossier, jamais un chemin ;
 *    le main appelle shell.openPath ;
 *  - écriture d'un secret, sélecteur de fichier natif et validation de la clé : canaux IPC de
 *    l'item 7 (pas encore définis).
 */
import * as React from 'react';
import { CircleCheck, FolderOpen, KeyRound, TriangleAlert } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  EnvironmentBadge,
  EnvironmentBanner,
  Input,
  formatDate,
} from '.';
import { ICON, ICON_STROKE } from './utils';

const NBSP = '\u00A0';

/* =====================================================================================
 * Extension CSS — à reporter dans flussi.css (et le token dans flussi-tokens.css)
 * ===================================================================================== */

const EXTENSION_CSS = `
/* Nouveau token (famille size) — DESIGN.md §4 */
:root {
  --content-max-width: 1600px;   /* Largeur max du contenu d'un écran, centré (DESIGN.md §4). */
}

/* ---------- Cadre d'application ---------- */
.fl-app-frame { display: flex; flex-direction: column; min-height: calc(100vh - var(--space-16)); background: var(--bg-page); border: var(--border-width) solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; }
.fl-app-header { display: flex; align-items: stretch; gap: var(--space-8); height: var(--header-height); padding: 0 var(--space-10); background: var(--bg-header); color: var(--text-on-brand); box-shadow: var(--shadow-sm); z-index: var(--z-header); }
.fl-app-brand { display: flex; align-items: center; gap: var(--space-3); }
.fl-app-name { margin: 0; font-size: var(--fs-16); line-height: var(--lh-24); font-weight: var(--fw-semibold); }
.fl-app-nav { display: flex; align-items: stretch; gap: var(--space-1); }
.fl-app-nav-item { display: flex; align-items: center; padding: var(--border-width-strong) var(--space-4) 0; background: transparent; border: 0; border-bottom: var(--border-width-strong) solid transparent; font-family: var(--font-sans); font-size: var(--fs-14); line-height: var(--lh-20); font-weight: var(--fw-medium); color: var(--navy-100); cursor: pointer; transition: color var(--duration-fast), background-color var(--duration-fast); }
.fl-app-nav-item:hover { background: var(--navy-800); color: var(--text-on-brand); }
.fl-app-nav-item[aria-current="page"] { background: var(--navy-800); border-bottom-color: var(--blue-300); color: var(--text-on-brand); }
.fl-app-nav-item:focus-visible { outline: none; box-shadow: var(--focus-ring-on-dark); }
.fl-app-meta { margin-left: auto; display: flex; align-items: center; gap: var(--space-4); font-size: var(--fs-13); line-height: var(--lh-18); color: var(--navy-100); }
.fl-app-version { font-size: var(--fs-12); line-height: var(--lh-16); }
.fl-app-main { width: 100%; max-width: var(--content-max-width); margin: 0 auto; padding: var(--space-8) var(--space-10) var(--space-12); display: flex; flex-direction: column; gap: var(--space-6); }
.fl-app-title { margin: 0; }

/* ---------- Carte Configuration : grille libellé | valeur | bouton ---------- */
.fl-settings-list { display: grid; grid-template-columns: max-content minmax(0, max-content) 1fr; gap: var(--space-2) var(--space-6); margin: 0; }
.fl-settings-entry { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; row-gap: var(--space-1); align-items: center; }
.fl-settings-entry > dt { grid-column: 1; grid-row: 1; font-size: var(--fs-13); line-height: var(--lh-20); color: var(--text-muted); }
.fl-settings-entry > dd { margin: 0; font-size: var(--fs-14); line-height: var(--lh-20); color: var(--text-default); font-variant-numeric: tabular-nums; min-width: 0; overflow-wrap: anywhere; }
.fl-settings-entry > .fl-settings-value { grid-column: 2; grid-row: 1; }
.fl-settings-entry > .fl-settings-action { grid-column: 3; grid-row: 1; justify-self: start; }
.fl-settings-entry > .fl-settings-caption { grid-column: 2 / -1; grid-row: 2; }
.fl-app-path { overflow-wrap: anywhere; }
.fl-app-origin { margin: 0; }

/* ---------- Secrets techniques ---------- */
.fl-secret-intro { margin-bottom: var(--space-4); }
.fl-secret-list { list-style: none; margin: 0; padding: 0; }
.fl-secret { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4) 0; border-top: var(--border-width) solid var(--border-subtle); }
.fl-secret:first-child { padding-top: 0; border-top: 0; }
.fl-secret:last-child { padding-bottom: 0; }
.fl-secret-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2) var(--space-4); }
.fl-secret-name { margin: 0; }
.fl-secret-form { display: flex; align-items: flex-end; flex-wrap: wrap; gap: var(--space-3); }
.fl-secret-input { flex: 0 1 calc(var(--space-16) * 5); }
.fl-secret-key { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-1); }

/* ---------- Barre d'aperçu (hors application) ---------- */
.fl-preview { min-height: 100vh; padding: 0 var(--space-6) var(--space-6); background: var(--bg-subtle); }
.fl-preview-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); padding: var(--space-3) 0; }
.fl-preview-label { margin-right: var(--space-2); }
`;

/* =====================================================================================
 * Modèle
 * ===================================================================================== */

type Environment = 'recette' | 'production';
type Role = 'standard' | 'admin';
/** config.json · valeur par défaut (production, dossier uniquement) · fichier .env (développement) */
type Origin = 'config' | 'defaut' | 'env';
type SecretId = 'ftpIga' | 'sftpMspPassword' | 'sftpMspKey';
/** Nom logique d'un dossier : c'est lui que l'écran envoie au main, jamais un chemin. */
type FolderName = 'travail' | 'in' | 'out' | 'journal';

/** set : renseigné à une date · env : renseigné dans le .env · unset : non renseigné */
type SecretStatus = { kind: 'set'; date: Date } | { kind: 'env' } | { kind: 'unset' };

interface SettingsData {
  environment: Environment;
  environmentOrigin: Exclude<Origin, 'defaut'>;
  /** Chemins des dossiers (IN, OUT et Journal sont toujours dérivés de la racine de travail). */
  folders: Record<FolderName, string>;
  /** Origine de la racine de travail ; IN, OUT et Journal n'ont pas d'origine propre. */
  workFolderOrigin: Origin;
  /** Fichier de configuration lu : config.json (application installée) ou .env (développement). */
  sourceFile: string;
  version: string;
  /** Build de développement : tout est lu dans le .env, rien n'est modifiable. */
  development: boolean;
  role: Role;
  secrets: Record<SecretId, SecretStatus>;
}

type Feedback = { tone: 'success' | 'error'; message: string };

interface Scenario {
  id: string;
  label: string;
  data: SettingsData;
  /** État affiché à l'ouverture (variantes 3, 4, 5). */
  feedback?: Partial<Record<SecretId, Feedback>>;
}

const CONFIG_FILE = 'C:\\ProgramData\\Flussi\\config.json';
const ENV_FILE = 'C:\\Dev\\flussi\\.env';
const PROD_ROOT = 'P:\\Siege\\Service administratif\\MATH\\APIVIA Transfert\\Transferts';

/** IN, OUT et Journal sont toujours des sous-dossiers de la racine de travail. */
function foldersFrom(root: string): Record<FolderName, string> {
  return { travail: root, in: `${root}\\IN`, out: `${root}\\OUT`, journal: `${root}\\Journal` };
}

/** Complément du libellé accessible du bouton « Ouvrir dans l’Explorateur ». */
const FOLDER_LABELS: Record<FolderName, string> = {
  travail: 'le dossier de travail',
  in: 'le dossier IN',
  out: 'le dossier OUT',
  journal: 'le dossier Journal',
};

const SECRETS: Array<{ id: SecretId; label: string; type: 'password' | 'key' }> = [
  { id: 'ftpIga', label: 'Mot de passe FTP IGA', type: 'password' },
  { id: 'sftpMspPassword', label: 'Mot de passe SFTP MSP', type: 'password' },
  { id: 'sftpMspKey', label: 'Clé privée SFTP MSP', type: 'key' },
];

const SAVED_MESSAGE: Record<SecretId, string> = {
  ftpIga: 'Mot de passe FTP IGA enregistré.',
  sftpMspPassword: 'Mot de passe SFTP MSP enregistré.',
  sftpMspKey: 'Clé privée SFTP MSP importée.',
};

const KEY_ERRORS = {
  ppkV3: 'Clé au format PPK version 3, non prise en charge. Convertissez-la en version 2 avec PuTTYgen.',
  passphrase: 'Clé protégée par une phrase secrète, non prise en charge.',
} as const;

/* =====================================================================================
 * Données fictives
 * ===================================================================================== */

const d = (day: number, month: number, year = 2026) => new Date(year, month - 1, day);
const UNSET: SecretStatus = { kind: 'unset' };

const recetteAdminBase: SettingsData = {
  environment: 'recette',
  environmentOrigin: 'config',
  folders: foldersFrom(`${PROD_ROOT}\\RECETTE`),
  workFolderOrigin: 'config',
  sourceFile: CONFIG_FILE,
  version: '0.2.0',
  development: false,
  role: 'admin',
  secrets: { ftpIga: UNSET, sftpMspPassword: UNSET, sftpMspKey: UNSET },
};

const recetteAdminSomeSet: SettingsData = {
  ...recetteAdminBase,
  secrets: {
    ftpIga: { kind: 'set', date: d(2, 10) },
    sftpMspPassword: { kind: 'set', date: d(2, 10) },
    sftpMspKey: UNSET,
  },
};

const SCENARIOS: Scenario[] = [
  {
    id: 'prod-standard',
    label: 'Production, utilisateur standard',
    data: {
      environment: 'production',
      environmentOrigin: 'config',
      folders: foldersFrom(PROD_ROOT),
      workFolderOrigin: 'defaut',
      sourceFile: CONFIG_FILE,
      version: '0.2.0',
      development: false,
      role: 'standard',
      secrets: {
        ftpIga: { kind: 'set', date: d(2, 10) },
        sftpMspPassword: { kind: 'set', date: d(2, 10) },
        sftpMspKey: { kind: 'set', date: d(30, 9) },
      },
    },
  },
  { id: 'recette-admin-vide', label: 'Recette, administrateur, secrets non renseignés', data: recetteAdminBase },
  {
    id: 'admin-enregistre',
    label: 'Administrateur, mot de passe enregistré',
    data: { ...recetteAdminBase, secrets: { ...recetteAdminBase.secrets, ftpIga: { kind: 'set', date: d(15, 10) } } },
    feedback: { ftpIga: { tone: 'success', message: SAVED_MESSAGE.ftpIga } },
  },
  {
    id: 'cle-ppk3',
    label: 'Clé refusée : PPK v3',
    data: recetteAdminSomeSet,
    feedback: { sftpMspKey: { tone: 'error', message: KEY_ERRORS.ppkV3 } },
  },
  {
    id: 'cle-phrase',
    label: 'Clé refusée : phrase secrète',
    data: recetteAdminSomeSet,
    feedback: { sftpMspKey: { tone: 'error', message: KEY_ERRORS.passphrase } },
  },
  {
    id: 'dev',
    label: 'Développement',
    data: {
      environment: 'recette',
      environmentOrigin: 'env',
      folders: foldersFrom('C:\\Dev\\flussi\\donnees-test'),
      workFolderOrigin: 'env',
      sourceFile: ENV_FILE,
      version: '0.2.0',
      development: true,
      role: 'admin',
      secrets: { ftpIga: { kind: 'env' }, sftpMspPassword: { kind: 'env' }, sftpMspKey: UNSET },
    },
  },
];

/* Mocks des appels window.api (voir l'en-tête du fichier) */
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
async function mockSaveSecret(_id: SecretId, _value: string): Promise<void> { await wait(500); }
async function mockImportKey(): Promise<{ ok: true } | { ok: false; reason: keyof typeof KEY_ERRORS } | null> {
  await wait(500);
  return { ok: true }; // null = sélection annulée dans le sélecteur natif
}
/** Équivalent de window.api.config.ouvrirDossier(dossier) : le main ouvre le dossier (shell.openPath). */
function mockOpenFolder(_dossier: FolderName) {}

/* =====================================================================================
 * Composants d'écran
 * ===================================================================================== */

/** Statut d'un secret. Icône + mots, comme StatusBadge : jamais la couleur seule, jamais la valeur. */
function SecretStatusBadge({ status }: { status: SecretStatus }) {
  const icon = (I: typeof CircleCheck) => <I className="fl-icon" size={ICON.sm} strokeWidth={ICON_STROKE} aria-hidden="true" />;
  if (status.kind === 'unset') return <Badge tone="warning" icon={icon(TriangleAlert)}>Non renseigné</Badge>;
  if (status.kind === 'env') return <Badge tone="success" icon={icon(CircleCheck)}>Renseigné dans le .env</Badge>;
  return <Badge tone="success" icon={icon(CircleCheck)}>{`Renseigné le ${formatDate(status.date)}`}</Badge>;
}

/** Légende de source : « Source : config.json · {chemin} », « valeur par défaut (production) » ou « fichier .env (développement) · {chemin} ». */
function OriginCaption({ origin, sourceFile }: { origin: Origin; sourceFile: string }) {
  return (
    <p className="fl-app-origin fl-type-caption">
      {`Source${NBSP}: `}
      {origin === 'config' && (<>config.json · <span className="fl-type-data-sm fl-app-path">{sourceFile}</span></>)}
      {origin === 'defaut' && 'valeur par défaut (production)'}
      {origin === 'env' && (<>fichier .env (développement) · <span className="fl-type-data-sm fl-app-path">{sourceFile}</span></>)}
    </p>
  );
}

/** Cadre de l'application : bandeau Recette, puis l'en-tête unique (marque, navigation, environnement, version). */
function AppFrame({ environment, version, children }: { environment: Environment; version: string; children: React.ReactNode }) {
  const entries = ['Accueil', 'Journal', 'Paramètres'];
  return (
    <div className="fl-app-frame">
      <EnvironmentBanner environment={environment} />
      <header className="fl-app-header">
        <div className="fl-app-brand">
          <span className="fl-app-name">Flussi</span>
          {environment === 'recette' && <EnvironmentBadge />}
        </div>
        <nav className="fl-app-nav" aria-label="Navigation principale">
          {entries.map((entry) => (
            <button key={entry} type="button" className="fl-app-nav-item" aria-current={entry === 'Paramètres' ? 'page' : undefined}>
              {entry}
            </button>
          ))}
        </nav>
        <div className="fl-app-meta">
          <span>{`Environnement${NBSP}: ${environment === 'recette' ? 'Recette' : 'Production'}`}</span>
          <span className="fl-app-version">{`Flussi ${version}`}</span>
        </div>
      </header>
      <main className="fl-app-main">{children}</main>
    </div>
  );
}

/**
 * Entrée de la grille de configuration : libellé (colonne 1), valeur (colonne 2), bouton éventuel
 * (colonne 3, alignée sur toutes les entrées), puis légende éventuelle sur sa propre ligne.
 */
function SettingsEntry({ label, value, action, caption }: { label: string; value: React.ReactNode; action?: React.ReactNode; caption?: React.ReactNode }) {
  return (
    <div className="fl-settings-entry">
      <dt>{label}</dt>
      <dd className="fl-settings-value">{value}</dd>
      {action && <dd className="fl-settings-action">{action}</dd>}
      {caption && <dd className="fl-settings-caption">{caption}</dd>}
    </div>
  );
}

/** Dossier : chemin (mono), bouton d'ouverture à libellé accessible distinct, puis légende. */
function FolderEntry({ name, label, path, caption }: { name: FolderName; label: string; path: string; caption: React.ReactNode }) {
  return (
    <SettingsEntry
      label={label}
      value={<span className="fl-mono fl-app-path">{path}</span>}
      action={
        <Button
          variant="secondary"
          size="sm"
          icon={<FolderOpen className="fl-icon" size={ICON.sm} strokeWidth={ICON_STROKE} aria-hidden="true" />}
          aria-label={`Ouvrir ${FOLDER_LABELS[name]} dans l’Explorateur`}
          onClick={() => mockOpenFolder(name)}
        >
          Ouvrir dans l’Explorateur
        </Button>
      }
      caption={caption}
    />
  );
}

function ConfigurationCard({ data }: { data: SettingsData }) {
  const derived = <p className="fl-app-origin fl-type-caption">Sous-dossier du dossier de travail</p>;
  const subFolders: Array<{ name: Exclude<FolderName, 'travail'>; label: string }> = [
    { name: 'in', label: 'IN' },
    { name: 'out', label: 'OUT' },
    { name: 'journal', label: 'Journal' },
  ];
  return (
    <Card title="Configuration" headingLevel={2}>
      <dl className="fl-settings-list">
        <SettingsEntry
          label="Mode"
          value={data.environment === 'recette' ? <EnvironmentBadge /> : <span>Production</span>}
          caption={<OriginCaption origin={data.environmentOrigin} sourceFile={data.sourceFile} />}
        />
        <FolderEntry
          name="travail"
          label="Dossier de travail"
          path={data.folders.travail}
          caption={<OriginCaption origin={data.workFolderOrigin} sourceFile={data.sourceFile} />}
        />
        {subFolders.map(({ name, label }) => (
          <FolderEntry key={name} name={name} label={label} path={data.folders[name]} caption={derived} />
        ))}
        <SettingsEntry label="Version" value={<span className="fl-mono">{data.version}</span>} />
      </dl>
    </Card>
  );
}

function PasswordForm({ id, label, onSaved }: { id: SecretId; label: string; onSaved: () => void }) {
  const [value, setValue] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || saving) return;
    setSaving(true);
    await mockSaveSecret(id, value);
    setValue(''); // le champ est vidé après l'enregistrement
    setSaving(false);
    onSaved();
  };
  return (
    <form className="fl-secret-form" onSubmit={submit} aria-label={label}>
      <Input
        className="fl-secret-input"
        type="password"
        label="Nouveau mot de passe"
        autoComplete="new-password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={saving}
      />
      <Button type="submit" variant="secondary" loading={saving} disabled={!value && !saving}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}

function KeyImport({ onResult }: { onResult: (r: { ok: true } | { ok: false; reason: keyof typeof KEY_ERRORS }) => void }) {
  const [busy, setBusy] = React.useState(false);
  const hintId = React.useId();
  const pick = async () => {
    setBusy(true);
    const r = await mockImportKey();
    setBusy(false);
    if (r) onResult(r);
  };
  return (
    <div className="fl-secret-key">
      <Button
        variant="secondary"
        loading={busy}
        aria-describedby={hintId}
        icon={<KeyRound className="fl-icon" size={ICON.md} strokeWidth={ICON_STROKE} aria-hidden="true" />}
        onClick={pick}
      >
        {busy ? 'Import en cours…' : 'Importer la clé…'}
      </Button>
      <p className="fl-hint" id={hintId}>PPK version 2 ou OpenSSH, sans phrase secrète.</p>
    </div>
  );
}

function SecretsCard({ data, initialFeedback }: { data: SettingsData; initialFeedback?: Scenario['feedback'] }) {
  const [secrets, setSecrets] = React.useState(data.secrets);
  const [feedback, setFeedback] = React.useState<Partial<Record<SecretId, Feedback>>>(initialFeedback ?? {});
  const editable = data.role === 'admin' && !data.development;

  const markSet = (id: SecretId) => {
    setSecrets((s) => ({ ...s, [id]: { kind: 'set', date: new Date() } }));
    setFeedback((f) => ({ ...f, [id]: { tone: 'success', message: SAVED_MESSAGE[id] } }));
  };

  const description = data.development
    ? `Mode développement${NBSP}: valeurs lues dans le fichier .env.`
    : data.role === 'admin'
      ? 'Flussi est lancé en tant qu’administrateur.'
      : undefined;

  return (
    <Card title="Secrets techniques" headingLevel={2} description={description}>
      {!editable && !data.development && (
        <Alert tone="info" className="fl-secret-intro">
          Seul un administrateur peut renseigner les secrets. Lancez Flussi en tant qu’administrateur pour les remplacer.
        </Alert>
      )}
      <ul className="fl-secret-list">
        {SECRETS.map((s) => {
          const fb = feedback[s.id];
          const nameId = `secret-${s.id}`;
          return (
            <li key={s.id} className="fl-secret" aria-labelledby={nameId}>
              <div className="fl-secret-head">
                <h3 className="fl-secret-name fl-type-h5" id={nameId}>{s.label}</h3>
                <SecretStatusBadge status={secrets[s.id]} />
              </div>
              {editable && s.type === 'password' && (
                <PasswordForm id={s.id} label={s.label} onSaved={() => markSet(s.id)} />
              )}
              {editable && s.type === 'key' && (
                <KeyImport
                  onResult={(r) =>
                    r.ok ? markSet(s.id) : setFeedback((f) => ({ ...f, [s.id]: { tone: 'error', message: KEY_ERRORS[r.reason] } }))}
                />
              )}
              {editable && fb && <Alert tone={fb.tone}>{fb.message}</Alert>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** Écran Paramètres, à monter dans l'entrée de navigation du même nom. */
export function ParametresScreen({ data, initialFeedback }: { data: SettingsData; initialFeedback?: Scenario['feedback'] }) {
  return (
    <AppFrame environment={data.environment} version={data.version}>
      <h1 className="fl-app-title fl-type-h1">Paramètres</h1>
      <ConfigurationCard data={data} />
      <SecretsCard data={data} initialFeedback={initialFeedback} />
    </AppFrame>
  );
}

/* =====================================================================================
 * Aperçu : barre de variantes hors du cadre de l'application
 * ===================================================================================== */

export default function ParametresPreview() {
  const [current, setCurrent] = React.useState(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((s) => s.id === current) ?? SCENARIOS[0];
  return (
    <div className="fl-root fl-preview">
      <style>{EXTENSION_CSS}</style>
      <div className="fl-preview-toolbar" role="group" aria-label="Variante d’aperçu">
        <span className="fl-preview-label fl-type-label">Variante</span>
        {SCENARIOS.map((s, i) => (
          <Button
            key={s.id}
            size="sm"
            variant={s.id === current ? 'secondary' : 'outline'}
            aria-pressed={s.id === current}
            onClick={() => setCurrent(s.id)}
          >
            {`${i + 1}. ${s.label}`}
          </Button>
        ))}
      </div>
      {/* key : chaque variante repart de son état initial */}
      <ParametresScreen key={scenario.id} data={scenario.data} initialFeedback={scenario.feedback} />
    </div>
  );
}
