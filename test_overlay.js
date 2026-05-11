const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const b64 = fs.readFileSync('page7.jpeg').toString('base64');

const htmlStr = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 210mm; font-family: Arial, Helvetica, sans-serif; }
.wrap { position: relative; width: 100%; }
.bg   { width: 100%; display: block; height: auto; }
.box { position: absolute; background: rgba(255, 0, 0, 0.4); border: 2px solid red; }

/* 1. Stat Temp */
.b1 { top: 3%; left: 4%; width: 50%; height: 30%; }

/* 2. Pharmacy Labels */
.b2 { top: 36%; left: 55%; width: 42%; height: 25%; }

/* 3. Bag Caddy */
.b3 { top: 65%; left: 4%; width: 42%; height: 10%; }

/* 4. Acrylic Dispenser */
.b4 { top: 80%; left: 45%; width: 52%; height: 18%; }

</style></head>
<body>
<div class="wrap">
  <img class="bg" src="data:image/jpeg;base64,${b64}">
  <div class="box b1"></div>
  <div class="box b2"></div>
  <div class="box b3"></div>
  <div class="box b4"></div>
</div>
</body></html>`;

fs.writeFileSync('test_overlay.html', htmlStr);

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({width: 1200, height: 1600, deviceScaleFactor: 2});
  const fileUrl = 'file:///' + path.resolve('test_overlay.html').replace(/\\/g, '/');
  
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  
  await page.screenshot({ path: 'test_boxes.jpeg', type: 'jpeg', quality: 90 });
  console.log('Saved test_boxes.jpeg');
  await browser.close();
})();
