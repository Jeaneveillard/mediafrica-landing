/**
 * PDFs pleine page — image uniquement, sans texte superposé.
 * Format A4 paysage, image centrée avec fond noir.
 */
const { Jimp, intToRGBA } = require('jimp');
const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const EDGE   = '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"';
const outDir = path.join(__dirname, 'pdfs_fr');

function findSeps(img, thr = 45) {
  const w = img.bitmap.width, h = img.bitmap.height;
  const bands = [], x0 = Math.floor(w * .05), x1 = Math.floor(w * .95), span = x1 - x0;
  let inB = false, bS = 0;
  for (let y = 0; y < h; y++) {
    let d = 0;
    for (let x = x0; x < x1; x++) {
      const { r, g, b } = intToRGBA(img.getPixelColor(x, y));
      if ((r + g + b) / 3 < thr) d++;
    }
    const rt = d / span;
    if (rt > .65 && !inB)        { inB = true; bS = y; }
    else if (rt < .30 && inB)    { inB = false; if (y - bS > 4) bands.push({ y0: bS, y1: y }); }
  }
  return bands;
}

const PAGES = [
  { name: 'C1',  file: 'C1 .jpeg' },
  { name: 'C2',  file: 'c2.jpeg'  },
  { name: 'C3',  file: 'c3.jpeg'  },
  { name: 'C4',  file: 'c4.jpeg'  },
  { name: 'C5',  file: 'c5.jpeg'  },
  { name: 'C6',  file: 'C6.jpeg'  },
  { name: 'C7',  file: 'C7.jpeg'  },
  { name: 'C8',  file: 'C8.jpeg'  },
  { name: 'C9',  file: 'C9.jpeg'  },
  { name: 'C10', file: 'C10.jpeg' },
  { name: 'C12', file: 'C12.jpeg' },
];

(async () => {
  for (const p of PAGES) {
    const fp = path.join(__dirname, p.file);
    if (!fs.existsSync(fp)) { console.error('Manquant : ' + p.file); continue; }

    const img   = await Jimp.read(fp);
    const H     = img.bitmap.height;
    const bands = findSeps(img);

    let y0, y1;
    if (p.name === 'C3') {
      y0 = 0; y1 = bands[0] ? bands[0].y0 : H;
    } else {
      y0 = bands[0] ? bands[0].y1 : 0;
      y1 = bands.length > 1 ? bands[bands.length - 1].y0 : H;
    }

    img.crop({ x: 0, y: y0, w: img.bitmap.width, h: y1 - y0 });
    const buf = await img.getBuffer('image/jpeg');
    const b64 = buf.toString('base64');

    const htmlStr = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @page { size: A4 landscape; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 297mm; height: 210mm; overflow: hidden; background: #111; }
  img  { width: 100%; height: 210mm; object-fit: contain; object-position: center; display: block; }
</style>
</head><body>
  <img src="data:image/jpeg;base64,${b64}">
</body></html>`;

    const hf  = path.join(outDir, p.name + '_img.html');
    const pf  = path.join(outDir, p.name + '_img.pdf');
    fs.writeFileSync(hf, htmlStr, 'utf8');

    const url = 'file:///' + hf.replace(/\\/g, '/');
    const cmd = `${EDGE} --headless=old --disable-gpu --print-to-pdf="${pf}" --print-to-pdf-no-header "${url}"`;
    try {
      execSync(cmd, { timeout: 30000, stdio: 'pipe' });
      console.log('✓ ' + p.name + '_img.pdf');
    } catch (e) {
      console.error('✗ ' + p.name + ' — ' + e.message.slice(0, 80));
    }
  }
  console.log('\nTerminé. PDFs dans : ' + outDir);
})();
