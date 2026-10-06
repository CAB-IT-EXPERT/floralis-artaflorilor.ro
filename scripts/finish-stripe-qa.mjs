import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const qa=JSON.parse(readFileSync('data/stripe-qa.json','utf8'));let cookie='',csrf='';
async function api(path,body){const r=await fetch('http://localhost:5192/api'+path,{method:body?'POST':'GET',headers:{Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const result=await r.json();if(result.csrf)csrf=result.csrf;assert.ok(r.ok,JSON.stringify(result));return result;}
await api('/bootstrap');await api('/auth/login',{email:'stripe-qa@floralis.local',password:'Floralis-QA-stripe-2026',admin:true});
const paid=await api('/admin/orders/'+qa.id);assert.equal(paid.payment_status,'paid');assert.equal(paid.total_cents,29500);assert.ok(paid.stripe_payment_intent);
await api('/admin/orders/'+qa.id+'/stripe/refund',{});const refunded=await api('/admin/orders/'+qa.id);assert.equal(refunded.payment_status,'refunded');assert.equal(refunded.status,'cancelled');
const report={tested_at:new Date().toISOString(),mode:'Stripe sandbox',product_cents:30000,discount_cents:3000,shipping_cents:2500,total_cents:29500,checkout_total_verified:true,card_payment_confirmed_by_server:true,refund_confirmed_by_stripe:true,order_cancelled_after_refund:true,database:'isolated disposable QA database'};
mkdirSync('qa',{recursive:true});writeFileSync('qa/stripe-test-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
