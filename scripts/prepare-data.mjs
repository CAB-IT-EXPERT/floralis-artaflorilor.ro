import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {parse} from 'csv-parse/sync';
import sharp from 'sharp';
import {decode} from 'html-entities';
import ffmpegPath from 'ffmpeg-static';

const root=process.cwd(), out=path.join(root,'public/assets/floralis');
const runFile=promisify(execFile);
await fs.mkdir(out,{recursive:true}); await fs.mkdir('data/source-images',{recursive:true});
const plain=s=>decode(String(s??'').replace(/<[^>]*>/g,'')).trim();
const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const cents=s=>s===''||s==null?null:Math.round(Number(String(s).replace(',','.'))*100);
const csv=(await fs.readdir(root)).find(x=>x.endsWith('.csv')&&x.startsWith('current-Produse-Export'));
const source=JSON.parse(await fs.readFile('data/source-catalog.json','utf8'));
const rows=source.products.map(p=>p.raw_export_fields);
const categories=new Map(), failures=[],media=[], imageMap={};
source.categories.forEach(c=>categories.set(c.slug,{name:c.name,slug:c.slug,parent_slug:c.parent_slug}));
const products=rows.map(r=>{
 const original=source.products.find(p=>String(p.wordpress_id)===r.id);
 const categorySlugs=original.categories.slug_path;
 return {source_id:r.id,sku:r.SKU||null,name:plain(r.Title),slug:r.Slug||slug(r.Title),status:r.Status,
  price_cents:cents(r.Price),regular_price_cents:cents(r['Regular Price']),sale_price_cents:cents(r['Sale Price']),
  stock:r.Stock===''?null:Number(r.Stock),stock_status:r['Stock Status'],manage_stock:r['Manage Stock']==='yes'?1:0,featured:r.Featured==='yes'?1:0,
  description:plain(r.Content),short_description:plain(r['Short Description']),tax_status:r['Tax Status'],tax_class:r['Tax Class'],categories:[...new Set(categorySlugs)],
  images:[],source_fields:Object.fromEntries(['Weight','Length','Width','Height','Backorders','Sold Individually','alergeni','ingrediente','declaratia_nutritionala'].filter(k=>r[k]).map(k=>[k,plain(r[k])])),
  image_sources:(r['Image URL']||'').split('|').filter(Boolean),image_alt:/[\p{L}\p{N}]/u.test(plain(r['Image Alt Text']))?plain(r['Image Alt Text']):plain(r.Title)};
});
async function optimize(input,name,{max=1200}={}){
 const dest=path.join(out,name+'.webp');
 try {await fs.access(dest);}catch{await sharp(input,{limitInputPixels:50000000}).rotate().resize({width:max,height:max,fit:'inside',withoutEnlargement:true}).webp({quality:84}).toFile(dest);}
 const thumb=path.join(out,name+'-480.webp');
 try{await fs.access(thumb);}catch{await sharp(input).rotate().resize({width:480,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:80}).toFile(thumb);}
 return '/assets/floralis/'+name+'.webp';
}
const jobs=products.flatMap(p=>p.image_sources.map((url,i)=>({p,url,i})));
const localRoot=(await fs.readdir(root)).find(x=>x.startsWith('produse-media-din-csv-'));
if(!localRoot)throw Error('Local product media directory not found');
const localManifest=parse(await fs.readFile(path.join(localRoot,'rapoarte/manifest-imagini.csv'),'utf8'),{columns:true,bom:true,skip_empty_lines:true});
const localByUrl=new Map(localManifest.filter(x=>x.local_file).map(x=>[x.source_url,path.join(localRoot,x.local_file)]));
let done=0;
async function worker(){while(jobs.length){const {p,url,i}=jobs.shift();const key='product-'+p.source_id+'-'+i;try{
 const target=localByUrl.get(url);if(!target)throw Error('No local image mapping');await fs.access(target);
 const local=await optimize(target,key);p.images.push({url:local,alt:p.image_alt,sort_order:i,original_url:url});imageMap[url]=local;media.push({url:local,name:p.name,alt:p.image_alt,type:'image'});
 }catch(e){failures.push({product:p.source_id,url,error:e.message});}if(++done%20===0)console.log('Product images prepared:',done);
}}
await Promise.all(Array.from({length:5},worker));
const manifest=JSON.parse(await fs.readFile('floralis-media-export/manifests/media_manifest.json','utf8'));
const exported={};
for(const m of manifest){const file=path.join('floralis-media-export',m.filename);if(m.type==='image'&&/\.(jpg|jpeg|png|webp)$/i.test(file)&&!/(other-brand-assets|logo-horeka|uncategorized|skin|preloader)/i.test(file)){
 try {const key='export-'+createHash('sha1').update(m.filename).digest('hex').slice(0,12);const url=await optimize(file,key,{max:1600});exported[m.filename]=url;media.push({url,name:path.basename(m.filename),alt:m.category==='gallery'?'Decor floral Floralis':plain(m.category),type:'image'});}catch(e){failures.push({file,error:e.message});}
}}
await fs.copyFile('floralis-media-export/00_branding/logo/logo-floralis.png',path.join(out,'logo.png'));
await fs.copyFile('floralis-media-export/00_branding/favicon/cropped-frame-2225164381.png',path.join(out,'favicon.png'));
for(const [source,name] of [
 ['video-floralis.mp4','atelier.mp4'],
 ['joined-video-264e5476c7344f10a87537d6c9f5d6d4.mp4','decor-poveste.mp4'],
 ['img-1900.mp4','decor-atelier-1900.mp4'],
 ['img-1908.mp4','decor-atelier-1908.mp4'],
]) await runFile(ffmpegPath,[
 '-loglevel','error','-y','-i',path.join('floralis-media-export/06_videos/hosted',source),
 '-t','4','-vf','scale=720:-2:flags=lanczos,fps=30','-an','-c:v','libx264','-preset','fast','-crf','24',
 '-pix_fmt','yuv420p','-movflags','+faststart','-map_metadata','-1',path.join(out,name),
],{windowsHide:true,maxBuffer:10*1024*1024});
const raw=await fs.readFile('floralis-texte-site.txt','utf8');
const pageBlocks=[...raw.matchAll(/PAGINA: ([^\r\n]+)\r?\nURL: ([^\r\n]+)\r?\nTIP: ([^\r\n]+)\r?\n=+\r?\n([\s\S]*?)(?=\r?\n-{20,})/g)];
const pages=pageBlocks.map(m=>({title:m[1],slug:new URL(m[2]).pathname.replace(/^\/+|\/+$/g,'')||'home',source_url:m[2],body:m[4].replace(/^(TITLE|H[1-6]|P|LI|TEXT|FORMULAR):\s*\r?\n/gm,'').trim()}));
const about=pages.find(p=>p.slug==='despre-noi'), decor=pages.find(p=>p.slug==='decor-floral');
const gallery=Object.entries(exported).filter(([k])=>k.startsWith('02_gallery/')).map(([name,url])=>({url,name}));
const sourceHero=exported['01_homepage/hero/acasa-floralis-arta-florilor.jpg'];
const catalog={source:'data/source-catalog.json',products:products.map(p=>({...p,images:p.images.sort((a,b)=>a.sort_order-b.sort_order)})),categories:[...categories.values()],media,pages};
await fs.writeFile('data/floralis_catalog.json',JSON.stringify(catalog,null,2));
await fs.writeFile('data/floralis_content.json',JSON.stringify({about:about?.body,decor:decor?.body,gallery,exported,sourceHero,social:JSON.parse(await fs.readFile('floralis-media-export/manifests/social_links.json','utf8')).official_profiles.map(x=>({platform:x.platform,url:x.url}))},null,2));
await fs.writeFile('data/import-report.json',JSON.stringify({source:'data/source-catalog.json',media_source:localRoot,products:products.length,categories:categories.size,product_images:done-failures.filter(x=>x.product).length,media:media.length,failures,missing_stock:products.filter(p=>p.stock===null).length},null,2));
console.log('Import prepared:',products.length,'products;',categories.size,'categories;',media.length,'media;',failures.length,'failures.');
