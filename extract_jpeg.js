const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
  });
  const page = await browser.newPage();
  await page.setViewport({width: 1200, height: 1600, deviceScaleFactor: 2});
  const fileUrl = 'file:///' + require('path').resolve('render_pdf.html').replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#render-complete', { timeout: 30000 });
  const canvas = await page.$('canvas');
  await canvas.screenshot({ path: 'page7.jpeg', type: 'jpeg', quality: 100 });
  console.log('Saved page7.jpeg');
  await browser.close();
})();
