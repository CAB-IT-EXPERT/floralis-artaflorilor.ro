import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Sparkles} from 'lucide-react';
import {ProductCard} from './components';

function topCategoryFor(product,categories){
 const productCategories=product.categories||[];
 for(const top of categories.filter(category=>!category.parent_id)){
  if(productCategories.some(category=>category.id===top.id||category.parent_id===top.id))return top;
 }
 return null;
}

export function interleaveFeaturedProducts(products,categories=[]){
 const tops=categories.filter(category=>!category.parent_id&&Number(category.visible)!==0);
 const buckets=tops.map(category=>({category,items:products.filter(product=>topCategoryFor(product,categories)?.id===category.id)})).filter(bucket=>bucket.items.length);
 const result=[];
 const seen=new Set();
 const length=Math.max(0,...buckets.map(bucket=>bucket.items.length));
 for(let row=0;row<length;row++)for(const bucket of buckets){
  const product=bucket.items[row];
  if(product&&!seen.has(product.id)){result.push(product);seen.add(product.id);}
 }
 for(const product of products)if(!seen.has(product.id)){result.push(product);seen.add(product.id);}
 return result;
}

function visibleCount(){
 if(typeof window==='undefined')return 4;
 if(window.innerWidth<620)return 1;
 if(window.innerWidth<960)return 2;
 if(window.innerWidth<1280)return 3;
 return 4;
}

export default function RecommendedCarousel({products,categories}){
 const [visible,setVisible]=useState(visibleCount),[position,setPosition]=useState(visibleCount),[animated,setAnimated]=useState(true),[paused,setPaused]=useState(false),[step,setStep]=useState(0);
 const viewportRef=useRef(null),firstRef=useRef(null),gestureRef=useRef(null),resumeRef=useRef(null),suppressClickRef=useRef(false);
 const enabled=products.length>visible;
 const extended=useMemo(()=>enabled?[...products.slice(-visible),...products,...products.slice(0,visible)]:products,[products,visible,enabled]);
 const represented=useMemo(()=>{
  const ids=new Set(products.map(product=>topCategoryFor(product,categories)?.id).filter(Boolean));
  return categories.filter(category=>ids.has(category.id));
 },[products,categories]);
 const logical=products.length?((position-visible)%products.length+products.length)%products.length:0;
 const measureStep=()=>{
  if(!viewportRef.current||!firstRef.current)return 0;
  const gap=parseFloat(getComputedStyle(viewportRef.current).getPropertyValue('--recommended-gap'))||24;
  return firstRef.current.getBoundingClientRect().width+gap;
 };
 const move=direction=>{
  if(!enabled)return;
  const measured=measureStep();
  if(measured)setStep(measured);
  setAnimated(true);
  setPosition(current=>current+direction);
  setStep(current=>current+1);
 };
 const pauseBriefly=()=>{
  setPaused(true);
  window.clearTimeout(resumeRef.current);
  resumeRef.current=window.setTimeout(()=>setPaused(false),3200);
 };
 useEffect(()=>{
  const resize=()=>{const next=visibleCount();setVisible(next);setAnimated(false);setPosition(next);};
  window.addEventListener('resize',resize);
  return()=>{window.removeEventListener('resize',resize);window.clearTimeout(resumeRef.current);};
 },[]);
 useEffect(()=>{setAnimated(false);setPosition(enabled?visible:0);requestAnimationFrame(()=>requestAnimationFrame(()=>setAnimated(true)));},[products.length,visible,enabled]);
 useEffect(()=>{
  const measure=()=>{
   const measured=measureStep();
   if(measured)setStep(measured);
  };
  measure();
  const frame=requestAnimationFrame(measure);
  const observer=new ResizeObserver(measure);
  if(viewportRef.current)observer.observe(viewportRef.current);
  observer.observe(document.documentElement);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();};
 },[visible,products.length]);
 useEffect(()=>{
  if(!enabled||paused)return;
  const timer=window.setInterval(()=>move(1),1700);
  return()=>window.clearInterval(timer);
 },[enabled,paused,visible,products.length]);
 const normalize=()=>{
  if(!enabled)return;
  if(position>=products.length+visible){setAnimated(false);setPosition(visible);requestAnimationFrame(()=>requestAnimationFrame(()=>setAnimated(true)));}
  else if(position<visible){setAnimated(false);setPosition(products.length+visible-1);requestAnimationFrame(()=>requestAnimationFrame(()=>setAnimated(true)));}
 };
 const pointerDown=event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  gestureRef.current={x:event.clientX,y:event.clientY,pointerId:event.pointerId};
  event.currentTarget.setPointerCapture?.(event.pointerId);
  setPaused(true);
 };
 const pointerMove=event=>{
  const start=gestureRef.current;
  if(!start||start.pointerId!==event.pointerId)return;
  const dx=event.clientX-start.x,dy=event.clientY-start.y;
  if(Math.abs(dx)>34&&Math.abs(dx)>Math.abs(dy)*1.12){
   event.preventDefault();
   gestureRef.current=null;
   suppressClickRef.current=true;
   move(dx<0?1:-1);
   pauseBriefly();
  }
 };
 const pointerUp=event=>{
  pointerMove(event);
  gestureRef.current=null;
  pauseBriefly();
  if(suppressClickRef.current)window.setTimeout(()=>{suppressClickRef.current=false;},0);
 };
 if(!products.length)return <div className="recommended-empty"><Sparkles/><h3>Selecția este în pregătire</h3><p>Bifează „Recomandat pe prima pagină” la produsele dorite din panoul de administrare.</p></div>;
 return <div className="recommended-carousel" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocusCapture={()=>setPaused(true)} onBlurCapture={()=>setPaused(false)}>
  <div className="recommended-category-ribbon" aria-label="Categorii recomandate">{represented.map((category,index)=><React.Fragment key={category.id}><span>{category.name}</span>{index<represented.length-1&&<i/>}</React.Fragment>)}</div>
  <div ref={viewportRef} className="recommended-viewport" style={{opacity:step?1:0}} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={()=>{gestureRef.current=null;suppressClickRef.current=false;pauseBriefly();}} onDragStart={event=>event.preventDefault()} onClickCapture={event=>{if(suppressClickRef.current){event.preventDefault();event.stopPropagation();suppressClickRef.current=false;}}}>
   <div className="recommended-track" style={{transform:`translate3d(${-position*step}px,0,0)`,transition:animated?'transform .78s cubic-bezier(.2,.74,.22,1)':'none'}} onTransitionEnd={normalize}>
    {extended.map((product,index)=><div className="recommended-slide" key={`${product.id}-${index}`} ref={index===0?firstRef:null} aria-hidden={enabled&&(index<position||index>=position+visible)}><ProductCard p={product}/></div>)}
   </div>
  </div>
  <div className="recommended-navigation">
   <div className="recommended-count"><strong>{String(logical+1).padStart(2,'0')}</strong><span>/</span>{String(products.length).padStart(2,'0')}</div>
   <div className="recommended-progress" aria-hidden="true"><i key={`${logical}-${paused}`} style={{animationPlayState:paused?'paused':'running'}}/></div>
   <div className="recommended-arrows"><button type="button" onClick={()=>{move(-1);pauseBriefly();}} disabled={!enabled} aria-label="Produsul recomandat anterior"><ArrowLeft/></button><button type="button" onClick={()=>{move(1);pauseBriefly();}} disabled={!enabled} aria-label="Următorul produs recomandat"><ArrowRight/></button></div>
  </div>
  <p className="recommended-gesture-hint"><span/><em>Glisează pentru a descoperi</em><span/></p>
 </div>;
}
