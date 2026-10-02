/**
 * Hook Claude Code (PostToolUse sur Edit|Write) — formate avec Prettier le fichier que Claude
 * ou un agent vient de modifier.
 *
 * Entrée : JSON sur stdin, chemin du fichier dans tool_input.file_path.
 * Ignore silencieusement les fichiers hors du projet, ceux exclus par .gitignore ou
 * .prettierignore et ceux que Prettier ne sait pas formater. Ne fait jamais échouer l'outil :
 * un fichier syntaxiquement invalide est laissé tel quel, le lint et le typecheck le signaleront.
 */
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as prettier from 'prettier';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function lireEntree() {
  let donnees = '';
  for await (const morceau of process.stdin) {
    donnees += morceau;
  }
  return JSON.parse(donnees);
}

async function formater(fichier) {
  const absolu = path.resolve(fichier);
  const relatif = path.relative(RACINE, absolu);
  if (!relatif || relatif.startsWith('..') || path.isAbsolute(relatif)) {
    return;
  }

  const info = await prettier.getFileInfo(absolu, {
    ignorePath: [path.join(RACINE, '.gitignore'), path.join(RACINE, '.prettierignore')],
  });
  if (info.ignored || !info.inferredParser) {
    return;
  }

  const source = await readFile(absolu, 'utf8');
  const options = await prettier.resolveConfig(absolu);
  const formate = await prettier.format(source, { ...options, filepath: absolu });
  if (formate !== source) {
    await writeFile(absolu, formate, 'utf8');
  }
}

try {
  const entree = await lireEntree();
  const fichier = entree.tool_input?.file_path ?? entree.tool_response?.filePath;
  if (fichier) {
    await formater(fichier);
  }
} catch (erreur) {
  // Jamais bloquant (code de sortie 0) : la trace reste visible en mode verbeux
  process.stderr.write(`claude-format : ${erreur instanceof Error ? erreur.message : erreur}\n`);
}
