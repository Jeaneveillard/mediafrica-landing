const { Jimp } = require('jimp');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE = '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"';
const outDir = path.join(__dirname, 'pdfs_fr');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

async function processPage7() {
  const imgObj = await Jimp.read(path.join(__dirname, 'page7.jpeg'));
  const buf = await imgObj.getBuffer('image/jpeg');
  const b64 = buf.toString('base64');

  const htmlStr = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 210mm; font-family: Arial, Helvetica, sans-serif; }
.wrap { position: relative; width: 100%; }
.bg   { width: 100%; display: block; height: auto; }

/* Obscuring text while keeping photos */
.box { position: absolute; background: rgba(255, 255, 255, 1); padding: 8px 14px; overflow: hidden; }

/* 1. Stat Temp (Top Left) */
.b1 { top: 3%; left: 4%; width: 55%; height: 27%; }
/* 2. Pharmacy Labels (Middle Right) */
.b2 { top: 30%; left: 46%; width: 52%; height: 23%; }
/* 3. Bag Caddy (Bottom Left) */
.b3 { top: 55.5%; left: 4%; width: 70%; height: 11.5%; }
/* 4. Acrylic Dispenser (Bottom Right) */
.b4 { top: 70%; left: 37%; width: 61%; height: 21%; }

h2 { font-size: 10pt; font-weight: bold; margin: 4px 0 3px; color: #222; }
ul { margin: 2px 0 6px 14px; padding: 0; }
li { margin-bottom: 2px; line-height: 1.25; font-size: 8pt; color: #333; }
table { border-collapse: collapse; margin: 4px 0; font-size: 7.5pt; width: 100%; }
th { background: #ddd; padding: 3px 5px; border: 1px solid #bbb; font-weight: bold; text-align: left; }
td { padding: 3px 5px; border: 1px solid #bbb; }
tr:nth-child(even) td { background: #f5f5f5; }
.b { display:inline-block; background:#c0392b; color:#fff; font-size:7pt; font-weight:bold; border-radius:2px; padding:0 4px; margin-left:3px; vertical-align:middle; }
</style></head>
<body>
<div class="wrap">
  <img class="bg" src="data:image/jpeg;base64,${b64}">
  
  <div class="box b1">
    <h2>Capteur Réfrigérateur/Congélateur Certifié NIST — Stat Temp 3.0</h2>
    <ul>
      <li><strong>Capteur intégré</strong> — boîtier incassable placé sur les clayettes</li>
      <li><strong>Journalisation Wi-Fi</strong> — fréquence réglable de 5 à 30 min</li>
      <li><strong>Aucun frais</strong> — sans abonnement</li>
      <li>Dimensions : 4&quot;L x 2½&quot;H x 1&quot;P</li>
    </ul>
    <table><tr><th>N° Art.</th><th>Description</th><th>Plage de temp.</th><th>Précision</th></tr>
    <tr><td>21266</td><td>Capteur simple</td><td>-50 °C à 50 °C</td><td>±0,2 °C</td></tr>
    <tr><td>21268</td><td>Capteur double</td><td>-50 °C à 50 °C</td><td>±0,2 °C</td></tr>
    <tr><td>21270</td><td>Capteur ambiant</td><td>-40 °C à 85 °C</td><td>±0,2 °C</td></tr>
    <tr><td>21272</td><td>Capteur ultra-froid</td><td>-100 °C à -50 °C</td><td>±0,5 °C</td></tr></table>
  </div>
  
  <div class="box b2">
    <h2>Étiquettes de Prescription de Pharmacie</h2>
    <ul>
      <li>Pré-imprimées en jaune et rose</li>
      <li>Couche de finition anti-bavure pour la durabilité</li>
      <li>Espace pour imprimer jusqu'à 5 étiquettes auxiliaires</li>
      <li>Compatibles Kroll, Fillware, PharmaClik, PropelRx</li>
      <li>Compatibles imprimantes bureau Zebra ZD/GK</li>
    </ul>
    <table><tr><th>N° Art.</th><th>Dimensions (L x H)</th><th>Qté</th></tr>
    <tr><td>80411 <span class="b">A</span></td><td>2&quot; x 4.5&quot;</td><td>500 / rouleau</td></tr>
    <tr><td>80412 <span class="b">B</span></td><td>3.375&quot; x 4.25&quot;</td><td>900 / rouleau</td></tr></table>
  </div>
  
  <div class="box b3">
    <h2>Support pour Sacs de Prescription Suspendus</h2>
    <ul>
      <li>Conçu pour l'utilisation avec sacs suspendus</li>
      <li>Contient jusqu'à 40 sacs</li>
      <li>Idéal pour organiser les sacs à réutiliser</li>
      <li>Dimensions : 6&quot;L x 16.5&quot;H x 7&quot;P</li>
    </ul>
    <table><tr><th>N° Art.</th></tr><tr><td>17545 <span class="b">C</span></td></tr></table>
  </div>
  
  <div class="box b4">
    <h2>Distributeur d'Étiquettes en Acrylique avec Séparateurs</h2>
    <ul>
      <li><strong>Rangement personnalisable :</strong> 6 séparateurs amovibles</li>
      <li><strong>Design transparent :</strong> Visibilité rapide des étiquettes</li>
      <li><strong>Garde les étiquettes propres :</strong> Empêche les emmêlements</li>
      <li><strong>Optimise le flux de travail :</strong> Accès rapide à une main</li>
      <li>Dimensions : 34.5 x 9 x 18 cm</li>
    </ul>
    <table><tr><th>N° Art.</th></tr><tr><td>12722</td></tr></table>
  </div>

</div>
</body></html>`;

  const name = 'page7_traduit';
  const hf = path.join(outDir, name + '.html');
  const pf = path.join(__dirname, 'catalogue_traduit_page7.pdf'); // save to root as user asked
  fs.writeFileSync(hf, htmlStr, 'utf8');
  const url = 'file:///' + hf.replace(/\\/g, '/');
  
  const cmd = `${EDGE} --headless=old --disable-gpu --print-to-pdf="${pf}" --print-to-pdf-no-header "${url}"`;
  try { 
    execSync(cmd, { timeout: 30000, stdio: 'pipe' }); 
    console.log('✅ PDF generated successfully: catalogue_traduit_page7.pdf'); 
  }
  catch(e) { console.error('✗ Erreur: ' + e.message); }
}

processPage7().catch(console.error);
