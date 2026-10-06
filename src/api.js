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
