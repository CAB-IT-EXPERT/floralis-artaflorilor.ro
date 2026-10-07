import test from 'node:test';
import assert from 'node:assert/strict';

const storage=new Map();
global.window={
  dataLayer:[],
  gtag:(...args)=>global.window.dataLayer.push(args),
  localStorage:{
    getItem:key=>storage.get(key)??null,
    setItem:(key,value)=>storage.set(key,String(value))
  }
};
global.localStorage=global.window.localStorage;

const {analyticsItem,pushEcommerce,saveConsent,CONSENT_KEY}=await import('../src/analytics.js');

test('maps product snapshots to GA4 ecommerce items with RON decimal prices',()=>{
  assert.deepEqual(analyticsItem({id:7,sku:'FL-07',name:'Buchet Floralis',price_cents:25990,categories:[{name:'Buchete'}]},2,3),{
    item_id:'FL-07',item_name:'Buchet Floralis',item_brand:'Floralis',item_category:'Buchete',price:259.9,quantity:2,index:3
  });
});

test('pushes a clean ecommerce object before each GA4 event',()=>{
  window.dataLayer=[];
  pushEcommerce('purchase',{transaction_id:'FL-TEST',currency:'RON',value:309.9,shipping:50,items:[{item_id:'FL-07',quantity:1}]});
  assert.deepEqual(window.dataLayer,[{ecommerce:null},{event:'purchase',ecommerce:{transaction_id:'FL-TEST',currency:'RON',value:309.9,shipping:50,items:[{item_id:'FL-07',quantity:1}]}}]);
});

test('persists consent and updates all four Google consent signals',()=>{
  window.dataLayer=[];storage.clear();
  saveConsent({analytics:true,marketing:false});
  assert.equal(JSON.parse(storage.get(CONSENT_KEY)).analytics,true);
  assert.deepEqual(window.dataLayer[0],['consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'}]);
  assert.equal(window.dataLayer[1].event,'consent_update');
});
