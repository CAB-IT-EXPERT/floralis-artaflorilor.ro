import React,{useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,ChevronLeft,ChevronRight,Heart,Leaf,Plus,ShieldCheck,ShoppingBag,Sparkles,Truck,X,ZoomIn,ZoomOut} from 'lucide-react';
import {useStore} from './context';
import {api,money} from './api';
import {Empty,Image,ProductCard,Quantity} from './components';
import './product-page.css';

const photoSizes='(max-width: 760px) calc(100vw - 32px), (max-width: 1280px) 52vw, 680px';
const thumbnailUrl=url=>url?.startsWith('/assets/floralis/')&&url.endsWith('.webp')?url.replace('.webp','-480.webp'):url;

function Thumbnails({images,selected,onSelect,name}){
 const active=useRef();
 useEffect(()=>{const button=active.current,rail=button?.parentElement;if(!button||!rail)return;const left=button.offsetLeft-rail.offsetLeft;if(left<rail.scrollLeft||left+button.offsetWidth>rail.scrollLeft+rail.clientWidth)rail.scrollLeft=left-(rail.clientWidth-button.offsetWidth)/2;},[selected]);
 return <div className="creation-thumbnails" aria-label="Miniaturi ale produsului">{images.map((image,index)=><button type="button" key={image.id||image.url+'-'+index} ref={index===selected?active:null} className={index===selected?'is-active':''} aria-label={`Vezi fotografia ${index+1} din ${images.length}`} aria-pressed={index===selected} onClick={()=>onSelect(index)}><img src={thumbnailUrl(image.url)} alt={image.alt||`${name} — fotografia ${index+1}`} width="80" height="80" loading="lazy" decoding="async"/></button>)}</div>;
}

function Lightbox({product,selected,onSelect,onClose}){
 const dialog=useRef(),stage=useRef(),drag=useRef(),touch=useRef(),closeTimer=useRef(),[scale,setScale]=useState(1),[closing,setClosing]=useState(false);
 const images=product.images,move=direction=>onSelect((selected+direction+images.length)%images.length);
 const close=()=>{if(closing)return;setClosing(true);closeTimer.current=window.setTimeout(onClose,220);};
 useEffect(()=>{const element=dialog.current,overflow=document.body.style.overflow;element.showModal();document.body.style.overflow='hidden';return()=>{window.clearTimeout(closeTimer.current);if(element.open)element.close();document.body.style.overflow=overflow;};},[]);
 useEffect(()=>{setScale(1);if(stage.current){stage.current.scrollTop=0;stage.current.scrollLeft=0;}},[selected]);
 useEffect(()=>{const element=stage.current;if(element){element.scrollLeft=(element.scrollWidth-element.clientWidth)/2;element.scrollTop=(element.scrollHeight-element.clientHeight)/2;}},[scale]);
 return <dialog ref={dialog} className={'creation-lightbox '+(closing?'is-closing':'')} aria-label={`Fotografii — ${product.name}`} onCancel={event=>{event.preventDefault();close();}} onClick={event=>{if(event.target===event.currentTarget)close();}} onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();move(1);}if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}}}>
  <header><div><span className="eyebrow">O PRIVIRE MAI APROAPE</span><h2>{product.name}</h2></div><div className="creation-lightbox-tools"><button type="button" disabled={scale===1} onClick={()=>setScale(value=>Math.max(1,value-1))} aria-label="Micșorează imaginea"><ZoomOut/></button><span aria-live="polite">{scale*100}%</span><button type="button" disabled={scale===3} onClick={()=>setScale(value=>Math.min(3,value+1))} aria-label="Mărește imaginea"><ZoomIn/></button><button type="button" onClick={close} aria-label="Închide galeria"><X/></button></div></header>
  <div className="creation-lightbox-view">
   {images.length>1&&<button type="button" className="creation-lightbox-arrow previous" onClick={()=>move(-1)} aria-label="Fotografia anterioară"><ChevronLeft/></button>}
   <div ref={stage} className={'creation-lightbox-stage '+(scale>1?'is-zoomed':'')} onDoubleClick={()=>setScale(value=>value===1?2:1)} onPointerDown={event=>{if(scale===1){touch.current={x:event.clientX,y:event.clientY};return;}if(event.pointerType==='touch')return;event.preventDefault();drag.current={x:event.clientX,y:event.clientY,left:stage.current.scrollLeft,top:stage.current.scrollTop};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{if(!drag.current)return;stage.current.scrollLeft=drag.current.left+drag.current.x-event.clientX;stage.current.scrollTop=drag.current.top+drag.current.y-event.clientY;}} onPointerUp={event=>{drag.current=null;if(touch.current&&scale===1){const dx=event.clientX-touch.current.x,dy=event.clientY-touch.current.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)&&images.length>1)move(dx<0?1:-1);}touch.current=null;}} onPointerCancel={()=>{drag.current=null;touch.current=null;}}>
    <div className="creation-lightbox-image" style={{width:`${scale*100}%`,height:`${scale*100}%`}}><img key={images[selected]?.url} src={images[selected]?.url} alt={images[selected]?.alt||product.name} draggable="false" decoding="async"/></div>
   </div>
   {images.length>1&&<button type="button" className="creation-lightbox-arrow next" onClick={()=>move(1)} aria-label="Fotografia următoare"><ChevronRight/></button>}
  </div>
  <footer><p><span>{String(selected+1).padStart(2,'0')} / {String(images.length).padStart(2,'0')}</span>{scale>1?'Glisează imaginea pentru a explora detaliile.':'Dublu clic pe fotografie pentru mărire.'}</p><Thumbnails images={images} selected={selected} onSelect={onSelect} name={product.name}/></footer>
 </dialog>;
}

function ProductContent({product:p}){
 const store=useStore(),[quantity,setQuantity]=useState(1),[selected,setSelected]=useState(0),[zoom,setZoom]=useState(false),[adding,setAdding]=useState(false),touch=useRef(),swiped=useRef(false);
 const images=p.images||[],current=images[selected],category=p.categories.at(-1),favorite=store.favorites.includes(p.id),available=p.stock_status==='instock'&&(!p.manage_stock||p.stock>0)&&p.price_cents!==null;
 const description=p.description||p.short_description||'Pentru detalii despre această creație, ne poți contacta direct.';
 const intro=(p.short_description||p.description||'').split(/\n\s*\n|\n/)[0];
 const move=direction=>setSelected(index=>(index+direction+images.length)%images.length);
 const related=p.related_products||[];
 const showStory=event=>{event.preventDefault();const story=document.getElementById('despre-creatie');if(!story)return;window.history.replaceState(null,'','#despre-creatie');story.scrollIntoView({behavior:'smooth',block:'start'});};
 useEffect(()=>{
  if(images.length<2||navigator.connection?.saveData)return;
  const preload=()=>{const image=new window.Image();image.src=thumbnailUrl(images[(selected+1)%images.length].url);};
  if('requestIdleCallback' in window){const id=window.requestIdleCallback(preload,{timeout:1500});return()=>window.cancelIdleCallback(id);}
  const id=window.setTimeout(preload,500);return()=>window.clearTimeout(id);
 },[selected,images]);
 const add=async()=>{if(adding||!available)return;setAdding(true);try{await store.add(p,quantity);}finally{setAdding(false);}};
 return <div className="creation-page">
  <nav className="creation-breadcrumbs" aria-label="Fir de navigare"><Link to="/">Acasă</Link><ChevronRight/><Link to="/magazin">Magazin</Link>{category&&<><ChevronRight/><Link to={'/categorie/'+category.slug}>{category.name}</Link></>}<ChevronRight/><span aria-current="page">{p.name}</span></nav>
  <section className="creation-hero" aria-labelledby="creation-title">
   <div className="creation-gallery" role="region" aria-roledescription="carusel" aria-label="Fotografiile produsului" onKeyDown={event=>{if(images.length>1&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}}}>
    <div className="creation-gallery-frame">
     <div className="creation-gallery-label"><span><Sparkles size={13}/> SELECȚIA FLORALIS</span>{images.length>0&&<span className="creation-counter" aria-live="polite" aria-atomic="true">{String(selected+1).padStart(2,'0')} <i>/</i> {String(images.length).padStart(2,'0')}</span>}</div>
     <button type="button" className="creation-main-photo" disabled={!images.length} aria-label={`Mărește fotografia ${selected+1} — ${p.name}`} onClick={()=>{if(swiped.current){swiped.current=false;return;}setZoom(true);}} onPointerDown={event=>{touch.current={x:event.clientX,y:event.clientY};swiped.current=false;}} onPointerUp={event=>{if(!touch.current)return;const dx=event.clientX-touch.current.x,dy=event.clientY-touch.current.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)&&images.length>1){swiped.current=true;move(dx<0?1:-1);}touch.current=null;}} onPointerCancel={()=>{touch.current=null;}}>
      <Image key={current?.url} src={current?.url} alt={current?.alt||p.name} priority sizes={photoSizes} draggable="false"/>
     </button>
     {images.length>1&&<><button type="button" className="creation-gallery-arrow previous" onClick={()=>move(-1)} aria-label="Fotografia anterioară"><ChevronLeft/></button><button type="button" className="creation-gallery-arrow next" onClick={()=>move(1)} aria-label="Fotografia următoare"><ChevronRight/></button></>}
     {images.length>0&&<button type="button" className="creation-expand" onClick={()=>setZoom(true)}><ZoomIn size={17}/><span>Explorează detaliile</span><Plus size={15}/></button>}
    </div>
    {images.length>0&&<div className="creation-gallery-bottom"><Thumbnails images={images} selected={selected} onSelect={setSelected} name={p.name}/><span>{images.length>1?'Fiecare unghi, o nouă emoție.':'Frumusețea stă în detalii.'}</span></div>}
   </div>
   <div className="creation-info">
    {category&&<Link className="creation-category" to={'/categorie/'+category.slug}><span/>{category.name}<ArrowRight size={14}/></Link>}
    <h1 id="creation-title">{p.name}</h1>
    <div className="creation-price-row"><div className="creation-price">{money(p.price_cents)}{p.sale_price_cents!==null&&p.regular_price_cents!==null&&<del>{money(p.regular_price_cents)}</del>}</div><span className={'creation-stock '+(!available?'unavailable':'')}><span/>{available?'Disponibil':'Indisponibil'}{Boolean(p.manage_stock)&&p.stock>0&&<small> · {p.stock} în stoc</small>}</span></div>
    {intro&&<p className="creation-intro">{intro}</p>}
    <a className="creation-about-link" href="#despre-creatie" onClick={showStory}>Descoperă povestea creației<ArrowRight size={15}/></a>
    <div className="creation-order">
     <div className="creation-order-label"><span>ALEGE CANTITATEA</span><span>UN DAR PLIN DE EMOȚIE</span></div>
     <div className="creation-buy"><Quantity value={quantity} max={p.manage_stock?Math.max(1,p.stock):99} onChange={setQuantity}/><button type="button" className={'creation-favorite '+(favorite?'is-selected':'')} aria-label={favorite?'Elimină de la favorite':'Adaugă la favorite'} aria-pressed={favorite} onClick={()=>store.favorite(p.id)}><Heart size={20}/></button><button type="button" className="creation-add" disabled={!available||adding} onClick={add}><ShoppingBag size={18}/><span>{adding?'Se adaugă…':available?'Adaugă în coș':'Momentan indisponibil'}</span><ArrowRight size={18}/></button></div>
     <p className="creation-checkout-note"><ShieldCheck size={14}/>Plată în siguranță. Grijă pentru fiecare detaliu.</p>
    </div>
    <div className="creation-assurances"><div><Leaf/><span>Flori atent<small>selecționate</small></span></div><div><Sparkles/><span>O creație<small>cu personalitate</small></span></div><div><Truck/><span>Livrare sau<small>ridicare din atelier</small></span></div></div>
    <Link className="creation-help" to="/contact"><span>Ai o întrebare despre această creație?<strong>Suntem aici pentru tine.</strong></span><ArrowRight size={19}/></Link>
   </div>
  </section>
  <section className="creation-story reveal" id="despre-creatie" aria-labelledby="creation-story-title">
   <span className="creation-section-mark" aria-hidden="true"><Leaf/></span><span className="eyebrow">DINCOLO DE PETALE</span><h2 id="creation-story-title">Despre această <em>creație.</em></h2><div className="creation-story-rule"><span/><Sparkles size={16}/><span/></div>
   <div className="creation-story-copy">{description.split(/\n+/).filter(text=>text.trim()).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
   <div className="creation-story-meta">{category&&<span><Leaf size={14}/>{category.name}</span>}{p.sku&&<span>Cod produs <strong>{p.sku}</strong></span>}</div>
   <div className="creation-details"><details><summary><span><Truck size={18}/>Livrare și ridicare</span><Plus size={18}/></summary><p>Metodele disponibile și costul livrării sunt afișate la finalizarea comenzii. Pentru detalii despre disponibilitate, ne poți contacta înainte de comandă.</p><Link to="/transport-si-livrare">Informații despre livrare<ArrowRight size={14}/></Link></details><details><summary><span><ShieldCheck size={18}/>Plată și comandă</span><Plus size={18}/></summary><p>Alege metoda de plată disponibilă la finalizarea comenzii. Datele comenzii și totalul sunt afișate înainte de confirmare.</p><Link to="/modalitati-de-plata">Metode de plată<ArrowRight size={14}/></Link></details></div>
  </section>
  {related.length>0&&<section className="creation-related reveal" aria-labelledby="creation-related-title"><div className="creation-related-heading"><span className="eyebrow">DIN ACEEAȘI POVESTE</span><h2 id="creation-related-title">S-ar putea să îți <em>placă.</em></h2><p>Creații alese să se potrivească cu ceea ce îți place.</p></div><div className="creation-related-grid">{related.map(product=><ProductCard key={product.id} p={product}/>)}</div><Link className="creation-collection-link" to={category?'/categorie/'+category.slug:'/magazin'}>Descoperă întreaga colecție<ArrowRight size={17}/></Link></section>}
  {zoom&&<Lightbox product={p} selected={selected} onSelect={setSelected} onClose={()=>setZoom(false)}/>}
 </div>;
}

export default function ProductPage({slug}){
 const [state,setState]=useState({slug:'',product:null,error:''});
 useEffect(()=>{const controller=new AbortController();api('/products/'+encodeURIComponent(slug)+'?related=1',{signal:controller.signal}).then(product=>setState({slug,product,error:''})).catch(error=>{if(error.name!=='AbortError')setState({slug,product:null,error:error.message});});return()=>controller.abort();},[slug]);
 if(state.slug!==slug)return <div className="creation-loading" role="status" aria-label="Se încarcă produsul"><div/><div><span/><span/><span/></div></div>;
 if(state.error)return <Empty title={state.error} text="Poți continua explorarea colecțiilor noastre."/>;
 return <ProductContent key={slug} product={state.product}/>;
}
