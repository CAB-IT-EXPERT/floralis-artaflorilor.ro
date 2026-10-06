import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {root} from './php-runtime.mjs';

const sources=process.argv.slice(2);
if(sources.length!==2)throw new Error('Usage: node scripts/prepare-hero.mjs desktop.png mobile.png');
const destination=join(root,'public/assets/floralis');
await mkdir(destination,{recursive:true});
for(const [index,name] of ['hero-desktop','hero-mobile'].entries()){
  const image=sharp(sources[index]).rotate();
  const full=await image.clone().webp({quality:90,effort:6}).toFile(join(destination,name+'.webp'));
  await image.clone().resize({width:480,withoutEnlargement:true}).webp({quality:82,effort:6}).toFile(join(destination,name+'-480.webp'));
  console.log(`${name}: ${full.width} × ${full.height}, ${Math.round(full.size/1024)} KB`);
}
