import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {randomUUID,createHash,createHmac} from 'node:crypto';
import {phpCommand,root} from '../scripts/php-runtime.mjs';
const p=phpCommand(),folder=mkdtempSync(join(root,'data','floralis-test-')),mailCapturePath=join(folder,'mail-capture.ndjson');
const env={...process.env,DATABASE_PATH:join(folder,'test.sqlite'),RATE_LIMIT_PATH:join(folder,'rate-limits'),EMAIL_CONFIG_FILE:join(folder,'email-private.json'),MAIL_CAPTURE_PATH:mailCapturePath,ADMIN_EMAIL:'qa@floralis.local',ADMIN_PASSWORD:'Floralis-QA-password-2026',APP_URL:'http://127.0.0.1:5191',GOOGLE_LOCAL_CALLBACK_ENABLED:'0',SESSION_COOKIE:'floralis_integration_session',STRIPE_ENABLED:'0',STRIPE_WEBHOOK_SECRET:'whsec_qa_fixture_secret',DB_DRIVER:process.env.TEST_DB_DRIVER||'sqlite'};
const base='http://127.0.0.1:5191';let server,logs='',sample,cat,created,order;const uploads=[];
const capturedMail=()=>existsSync(mailCapturePath)?readFileSync(mailCapturePath,'utf8').trim().split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line)):[];
class Client{
 cookie='';csrf='';
 async request(path,{method='GET',body,raw=false,csrf=true,origin}={}){
  const headers={Cookie:this.cookie};if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';if(csrf)headers['X-CSRF-Token']=this.csrf;if(origin)headers.Origin=origin;
  const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body),redirect:'manual'});
  const cookie=r.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];
  const data=raw?await r.text():await r.json();if(data.csrf)this.csrf=data.csrf;
  return {status:r.status,data,headers:r.headers};
 }
 async api(path,opts){const r=await this.request('/api'+path,opts);assert.ok(r.status<300,`${path}: ${r.status} ${JSON.stringify(r.data)} ${logs.slice(-1000)}`);return r.data;}
}
const admin=new Client(),customer=new Client(),guest=new Client();
before(async()=>{
 const first=execFileSync(p.binary,[...p.args,'tools/seed.php'],{cwd:root,env,encoding:'utf8'});
 assert.equal(execFileSync(p.binary,[...p.args,'tools/seed.php'],{cwd:root,env,encoding:'utf8'}),first);
 server=spawn(p.binary,[...p.args,'-S','127.0.0.1:5191','router.php'],{cwd:root,env});server.stderr.on('data',b=>logs+=b);
 for(let i=0;i<50;i++){try{await admin.api('/bootstrap');break;}catch(e){if(i===49)throw e;await new Promise(r=>setTimeout(r,100));}}
 await admin.api('/auth/login',{method:'POST',body:{email:env.ADMIN_EMAIL,password:env.ADMIN_PASSWORD,admin:true}});
 await customer.api('/bootstrap');await guest.api('/bootstrap');
 sample=(await guest.api('/products?limit=100')).items[0];cat=(await admin.api('/admin/categories'))[0];
});
after(async()=>{
 if(server){server.kill();await new Promise(r=>server.once('exit',r));}
 for(const name of uploads){const file=resolve(root,'public',name.slice(1));if(file.startsWith(resolve(root,'public','uploads')+'\\')||file.startsWith(resolve(root,'public','uploads')+'/'))rmSync(file,{force:true});}
 if(resolve(folder).startsWith(resolve(root,'data')+ '\\')||resolve(folder).startsWith(resolve(root,'data')+'/'))rmSync(folder,{recursive:true,force:true});
});
test('catalog import is complete, idempotent and local',async()=>{
 const list=await guest.api('/products?limit=100');assert.equal(list.total,83);assert.equal((await guest.api('/categories')).length,12);
 for(const x of list.items){assert.equal(x.stock,null);assert.equal(x.manage_stock,0);assert.ok(x.images.length);for(const i of x.images)assert.ok(existsSync(join(root,'public',i.url)));}
 const detail=await guest.api('/products/'+sample.slug+'?related=1');assert.equal(detail.related_products.length,4);assert.ok(detail.related_products.every(product=>product.id!==sample.id));assert.equal(new Set(detail.related_products.map(product=>product.id)).size,4);
 const boot=await guest.api('/bootstrap');assert.equal(boot.google.enabled,false);assert.ok(boot.payments.find(p=>p.code==='card').enabled===0);
});
test('private files, roles, CSRF and cross-origin mutations are protected',async()=>{
 for(const path of ['/.env','/data/google-client.json','/data/source-catalog.json','/tools/seed.php','/app/bootstrap.php','/package.json'])assert.equal((await guest.request(path,{raw:true})).status,404,path);
 assert.equal((await guest.request('/api/admin/dashboard')).status,401);
 assert.equal((await guest.request('/api/cart/'+sample.id,{method:'PUT',body:{quantity:1},csrf:false})).status,403);
 assert.equal((await guest.request('/api/cart/'+sample.id,{method:'PUT',body:{quantity:1},origin:'https://example.com'})).status,403);
});
test('customer registration preserves cart, favorite/profile/address state and isolates admin',async()=>{
 await customer.api('/cart/'+sample.id,{method:'PUT',body:{quantity:1}});const old=customer.cookie;
 const r=await customer.api('/auth/register',{method:'POST',body:{name:'Client QA',email:'client-qa@example.test',password:'Floralis-customer-2026'}});assert.equal(r.user.role,'customer');assert.notEqual(customer.cookie,old);
 assert.equal((await customer.api('/cart')).items.length,1);
 assert.equal((await customer.request('/api/admin/products')).status,403);
 await customer.api('/account/profile',{method:'PATCH',body:{name:'Client QA nou',phone:'0720000000',email:'client-renewed@example.test'}});
 await customer.api('/account/favorites',{method:'PUT',body:{ids:[sample.id]}});
 await customer.api('/account/addresses',{method:'POST',body:{name:'Client QA',phone:'0720000000',street:'Strada Test 10',city:'Tunari',county:'Ilfov',postal_code:'077180'}});
 await customer.api('/account/addresses',{method:'POST',body:{name:'Client QA',phone:'0720000000',street:'Strada Atelier 12',city:'Tunari',county:'Ilfov',postal_code:'077180',identity_type:'pj',company_name:'Floralis QA SRL',cui:'RO12345678',registration_number:'J23/123/2026'}});
 const a=await customer.api('/account');assert.equal(a.user.name,'Client QA nou');assert.equal(a.user.email,'client-renewed@example.test');assert.equal(a.addresses.length,2);assert.equal(a.addresses.find(address=>address.identity_type==='pj').company_name,'Floralis QA SRL');assert.deepEqual(a.favorites,[sample.id]);
});
test('admin product CRUD, duplicate, archive and category hierarchy update storefront',async()=>{
 created=await admin.api('/admin/products',{method:'POST',body:{name:'Produs QA',slug:'produs-qa',sku:'QA-1',status:'publish',price_cents:10000,regular_price_cents:10000,sale_price_cents:null,stock:5,manage_stock:1,stock_status:'instock',categories:[cat.id],images:[{url:sample.images[0].url,alt:'Imagine QA'}],seo:{title:'Titlu produs QA',description:'Descriere SEO QA'}}});
 assert.equal((await guest.api('/products/produs-qa')).price_cents,10000);
 created=await admin.api('/admin/products/'+created.id,{method:'PUT',body:{...created,name:'Buchet cu trandafir Quasar QA',price_cents:12000,regular_price_cents:12000,categories:[cat.id]}});
 assert.equal((await guest.api('/products/produs-qa')).name,'Buchet cu trandafir Quasar QA');
 const pluralSearch=await guest.api('/products?q=trandafiri%20quasar');assert.ok(pluralSearch.items.some(p=>p.id===created.id),JSON.stringify(pluralSearch));
 const typoSearch=await guest.api('/products?q=quasr');assert.ok(typoSearch.items.some(p=>p.id===created.id),JSON.stringify(typoSearch));
 const adminSearch=await admin.api('/admin/products?q=trandafiri%20quasar');assert.ok(adminSearch.items.some(p=>p.id===created.id),JSON.stringify(adminSearch));
 assert.ok((await guest.api('/search?q=quasr')).items.some(item=>item.url==='/produs/produs-qa'));
 assert.ok((await guest.api('/search?q=contatc')).items.some(item=>item.url==='/contact'));
 const copy=await admin.api('/admin/products/'+created.id+'/duplicate',{method:'POST'});assert.equal(copy.status,'draft');assert.equal((await guest.request('/api/products/'+copy.slug)).status,404);
 await admin.api('/admin/products/'+copy.id,{method:'DELETE'});
 await admin.api('/admin/categories',{method:'POST',body:{name:'Colecție QA',slug:'colectie-qa',parent_id:cat.id}});
 const child=(await admin.api('/admin/categories')).find(c=>c.slug==='colectie-qa');
 assert.equal((await admin.request('/api/admin/categories/'+cat.id,{method:'PUT',body:{...cat,parent_id:child.id}})).status,400);
 await admin.api('/admin/categories/'+child.id,{method:'DELETE'});
 assert.equal((await admin.request('/api/admin/categories/'+cat.id,{method:'DELETE'})).status,409);
});
test('checkout uses server prices, coupons, shipping, stock and idempotency',async()=>{
 await admin.api('/admin/discounts',{method:'POST',body:{code:'QA10',type:'percent',value:10,min_cents:0,max_uses:1,active:1}});
 await guest.api('/cart/'+created.id,{method:'PUT',body:{quantity:2}});
 const ship=(await guest.api('/bootstrap')).shipping[0].id;
 const body={email:'guest-qa@example.test',address:{name:'Oaspete QA',phone:'0720000000',street:'Strada Test 10',city:'Tunari',county:'Ilfov'},shipping_id:ship,payment_method:'cod',coupon:'QA10',consent:true,idempotency_key:randomUUID(),total_cents:1};
 const quote=await guest.api('/checkout/quote',{method:'POST',body});assert.equal(quote.total_cents,21600);
 assert.equal((await guest.request('/api/orders',{method:'POST',body:{...body,payment_method:'card'}})).status,400);
 order=await guest.api('/orders',{method:'POST',body});assert.equal(order.total_cents,21600);
 assert.match(order.tracking_url,/\/api\/orders\/FL-\d+\/tracking\?token=/);
 const orderClientMail=capturedMail().find(message=>message.template==='order_client'&&message.subject.includes(order.number)),orderInternalMail=capturedMail().find(message=>message.template==='order_internal'&&message.subject.includes(order.number));assert.ok(orderClientMail);assert.ok(orderInternalMail);assert.equal(orderClientMail.recipient,'guest-qa@example.test');assert.equal(orderInternalMail.recipient,'alexie.popescu2019@yahoo.com');
 const orderMailData=JSON.parse(orderClientMail.template_data);assert.equal(orderMailData.payment_method,'cod');assert.equal(orderMailData.status,'received');assert.equal(orderMailData.items[0].name,'Buchet cu trandafir Quasar QA');assert.equal(orderMailData.items[0].price_cents,12000);assert.equal(orderMailData.subtotal_cents,24000);assert.equal(orderMailData.discount_cents,2400);assert.equal(orderMailData.shipping_cents,0);assert.equal(orderMailData.total_cents,21600);assert.equal(orderMailData.coupon,'QA10');
 const encodedOrderMail=Buffer.from(JSON.stringify(orderClientMail)).toString('base64'),renderedOrderMail=execFileSync(p.binary,[...p.args,'-r',`require 'app/bootstrap.php'; require 'app/email.php'; echo mailHtml(json_decode(base64_decode('${encodedOrderMail}'),true));`],{cwd:root,env,encoding:'utf8'});assert.match(renderedOrderMail,/Am primit comanda ta\./);assert.match(renderedOrderMail,/Urmărește comanda ta/);assert.match(renderedOrderMail,/Buchet cu trandafir Quasar QA/);assert.match(renderedOrderMail,/Reducere · QA10/);assert.match(renderedOrderMail,/Transport/);assert.match(renderedOrderMail,/216,00 lei/);assert.match(renderedOrderMail,/<img[^>]+Imagine QA|<img[^>]+Buchet cu trandafir Quasar QA/);
 const tracking=await guest.request(order.tracking_url.replace(base,''),{raw:true});assert.equal(tracking.status,200);assert.match(tracking.data,/Urmărire comandă Floralis/);assert.match(tracking.data,/Am primit comanda ta\./);assert.match(tracking.data,/Buchet cu trandafir Quasar QA/);assert.match(tracking.data,/Pagina este protejată prin tokenul unic/);
 assert.equal((await guest.request('/api/orders/'+order.number+'/tracking?token=invalid',{raw:true})).status,404);
 assert.equal((await guest.api('/orders',{method:'POST',body})).id,order.id);
 assert.equal((await guest.api('/cart')).items.length,0);assert.equal((await admin.api('/admin/products/'+created.id)).stock,3);
 assert.equal((await customer.request('/api/orders/'+order.number)).status,404);
 assert.equal((await guest.api('/orders/'+order.number+'?token='+order.token)).items[0].price_cents,12000);
 const catalogBefore=await admin.api('/admin/products/'+created.id),snapshotBefore=await admin.api('/admin/orders/'+order.id);
 await admin.api('/admin/products/'+created.id,{method:'PUT',body:{...catalogBefore,price_cents:18900,regular_price_cents:18900,categories:catalogBefore.categories.map(category=>category.id)}});
 const snapshotAfter=await admin.api('/admin/orders/'+order.id);assert.equal(snapshotAfter.items[0].price_cents,snapshotBefore.items[0].price_cents);assert.equal(snapshotAfter.items[0].total_cents,snapshotBefore.items[0].total_cents);assert.equal(snapshotAfter.subtotal_cents,snapshotBefore.subtotal_cents);assert.equal(snapshotAfter.total_cents,snapshotBefore.total_cents);
 created=await admin.api('/admin/products/'+created.id,{method:'PUT',body:{...catalogBefore,categories:catalogBefore.categories.map(category=>category.id)}});
 await guest.api('/cart/'+created.id,{method:'PUT',body:{quantity:1}});
 assert.equal((await guest.request('/api/checkout/quote',{method:'POST',body})).status,400);
 assert.equal((await guest.request('/api/cart/'+created.id,{method:'PUT',body:{quantity:4}})).status,400);
});
test('coupon administration checks codes, updates status and deletes permanently',async()=>{
 await admin.api('/admin/discounts',{method:'POST',body:{code:'QAMANAGE',type:'fixed',value:2500,min_cents:10000,max_uses:12,active:1}});
 const coupon=(await admin.api('/admin/discounts')).find(item=>item.code==='QAMANAGE');assert.ok(coupon);
 assert.equal((await admin.api('/admin/discounts/availability?code=qamanage')).available,false);
 assert.equal((await admin.api('/admin/discounts/availability?code=qamanage&exclude_id='+coupon.id)).available,true);
 assert.equal((await admin.request('/api/admin/discounts',{method:'POST',body:{code:'qamanage',type:'percent',value:5,min_cents:0,max_uses:null,active:1}})).status,409);
 await admin.api('/admin/discounts/'+coupon.id+'/status',{method:'PATCH',body:{active:0}});
 assert.equal(Number((await admin.api('/admin/discounts')).find(item=>item.id===coupon.id).active),0);
 await admin.api('/admin/discounts/'+coupon.id,{method:'PUT',body:{code:'QAMANAGE25',type:'percent',value:25,min_cents:0,max_uses:null,expires_at:null,active:1}});
 assert.equal((await admin.api('/admin/discounts')).find(item=>item.id===coupon.id).code,'QAMANAGE25');
 await admin.api('/admin/discounts/'+coupon.id,{method:'DELETE'});
 assert.equal((await admin.api('/admin/discounts')).some(item=>item.id===coupon.id),false);
 assert.equal((await admin.request('/api/admin/discounts/'+coupon.id+'/status',{method:'PATCH',body:{active:1}})).status,404);
});
test('admin order status emails are optional, private and sent once per real transition',async()=>{
 const before=capturedMail().filter(message=>message.template==='order_status'&&message.subject.includes(order.number)).length;
 const silent=await admin.api('/admin/orders/'+order.id,{method:'PATCH',body:{status:'confirmed',payment_status:'paid',admin_notes:'Confirmare QA',notify_customer:false}});assert.equal(silent.status_changed,true);assert.equal(silent.email_delivery,'not_requested');assert.equal(capturedMail().filter(message=>message.template==='order_status'&&message.subject.includes(order.number)).length,before);
 const detail=await admin.api('/admin/orders/'+order.id);assert.equal(detail.payment_status,'paid');assert.equal(detail.history.length,2);
 const notified=await admin.api('/admin/orders/'+order.id,{method:'PATCH',body:{status:'processing',payment_status:'paid',admin_notes:'NOTĂ INTERNĂ SECRETĂ',notify_customer:true}});assert.equal(notified.status_changed,true);assert.equal(notified.email_delivery,'disabled');
 const statusMessages=capturedMail().filter(message=>message.template==='order_status'&&message.subject.includes(order.number));assert.equal(statusMessages.length,before+1);const statusMail=statusMessages.at(-1),statusData=JSON.parse(statusMail.template_data);assert.equal(statusMail.recipient,'guest-qa@example.test');assert.equal(statusData.status,'processing');assert.equal(statusData.items[0].price_cents,12000);assert.doesNotMatch(statusMail.body,/NOTĂ INTERNĂ SECRETĂ/);assert.doesNotMatch(statusMail.template_data,/NOTĂ INTERNĂ SECRETĂ/);
 const encodedStatusMail=Buffer.from(JSON.stringify(statusMail)).toString('base64'),renderedStatusMail=execFileSync(p.binary,[...p.args,'-r',`require 'app/bootstrap.php'; require 'app/email.php'; echo mailHtml(json_decode(base64_decode('${encodedStatusMail}'),true));`],{cwd:root,env,encoding:'utf8'});assert.match(renderedStatusMail,/Pregătim comanda ta\./);assert.match(renderedStatusMail,/În pregătire/);assert.match(renderedStatusMail,/Urmărește comanda ta/);assert.match(renderedStatusMail,/Buchet cu trandafir Quasar QA/);assert.doesNotMatch(renderedStatusMail,/NOTĂ INTERNĂ SECRETĂ/);
 const unchanged=await admin.api('/admin/orders/'+order.id,{method:'PATCH',body:{status:'processing',payment_status:'paid',admin_notes:'NOTĂ INTERNĂ SECRETĂ',notify_customer:true}});assert.equal(unchanged.status_changed,false);assert.equal(unchanged.email_delivery,'not_requested');assert.equal(capturedMail().filter(message=>message.template==='order_status'&&message.subject.includes(order.number)).length,before+1);
 await admin.api('/admin/orders/'+order.id,{method:'PATCH',body:{status:'cancelled',payment_status:'refunded',admin_notes:'Anulare QA',notify_customer:false}});
 assert.equal((await admin.api('/admin/products/'+created.id)).stock,5);
 await admin.api('/admin/orders/'+order.id,{method:'PATCH',body:{status:'cancelled',payment_status:'refunded',admin_notes:'Anulare QA',notify_customer:true}});
 assert.equal((await admin.api('/admin/products/'+created.id)).stock,5);
 assert.equal((await admin.request('/api/admin/orders/'+order.id,{method:'PATCH',body:{status:'received',payment_status:'unpaid'}})).status,409);
 const customers=await admin.api('/admin/customers');assert.ok(customers.some(c=>c.email==='guest-qa@example.test'));
 assert.equal((await admin.api('/admin/dashboard')).stats.orders,0);
});
test('stock adjustments, CMS, SEO, shipping and payment settings are connected',async()=>{
 created=await admin.api('/admin/products/'+created.id,{method:'PUT',body:{...created,stock:0,categories:[cat.id]}});
 const unlimited=await guest.api('/products/produs-qa');assert.equal(unlimited.stock,null);assert.equal(unlimited.manage_stock,0);assert.equal(unlimited.stock_status,'instock');assert.ok((await admin.api('/admin/stock')).history.length>=2);
 await admin.api('/admin/settings',{method:'PUT',body:{seo_title:'Titlu SEO QA'}});
 assert.equal((await guest.api('/bootstrap')).settings.seo_title,'Titlu SEO QA');
 assert.equal((await admin.request('/api/admin/settings',{method:'PUT',body:{hero_title:'Titlu QA'}})).status,400);
 await admin.api('/admin/pages',{method:'POST',body:{slug:'pagina-qa',title:'Pagina QA',body:'Conținut QA real editabil.',type:'page',status:'publish',seo:{title:'SEO QA'}}});
 assert.equal((await guest.api('/pages/pagina-qa')).title,'Pagina QA');
 const html=(await guest.request('/pagina-qa',{raw:true})).data;assert.ok(html.includes('<title>SEO QA</title>'));assert.ok(html.includes('Conținut QA real editabil.'));
 const seo=(await guest.request('/produs/produs-qa',{raw:true})).data;assert.ok(seo.includes('Titlu produs QA'));assert.ok(seo.includes('application/ld+json'));assert.ok(seo.includes('InStock'));
 await admin.api('/admin/shipping',{method:'POST',body:{name:'Livrare QA',price_cents:2500,zones:'Ilfov',enabled:1}});
 assert.ok((await guest.api('/bootstrap')).shipping.some(s=>s.name==='Livrare QA'));
 await admin.api('/admin/payments/cod',{method:'PUT',body:{enabled:0}});assert.equal((await guest.api('/bootstrap')).payments.find(p=>p.code==='cod').enabled,0);
 assert.equal((await admin.request('/api/admin/payments/card',{method:'PUT',body:{enabled:1}})).status,400);
 execFileSync(p.binary,[...p.args,'-r',"require 'app/bootstrap.php'; migrate(); sql(\"UPDATE payment_methods SET enabled=1 WHERE code='card'\");"],{cwd:root,env});
 const orderedPayments=(await guest.api('/bootstrap')).payments;assert.equal(orderedPayments[0].code,'card');assert.equal(Number(orderedPayments[0].enabled),1);
});
test('contact, newsletter, reviews moderation and CSV export use actual persisted data',async()=>{
 await guest.api('/contact',{method:'POST',body:{name:'Contact QA',email:'contact@example.test',subject:'Decor floral',body:'Doresc informații despre decor floral.',consent:true}});
 await guest.api('/newsletter',{method:'POST',body:{email:'newsletter@example.test',consent:true}});
 for(let index=0;index<11;index++)await guest.api('/newsletter',{method:'POST',body:{email:`subscriber${index}@example.test`,consent:true}});
 const subscribers=await admin.api('/admin/newsletter?limit=5&page=2');assert.equal(subscribers.items.length,5);assert.equal(subscribers.pages,3);assert.equal(subscribers.counts.total,12);
 const tolerantSubscriberSearch=await admin.api('/admin/newsletter?q=newslettr');assert.equal(tolerantSubscriberSearch.items[0].email,'newsletter@example.test');
 await admin.api('/admin/newsletter/'+subscribers.items[0].id,{method:'DELETE'});assert.equal((await admin.api('/admin/newsletter')).counts.total,11);
 await customer.api('/account/reviews',{method:'POST',body:{product_id:sample.id,rating:5,body:'Recenzie QA pentru moderare.'}});
 assert.equal((await guest.api('/bootstrap')).reviews.length,0);
 const review=(await admin.api('/admin/reviews'))[0];await admin.api('/admin/reviews/'+review.id,{method:'PATCH',body:{approved:1}});
 assert.equal((await guest.api('/bootstrap')).reviews.length,1);const inbox=await admin.api('/admin/messages');assert.equal(inbox.items.length,1);assert.equal(inbox.counts.unread,1);
 const contactMessage=inbox.items[0];const reply=await admin.api('/admin/messages/'+contactMessage.id+'/reply',{method:'POST',body:{subject:'Despre decorul tău',body:'Îți mulțumim pentru mesaj. Revenim cu propunerea potrivită.'}});assert.equal(reply.delivery.status,'disabled');
 const repliedInbox=await admin.api('/admin/messages?status=resolved');assert.equal(repliedInbox.items[0].reply_count,1);assert.equal(repliedInbox.items[0].replies[0].body,'Îți mulțumim pentru mesaj. Revenim cu propunerea potrivită.');
 const replyMail=capturedMail().find(message=>message.subject.includes('Răspuns Floralis'));assert.equal(replyMail.recipient,'contact@example.test');assert.equal((await admin.request('/api/admin/outbox')).status,404);
 const exported=await admin.request('/api/admin/export/newsletter',{raw:true});assert.ok(exported.data.includes('newsletter@example.test'));assert.ok(!exported.data.includes('password'));
});
test('uploads validate actual content, re-encode images and protect imported originals',async()=>{
 const bad=new FormData();bad.set('file',new Blob(['<svg/>'],{type:'image/svg+xml'}),'bad.svg');assert.equal((await admin.request('/api/admin/media',{method:'POST',body:bad})).status,400);
 const form=new FormData();form.set('file',new Blob([readFileSync(join(root,'public/assets/floralis/logo.png'))],{type:'image/png'}),'qa.png');form.set('alt','Logo QA');
 const uploaded=await admin.api('/admin/media',{method:'POST',body:form});uploads.push(uploaded.url);assert.ok(uploaded.url.endsWith('.webp'));
 const list=await admin.api('/admin/media');const u=list.find(m=>m.url===uploaded.url);await admin.api('/admin/media/'+u.id,{method:'PATCH',body:{alt:'Alt QA editat'}});
 assert.equal((await admin.request('/api/admin/media/'+list.find(m=>!m.uploaded).id,{method:'DELETE'})).status,400);
 await admin.api('/admin/media/'+u.id,{method:'DELETE'});
});
test('password reset invalidates old sessions and is single-use',async()=>{
 await guest.api('/auth/forgot',{method:'POST',body:{email:'client-renewed@example.test'}});
 const message=capturedMail().find(mail=>mail.subject.includes('Resetare')),resetUrl=message.body.match(/https?:\/\/\S+/)[0],token=new URL(resetUrl).searchParams.get('token');
 await guest.api('/auth/reset',{method:'POST',body:{token,password:'QA-new-password-2026'}});
 assert.equal((await customer.request('/api/account')).status,401);
 assert.equal((await guest.request('/api/auth/reset',{method:'POST',body:{token,password:'QA-new-password-2026'}})).status,400);
 await guest.api('/auth/login',{method:'POST',body:{email:'client-renewed@example.test',password:'QA-new-password-2026'}});
 assert.equal((await guest.api('/account')).user.role,'customer');
});
test('Stripe signed events validate amount/currency and cannot duplicate fulfillment',async()=>{
 await guest.api('/cart/'+created.id,{method:'PUT',body:{quantity:2}});
 const checkoutSessionHash=createHash('sha256').update(guest.cookie.split('=')[1]).digest('hex');execFileSync(p.binary,[...p.args,'-r',`require 'app/bootstrap.php'; sql("UPDATE orders SET status='received',payment_status='unpaid',payment_method='card',stripe_session_id='cs_test_fixture',session_hash=? WHERE id=?",['${checkoutSessionHash}',${order.id}]);`],{cwd:root,env});
 assert.equal((await guest.api('/cart')).items[0].quantity,2);assert.ok(!(await admin.api('/admin/orders')).some(item=>item.id===order.id));assert.equal((await admin.request('/api/admin/orders/'+order.id)).status,404);
 const event={id:'evt_qa_fixture',type:'checkout.session.completed',livemode:false,data:{object:{id:'cs_test_fixture',currency:'ron',amount_total:order.total_cents,payment_status:'paid',payment_intent:'pi_test_fixture',metadata:{application:'floralis',local_order_id:String(order.id)}}}};
 async function webhook(value,t=Math.floor(Date.now()/1000),valid=true){const raw=JSON.stringify(value),sig=createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(t+'.'+raw).digest('hex');const r=await fetch(base+'/api/payments/stripe/webhook',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':`t=${t},v1=${valid?sig:'bad'}`},body:raw});return r.status;}
 assert.equal(await webhook(event,undefined,false),400);assert.equal(await webhook(event,Math.floor(Date.now()/1000)-1000),400);
 assert.equal(await webhook({...event,data:{object:{...event.data.object,amount_total:1}}}),400);
 const mailCountBefore=capturedMail().filter(message=>message.template==='order_client'&&message.subject.includes(order.number)).length;assert.equal(await webhook(event),200);const first=await admin.api('/admin/orders/'+order.id);assert.equal(first.payment_status,'paid');assert.equal(first.status,'confirmed');assert.equal((await guest.api('/cart')).items.length,0);
 const paidMail=capturedMail().filter(message=>message.template==='order_client'&&message.subject.includes(order.number)).at(-1),paidData=JSON.parse(paidMail.template_data);assert.match(paidMail.subject,/Comandă confirmată/);assert.equal(paidData.payment_method,'card');assert.equal(paidData.payment_status,'paid');assert.equal(paidData.status,'confirmed');assert.equal(capturedMail().filter(message=>message.template==='order_client'&&message.subject.includes(order.number)).length,mailCountBefore+1);
 assert.equal(await webhook(event),200);assert.equal((await admin.api('/admin/orders/'+order.id)).history.length,first.history.length);assert.equal(capturedMail().filter(message=>message.template==='order_client'&&message.subject.includes(order.number)).length,mailCountBefore+1);
 const discarded=JSON.parse(execFileSync(p.binary,[...p.args,'-r',`require 'app/bootstrap.php'; require 'app/stripe.php'; $source=one('SELECT * FROM orders WHERE id=?',[${order.id}]);sql("INSERT INTO orders(number,customer_id,user_id,session_hash,idempotency_key,status,payment_method,payment_status,shipping_method,shipping_address,subtotal_cents,discount_cents,shipping_cents,total_cents,coupon,notes,access_token) VALUES('FL-PENDING-QA',?,?,?,?,?,'card','unpaid',?,?,?,?,?,?,?,'',?)",[$source['customer_id'],$source['user_id'],$source['session_hash'],'pending-'.bin2hex(random_bytes(8)),'received',$source['shipping_method'],$source['shipping_address'],$source['subtotal_cents'],0,$source['shipping_cents'],$source['subtotal_cents']+$source['shipping_cents'],'',bin2hex(random_bytes(24))]);$pending=one("SELECT * FROM orders WHERE number='FL-PENDING-QA'");$item=one('SELECT * FROM order_items WHERE order_id=?',[${order.id}]);sql('INSERT INTO order_items(order_id,product_id,sku,name,image,quantity,price_cents,total_cents) VALUES(?,?,?,?,?,?,?,?)',[$pending['id'],$item['product_id'],$item['sku'],$item['name'],$item['image'],1,$item['price_cents'],$item['price_cents']]);sql('INSERT INTO cart_items VALUES(?,?,?) ON CONFLICT(session_hash,product_id) DO UPDATE SET quantity=excluded.quantity',[$pending['session_hash'],$item['product_id'],1]);tx(fn()=>stripeDiscardUnpaidOrder($pending));echo j(['order'=>one("SELECT id FROM orders WHERE number='FL-PENDING-QA'"),'cart'=>one('SELECT quantity FROM cart_items WHERE session_hash=? AND product_id=?',[$pending['session_hash'],$item['product_id']])]);`],{cwd:root,env,encoding:'utf8'}));assert.equal(discarded.order,null);assert.equal(Number(discarded.cart.quantity),1);
});
test('Stripe payload takes exact order snapshot prices, shipping and fixed discount',async()=>{
 const result=JSON.parse(execFileSync(p.binary,[...p.args,'-r',`require 'app/bootstrap.php'; require 'app/stripe.php'; $o=one('SELECT * FROM orders WHERE id=?',[${order.id}]); $items=all('SELECT * FROM order_items WHERE order_id=?',[$o['id']]); $saleOrder=$o;$saleOrder['subtotal_cents']=18000;$saleOrder['discount_cents']=3000;$saleOrder['shipping_cents']=5000;$saleOrder['total_cents']=20000;$saleItem=$items[0];$saleItem['price_cents']=9000;$saleItem['quantity']=2;$saleItem['total_cents']=18000;echo j(['standard'=>stripeCheckoutPayload($o,$items,'qa@example.test','coupon_qa'),'sale'=>stripeCheckoutPayload($saleOrder,[$saleItem],'qa@example.test','coupon_sale')]);`],{cwd:root,env,encoding:'utf8'}));
 assert.equal(result.standard.line_items[0].price_data.unit_amount,12000);assert.equal(result.standard.line_items[0].quantity,2);assert.equal(result.standard.shipping_options[0].shipping_rate_data.fixed_amount.amount,0);assert.equal(result.standard.discounts[0].coupon,'coupon_qa');assert.equal(result.standard.line_items[0].price_data.currency,'ron');
 assert.equal(result.sale.line_items[0].price_data.unit_amount,9000);assert.equal(result.sale.shipping_options[0].shipping_rate_data.fixed_amount.amount,5000);assert.equal(result.sale.discounts[0].coupon,'coupon_sale');assert.equal(result.sale.metadata.subtotal_cents,'18000');assert.equal(result.sale.metadata.discount_cents,'3000');assert.equal(result.sale.metadata.shipping_cents,'5000');assert.equal(result.sale.metadata.total_cents,'20000');assert.deepEqual(result.sale.payment_intent_data.metadata,result.sale.metadata);
 const invalid=execFileSync(p.binary,[...p.args,'-r',`require 'app/bootstrap.php'; require 'app/stripe.php'; $o=one('SELECT * FROM orders WHERE id=?',[${order.id}]);$o['total_cents']=1;try{stripeCheckoutPayload($o,all('SELECT * FROM order_items WHERE order_id=?',[$o['id']]),'qa@example.test');}catch(Throwable $e){echo $e->getMessage();}`],{cwd:root,env,encoding:'utf8'});assert.match(invalid,/nu sunt coerente/);
});
test('category visibility, permanent product deletion and content editors remain connected',async()=>{
 await admin.api('/admin/categories/'+cat.id+'/visibility',{method:'PATCH',body:{visible:0}});
 assert.ok(!(await guest.api('/categories')).some(c=>c.id===cat.id));assert.ok((await admin.api('/admin/categories')).some(c=>c.id===cat.id));
 await admin.api('/admin/categories/'+cat.id+'/visibility',{method:'PATCH',body:{visible:1}});
 const removableProduct=await admin.api('/admin/products',{method:'POST',body:{name:'Produs de șters QA',slug:'produs-de-sters-qa',price_cents:5000,status:'draft'}});
 await admin.api('/admin/products/'+removableProduct.id+'/permanent',{method:'DELETE'});assert.equal((await admin.request('/api/admin/products/'+removableProduct.id)).status,404);
 assert.equal((await admin.request('/api/admin/products/'+created.id+'/permanent',{method:'DELETE'})).status,409);
 const about=(await admin.api('/admin/pages')).find(p=>p.slug==='despre-noi');await admin.api('/admin/pages/'+about.id,{method:'PUT',body:{...about,body:'Floralis — text actualizat din editorul paginii.'}});
 assert.equal((await guest.api('/bootstrap')).settings.story,'Floralis — text actualizat din editorul paginii.');
 const unpriced=await admin.api('/admin/products',{method:'POST',body:{name:'Preț la cerere QA',slug:'pret-la-cerere-qa',price_cents:null,status:'publish'}});
 const html=await guest.request('/produs/pret-la-cerere-qa',{raw:true});assert.equal(html.status,200);assert.match(html.data,/Preț la cerere/);
 const jsonld=[...html.data.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m=>JSON.parse(m[1]));assert.ok(!('offers' in jsonld.find(v=>v['@type']==='Product')));
 await admin.api('/admin/products/'+unpriced.id+'/permanent',{method:'DELETE'});
 await admin.api('/admin/pages',{method:'POST',body:{title:'Articol public QA',slug:'articol-public-qa',body:'Floralis — articol public de verificare.',type:'post',status:'publish',seo:{title:'Titlu SEO articol QA'}}});
 const post=await guest.request('/blog/articol-public-qa',{raw:true});assert.equal(post.status,200);assert.match(post.data,/<title>Titlu SEO articol QA<\/title>/);
 assert.match((await guest.request('/sitemap.xml',{raw:true})).data,/\/blog\/articol-public-qa/);
 assert.ok((await guest.api('/search?q=publc%20qa')).items.some(item=>item.url==='/articol-public-qa'));
 const announcements=capturedMail().filter(message=>message.template==='newsletter_product'||message.template==='newsletter_post');assert.equal(announcements.length,22);assert.equal(announcements.filter(message=>message.template==='newsletter_product').length,11);assert.equal(announcements.filter(message=>message.template==='newsletter_post').length,11);
 const productAnnouncement=announcements.find(message=>message.template==='newsletter_product');assert.equal(productAnnouncement.recipient.includes(','),false);assert.equal(JSON.parse(productAnnouncement.template_data).url,base+'/produs/pret-la-cerere-qa');
 const encodedAnnouncement=Buffer.from(JSON.stringify(productAnnouncement)).toString('base64'),renderedNewsletter=execFileSync(p.binary,[...p.args,'-r',`require 'app/bootstrap.php'; require 'app/email.php'; migrate(); echo mailHtml(json_decode(base64_decode('${encodedAnnouncement}'),true));`],{cwd:root,env,encoding:'utf8'});assert.match(renderedNewsletter,/O creație nouă/);assert.match(renderedNewsletter,/href="http:\/\/127\.0\.0\.1:5191\/produs\/pret-la-cerere-qa"/);assert.match(renderedNewsletter,/Primești acest mesaj pentru că te-ai abonat/);assert.match(renderedNewsletter,/name="color-scheme" content="light"/);assert.match(renderedNewsletter,/@media\(prefers-color-scheme:dark\)/);assert.doesNotMatch(renderedNewsletter,/(radial|linear)-gradient/);
 const standardEmail={subject:'Resetare parolă Floralis',body:'Folosește linkul sigur:\n'+base+'/resetare-parola?token=qa'},encodedStandard=Buffer.from(JSON.stringify(standardEmail)).toString('base64'),renderedStandard=execFileSync(p.binary,[...p.args,'-r',`require 'app/bootstrap.php'; require 'app/email.php'; echo mailHtml(json_decode(base64_decode('${encodedStandard}'),true));`],{cwd:root,env,encoding:'utf8'});assert.match(renderedStandard,/Alege o parolă nouă/);assert.match(renderedStandard,/name="supported-color-schemes" content="light"/);assert.match(renderedStandard,/@media\(prefers-color-scheme:dark\)/);assert.doesNotMatch(renderedStandard,/(radial|linear)-gradient/);
 const savedPost=(await admin.api('/admin/pages')).find(p=>p.slug==='articol-public-qa');await admin.api('/admin/pages/'+savedPost.id,{method:'PUT',body:{...savedPost,body:savedPost.body+' Text editat fără retrimitere.'}});assert.equal(capturedMail().filter(message=>message.template==='newsletter_post').length,11);await admin.api('/admin/pages/'+savedPost.id+'/permanent',{method:'DELETE'});
 assert.ok(!(await admin.api('/admin/pages')).some(p=>p.id===savedPost.id));assert.equal((await guest.request('/blog/articol-public-qa',{raw:true})).status,404);
 assert.equal((await guest.request('/categorie/categorie-care-nu-exista',{raw:true})).status,404);
 assert.equal((await admin.request('/api/admin/settings',{method:'PUT',body:{phone:{invalid:true}}})).status,400);
 assert.equal((await guest.request('/api/admin/email/settings')).status,403);const config=await admin.api('/admin/email/settings');assert.ok(!('password' in config));assert.equal(config.enabled,0);assert.equal(config.from_email,'contact@floralis-artaflorilor.ro');assert.equal(config.notification_email,'alexie.popescu2019@yahoo.com');assert.equal(config.port,465);assert.equal(config.security,'ssl');
});
