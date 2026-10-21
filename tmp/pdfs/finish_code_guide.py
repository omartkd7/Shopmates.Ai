from pathlib import Path
import json
from pypdf import PdfReader, PdfWriter
import pypdfium2 as pdfium
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[2]
out=root/'output/pdf/shopmate-comprendre-darija-v2.pdf'
writer=PdfWriter()
main=PdfReader(root/'tmp/pdfs/shopmate-code-main.pdf')
writer.append(main)
for chapter in json.loads((root/'tmp/pdfs/chapter-starts.json').read_text(encoding='utf-8')):
    writer.add_outline_item(chapter['title'],chapter['page']-1)
writer.add_outline_item('Annexe - premier guide des concepts',len(main.pages))
writer.append(PdfReader(root/'output/pdf/shopmate-comprendre-darija.pdf'))
writer.add_metadata({'/Title':'ShopMate AI — comprendre le code en darija — version 2','/Author':'Guide de revision pour Omar Fahid'})
with out.open('wb') as f: writer.write(f)
pdf=pdfium.PdfDocument(str(out))
thumbs=[]
for i in range(len(pdf)):
    img=pdf[i].render(scale=.38).to_pil().convert('RGB')
    canvas=Image.new('RGB',(240,350),'#dce3e7')
    img.thumbnail((228,325));canvas.paste(img,((240-img.width)//2,5))
    ImageDraw.Draw(canvas).text((10,332),str(i+1),fill='black')
    thumbs.append(canvas)
for start in range(0,len(thumbs),12):
    sheet=Image.new('RGB',(960,1050),'white')
    for j,img in enumerate(thumbs[start:start+12]):sheet.paste(img,((j%4)*240,(j//4)*350))
    sheet.save(root/f'tmp/pdfs/v2-contact-{start//12:02}.png')
for i in [0,5,12,30,45,68,85,90]:
    pdf[i].render(scale=1.5).to_pil().save(root/f'tmp/pdfs/v2-page-{i+1}.png')
print(json.dumps({'pages':len(pdf),'main_pages':len(main.pages),'bytes':out.stat().st_size,'contact_sheets':(len(pdf)+11)//12}))
