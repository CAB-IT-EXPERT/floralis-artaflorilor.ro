let csrf='';
export const setCsrf=value=>{csrf=value;};
export async function api(path,options={}){
 const headers={...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...options.headers};
 if(options.method&&options.method!=='GET')headers['X-CSRF-Token']=csrf;
 const response=await fetch('/api'+path,{credentials:'same-origin',...options,headers,body:options.body instanceof FormData?options.body:options.body?JSON.stringify(options.body):undefined});
 const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Operația nu a reușit.'),{status:response.status});if(data.csrf)setCsrf(data.csrf);return data;
}
export const money=cents=>cents===null||cents===undefined?'La cerere':new Intl.NumberFormat('ro-RO',{style:'currency',currency:'RON',maximumFractionDigits:2}).format(cents/100);
export const slugify=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const date=s=>new Date(s.replace(' ','T')+'Z').toLocaleString('ro-RO',{timeZone:'Europe/Bucharest',dateStyle:'short',timeStyle:'short'});

export const searchNormalize=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export function searchStem(word){
 if(word.length<4)return word;
 const suffixes=['urilor','iilor','elor','ilor','ului','ate','ite','ele','ile','uri','ii','ul','ea','ie','e','i','a'];
 for(const suffix of suffixes)if(word.endsWith(suffix)&&word.length-suffix.length>=3)return word.slice(0,-suffix.length);
 return word;
}
export function editDistance(a,b){
 if(a===b)return 0;if(!a.length)return b.length;if(!b.length)return a.length;
 let previous=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const current=[i];for(let j=1;j<=b.length;j++)current[j]=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));previous=current;}
 return previous[b.length];
}
export function smartSearchMatch(value,query){
 const needle=searchNormalize(query);if(!needle)return true;
 const haystack=searchNormalize(value);if(haystack.includes(needle))return true;
 const words=haystack.split(' ').filter(Boolean),needles=needle.split(' ').filter(Boolean);
 return needles.every(term=>{const stem=searchStem(term);return words.some(word=>{const wordStem=searchStem(word);if(word.includes(term)||(word.length>=3&&term.includes(word))||wordStem===stem||wordStem.includes(stem)||(wordStem.length>=3&&stem.includes(wordStem)))return true;const limit=Math.max(term.length,word.length)>=7?2:1;return editDistance(term,word)<=limit||editDistance(stem,wordStem)<=limit;});});
}
