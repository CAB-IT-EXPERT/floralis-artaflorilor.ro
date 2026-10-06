// Disposable, isolated database; real Stripe test API, no real payments.
import {mkdtempSync,writeFileSync} from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {phpCommand,root} from './php-runtime.mjs';
const php=phpCommand(),folder=mkdtempSync(join(root,'data','floralis-test-'));
const env={...process.env,DB_DRIVER:'sqlite',DATABASE_PATH:join(folder,'stripe-qa.sqlite'),ADMIN_EMAIL:'stripe-qa@floralis.local',ADMIN_PASSWORD:'Floralis-QA-stripe-2026',APP_URL:'http://localhost:5192',STRIPE_ENABLED:'1'};
execFileSync(php.binary,[...php.args,'tools/seed.php'],{cwd:root,env});
execFileSync(php.binary,[...php.args,'-r',`require 'app/bootstrap.php'; sql("UPDATE payment_methods SET enabled=1 WHERE code='card'"); sql('UPDATE shipping_methods SET price_cents=2500 WHERE id=1'); sql("INSERT INTO discounts(code,type,value) VALUES('QA10','percent',10)");`],{cwd:root,env});
const child=spawn(php.binary,[...php.args,'-S','127.0.0.1:5192','router.php'],{cwd:root,env,stdio:'ignore'});
let cookie='',csrf='';
async function api(path,body){const response=await fetch('http://localhost:5192/api'+path,{method:body?'POST':'GET',headers:{Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];const result=await response.json();if(result.csrf)csrf=result.csrf;if(!response.ok)throw Error(JSON.stringify(result));return result;}
try{
 for(let i=0;i<50;i++){try{await api('/bootstrap');break;}catch(e){if(i===49)throw e;await new Promise(r=>setTimeout(r,100));}}
 const p=(await api('/products?limit=100')).items.find(p=>p.sku==='4');
 const r=await fetch('http://localhost:5192/api/cart/'+p.id,{method:'PUT',headers:{Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:JSON.stringify({quantity:1})});if(!r.ok)throw Error(await r.text());
 const o=await api('/orders',{email:'stripe-qa@example.test',address:{name:'Client test Floralis',phone:'0720000000',street:'Strada Test 10',city:'Tunari',county:'Ilfov'},shipping_id:1,payment_method:'card',coupon:'QA10',consent:true,idempotency_key:randomUUID()});
 const privateData={...o,database:env.DATABASE_PATH,cookie,csrf,port:5192};writeFileSync(join(root,'data','stripe-qa.json'),JSON.stringify(privateData));
 console.log(JSON.stringify({checkout_url:o.checkout_url,total_cents:o.total_cents,expected_cents:29500,confirmation:'http://localhost:5192/comanda/'+o.number+'?token='+o.token}));
}catch(e){child.kill();throw e;}
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{child.kill();process.exit();});
