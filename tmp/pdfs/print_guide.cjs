const {chromium} = require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path = require('path');
const {pathToFileURL} = require('url');
(async()=>{
  const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.resolve('output/pdf/shopmate-comprendre-darija.html')).href);
  await page.evaluate(()=>document.fonts.ready);
  console.log(await page.locator('.page').evaluateAll(els=>els.map((e,i)=>({page:i+1,contentBottom:Math.max(...Array.from(e.querySelectorAll('.block,pre')).map(x=>x.getBoundingClientRect().bottom)),footerTop:e.querySelector('.source').getBoundingClientRect().top})).filter(x=>x.contentBottom>x.footerTop)));
  await page.pdf({path:'output/pdf/shopmate-comprendre-darija.pdf',printBackground:true,preferCSSPageSize:true});
  await browser.close();
})();
