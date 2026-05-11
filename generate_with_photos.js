/**
 * Génère les PDFs avec photos en place + texte français superposé.
 * Jimp découpe chaque image à la section complète,
 * Edge headless convertit l'HTML en PDF.
 */
const { Jimp, intToRGBA } = require('jimp');
const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const EDGE   = '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"';
const outDir = path.join(__dirname, 'pdfs_fr');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

/* ─── Trouve les bandes sombres horizontales (séparateurs entre pages) ─ */
function brightness(n) {
  const { r, g, b } = intToRGBA(n);
  return (r + g + b) / 3;
}

function findSeparators(img, threshold = 45, minRatio = 0.70) {
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  const bands = [];
  let inBand = false, bandStart = 0;
  const x0 = Math.floor(w * 0.05), x1 = Math.floor(w * 0.95);
  const span = x1 - x0;

  for (let y = 0; y < h; y++) {
    let dark = 0;
    for (let x = x0; x < x1; x++) {
      if (brightness(img.getPixelColor(x, y)) < threshold) dark++;
    }
    const ratio = dark / span;
    if (ratio > 0.65 && !inBand) { inBand = true; bandStart = y; }
    else if (ratio < 0.30 && inBand) {
      inBand = false;
      if (y - bandStart > 4) bands.push({ y0: bandStart, y1: y });
    }
  }
  return bands;
}

/* ─── Découpe et encode en base64 ─────────────────────────────────── */
async function cropB64(file, y0, y1) {
  const img  = await Jimp.read(path.join(__dirname, file));
  const w    = img.bitmap.width;
  const h    = img.bitmap.height;
  const sy   = Math.max(0, y0);
  const ey   = Math.min(h, y1);
  img.crop({ x: 0, y: sy, w, h: ey - sy });
  const buf  = await img.getBuffer('image/jpeg');
  return { b64: buf.toString('base64'), w, h: ey - sy };
}

/* ─── Template HTML ───────────────────────────────────────────────── */
function html(img, overlay, cat) {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 210mm; font-family: Arial, Helvetica, sans-serif; }
.wrap { position: relative; width: 100%; }
.bg   { width: 100%; display: block; height: auto; }
/* bande rouge latérale */
.side { position: absolute; top: 0; left: 0; width: 3.5%; bottom: 0;
        background: #c0392b; display: flex; align-items: center; justify-content: center; }
.side span { writing-mode: vertical-rl; transform: rotate(180deg);
             color: #fff; font-size: 6.5pt; font-weight: bold; white-space: nowrap; }
/* bloc blanc sur la zone texte (gauche) — photos visibles à droite sans rognage */
.ov { position: absolute; top: 0; left: 3.5%; width: 50%; bottom: 0;
      background: rgba(255,255,255,.97); padding: 6px 9px 6px 7px; overflow: hidden; }
h2 { font-size: 10pt; font-weight: bold; margin: 8px 0 2px; }
h3 { font-size: 9pt; font-weight: bold; margin: 6px 0 2px; }
ul { margin: 2px 0 4px 12px; padding: 0; }
li { margin-bottom: 1px; line-height: 1.25; font-size: 7.5pt; }
table { border-collapse: collapse; margin: 3px 0; font-size: 7pt; max-width: 100%; }
th { background: #ddd; padding: 2px 5px; border: 1px solid #bbb; font-weight: bold; text-align: left; }
td { padding: 2px 5px; border: 1px solid #bbb; }
tr:nth-child(even) td { background: #f5f5f5; }
.b { display:inline-block; background:#c0392b; color:#fff; font-size:6.5pt; font-weight:bold;
     border-radius:2px; padding:0 3px; margin-left:2px; vertical-align:middle; }
.ck { list-style:none; margin-left:0; }
.ck li::before { content:"✓ "; color:#c0392b; font-weight:bold; }
.two { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
</style></head>
<body>
<div class="wrap">
  <img class="bg" src="data:image/jpeg;base64,${img.b64}">
  <div class="side"><span>${cat}</span></div>
  <div class="ov">${overlay}</div>
</div>
</body></html>`;
}

/* ─── Conversion PDF via Edge ─────────────────────────────────────── */
function pdf(htmlStr, name) {
  const hf = path.join(outDir, name + '.html');
  const pf = path.join(outDir, name + '.pdf');
  fs.writeFileSync(hf, htmlStr, 'utf8');
  const url = 'file:///' + hf.replace(/\\/g, '/');
  const cmd = `${EDGE} --headless=old --disable-gpu --print-to-pdf="${pf}" --print-to-pdf-no-header "${url}"`;
  try { execSync(cmd, { timeout: 30000, stdio: 'pipe' }); console.log('✓ ' + name + '.pdf'); }
  catch(e) { console.error('✗ ' + name + ' — ' + e.message.slice(0, 100)); }
}

/* ════════════════════════════════════════════════════════════════════
   CONTENU FRANÇAIS PAR PAGE
   ════════════════════════════════════════════════════════════════════ */

const FR = {

/* ── C1 – Page 18 : Spatules ──────────────────────────────────────── */
C1: `
<h2>Spatules en Caoutchouc</h2>
<ul>
  <li>Spatule en caoutchouc dur et non poreux pour le compoundage</li>
  <li>Recommandée pour les composés qui réagissent avec le métal</li>
  <li>Nettoyable à l'eau savonneuse, à l'alcool ou par autoclavage</li>
</ul>
<table><tr><th>N° Art.</th><th>Taille lame</th></tr>
<tr><td>3091 <span class="b">A</span></td><td>4&quot; (101,6 mm)</td></tr>
<tr><td>3093</td><td>6&quot; (152,4 mm)</td></tr>
<tr><td>3095</td><td>8&quot; (203,2 mm)</td></tr></table>

<h2>Spatule avec Outil Multifonction</h2>
<ul>
  <li>Outil de coupe multifonction pivotant inclus</li>
  <li>Extrémité effilée idéale pour compter les comprimés</li>
  <li>Lame et outil de coupe en acier inoxydable ; manche en bois de rose</li>
  <li>Outil de coupe : 1¼&quot;</li>
</ul>
<table><tr><th>N° Art.</th></tr>
<tr><td>1137 <span class="b">B</span></td></tr></table>

<h2>Spatules en Acier Inoxydable</h2>
<ul>
  <li>Bords incurvés souples, manche en bois confortable</li>
  <li>Tailles 4&quot;, 6&quot; et 8&quot; recommandées par le Collège des Pharmaciens</li>
  <li>Manche en bois de rose</li>
</ul>
<table><tr><th>N° Art.</th><th>Taille lame</th></tr>
<tr><td>3042</td><td>4&quot; (101,6 mm)</td></tr>
<tr><td>3043</td><td>5&quot; (114,3 mm)</td></tr>
<tr><td>3028 <span class="b">A</span></td><td>6&quot; (152,4 mm)</td></tr>
<tr><td>3029</td><td>8&quot; (203,2 mm)</td></tr>
<tr><td>3429</td><td>10&quot; (254 mm)</td></tr>
<tr><td>3430</td><td>12&quot; (355,6 mm)</td></tr></table>

<h2>Spatules Jetables</h2>
<ul>
  <li>Noyaux creux minimisant le transfert thermique</li>
  <li>Résistantes aux acides et bases dilués</li>
  <li>Polypropylène autoclavable pour préparations stériles</li>
</ul>
<table><tr><th>N° Art.</th><th>Description</th><th>Taille</th><th>Qté</th></tr>
<tr><td>17946 <span class="b">D</span></td><td>Jetable, Opaque</td><td>210 mm</td><td>300</td></tr>
<tr><td>17947 <span class="b">E</span></td><td>Jetable, Bleue</td><td>210 mm</td><td>300</td></tr>
<tr><td>17056 <span class="b">F</span></td><td>Jetable, Verte</td><td>310 mm</td><td>150</td></tr></table>`,

/* ── C2 – Page 20 : Tampon, Plaque, Tubes à pommade ──────────────── */
C2: `
<h2>Tampon à Pommade <span class="b">A</span></h2>
<ul><li>Carré de 12&quot;</li><li>100 feuilles par bloc</li></ul>
<table><tr><th>N° Art.</th><th>Description</th><th>Qté</th></tr>
<tr><td>3088 <span class="b">A</span></td><td>Carré 12 × 12&quot;</td><td>100 feuilles</td></tr></table>

<h2>Plaque en Verre pour Pommade <span class="b">B</span></h2>
<ul>
  <li>Adaptée au mélange de diverses préparations</li>
  <li>Carré de 12&quot;, épaisseur ¼&quot;</li>
</ul>
<table><tr><th>N° Art.</th><th>Description</th></tr>
<tr><td>3098 <span class="b">B</span></td><td>Plaque carrée 12&quot;, épaisseur ¼&quot;</td></tr></table>

<h2>Tubes à Pommade</h2>
<ul>
  <li>Tubes en aluminium (A–F) idéaux pour crèmes, pommades et médicaments topiques</li>
  <li>Tube en métal blanc avec bouchon plastique et embout ophtalmique</li>
  <li>Tapissés de Téflon® — résistants aux réactions avec l'aluminium ; autoclavables</li>
  <li>Sceller en repliant les extrémités avec des pinces</li>
</ul>
<table><tr><th>N° Art.</th><th>Description</th><th>Qté</th></tr>
<tr><td>10205-01 <span class="b">C</span></td><td>Tube 5 g avec Anneau Inviolable</td><td>135</td></tr>
<tr><td>10206-01 <span class="b">D</span></td><td>Tube 10 g</td><td>100</td></tr>
<tr><td>10202 <span class="b">E</span></td><td>Tube 15 g</td><td>117</td></tr>
<tr><td>10202 <span class="b">F</span></td><td>Tube 30 g</td><td>12</td></tr>
<tr><td>10203A <span class="b">G</span></td><td>Tube 50 g</td><td>12</td></tr>
<tr><td>10204-01 <span class="b">H</span></td><td>Tube 100 g</td><td>54</td></tr>
<tr><td>4040 <span class="b">I</span></td><td>Pince pour Tube à Pommade</td><td>1</td></tr></table>`,

/* ── C3 – Page 72 : Sachets UV ────────────────────────────────────── */
C3: `
<h2>Sachets UV</h2>
<ul>
  <li>Idéaux pour médicaments photosensibles et perfusions IV</li>
  <li>Absorbent 92–98 % de la lumière dans la plage UV</li>
  <li>Étiquettes lisibles à travers le sachet — pas de double étiquetage nécessaire</li>
  <li>Sans latex · Épaisseur : 2 mil</li>
</ul>
<table><tr><th>N° Art.</th><th>Description</th><th>Taille (L × H)</th><th>Qté</th></tr>
<tr><td>ST-320-57</td><td>Sachet à ouverture fente — perfusions piggyback 250 mL</td><td>5 × 8,5&quot;</td><td>500</td></tr>
<tr><td>ST-320-60</td><td>Sachet à ouverture fente — poches ½ L (500 mL)</td><td>6 × 10&quot;</td><td>1000</td></tr>
<tr><td>ST-320-64</td><td>Sachet à ouverture fente — poches 1 L (1000 mL)</td><td>6 × 14&quot;</td><td>1000</td></tr>
<tr><td>ST-320-84D</td><td>Sachet à ouverture fente — poches 1 L (1000 mL)</td><td>8 × 14&quot;</td><td>500</td></tr>
<tr><td>ST-320-84M</td><td>Sachet à ouverture fente — flacons 1 L (1000 mL)</td><td>8 × 14&quot;</td><td>1000</td></tr>
<tr><td>ST-320-108</td><td>Sachet à ouverture fente — poches 3 L (3000 mL)</td><td>10 × 18&quot;</td><td>250</td></tr>
<tr><td>ST-320-128</td><td>Sachet à ouverture fente — poches 4 L (4000 mL)</td><td>12 × 18&quot;</td><td>250</td></tr>
<tr><td>MP-320-22</td><td>Sachet UV standard pour comprimés</td><td>2 × 2&quot;</td><td>1000</td></tr>
<tr><td>MP-320-25</td><td>Sachet UV standard pour grandes ampoules</td><td>2,5 × 5&quot;</td><td>1000</td></tr>
<tr><td>MP-320-28</td><td>Sachet UV standard pour seringues</td><td>2,5 × 8,5&quot;</td><td>1000</td></tr>
<tr><td>MP-320-314</td><td>Sachet UV standard pour grandes seringues</td><td>3 × 14&quot;</td><td>1000</td></tr>
<tr><td>MP-320-60</td><td>Sachet UV standard — perfusions piggyback 250 mL</td><td>5 × 8,5&quot;</td><td>1000</td></tr>
<tr><td>MP-320-60</td><td>Sachet UV standard — poches ½ L (500 mL)</td><td>6 × 10&quot;</td><td>1000</td></tr>
<tr><td>MP-320-64</td><td>Sachet UV standard — poches 1 L (1000 mL)</td><td>6 × 14&quot;</td><td>1000</td></tr>
<tr><td>MP-320-84</td><td>Sachet UV standard — poches 1 L (1000 mL)</td><td>8 × 14&quot;</td><td>500</td></tr>
<tr><td>MP-320-84M</td><td>Sachet UV standard — flacons 1 L (1000 mL)</td><td>8 × 14&quot;</td><td>1000</td></tr>
<tr><td>MP-320-108</td><td>Sachet UV standard — poches 3 L (3000 mL)</td><td>10 × 18&quot;</td><td>250</td></tr>
<tr><td>MP-320-128</td><td>Sachet UV standard — poches 4 L (4000 mL)</td><td>12 × 18&quot;</td><td>250</td></tr>
<tr><td>AU235</td><td>Sachet à fermeture glissière UV-Zip</td><td>3 × 5&quot;</td><td>500</td></tr>
<tr><td>AU39</td><td>Sachet à fermeture glissière UV-Zip</td><td>3 × 9&quot;</td><td>500</td></tr>
<tr><td>AU246</td><td>Sachet à fermeture glissière UV-Zip</td><td>4 × 6&quot;</td><td>1000</td></tr>
<tr><td>AU258</td><td>Sachet à fermeture glissière UV-Zip</td><td>5 × 8&quot;</td><td>500</td></tr>
<tr><td>AU269</td><td>Sachet à fermeture glissière UV-Zip</td><td>6 × 9&quot;</td><td>500</td></tr>
<tr><td>AU2814</td><td>Sachet à fermeture glissière UV-Zip</td><td>8 × 14&quot;</td><td>500</td></tr>
<tr><td>AU2912</td><td>Sachet à fermeture glissière UV-Zip</td><td>9 × 12&quot;</td><td>500</td></tr></table>`,

/* ── C4 – Page 90 : Seringues Sol-M, Sol-Care, Ventilation, 16G ───── */
C4: `
<h2>Seringues Sol-M® à Verrou Luer <span class="b">A</span></h2>
<ul>
  <li>Espace mort minimal (LDS) : réduit le médicament résiduel après injection, augmentant le nombre de doses par flacon</li>
  <li>Canon haute transparence pour visualiser le contenu</li>
  <li>Lubrification silicone pour un mouvement fluide du piston</li>
  <li>Large gamme de tailles et raccords disponibles</li>
  <li>Arrêt de plongeur prévenant le retrait accidentel</li>
  <li>Emballage individuel</li>
</ul>
<table><tr><th>N° Art.</th><th>Description</th><th>Qté</th></tr>
<tr><td>V0201 <span class="b">A</span></td><td>Sol-M® 1 mL Seringue Verrou Luer LDS (sans aiguille)</td><td>100</td></tr>
<tr><td>V0203</td><td>Seringue Verrou Luer 3 mL (sans aiguille)</td><td>100</td></tr></table>

<h2>Aiguille de Sécurité Sol-Care® <span class="b">B</span></h2>
<ul>
  <li>Bras protecteur qui enferme l'aiguille après usage — protège contre les piqûres accidentelles</li>
  <li>Deux modes d'activation : surface dure ou pouce</li>
  <li>Usage unique · Emballage individuel</li>
</ul>
<table><tr><th>N° Art.</th><th>Description</th><th>Qté</th></tr>
<tr><td>V0205</td><td>Aiguille Adulte 1&quot;</td><td>100</td></tr>
<tr><td>V0206</td><td>Aiguille 1-½&quot; (IMC élevé)</td><td>100</td></tr>
<tr><td>V0207</td><td>Aiguille 5/8&quot; (adolescents/nourrissons)</td><td>100</td></tr></table>

<h2>Aiguille de Ventilation, 20 gauge <span class="b">C</span></h2>
<ul>
  <li>Filtrée stérile — évacue les médicaments des récipients lors de la préparation</li>
  <li>Filtre hydrophobe 0,2 micron compact et facile à manipuler</li>
  <li>Aiguille 20G × ½&quot; non carotteuse, pénètre facilement tous les bouchons</li>
</ul>
<table><tr><th>N° Art.</th><th>Qté</th></tr>
<tr><td>18955 <span class="b">C</span></td><td>25</td></tr></table>

<h2>Aiguilles Stériles 16G Two-Fer <span class="b">D E</span></h2>
<ul>
  <li>Aiguille à paroi mince collée sur moyeu verrou Luer par adhésif UV</li>
  <li>Double usage : transfère liquides dans flacons fermés ET aspire sans pression négative</li>
  <li>Filtre hydrophobe empêche les matières toxiques aérosolisées de sortir</li>
  <li>Moyeux codés couleur</li>
</ul>
<table><tr><th>N° Art.</th><th>Longueur</th><th>Qté</th><th>Couleur</th></tr>
<tr><td>19003 <span class="b">D</span></td><td>1&quot;</td><td>100/boîte</td><td>Vert</td></tr>
<tr><td>16004 <span class="b">E</span></td><td>½&quot;</td><td>100/boîte</td><td>Mauve</td></tr></table>`,

/* ── C5 : Aiguille aspiration, pointe, add-port, Chemo-Vent ──────── */
C5: `
<h2>Aiguille d'Aspiration</h2>
<ul>
  <li>Canule acérée pour aspiration du liquide avant reconstitution ou pré-remplissage</li>
  <li>Emballage stérile · Sans pyrogène · Blisters individuels</li>
</ul>
<table><tr><th>N° Art.</th><th>Description</th><th>Qté</th></tr>
<tr><td>17046</td><td>19 gauge × 3&quot;</td><td>100</td></tr>
<tr><td>17047</td><td>19 gauge × 5&quot;</td><td>100</td></tr>
<tr><td>17056</td><td>16 gauge × 3,5&quot;</td><td>100</td></tr></table>

<h2>Aiguille de Remplissage en Plastique à Pointe</h2>
<ul>
  <li>Pointe acérée pénètre facilement les bouchons en caoutchouc — se fixe à un embout Luer</li>
  <li>Permet à l'air de s'échapper pendant le remplissage</li>
  <li>Jetable · Stérile</li>
</ul>
<table><tr><th>N° Art.</th><th>Qté</th></tr>
<tr><td>7723</td><td>100</td></tr></table>

<h2>Bouchon Anti-Effraction Add-Port</h2>
<ul>
  <li>Restreint l'accès au port d'ajout des poches</li>
  <li>Joint positif irréversible · Non stérile · Corps en polypropylène</li>
</ul>
<table><tr><th>N° Art.</th><th>Qté</th><th>Couleur</th></tr>
<tr><td>4858</td><td>100</td><td>Rouge</td></tr>
<tr><td>4073</td><td>25</td><td>Bleu</td></tr></table>

<h2>Aiguille de Ventilation Filtrée Chemo-Vent®</h2>
<ul>
  <li>Conçue pour reconstitution et retrait d'agents cytostatiques/antinéoplasiques</li>
  <li>Filtre hydrophobe maintient l'asepsie et empêche les matières toxiques aérosolisées</li>
  <li>Codage rouge pour identification avec agents cytotoxiques</li>
  <li>Filtre 0,2 micron · Acier inox 20G × 1,5&quot; (non réactif au cis-platine)</li>
</ul>
<table><tr><th>N° Art.</th><th>Qté</th></tr>
<tr><td>18723</td><td>25</td></tr>
<tr><td>18723-10</td><td>100</td></tr></table>`,

/* ── C6 – Page 92 : Tube transfert, Kwik-Vial ─────────────────────── */
C6: `
<h2>Ensemble de Tube de Transfert avec Pointe Ventilée</h2>
<ul>
  <li>Pointe d'admission ventilée et sortie verrou Luer — pour remplir distributeurs oraux, seringues, flacons, infuseurs, mini-poches et cassettes IV</li>
  <li>À utiliser avec raccords rapide-fill, broches de distribution ou aiguilles TwoFer 16G</li>
  <li>Tube PVC · Raccords ABS · Pince homopolymère</li>
</ul>
<table><tr><th>N° Art.</th><th>Qté</th></tr>
<tr><td>11</td><td>10</td></tr></table>

<h2>Ensemble de Tube de Transfert de Fluide</h2>
<ul>
  <li>Raccords verrou Luer mâles — aiguille, pointe verrou Luer ou broche utilisables en entrée et sortie</li>
  <li>Tube PVC · Raccords ABS · Emballage individuel, 10/boîte</li>
</ul>
<table><tr><th>N° Art.</th><th>Qté/boîte</th><th>Qté/caisse</th></tr>
<tr><td>21</td><td>1</td><td>10</td></tr></table>

<h2>Kwik-Vial™</h2>
<ul>
  <li>Fioles ambrées résistantes à la lumière, couvercles thermosoudés — pour conditionnement unitaire et distribution de médicaments liquides oraux</li>
  <li>Scellées en usine · Plateau plastique maintient les fioles en position idéale</li>
  <li>Sans latex · PEHD · Bouchon polypropylène · Couvercle laminé 3,9 mil</li>
  <li>Étiquettes compatibles : article nº 20475 (non incluses)</li>
</ul>
<table><tr><th>N° Art.</th><th>Taille</th><th>Qté</th></tr>
<tr><td>30015</td><td>15 mL</td><td>300 (50/plateau)</td></tr>
<tr><td>30030</td><td>30 mL</td><td>300 (50/plateau)</td></tr></table>`,

/* ── C7 – Page 94 : Distributeur Kwik-Vial, Extension, Pompe ─────── */
C7: `
<h2>Distributeur Kwik-Vial™</h2>
<ul>
  <li>Placement rapide et propre du bouchon Kwik-Vial™</li>
  <li>Contient suffisamment de bouchons pour un plateau complet de 50 fioles</li>
</ul>
<table><tr><th>N° Art.</th></tr>
<tr><td>30009</td></tr></table>

<h2>Extension de Remplissage Kwik-Vial™</h2>
<ul>
  <li>Se fixe à tout raccord Luer mâle pour faciliter le remplissage des fioles</li>
  <li>S'étend dans l'orifice de remplissage pour guider le liquide</li>
  <li>Chlorure de polyvinyle · Sans latex · Non stérile</li>
</ul>
<table><tr><th>N° Art.</th><th>Qté</th></tr>
<tr><td>30008</td><td>50</td></tr></table>

<h2>Pompe Répéteur</h2>
<ul>
  <li>Transfère des fluides de 0,2 mL à 9,999 mL à 13,5 mL/s avec aiguille 16G</li>
  <li>Fonction retour pour relâcher la pression de conduite entre les remplissages</li>
  <li>Mode intervalle pour éviter les appuis répétés sur démarrer/arrêter</li>
  <li>27 combinaisons de vitesses (incluant mode inverse) — pompe fluides visqueux et remplit infuseurs élastomères</li>
  <li>Mémoire 20 cellules pour standardiser les applications répétées</li>
</ul>
<table><tr><th>N° Art.</th><th>Description</th></tr>
<tr><td>99</td><td>Pompe Répéteur</td></tr>
<tr><td>30</td><td>Support pour Pompe Répéteur</td></tr>
<tr><td>32</td><td>Poteau de Sac pour Pompe Répéteur</td></tr>
<tr><td>99-PED</td><td>Pédale de Pied pour Pompe Répéteur</td></tr></table>`,

/* ── C8 : Seringues ENFit, Bouchons ENFit ─────────────────────────── */
C8: `
<h2>Seringues ENFit®</h2>
<ul>
  <li><strong>Prévention des mauvais raccordements</strong> — l'embout ENFit® nécessite un mouvement rotatif et ne s'adapte qu'aux dispositifs entéraux</li>
  <li><strong>Facile à lire</strong> — graduations de 1 mL pour précision du dosage</li>
  <li><strong>Emballage</strong> — bouchons d'embout inclus ; seringues 60 mL en poche IV refermable</li>
</ul>
<div class="two">
<div>
<h3>Seringues ENFit Transparentes</h3>
<table><tr><th>N° Art.</th><th>Description</th><th>Taille</th><th>Qté</th></tr>
<tr><td>19798-31</td><td>Faible dose</td><td>1 mL</td><td>50</td></tr>
<tr><td>19798-500</td><td>Faible dose</td><td>1 mL</td><td>500</td></tr>
<tr><td>19799-31</td><td>Faible dose</td><td>3 mL</td><td>50</td></tr>
<tr><td>19799-500</td><td>Faible dose</td><td>3 mL</td><td>500</td></tr>
<tr><td>19801-31</td><td>ENFit</td><td>10 mL</td><td>50</td></tr>
<tr><td>19801-500</td><td>ENFit</td><td>10 mL</td><td>500</td></tr></table>
</div>
<div>
<h3>Seringues ENFit Ambrées</h3>
<table><tr><th>N° Art.</th><th>Taille</th><th>Qté</th></tr>
<tr><td>20306-50/500</td><td>1 mL</td><td>50/500</td></tr>
<tr><td>20307-50/500</td><td>3 mL</td><td>50/500</td></tr>
<tr><td>20308-50/500</td><td>5 mL</td><td>50/500</td></tr>
<tr><td>20309-50/500</td><td>10 mL</td><td>50/500</td></tr>
<tr><td>20310-50/500</td><td>20 mL</td><td>50/200</td></tr>
<tr><td>20311/20311-500</td><td>35 mL</td><td>50/500</td></tr>
<tr><td>20318/20318-500</td><td>60 mL</td><td>50/500</td></tr></table>
</div>
</div>
<h2>Bouchons d'Embout ENFit</h2>
<table><tr><th>N° Art.</th><th>Description</th><th>Qté</th></tr>
<tr><td>19960</td><td>Bouchons inviolables pour seringues ENFit</td><td>100</td></tr>
<tr><td>19960-10</td><td>Bouchons inviolables pour seringues ENFit</td><td>1000</td></tr></table>`,

/* ── C9 – Page 126 : Exigences surveillance températures vaccins ─── */
C9: `
<h2>Exigences de Surveillance de la Température des Vaccins</h2>
<ul>
  <li>Les lignes directrices nationales (2015) et provinciales exigent l'enregistrement manuel des températures actuelle, minimale et maximale du réfrigérateur ET de la température ambiante, au début et à la fin de chaque journée (les températures min/max doivent être réinitialisées après chaque enregistrement) — modèles de journaux disponibles</li>
  <li>Affichage numérique à placer à l'<strong>extérieur</strong> du réfrigérateur (Ontario : résolution min. 0,1 °C), sonde au centre (de préférence dans une boîte à vaccins)</li>
  <li>Sondes à bouteille (fluide glycol bio-sécuritaire) recommandées pour une lecture plus précise</li>
  <li>Bouton de réinitialisation requis pour remettre à zéro min/max après chaque enregistrement</li>
  <li>Alarme à régler à 3 °C (bas) et 7 °C (haut) pour signaler une sortie de plage</li>
  <li>Vérification de l'étalonnage au moins une fois par an, précision ±0,5 °C (±1 °F)</li>
  <li>Indicateur de batterie faible requis — piles à remplacer tous les 6 mois</li>
</ul>

<h2>Exigences Générales de Stockage des Vaccins</h2>
<ul class="ck">
  <li>Maintenir les températures de stockage requises</li>
  <li>Maintenir un inventaire suffisant</li>
  <li>Dispositif de surveillance de la température étalonné à l'intérieur de chaque compartiment</li>
  <li>Réfrigérateur dédié exclusivement au stockage des vaccins</li>
  <li>Placer dans un endroit sécurisé</li>
  <li>Étalonnage précis à ±0,5 °C (±1 °F)</li>
  <li>Enregistrer la température du réfrigérateur deux fois par jour</li>
  <li>Contacter les autorités de santé publique si les vaccins sont hors plage de température</li>
</ul>`,

/* ── C10 : Capteur Stat Temp 3.0 NIST ────────────────────────────── */
C10: `
<h2>Capteur Réfrigérateur/Congélateur Certifié NIST — Stat Temp 3.0</h2>
<ul>
  <li><strong>Capteur intégré</strong> — boîtier silicone incassable placé entre les fils des clayettes</li>
  <li><strong>Journalisation Wi-Fi</strong> — fréquence réglable de 5 à 30 min (réseaux 2,4 GHz uniquement)</li>
  <li><strong>Connectivité maillée</strong> — extension de couverture entre appareils sans Wi-Fi direct</li>
  <li><strong>Tableau de bord automatique</strong> — connexion unique au site stat-temp.io</li>
  <li><strong>Rapports mobiles</strong> — accès via ordinateur, tablette ou téléphone</li>
  <li><strong>Aucun abonnement</strong> · Stockage illimité · Portails par emplacement</li>
  <li>Alertes configurables par texto, courriel ou appel avec accusé de réception</li>
  <li>Alimentation USB-C · Batterie de secours 3 jours · Journal Min/Max 24 h</li>
  <li>Certificat NIST valable 4 ans inclus</li>
</ul>
<table><tr><th>N° Art.</th><th>Description</th><th>Plage de température</th><th>Précision</th><th>Dimensions</th></tr>
<tr><td>21266</td><td>Capteur simple</td><td>-50 °C à 50 °C</td><td>±0,2 °C</td><td>4&quot;×2½&quot;×1&quot;</td></tr>
<tr><td>21268</td><td>Capteur double</td><td>-50 °C à 50 °C</td><td>±0,2 °C</td><td>4&quot;×2½&quot;×1&quot;</td></tr>
<tr><td>21270</td><td>Capteur ambiant</td><td>-40 °C à 85 °C</td><td>±0,2 °C</td><td>4&quot;×2½&quot;×1&quot;</td></tr>
<tr><td>21272</td><td>Capteur ultra-froid</td><td>-100 °C à -50 °C</td><td>±0,5 °C</td><td>4&quot;×2½&quot;×1&quot;</td></tr></table>`,

/* ── C12 – Page 128 : Thermomètres Traçables ─────────────────────── */
C12: `
<h2>Thermomètres Traçables®</h2>
<ul>
  <li>Affichage triple : températures actuelle, minimale et maximale simultanément</li>
  <li>Certificat Traçable® ISO 17025 (accrédité A2LA), valable 1 an — réétalonnage à la charge du client</li>
  <li>Indicateur de batterie faible · Alarme si hors seuil défini</li>
  <li>Plage : -50 °C à 70 °C (-58 °F à 158 °F)</li>
  <li>Piles et équipements de montage inclus (supports, mural, Velcro®, languettes magnétiques)</li>
</ul>
<p style="font-size:7.5pt;color:#555;margin:2px 0 6px;">Lit la température ambiante ET la sonde externe — programmable par incréments de 1°</p>
<table><tr><th>N° Art.</th><th>Description</th><th>Type de sonde</th><th>Dimensions (L×H×P)</th></tr>
<tr><td>14144 <span class="b">A</span></td><td>Réfrigérateur/Congélateur Traçable®</td><td>Sonde bouteille 5 mL</td><td>2-3/4×4-1/4×3/4&quot;</td></tr>
<tr><td>10367 <span class="b">B</span></td><td>Réfrigérateur/Congélateur Traçable®</td><td>Sonde ambiante</td><td>2-3/4×4-1/4×3/4&quot;</td></tr>
<tr><td>10368</td><td>Réfrigérateur/Congélateur Traçable®</td><td>Sonde ambiante</td><td>2-3/4×4-1/4×3/4&quot;</td></tr>
<tr><td>17751</td><td>Jumbo Réfrigérateur/Congélateur Traçable®</td><td>Sonde bouteille 10 mL</td><td>3-7/8×4-3/8×7/8&quot;</td></tr>
<tr><td>17752</td><td>Jumbo Réfrigérateur/Congélateur Traçable®</td><td>Sonde bouteille 5 mL</td><td>3-7/8×4-3/8×7/8&quot;</td></tr>
<tr><td>17750 <span class="b">E</span></td><td>Jumbo Réfrigérateur/Congélateur Traçable®</td><td>Sonde ambiante</td><td>3-7/8×4-3/8×7/8&quot;</td></tr>
<tr><td>14140</td><td>Haute Résolution Réfrig./Congélateur Plus™</td><td>Sonde bouteille 10 mL</td><td>3-1/4×2-15/16×5/8&quot;</td></tr>
<tr><td>10366 <span class="b">F</span></td><td>Réfrigérateur/Congélateur Traçable®</td><td>2 sondes 10 mL</td><td>3-1/2×1-3/4×1&quot;</td></tr>
<tr><td>10369</td><td>Extension sonde double Traçable® pour #10366</td><td>2 sondes ambiantes</td><td>3-1/2×1-3/4×1&quot;</td></tr></table>`

}; // end FR

/* ════════════════════════════════════════════════════════════════════
   PIPELINE : analyse Jimp → crop → HTML → PDF
   ════════════════════════════════════════════════════════════════════ */

// For each file: which section is "complete" (top, middle, or bottom)
const PAGES = [
  { name:'C1',  file:'C1 .jpeg', section:'middle', cat:'Compoundage &amp; Accessoires de Distribution' },
  { name:'C2',  file:'c2.jpeg',  section:'middle', cat:'Compoundage &amp; Accessoires de Distribution' },
  { name:'C3',  file:'c3.jpeg',  section:'top',    cat:'Contenants &amp; Accessoires de Distribution' },
  { name:'C4',  file:'c4.jpeg',  section:'middle', cat:'Administration des Médicaments' },
  { name:'C5',  file:'c5.jpeg',  section:'middle', cat:'Administration des Médicaments' },
  { name:'C6',  file:'C6.jpeg',  section:'middle', cat:'Administration des Médicaments' },
  { name:'C7',  file:'C7.jpeg',  section:'middle', cat:'Administration des Médicaments' },
  { name:'C8',  file:'C8.jpeg',  section:'middle', cat:'Administration des Médicaments' },
  { name:'C9',  file:'C9.jpeg',  section:'middle', cat:'Surveillance de Température &amp; Stockage' },
  { name:'C10', file:'C10.jpeg', section:'middle', cat:'Surveillance de Température &amp; Stockage' },
  { name:'C12', file:'C12.jpeg', section:'middle', cat:'Surveillance de Température &amp; Stockage' },
];

(async () => {
  for (const p of PAGES) {
    console.log(`\nTraitement de ${p.name}...`);
    const filePath = path.join(__dirname, p.file);
    if (!fs.existsSync(filePath)) { console.error('  ✗ Fichier introuvable : ' + p.file); continue; }

    const imgObj = await Jimp.read(filePath);
    const H = imgObj.bitmap.height;
    const bands = findSeparators(imgObj);

    console.log(`  Séparateurs trouvés : ${bands.length} — ${bands.map(b => `[${b.y0}–${b.y1}]`).join(', ')}`);

    let y0, y1;
    if (bands.length === 0) {
      // Pas de séparateur détecté — prendre toute l'image
      y0 = 0; y1 = H;
    } else if (p.section === 'top') {
      y0 = 0;
      y1 = bands[0].y0;
    } else if (p.section === 'bottom') {
      y0 = bands[bands.length - 1].y1;
      y1 = H;
    } else { // 'middle'
      y0 = bands[0].y1;
      y1 = bands.length > 1 ? bands[bands.length - 1].y0 : H;
    }

    console.log(`  Découpe : y=${y0} → y=${y1}`);
    const imgData = await cropB64(p.file, y0, y1);
    const htmlStr = html(imgData, FR[p.name], p.cat);
    pdf(htmlStr, p.name);
  }

  console.log('\n✅  Terminé. PDFs dans : ' + outDir);
})();
