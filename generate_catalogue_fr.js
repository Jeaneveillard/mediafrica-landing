/**
 * Génère les PDFs traduits en français du catalogue PharmaSystems.
 * Chaque photo C1–C12 (sans C11) → une seule PDF contenant les pages COMPLÈTES.
 */
const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const EDGE   = '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"';
const outDir = path.join(__dirname, 'pdfs_fr');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const CONTACT = 'Tél : 905.475.2500 &nbsp; Sans frais : 1.888.475.2500 | Fax : 905.475.7155 &nbsp; Sans frais : 1.888.475.7155<br>Courriel : Orders@PharmaSystems.com';

/* ─── HTML TEMPLATE ─────────────────────────────────────────────────── */
function page(category, pageNum, body) {
  const footer = pageNum
    ? `<div class="footer">
         <span><strong>${pageNum}</strong> | Voir le catalogue et passer des commandes en ligne : <strong>www.PharmaSystems.com</strong></span>
         <span class="contact">${CONTACT}</span>
       </div>`
    : `<div class="footer"><span></span><span class="contact">${CONTACT}</span></div>`;

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<style>
  @page { size: A4; margin: 14mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; margin: 0; }
  .wrap { display: flex; gap: 0; }
  .side { writing-mode: vertical-rl; transform: rotate(180deg); background: #c0392b; color: #fff;
          font-size: 8.5pt; font-weight: bold; padding: 8px 4px; white-space: nowrap; flex-shrink: 0; }
  .main { flex: 1; padding: 6px 18px; }
  h2 { font-size: 12.5pt; font-weight: bold; margin: 14px 0 3px; }
  h3 { font-size: 11pt; font-weight: bold; margin: 12px 0 2px; }
  ul { margin: 3px 0 7px 16px; padding: 0; }
  li { margin-bottom: 2px; line-height: 1.35; }
  table { border-collapse: collapse; margin: 6px 0; font-size: 9pt; }
  th { background: #ddd; padding: 3px 9px; border: 1px solid #bbb; text-align: left; font-weight: bold; }
  td { padding: 3px 9px; border: 1px solid #bbb; }
  tr:nth-child(even) td { background: #f7f7f7; }
  .b { display:inline-block; background:#c0392b; color:#fff; font-size:7.5pt; font-weight:bold;
       border-radius:3px; padding:0 4px; margin-left:3px; vertical-align:middle; }
  .check-list { list-style: none; margin-left: 0; padding: 0; }
  .check-list li::before { content: "✓ "; color: #c0392b; font-weight: bold; }
  .box { background: #f2f2f2; border: 1px solid #ccc; border-radius: 4px; padding: 8px 12px; margin: 8px 0; }
  .footer { border-top: 2px solid #c0392b; margin-top: 16px; padding-top: 5px;
            display: flex; justify-content: space-between; font-size: 8.5pt; color: #444; }
  .contact { text-align: right; line-height: 1.4; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
</style>
</head><body>
<div class="wrap">
  <div class="side">${category}</div>
  <div class="main">${body}${footer}</div>
</div>
</body></html>`;
}

/* ─── PDF BUILDER ────────────────────────────────────────────────────── */
function build(html, name) {
  const htmlFile = path.join(outDir, name + '.html');
  const pdfFile  = path.join(outDir, name + '.pdf');
  fs.writeFileSync(htmlFile, html, 'utf8');
  const url = 'file:///' + htmlFile.replace(/\\/g, '/');
  const cmd = `${EDGE} --headless=old --disable-gpu --print-to-pdf="${pdfFile}" --print-to-pdf-no-header "${url}"`;
  try {
    execSync(cmd, { timeout: 30000, stdio: 'pipe' });
    console.log('✓ ' + name + '.pdf');
  } catch (e) {
    console.error('✗ ' + name + ' — ' + e.message.slice(0, 120));
  }
}

/* ══════════════════════════════════════════════════════════════════════
   C1 – Page 18  |  Compoundage & Accessoires de Distribution
   Contenu complet : Spatules (caoutchouc, multifonction, inox, jetables)
   ══════════════════════════════════════════════════════════════════════ */
build(page('Compoundage &amp; Accessoires de Distribution', 18, `
<h2>Spatules en Caoutchouc</h2>
<ul>
  <li>Spatule en caoutchouc dur et non poreux pour le compoundage</li>
  <li>Recommandée pour les composés qui réagissent avec le métal</li>
  <li>Peut être nettoyée avec de l'eau et du savon, de l'alcool ou par autoclavage</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Taille de la lame</th></tr>
  <tr><td>3091 <span class="b">A</span></td><td>4&quot; (101,6 mm)</td></tr>
  <tr><td>3093</td><td>6&quot; (152,4 mm)</td></tr>
  <tr><td>3095</td><td>8&quot; (203,2 mm)</td></tr>
</table>

<h2>Spatule avec Outil Multifonction</h2>
<ul>
  <li>Comprend un outil de coupe multifonction pivotant</li>
  <li>Extrémité effilée idéale pour compter les comprimés</li>
  <li>La lame et l'outil de coupe sont en acier inoxydable ; le manche est en bois de rose</li>
  <li>L'outil de coupe mesure 1¼&quot;</li>
</ul>
<table>
  <tr><th>N° Art.</th></tr>
  <tr><td>1137 <span class="b">B</span></td></tr>
</table>

<h2>Spatules en Acier Inoxydable</h2>
<ul>
  <li>Bords incurvés souples avec un confortable manche en bois</li>
  <li>Les spatules de 4&quot;, 6&quot; et 8&quot; sont recommandées par le Collège des Pharmaciens</li>
  <li>Le manche est en bois de rose</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Taille de la lame</th></tr>
  <tr><td>3042</td><td>4&quot; (101,6 mm)</td></tr>
  <tr><td>3043</td><td>5&quot; (114,3 mm)</td></tr>
  <tr><td>3028 <span class="b">A</span></td><td>6&quot; (152,4 mm)</td></tr>
  <tr><td>3029</td><td>8&quot; (203,2 mm)</td></tr>
  <tr><td>3429</td><td>10&quot; (254 mm)</td></tr>
  <tr><td>3430</td><td>12&quot; (355,6 mm)</td></tr>
</table>

<h2>Spatules Jetables</h2>
<ul>
  <li>Noyaux creux uniques minimisant le transfert thermique</li>
  <li>Résistantes aux acides et bases dilués</li>
  <li>Polypropylène autoclavable utilisable pour les préparations stériles</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Description</th><th>Taille</th><th>Qté</th></tr>
  <tr><td>17946 <span class="b">D</span></td><td>Jetable, Opaque</td><td>210 mm</td><td>300</td></tr>
  <tr><td>17947 <span class="b">E</span></td><td>Jetable, Bleue</td><td>210 mm</td><td>300</td></tr>
  <tr><td>17056 <span class="b">F</span></td><td>Jetable, Verte</td><td>310 mm</td><td>150</td></tr>
</table>
`), 'C1');

/* ══════════════════════════════════════════════════════════════════════
   C2 – Page 20  |  Compoundage & Accessoires de Distribution
   Contenu complet : Tampon à pommade, Plaque en verre, Tubes à pommade
   ══════════════════════════════════════════════════════════════════════ */
build(page('Compoundage &amp; Accessoires de Distribution', 20, `
<h2>Tampon à Pommade <span class="b">A</span></h2>
<ul>
  <li>Carré de 12&quot;</li>
  <li>100 feuilles par bloc</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Description</th><th>Qté</th></tr>
  <tr><td>3088 <span class="b">A</span></td><td>Carré 12 x 12&quot;</td><td>100 feuilles</td></tr>
</table>

<h2>Plaque en Verre pour Pommade <span class="b">B</span></h2>
<ul>
  <li>Plaque en verre pour pommade, adaptée au mélange de diverses préparations</li>
  <li>Carré de 12&quot;</li>
  <li>Épaisseur de ¼&quot;</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Description</th></tr>
  <tr><td>3098 <span class="b">B</span></td><td>Plaque carrée 12&quot;, épaisseur ¼&quot;</td></tr>
</table>

<h2>Tubes à Pommade</h2>
<ul>
  <li>Tubes à Pommade en Aluminium (A–F)</li>
  <li>Idéaux pour les crèmes, pommades et médicaments topiques</li>
  <li>Tube en métal blanc avec bouchon plastique et embout ophtalmique plastique — les tubes sont tapissés de Téflon® pour éviter le collage ou les réactions avec l'aluminium ; autoclavables</li>
  <li>Sceller en repliant les extrémités avec des pinces</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Description</th><th>Qté</th></tr>
  <tr><td>10205-01 <span class="b">C</span></td><td>Tube à Pommade Aluminium 5 g, avec Anneau Inviolable</td><td>135</td></tr>
  <tr><td>10206-01 <span class="b">D</span></td><td>Tube à Pommade Aluminium 10 g</td><td>100</td></tr>
  <tr><td>10202 <span class="b">E</span></td><td>Tube à Pommade Aluminium 15 g</td><td>117</td></tr>
  <tr><td>10202 <span class="b">F</span></td><td>Tube à Pommade Aluminium 30 g</td><td>12</td></tr>
  <tr><td>10203A <span class="b">G</span></td><td>Tube à Pommade Aluminium 50 g</td><td>12</td></tr>
  <tr><td>10204-01 <span class="b">H</span></td><td>Tube à Pommade Aluminium 100 g</td><td>54</td></tr>
  <tr><td>4040 <span class="b">I</span></td><td>Pince pour Tube à Pommade</td><td>1</td></tr>
</table>
`), 'C2');

/* ══════════════════════════════════════════════════════════════════════
   C3 – Page 72  |  Contenants & Accessoires de Distribution
   Contenu complet : Sachets UV (tableau complet)
   ══════════════════════════════════════════════════════════════════════ */
build(page('Contenants &amp; Accessoires de Distribution', 72, `
<h2>Sachets UV</h2>
<ul>
  <li>Idéaux pour les médicaments photosensibles et les perfusions IV</li>
  <li>Les sachets ambrés absorbent 92 à 98 % de la lumière dans la plage UV</li>
  <li>Les étiquettes peuvent être lues à travers les sachets ambrés, éliminant le besoin d'un double étiquetage</li>
  <li>Sans latex</li>
  <li>Épaisseur : 2 mil</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Description</th><th>Taille (L x H)</th><th>Qté</th></tr>
  <tr><td>ST-320-57</td><td>Sachet UV à ouverture fente pour perfusions piggyback (250 mL)</td><td>5 x 8,5&quot;</td><td>500</td></tr>
  <tr><td>ST-320-60</td><td>Sachet UV à ouverture fente pour poches IV ½ litre (500 mL)</td><td>6 x 10&quot;</td><td>1000</td></tr>
  <tr><td>ST-320-64</td><td>Sachet UV à ouverture fente pour poches IV 1 litre (1000 mL)</td><td>6 x 14&quot;</td><td>1000</td></tr>
  <tr><td>ST-320-84D</td><td>Sachet UV à ouverture fente pour poches IV 1 litre (1000 mL)</td><td>8 x 14&quot;</td><td>500</td></tr>
  <tr><td>ST-320-84M</td><td>Sachet UV à ouverture fente pour flacons IV 1 litre (1000 mL)</td><td>8 x 14&quot;</td><td>1000</td></tr>
  <tr><td>ST-320-108</td><td>Sachet UV à ouverture fente pour poches IV 3 litres (3000 mL)</td><td>10 x 18&quot;</td><td>250</td></tr>
  <tr><td>ST-320-128</td><td>Sachet UV à ouverture fente pour poches IV 4 litres (4000 mL)</td><td>12 x 18&quot;</td><td>250</td></tr>
  <tr><td>MP-320-22</td><td>Sachet UV standard pour comprimés</td><td>2 x 2&quot;</td><td>1000</td></tr>
  <tr><td>MP-320-25</td><td>Sachet UV standard pour grandes ampoules</td><td>2,5 x 5&quot;</td><td>1000</td></tr>
  <tr><td>MP-320-28</td><td>Sachet UV standard pour seringues</td><td>2,5 x 8,5&quot;</td><td>1000</td></tr>
  <tr><td>MP-320-314</td><td>Sachet UV standard pour grandes seringues</td><td>3 x 14&quot;</td><td>1000</td></tr>
  <tr><td>MP-320-60</td><td>Sachet UV standard pour perfusions piggyback (250 mL)</td><td>5 x 8,5&quot;</td><td>1000</td></tr>
  <tr><td>MP-320-60</td><td>Sachet UV standard pour poches IV ½ litre (500 mL)</td><td>6 x 10&quot;</td><td>1000</td></tr>
  <tr><td>MP-320-64</td><td>Sachet UV standard pour poches IV 1 litre (1000 mL)</td><td>6 x 14&quot;</td><td>1000</td></tr>
  <tr><td>MP-320-84</td><td>Sachet UV standard pour poches IV 1 litre (1000 mL)</td><td>8 x 14&quot;</td><td>500</td></tr>
  <tr><td>MP-320-84M</td><td>Sachet UV standard pour flacons IV 1 litre (1000 mL)</td><td>8 x 14&quot;</td><td>1000</td></tr>
  <tr><td>MP-320-108</td><td>Sachet UV standard pour poches IV 3 litres (3000 mL)</td><td>10 x 18&quot;</td><td>250</td></tr>
  <tr><td>MP-320-128</td><td>Sachet UV standard pour poches IV 4 litres (4000 mL)</td><td>12 x 18&quot;</td><td>250</td></tr>
  <tr><td>AU235</td><td>Sachets à fermeture à glissière UV-Zip</td><td>3 x 5&quot;</td><td>500</td></tr>
  <tr><td>AU39</td><td>Sachets à fermeture à glissière UV-Zip</td><td>3 x 9&quot;</td><td>500</td></tr>
  <tr><td>AU246</td><td>Sachets à fermeture à glissière UV-Zip</td><td>4 x 6&quot;</td><td>1000</td></tr>
  <tr><td>AU258</td><td>Sachets à fermeture à glissière UV-Zip</td><td>5 x 8&quot;</td><td>500</td></tr>
  <tr><td>AU269</td><td>Sachets à fermeture à glissière UV-Zip</td><td>6 x 9&quot;</td><td>500</td></tr>
  <tr><td>AU2814</td><td>Sachets à fermeture à glissière UV-Zip</td><td>8 x 14&quot;</td><td>500</td></tr>
  <tr><td>AU2912</td><td>Sachets à fermeture à glissière UV-Zip</td><td>9 x 12&quot;</td><td>500</td></tr>
</table>
`), 'C3');

/* ══════════════════════════════════════════════════════════════════════
   C4 – Page 90  |  Administration des Médicaments
   Contenu complet : Sol-M® Seringues, Sol-Care® Aiguille de sécurité,
                     Aiguille de ventilation 20G, Aiguilles 16G Two-Fer
   ══════════════════════════════════════════════════════════════════════ */
build(page('Administration des Médicaments', 90, `
<h2>Seringues Sol-M® à Verrou Luer</h2>
<ul>
  <li>Les seringues Sol-M® à espace mort minimal (LDS) réduisent l'"espace mort", c'est-à-dire le volume dans la seringue qui retient le médicament après l'injection. Minimiser cet espace mort améliore l'efficacité de l'administration des médicaments en réduisant le nombre de doses gaspillées à chaque flacon.</li>
  <li>Les seringues LDS augmentent le nombre de doses obtenues par flacon</li>
  <li>Canon haute transparence pour visualiser facilement le contenu</li>
  <li>Lubrification au silicone pour un mouvement fluide du piston</li>
  <li>Seringue à verrou Luer disponible dans une large gamme de tailles et de combinaisons de raccords</li>
  <li>Arrêt de plongeur sûr pour éviter le retrait accidentel du piston</li>
  <li>Emballage individuel</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Description</th><th>Qté</th></tr>
  <tr><td>V0201 <span class="b">A</span></td><td>Sol-M® 1 mL Seringue à Verrou Luer à Espace Mort Minimal (sans aiguille)</td><td>100</td></tr>
  <tr><td>V0203</td><td>Seringue à Verrou Luer 3 mL (sans aiguille)</td><td>100</td></tr>
</table>

<h2>Aiguille de Sécurité Sol-Care® <span class="b">B</span></h2>
<ul>
  <li>L'Aiguille de Sécurité Sol-Care™ est une aiguille hypodermique à usage unique, standard, avec un bras protecteur utilisé pour enfermer l'aiguille après usage, afin de protéger les professionnels de santé des blessures par piqûre d'aiguille</li>
  <li>En position activée, le bras protecteur empêche tout contact accidentel avec l'aiguille lors de la manipulation et de l'élimination de la combinaison aiguille/seringue usagée</li>
  <li>Deux options d'activation du bras protecteur : activation par surface dure et activation par pouce</li>
  <li>Mécanisme simple à bouclier de sécurité à activation par pouce</li>
  <li>Emballage individuel</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Description</th><th>Qté</th></tr>
  <tr><td>V0205</td><td>Aiguille Adulte 1&quot; (Adulte)</td><td>100</td></tr>
  <tr><td>V0206</td><td>Aiguille de Sécurité 1-½&quot; (Pour IMC élevé)</td><td>100</td></tr>
  <tr><td>V0207</td><td>Aiguille de Sécurité 5/8&quot; (Adolescents/Nourrissons)</td><td>100</td></tr>
</table>

<h2>Aiguille de Ventilation, 20 gauge <span class="b">C</span></h2>
<ul>
  <li>Aiguille de ventilation filtrée stérile conçue pour les pharmaciens et autres spécialistes pour évacuer les médicaments des récipients lors de la préparation et de la distribution</li>
  <li>Peut être utilisée avec n'importe quel flacon ou bouteille</li>
  <li>La tête de filtre hydrophobe 0,2 micron est compacte et facile à manipuler</li>
  <li>Aiguille en acier inoxydable 20 gauge x ½&quot; non carotteuse pénètre facilement tous les bouchons avec un risque minimal de dommages</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Qté</th></tr>
  <tr><td>18955 <span class="b">C</span></td><td>25</td></tr>
</table>

<h2>Aiguilles Stériles 16G Two-Fer <span class="b">D E</span></h2>
<ul>
  <li>Aiguille en acier inoxydable à paroi mince collée sur un moyeu de verrou Luer par adhésif UV</li>
  <li>Peut être utilisée avec n'importe quel flacon ou bouteille</li>
  <li>Fonctionne comme un filtre haute efficacité, la membrane de filtre hydrophobe empêche les matières toxiques, aérosolisées de sortir du récipient lors du remplissage</li>
  <li>Aiguille à double usage : transfère les liquides dans des flacons fermés sans surpression, transfère les liquides à volume élevé à l'aide de pompes et répéteurs, et aspire la solution des flacons sans créer de pression négative</li>
  <li>Les moyeux sont codés par couleur pour l'identification</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Longueur</th><th>Qté</th><th>Couleur</th></tr>
  <tr><td>19003 <span class="b">D</span></td><td>1&quot;</td><td>100/boîte</td><td>Vert</td></tr>
  <tr><td>16004 <span class="b">E</span></td><td>½&quot;</td><td>100/boîte</td><td>Mauve</td></tr>
</table>
`), 'C4');

/* ══════════════════════════════════════════════════════════════════════
   C5  |  Administration des Médicaments
   Contenu complet : Aiguille d'aspiration, Aiguille de remplissage
                     à pointe, Bouchon anti-effraction Add-Port,
                     Aiguille filtrée Chemo-Vent®
   ══════════════════════════════════════════════════════════════════════ */
build(page('Administration des Médicaments', '', `
<h2>Aiguille d'Aspiration</h2>
<ul>
  <li>La canule acérée est utilisée pour aspirer le liquide en vue de la reconstitution ou du pré-remplissage des seringues</li>
  <li>Emballage stérile</li>
  <li>Sans pyrogène</li>
  <li>Blisters individuels</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Description</th><th>Qté</th></tr>
  <tr><td>17046</td><td>19 gauge x 3&quot;</td><td>100</td></tr>
  <tr><td>17047</td><td>19 gauge x 5&quot;</td><td>100</td></tr>
  <tr><td>17056</td><td>16 gauge x 3,5&quot;</td><td>100</td></tr>
</table>

<h2>Aiguille de Remplissage en Plastique à Pointe</h2>
<ul>
  <li>La pointe aiguisée pénètre facilement les bouchons en caoutchouc pour le remplissage — se fixe à un embout Luer</li>
  <li>Permet à l'air de s'échapper pendant le remplissage</li>
  <li>Jetable</li>
  <li>Stérile</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Qté</th></tr>
  <tr><td>7723</td><td>100</td></tr>
</table>

<h2>Bouchon Anti-Effraction Add-Port</h2>
<ul>
  <li>Restreint l'accès au port d'ajout des poches</li>
  <li>Le joint positif se scelle une seule fois et ne peut pas être rouvert</li>
  <li>Non stérile</li>
  <li>Corps : Polypropylène</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Qté</th><th>Couleur</th></tr>
  <tr><td>4858</td><td>100</td><td>Rouge</td></tr>
  <tr><td>4073</td><td>25</td><td>Bleu</td></tr>
</table>

<h2>Aiguille de Ventilation Filtrée Chemo-Vent®</h2>
<ul>
  <li>Aiguille de ventilation filtrée conçue pour la reconstitution et le retrait d'agents cytostatiques/antinéoplasiques</li>
  <li>L'aiguille non carotteuse pénètre facilement tous les bouchons avec un risque minimal de dommages ; la membrane de filtre hydrophobe maintient l'asepsie et empêche les matières toxiques et aérosolisées de sortir du récipient lors du remplissage</li>
  <li>Codage couleur rouge pour une identification sécuritaire avec les agents cytotoxiques</li>
  <li>Filtre hydrophobe 0,2 micron</li>
  <li>Calibre 20 x 1,5&quot; non carotteur, aiguille en acier inoxydable (non réactive aux agents tels que le cis-platine)</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Qté</th></tr>
  <tr><td>18723</td><td>25</td></tr>
  <tr><td>18723-10</td><td>100</td></tr>
</table>
`), 'C5');

/* ══════════════════════════════════════════════════════════════════════
   C6 – Page 92  |  Administration des Médicaments
   Contenu complet : Ensemble tube de transfert ventilé, Ensemble tube
                     de transfert, Kwik-Vial™
   ══════════════════════════════════════════════════════════════════════ */
build(page('Administration des Médicaments', 92, `
<h2>Ensemble de Tube de Transfert de Fluide avec Pointe Ventilée</h2>
<ul>
  <li>Pointe d'admission ventilée et sortie à verrou Luer pour remplir les distributeurs oraux stériles, seringues Luer, flacons, infuseurs élastomères, mini-poches et cassettes à partir de poches IV ou bouteilles de solution</li>
  <li>À utiliser avec les raccords de remplissage rapide, les broches de distribution ou les aiguilles TwoFer 16 gauge</li>
  <li>Tube en PVC ; raccords en ABS et pince en homopolymère</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Qté</th></tr>
  <tr><td>11</td><td>10</td></tr>
</table>

<h2>Ensemble de Tube de Transfert de Fluide</h2>
<ul>
  <li>Les raccordements à verrou Luer mâles permettent d'utiliser aiguille, pointe à verrou Luer ou broche de distribution à l'entrée et à la sortie</li>
  <li>Tube en PVC ; raccords en ABS et pince en homopolymère</li>
  <li>Emballage individuel, 10 par boîte</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Qté/boîte</th><th>Qté/caisse</th></tr>
  <tr><td>21</td><td>1</td><td>10</td></tr>
</table>

<h2>Kwik-Vial™</h2>
<ul>
  <li>Fioles en plastique ambrées résistantes à la lumière avec couvercles thermosoudés durables, idéales pour le conditionnement unitaire, la distribution et l'administration de médicaments liquides oraux</li>
  <li>Scellées en usine, couvercle feuilleté laminé à languette (non stérile)</li>
  <li>Le plateau en plastique maintient les fioles propres, séparées et dans la position de remplissage idéale</li>
  <li>Sans latex, en polyéthylène haute densité ; le bouchon d'étanchéité est en polypropylène ; le couvercle feuilleté laminé mesure 3,9 mil d'épaisseur</li>
  <li>Les étiquettes ne sont pas incluses. Les étiquettes compatibles sont l'article n° 20475</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Taille</th><th>Qté</th></tr>
  <tr><td>30015</td><td>15 mL</td><td>300 (50/plateau)</td></tr>
  <tr><td>30030</td><td>30 mL</td><td>300 (50/plateau)</td></tr>
</table>
`), 'C6');

/* ══════════════════════════════════════════════════════════════════════
   C7 – Page 94  |  Administration des Médicaments
   Contenu complet : Distributeur Kwik-Vial™, Extension de remplissage,
                     Pompe Répéteur
   ══════════════════════════════════════════════════════════════════════ */
build(page('Administration des Médicaments', 94, `
<h2>Distributeur Kwik-Vial™</h2>
<ul>
  <li>Permet la mise en place rapide et propre du bouchon Kwik-Vial™</li>
  <li>Le distributeur contient suffisamment de bouchons pour remplir un plateau complet de 50 fioles</li>
</ul>
<table>
  <tr><th>N° Art.</th></tr>
  <tr><td>30009</td></tr>
</table>

<h2>Extension de Remplissage Kwik-Vial™</h2>
<ul>
  <li>Se fixe à n'importe quel raccord Luer mâle pour faciliter le remplissage des fioles</li>
  <li>S'étend dans l'orifice de remplissage du Kwik-Vial™ pour guider le liquide</li>
  <li>Fabriqué en chlorure de polyvinyle ; sans latex</li>
  <li>Non stérile</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Qté</th></tr>
  <tr><td>30008</td><td>50</td></tr>
</table>

<h2>Pompe Répéteur</h2>
<ul>
  <li>Conçue pour transférer des fluides à des volumes de 0,2 mL à 9,999 mL à des débits allant jusqu'à 13,5 mL par seconde avec une aiguille de calibre 16</li>
  <li>Fonction de retour pour relâcher la pression de la conduite et prévenir les fuites entre les remplissages</li>
  <li>Mode intervalle pour éviter d'appuyer plusieurs fois sur démarrer/arrêter</li>
  <li>Moteur puissant avec 27 combinaisons de vitesses (incluant le mode inverse), permettant de pomper des fluides visqueux et de remplir des infuseurs élastomères</li>
  <li>Mémoire 20 cellules pour les réglages de pompe couramment utilisés, afin de standardiser les applications répétées</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Description</th></tr>
  <tr><td>99</td><td>Pompe Répéteur</td></tr>
  <tr><td>30</td><td>Support pour Pompe Répéteur</td></tr>
  <tr><td>32</td><td>Poteau de Sac pour Pompe Répéteur</td></tr>
  <tr><td>99-PED</td><td>Pédale de Pied pour Pompe Répéteur</td></tr>
</table>
`), 'C7');

/* ══════════════════════════════════════════════════════════════════════
   C8  |  Administration des Médicaments
   Contenu complet : Seringues ENFit® (transparentes + ambrées),
                     Bouchons d'embout ENFit
   ══════════════════════════════════════════════════════════════════════ */
build(page('Administration des Médicaments', '', `
<h2>Seringues ENFit®</h2>
<ul>
  <li><strong>Prévention des mauvais raccordements :</strong> L'embout ENFit® nécessite un mouvement de rotation pour se connecter. Ce nouveau design ne s'adapte qu'aux dispositifs entéraux pour prévenir les mauvais raccordements.</li>
  <li><strong>Facile à lire :</strong> Les seringues comportent des graduations de 1 mL pour améliorer la précision du dosage.</li>
  <li><strong>Emballage :</strong> Les seringues incluent des bouchons d'embout. Les seringues de 60 mL sont emballées dans une poche de sac IV refermable.</li>
</ul>

<div class="two-col">
<div>
<h3>Seringues ENFit Transparentes</h3>
<table>
  <tr><th>N° Art.</th><th>Description</th><th>Taille</th><th>Qté</th></tr>
  <tr><td>19798-31</td><td>Seringue ENFit faible dose</td><td>1 mL</td><td>50</td></tr>
  <tr><td>19798-500</td><td>Seringue ENFit faible dose</td><td>1 mL</td><td>500</td></tr>
  <tr><td>19799-31</td><td>Seringue ENFit faible dose</td><td>3 mL</td><td>50</td></tr>
  <tr><td>19799-500</td><td>Seringue ENFit faible dose</td><td>3 mL</td><td>500</td></tr>
  <tr><td>19801-31</td><td>Seringue ENFit</td><td>10 mL</td><td>50</td></tr>
  <tr><td>19801-500</td><td>Seringue ENFit</td><td>10 mL</td><td>500</td></tr>
</table>
</div>
<div>
<h3>Seringues ENFit Ambrées</h3>
<table>
  <tr><th>N° Art.</th><th>Description</th><th>Taille</th><th>Qté</th></tr>
  <tr><td>20306-50</td><td>Seringue ENFit faible dose</td><td>1 mL</td><td>50</td></tr>
  <tr><td>20306-500</td><td>Seringue ENFit faible dose</td><td>1 mL</td><td>500</td></tr>
  <tr><td>20307-50</td><td>Seringue ENFit faible dose</td><td>3 mL</td><td>50</td></tr>
  <tr><td>20307-500</td><td>Seringue ENFit faible dose</td><td>3 mL</td><td>500</td></tr>
  <tr><td>20308-50</td><td>Seringue ENFit</td><td>5 mL</td><td>50</td></tr>
  <tr><td>20308-500</td><td>Seringue ENFit</td><td>5 mL</td><td>500</td></tr>
  <tr><td>20309-50</td><td>Seringue ENFit</td><td>10 mL</td><td>50</td></tr>
  <tr><td>20309-500</td><td>Seringue ENFit</td><td>10 mL</td><td>500</td></tr>
  <tr><td>20310-50</td><td>Seringue ENFit</td><td>20 mL</td><td>50</td></tr>
  <tr><td>20310-500</td><td>Seringue ENFit</td><td>20 mL</td><td>200</td></tr>
  <tr><td>20311</td><td>Seringue ENFit</td><td>35 mL</td><td>50</td></tr>
  <tr><td>20311-500</td><td>Seringue ENFit</td><td>35 mL</td><td>500</td></tr>
  <tr><td>20318</td><td>Seringue ENFit</td><td>60 mL</td><td>50</td></tr>
  <tr><td>20318-500</td><td>Seringue ENFit</td><td>60 mL</td><td>500</td></tr>
</table>
</div>
</div>

<h2>Bouchons d'Embout ENFit</h2>
<table>
  <tr><th>N° Art.</th><th>Description</th><th>Qté</th></tr>
  <tr><td>19960</td><td>Bouchons d'embout inviolables pour seringues ENFit</td><td>100</td></tr>
  <tr><td>19960-10</td><td>Bouchons d'embout inviolables pour seringues ENFit</td><td>1000</td></tr>
</table>
`), 'C8');

/* ══════════════════════════════════════════════════════════════════════
   C9 – Page 126  |  Surveillance de Température & Stockage
   Contenu complet : Exigences de surveillance de la température
                     des vaccins + Exigences générales de stockage
   ══════════════════════════════════════════════════════════════════════ */
build(page('Surveillance de Température &amp; Stockage', 126, `
<h2>Exigences de Surveillance de la Température des Vaccins</h2>
<ul>
  <li>Les Lignes directrices nationales sur l'entreposage et la manutention des vaccins (2015), ainsi que de nombreuses lignes directrices provinciales, exigent la documentation manuelle des températures des vaccins. Les températures actuelles, minimales et maximales du réfrigérateur, ainsi que la température ambiante, doivent être enregistrées au début et à la fin de chaque journée (les températures min/max doivent être réinitialisées après chaque enregistrement) — des modèles de journaux sont disponibles ; consultez les lignes directrices ou contactez-nous pour obtenir de l'aide.</li>
  <li>L'affichage numérique doit être placé à l'<strong>extérieur</strong> du réfrigérateur (l'Ontario exige un affichage avec une résolution minimale de 0,1 °C), avec la sonde au centre du réfrigérateur (de préférence dans une boîte à vaccins).</li>
  <li>Les sondes à bouteille (sondes à bouteille avec fluide glycol bio-sécuritaire) sont recommandées pour une lecture plus précise.</li>
  <li>Un bouton de réinitialisation est nécessaire pour remettre à zéro les températures minimale et maximale après chaque enregistrement.</li>
  <li>Les thermomètres doivent être réglés pour déclencher une alarme si les températures descendent à 3 °C ou montent à 7 °C, signalant une sortie de la plage recommandée.</li>
  <li>Les thermomètres doivent être vérifiés pour l'étalonnage au moins annuellement ; il est recommandé qu'ils soient étalonnés avec une précision de ±0,5 °C (±1 °F).</li>
  <li>Les thermomètres doivent avoir un indicateur de batterie faible, et les piles doivent être remplacées tous les 6 mois.</li>
</ul>

<h2>Exigences Générales de Stockage des Vaccins</h2>
<ul class="check-list">
  <li>Maintenir les températures de stockage des vaccins requises</li>
  <li>Maintenir un inventaire suffisant</li>
  <li>Disposer d'un dispositif de surveillance de la température étalonné à l'intérieur de chaque compartiment de stockage</li>
  <li>Le réfrigérateur est dédié uniquement au stockage des vaccins</li>
  <li>Être placé dans un endroit sécurisé</li>
  <li>L'étalonnage recommandé du thermomètre doit être précis à ±0,5 °C (±1 °F)</li>
  <li>Enregistrer la température du réfrigérateur deux fois par jour</li>
  <li>Contacter les autorités de santé publique si les vaccins sont exposés à des températures en dehors de la plage recommandée</li>
</ul>
`), 'C9');

/* ══════════════════════════════════════════════════════════════════════
   C10  |  Surveillance de Température & Stockage
   Contenu complet : Capteur réfrigérateur/congélateur certifié NIST
                     Stat Temp 3.0
   ══════════════════════════════════════════════════════════════════════ */
build(page('Surveillance de Température &amp; Stockage', '', `
<h2>Capteur Réfrigérateur/Congélateur Certifié NIST Stat Temp 3.0</h2>
<ul>
  <li>Capteur intégré — Le capteur (21266 inclut un capteur ; 21268 inclut deux capteurs) est logé dans un boîtier en silicone incassable qui peut être placé entre les fils de la plupart des clayettes de réfrigérateur et congélateur pour minimiser les obstructions.</li>
  <li>Journalisation des données — Le moniteur de température Wi-Fi (inclus) offre un nombre illimité de lectures avec une fréquence d'enregistrement sélectionnable de 5 minutes à 30 minutes. Remarque : fonctionne uniquement avec les réseaux Wi-Fi 2,4 GHz.</li>
  <li>Connectivité à maillage — Les appareils peuvent communiquer entre eux pour étendre la couverture et améliorer la fiabilité du réseau, même dans des environnements hospitaliers complexes. Cela permet d'installer des capteurs dans des zones distantes ou obstruées sans nécessiter un accès Wi-Fi direct.</li>
  <li>Configuration — Une fois connecté au Wi-Fi, l'appareil peut être ajouté au site Web Stat Temp, stat-temp.io. Le capteur sera ajouté automatiquement au tableau de bord.</li>
  <li>Rapports accessibles sur mobile — Le stockage en nuage permet un accès instantané aux rapports depuis un ordinateur, une tablette, un téléphone ou tout autre appareil connecté pour le traitement, la conformité ou l'inspection.</li>
  <li>Aucun frais — Aucun abonnement pour Stat Temp.</li>
  <li>Illimité — Les utilisateurs disposent d'un stockage illimité dans le nuage et peuvent avoir plusieurs moniteurs Stat Temp liés à leur portail.</li>
  <li>Portails en ligne — Créer des portails sur le site Stat Temp pour les emplacements ; voir toutes les unités surveillées ou trier pour afficher moins (ex. : par emplacement).</li>
  <li>Permissions — Définir les autorisations des utilisateurs selon les rôles ou les quarts de travail.</li>
  <li>Alertes — Configurer des alertes en temps réel définies par l'utilisateur par texte, courriel ou appel téléphonique avec accusé de réception forcé.</li>
  <li>Alimentation — Utilise une prise USB-C standard. Pas de piles à changer.</li>
  <li>Perte d'alimentation — Sauvegarde de batterie de 3 jours.</li>
  <li>Journal Min/Max — Fournit les données min/max des dernières 24 heures.</li>
  <li>NIST — Inclut un certificat NIST valable 4 ans.</li>
</ul>
<table>
  <tr><th>N° Art.</th><th>Description</th><th>Plage de température</th><th>Précision</th><th>Dimensions (L x H x P)</th></tr>
  <tr><td>21266</td><td>Capteur simple</td><td>-50 °C à 50 °C (-58 °F à 122 °F)</td><td>+/-0,2 °C</td><td>4&quot; x 2½&quot; x 1&quot;</td></tr>
  <tr><td>21268</td><td>Capteur double</td><td>-50 °C à 50 °C (-58 °F à 122 °F)</td><td>+/-0,2 °C</td><td>4&quot; x 2½&quot; x 1&quot;</td></tr>
  <tr><td>21270</td><td>Capteur ambiant</td><td>-40 °C à 85 °C (-40 °F à 185 °F)</td><td>+/-0,2 °C</td><td>4&quot; x 2½&quot; x 1&quot;</td></tr>
  <tr><td>21272</td><td>Capteur ultra-froid</td><td>-100 °C à -50 °C (-148 °F à -58 °F)</td><td>+/-0,5 °C</td><td>4&quot; x 2½&quot; x 1&quot;</td></tr>
</table>
`), 'C10');

/* ══════════════════════════════════════════════════════════════════════
   C12 – Page 128  |  Surveillance de Température & Stockage
   Contenu complet : Thermomètres Traçables® (description + tableau)
   ══════════════════════════════════════════════════════════════════════ */
build(page('Surveillance de Température &amp; Stockage', 128, `
<h2>Thermomètres Traçables®</h2>
<ul>
  <li>L'affichage triple indique simultanément les températures actuelle, minimale et maximale</li>
  <li>Inclut un certificat Traçable® du laboratoire d'étalonnage ISO 17025, accrédité par A2LA, valable 1 an — le réétalonnage est sous la responsabilité du client ; contactez-nous pour obtenir de l'aide</li>
  <li>L'indicateur de batterie faible signale quand les piles doivent être remplacées</li>
  <li>Déclenche une alarme lorsque la température dépasse ou descend en dessous du seuil défini</li>
  <li>Lit les températures de -50 °C à 70 °C (-58 °F à 158 °F)</li>
  <li>Inclut toutes les piles nécessaires et les équipements de montage (supports à rabat, fixations murales, Velcro® et languettes magnétiques)</li>
</ul>

<h3>Thermomètres Traçables®</h3>
<p style="font-size:9pt;color:#555;margin:4px 0 8px;">Lit la température ambiante ainsi que la température de la sonde externe à l'aide de la fonction entrée/sortie. Programmable par incréments de 1&quot;</p>
<table>
  <tr><th>N° Art.</th><th>Description</th><th>Type de sonde</th><th>Dimensions (L x H x P)</th></tr>
  <tr><td>14144 <span class="b">A</span></td><td>Thermomètre Traçable® Réfrigérateur/Congélateur</td><td>Sonde bouteille 5 mL</td><td>2-3/4 x 4-1/4 x 3/4&quot;</td></tr>
  <tr><td>10367 <span class="b">B</span></td><td>Thermomètre Traçable® Réfrigérateur/Congélateur</td><td>Sonde ambiante</td><td>2-3/4 x 4-1/4 x 3/4&quot;</td></tr>
  <tr><td>10368</td><td>Thermomètre Traçable® Réfrigérateur/Congélateur</td><td>Sonde ambiante</td><td>2-3/4 x 4-1/4 x 3/4&quot;</td></tr>
  <tr><td>17751</td><td>Thermomètre Traçable® Jumbo Réfrigérateur/Congélateur</td><td>Sonde bouteille 10 mL</td><td>3-7/8 x 4-3/8 x 7/8&quot;</td></tr>
  <tr><td>17752</td><td>Thermomètre Traçable® Jumbo Réfrigérateur/Congélateur</td><td>Sonde bouteille 5 mL</td><td>3-7/8 x 4-3/8 x 7/8&quot;</td></tr>
  <tr><td>17750 <span class="b">E</span></td><td>Thermomètre Traçable® Jumbo Réfrigérateur/Congélateur</td><td>Sonde ambiante</td><td>3-7/8 x 4-3/8 x 7/8&quot;</td></tr>
  <tr><td>14140</td><td>Thermomètre Traçable® Haute Résolution Réfrigérateur/Congélateur Plus™</td><td>Sonde bouteille 10 mL</td><td>3-1/4 x 2-15/16 x 5/8&quot;</td></tr>
  <tr><td>10366 <span class="b">F</span></td><td>Thermomètre Traçable® Réfrigérateur/Congélateur</td><td>2 sondes 10 mL</td><td>3-1/2 x 1-3/4 x 1&quot;</td></tr>
  <tr><td>10369</td><td>Extension sonde bouteille double Traçable® pour #10366</td><td>2 sondes ambiantes</td><td>3-1/2 x 1-3/4 x 1&quot;</td></tr>
</table>
`), 'C12');

console.log('\nTerminé. Fichiers PDF dans : ' + outDir);
