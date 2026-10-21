const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
const {pathToFileURL}=require('url');
const path=require('path');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage();
 const htmlPath=path.resolve('output/pdf/shopmate-code-darija-v2.html');
 await page.goto(pathToFileURL(htmlPath).href);
 await page.evaluate(()=>document.fonts.ready);
 const result=await page.evaluate(()=>{
  const source=document.querySelector('#source');
  const chapters=[...source.querySelectorAll('article')];
  let previous=chapters[0];
  for(let i=0;i<chapters.length;i+=18){
   const a=document.createElement('article');a.dataset.id='contents-'+i;
   a.innerHTML='<h1>الفهرس • '+(i/18+1)+'</h1><div class="intro">اختار القسم اللي محتاج. أرقام الصفحات كتخص الشرح الموسع؛ الدليل الأول كاين فالملحق.</div>';
   for(const ch of chapters.slice(i,i+18)){
    const row=document.createElement('div');row.className='block tocrow';
    const link=document.createElement('a');link.href='#'+ch.dataset.id;link.textContent=ch.querySelector('h1').textContent;
    const number=document.createElement('span');number.dataset.target=ch.dataset.id;row.append(link,number);a.append(row);
   }
   previous.after(a);previous=a;
  }
  window.paginate();
  for(const n of source.querySelectorAll('[data-target]'))n.textContent=window.chapterStarts.find(c=>c.id===n.dataset.target).page;
  return window.paginate();
 });
 console.log(JSON.stringify(result));
 fs.writeFileSync('tmp/pdfs/chapter-starts.json',JSON.stringify(await page.evaluate(()=>window.chapterStarts)));
 await page.pdf({path:'tmp/pdfs/shopmate-code-main.pdf',preferCSSPageSize:true,printBackground:true});
 // Save a usable standalone guide with the same table of contents and pagination.
 const html=await page.content();
 fs.writeFileSync(htmlPath,html);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
