export const GTM_ID='GTM-TBH2Q2KN';
export const GA4_ID='G-N7QD4SELGB';
export const CONSENT_KEY='floralis-cookie-consent-v2';

const dataLayer=()=>{
  window.dataLayer=window.dataLayer||[];
  return window.dataLayer;
};

export function pushEvent(event,parameters={}){
  if(typeof window==='undefined')return;
  dataLayer().push({event,...parameters});
}

export function analyticsItem(product,quantity=1,index){
  const category=product?.categories?.at?.(-1)?.name||product?.category||'Creații Floralis';
  const item={
    item_id:String(product?.sku||product?.product_id||product?.id||''),
    item_name:product?.name||'Creație Floralis',
    item_brand:'Floralis',
    item_category:category,
    price:Number(product?.price_cents||0)/100,
    quantity:Number(quantity)||1
  };
  if(index!==undefined)item.index=index;
  return item;
}

export function pushEcommerce(event,parameters={}){
  if(typeof window==='undefined')return;
  const layer=dataLayer();
  layer.push({ecommerce:null});
  layer.push({event,ecommerce:parameters});
}

export function readConsent(){
  try{
    const saved=JSON.parse(localStorage.getItem(CONSENT_KEY)||'null');
    return saved&&typeof saved.analytics==='boolean'&&typeof saved.marketing==='boolean'?saved:null;
  }catch{return null;}
}

export function updateGoogleConsent(choice){
  if(typeof window==='undefined')return;
  const consent={
    analytics_storage:choice.analytics?'granted':'denied',
    ad_storage:choice.marketing?'granted':'denied',
    ad_user_data:choice.marketing?'granted':'denied',
    ad_personalization:choice.marketing?'granted':'denied'
  };
  if(typeof window.gtag==='function')window.gtag('consent','update',consent);
  pushEvent('consent_update',{consent_analytics:choice.analytics?'granted':'denied',consent_marketing:choice.marketing?'granted':'denied'});
}

export function saveConsent(choice){
  const value={analytics:Boolean(choice.analytics),marketing:Boolean(choice.marketing),updated_at:new Date().toISOString()};
  try{localStorage.setItem(CONSENT_KEY,JSON.stringify(value));}catch{}
  updateGoogleConsent(value);
  return value;
}
