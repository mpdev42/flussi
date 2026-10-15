/**
 * Génération de l'icône de l'application : `build/icon.svg` -> `build/icon.ico`.
 *
 * Usage (depuis la racine du projet) :
 *   node scripts/icone.mjs
 *
 * Source : `build/icon.svg` (dessin vectoriel, sans texte ni police).
 * Sortie : `build/icon.ico` multi-tailles (16, 20, 24, 32, 40, 48, 64, 128, 256 px), lu par
 * electron-builder (icône de l'exécutable et de l'installeur NSIS).
 *
 * Pourquoi Electron : le poste ne dispose d'aucun outil de rendu SVG et on n'ajoute aucune
 * dépendance. Chromium, déjà présent avec Electron, rastérise le SVG à la taille finale dans un
 * <canvas> (pas de réduction d'une image 256 px). Lancé sous Node, le script relance donc le
 * binaire Electron du projet sur lui-même ; l'ICO est ensuite écrit en JavaScript pur : entrée
 * 256 px en PNG, autres tailles en BMP 32 bits (compatibles NSIS et rcedit).
 *
 * Le résultat est déterministe : deux exécutions produisent le même fichier.
 */
import { spawnSync } from 'child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const TAILLES = [16, 20, 24, 32, 40, 48, 64, 128, 256];
const TAILLE_PNG = 256;

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(racine, 'build', 'icon.svg');
const SORTIE = join(racine, 'build', 'icon.ico');

/** Sous Node : relance le binaire Electron du projet sur ce script. */
function relancerSousElectron() {
  // Sous Node, require('electron') renvoie uniquement le chemin du binaire.
  const cheminElectron = createRequire(import.meta.url)('electron');
  // VS Code et Claude Code posent ELECTRON_RUN_AS_NODE : Electron démarrerait en simple Node.
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const resultat = spawnSync(cheminElectron, [fileURLToPath(import.meta.url)], {
    cwd: racine,
    stdio: 'inherit',
    env,
  });
  if (resultat.error) {
    console.error('[icone] Lancement d’Electron impossible :', resultat.error.message);
    process.exit(1);
  }
  process.exit(resultat.status ?? 1);
}

/** Entrée ICO au format BMP 32 bits : BITMAPINFOHEADER, pixels BGRA de bas en haut, masque AND. */
function encoderBmp(taille, rgba) {
  const tailleMasqueLigne = Math.ceil(taille / 32) * 4;
  const tailleEntete = 40;
  const tailleImage = taille * taille * 4 + tailleMasqueLigne * taille;
  const tampon = Buffer.alloc(tailleEntete + tailleImage);

  tampon.writeUInt32LE(tailleEntete, 0);
  tampon.writeInt32LE(taille, 4);
  tampon.writeInt32LE(taille * 2, 8); // hauteur doublée : image XOR + masque AND
  tampon.writeUInt16LE(1, 12); // plans
  tampon.writeUInt16LE(32, 14); // bits par pixel
  tampon.writeUInt32LE(0, 16); // BI_RGB
  tampon.writeUInt32LE(tailleImage, 20);

  let decalage = tailleEntete;
  for (let y = taille - 1; y >= 0; y--) {
    for (let x = 0; x < taille; x++) {
      const i = (y * taille + x) * 4;
      tampon[decalage++] = rgba[i + 2]; // B
      tampon[decalage++] = rgba[i + 1]; // G
      tampon[decalage++] = rgba[i]; // R
      tampon[decalage++] = rgba[i + 3]; // A (non prémultiplié)
    }
  }
  // Masque AND : tout à 0 (la transparence vient du canal alpha), déjà à zéro dans le tampon.
  return tampon;
}

/** Assemble l'ICO : ICONDIR, une ICONDIRENTRY par image, puis les données. */
function assemblerIco(images) {
  const entete = Buffer.alloc(6 + images.length * 16);
  entete.writeUInt16LE(0, 0); // réservé
  entete.writeUInt16LE(1, 2); // type : icône
  entete.writeUInt16LE(images.length, 4);

  let decalage = entete.length;
  images.forEach(({ taille, donnees }, index) => {
    const o = 6 + index * 16;
    entete[o] = taille >= 256 ? 0 : taille; // 0 = 256
    entete[o + 1] = taille >= 256 ? 0 : taille;
    entete[o + 2] = 0; // pas de palette
    entete[o + 3] = 0;
    entete.writeUInt16LE(1, o + 4); // plans
    entete.writeUInt16LE(32, o + 6); // bits par pixel
    entete.writeUInt32LE(donnees.length, o + 8);
    entete.writeUInt32LE(decalage, o + 12);
    decalage += donnees.length;
  });
  return Buffer.concat([entete, ...images.map((i) => i.donnees)]);
}

/** Exécuté dans la page : rastérise le SVG à chaque taille et renvoie les pixels (et le PNG 256). */
async function rendreDansPage(urlSvg, tailles, taillePng) {
  const image = new Image();
  image.src = urlSvg;
  await image.decode();
  const resultats = [];
  for (const taille of tailles) {
    const canvas = document.createElement('canvas');
    canvas.width = taille;
    canvas.height = taille;
    const contexte = canvas.getContext('2d', { willReadFrequently: true });
    contexte.clearRect(0, 0, taille, taille);
    contexte.drawImage(image, 0, 0, taille, taille);
    resultats.push(
      taille === taillePng
        ? { taille, png: canvas.toDataURL('image/png') }
        : { taille, pixels: Array.from(contexte.getImageData(0, 0, taille, taille).data) },
    );
  }
  return resultats;
}

/** Sous Electron : rendu dans une fenêtre cachée, puis écriture de l'ICO. */
async function genererIco(app, BrowserWindow) {
  // Rendu logiciel (pas de GPU) et profil jetable : résultat reproductible, rien dans %APPDATA%.
  app.disableHardwareAcceleration();
  const profil = join(tmpdir(), 'flussi-icone');
  mkdirSync(profil, { recursive: true });
  app.setPath('userData', profil);
  await app.whenReady();

  const fenetre = new BrowserWindow({ show: false, width: 300, height: 300 });
  await fenetre.loadURL('data:text/html,<!doctype html><meta charset="utf-8"><body></body>');

  const svg = readFileSync(SOURCE);
  const urlSvg = `data:image/svg+xml;base64,${svg.toString('base64')}`;
  const resultats = await fenetre.webContents.executeJavaScript(
    `(${rendreDansPage.toString()})(${JSON.stringify(urlSvg)}, ${JSON.stringify(TAILLES)}, ${TAILLE_PNG})`,
  );
  fenetre.destroy();

  const images = resultats
    .map((r) => ({
      taille: r.taille,
      donnees: r.png
        ? Buffer.from(r.png.slice('data:image/png;base64,'.length), 'base64')
        : encoderBmp(r.taille, r.pixels),
    }))
    .sort((a, b) => a.taille - b.taille);

  const ico = assemblerIco(images);
  writeFileSync(SORTIE, ico);
  console.log(`[icone] ${SORTIE} écrit (${images.length} tailles, ${ico.length} octets).`);
}

/** Sous Electron : génère l'ICO puis quitte avec le code de sortie adapté. */
async function principal() {
  // Import dynamique : sous Node, le paquet « electron » n'exporte que le chemin du binaire.
  const { app, BrowserWindow } = await import('electron');
  try {
    await genererIco(app, BrowserWindow);
    app.exit(0);
  } catch (erreur) {
    console.error('[icone] Échec de la génération :', erreur);
    app.exit(1);
  }
}

if (!process.versions.electron) {
  relancerSousElectron();
} else {
  // Pas de await au niveau racine : Electron attend la fin du chargement du module ESM
  // avant d'émettre « ready », ce qui bloquerait app.whenReady() indéfiniment.
  principal();
}
