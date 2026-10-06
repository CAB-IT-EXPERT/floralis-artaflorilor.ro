import React,{useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,ChevronLeft,ChevronRight,Leaf,Heart,Diamond,Sparkles,Baby,Gift,Flower2,MapPin,Phone,Navigation} from 'lucide-react';
import {useStore} from './context';
import {api} from './api';
import {Image,SectionHeading,Newsletter} from './components';
import Hero from './Hero';
import RecommendedCarousel,{interleaveFeaturedProducts} from './RecommendedCarousel';
import HomeGallery from './HomeGallery';
const decorVideos=[
 {src:'/assets/floralis/atelier.mp4',eyebrow:'CEREMONII ÎN AER LIBER',title:'Flori care deschid povestea'},
 {src:'/assets/floralis/decor-poveste.mp4',eyebrow:'ELEGANȚĂ LA FIECARE MASĂ',title:'Atmosferă creată în detaliu'},
 {src:'/assets/floralis/decor-atelier-1900.mp4',eyebrow:'DIN CULISELE FLORALIS',title:'Fiecare gest, așezat cu grijă'},
 {src:'/assets/floralis/decor-atelier-1908.mp4',eyebrow:'MOMENTE GATA SĂ ÎNFLOREASCĂ',title:'Ultimele detalii înainte de emoție'},
];
const occasionDefinitions=[
 ['Aniversări','aranjamente-florale','Bucurii care înfloresc',Sparkles],
 ['Ziua nunții','nunta','Începuturi pentru totdeauna',Flower2],
 ['Bun venit pe lume','botez','Delicatețe pentru cei mici',Baby],
 ['Un simplu „mulțumesc”','cadouri-accesorii','Gesturi care spun totul',Gift],
];
const categoryImageFallbacks={
 'aranjamente-florale':'/assets/floralis/product-4146-0.webp',
 nunta:'/assets/floralis/product-4164-0.webp',
 botez:'/assets/floralis/product-4180-0.webp',
 'cadouri-accesorii':'/assets/floralis/product-4198-0.webp',
 craciun:'/assets/floralis/product-4314-0.webp',
};
const categoryImage=category=>category?.image||categoryImageFallbacks[category?.slug]||'/assets/floralis/export-81d675f18c22.webp';
function useSwipeRail(){
 const ref=useRef(null),gesture=useRef(null),suppressClick=useRef(false);
 const end=event=>{
  const rail=ref.current,start=gesture.current;
  gesture.current=null;
  rail?.classList.remove('is-dragging');
  if(start?.dragged){
   const cards=[...rail.children],target=card=>card.offsetLeft-rail.offsetLeft,closest=cards.reduce((best,card)=>Math.abs(target(card)-rail.scrollLeft)<Math.abs(target(best)-rail.scrollLeft)?card:best,cards[0]);
   if(closest)rail.scrollTo({left:target(closest),behavior:'smooth'});
  }
  if(start?.captured)rail?.releasePointerCapture?.(start.pointerId);
  if(suppressClick.current)window.setTimeout(()=>{suppressClick.current=false;},0);
 };
 return {ref,onPointerDown:event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  const rail=ref.current;
  gesture.current={x:event.clientX,y:event.clientY,left:rail.scrollLeft,pointerId:event.pointerId,dragged:false,captured:false};
 },onPointerMove:event=>{
  const start=gesture.current,rail=ref.current;
  if(!start||start.pointerId!==event.pointerId)return;
  const dx=event.clientX-start.x,dy=event.clientY-start.y;
  if(start.dragged||(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.15)){
   if(!start.dragged){start.dragged=true;start.captured=true;rail.classList.add('is-dragging');rail.setPointerCapture?.(event.pointerId);}
   event.preventDefault();suppressClick.current=true;rail.scrollLeft=start.left-dx;
  }
 },onPointerUp:end,onPointerCancel:end,onDragStart:event=>event.preventDefault(),onClickCapture:event=>{if(suppressClick.current){event.preventDefault();event.stopPropagation();suppressClick.current=false;}}};
}
function DecorVideoCarousel(){
 const [active,setActive]=useState(0),refs=useRef([]),gesture=useRef(null);
 const move=step=>setActive(current=>(current+step+decorVideos.length)%decorVideos.length);
 const startGesture=event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  gesture.current={x:event.clientX,y:event.clientY};
  event.currentTarget.setPointerCapture?.(event.pointerId);
 };
 const readGesture=event=>{
  const start=gesture.current;
  if(!start)return;
  const deltaX=event.clientX-start.x,deltaY=event.clientY-start.y;
  if(Math.abs(deltaX)>45&&Math.abs(deltaX)>Math.abs(deltaY)*1.15){
   gesture.current=null;
   move(deltaX<0?1:-1);
  }
 };
 const endGesture=event=>{readGesture(event);gesture.current=null;};
 useEffect(()=>{
  refs.current.forEach((video,index)=>{
   if(!video)return;
   if(index===active){video.currentTime=0;video.play().catch(()=>{});}
   else video.pause();
  });
  const timer=window.setTimeout(()=>move(1),4000);
  return()=>window.clearTimeout(timer);
 },[active]);
 return <div className="decor-video-stage">
  <span className="decor-video-orbit" aria-hidden="true"/>
  <div className="decor-video-frame" onPointerDown={startGesture} onPointerMove={readGesture} onPointerUp={endGesture} onPointerCancel={()=>{gesture.current=null;}} aria-label="Carusel video Floralis. Glisează pentru a schimba videoclipul.">
   {decorVideos.map((item,index)=><video key={item.src} ref={node=>refs.current[index]=node} className={index===active?'active':''} src={item.src} muted playsInline autoPlay={index===active} preload={index===active?'auto':'none'} aria-hidden={index!==active} onEnded={()=>index===active&&move(1)}/>)}
   <div className="decor-video-veil"/><div className="decor-video-caption" aria-live="polite"><span>{decorVideos[active].eyebrow}</span><strong>{decorVideos[active].title}</strong></div><span className="decor-video-count">0{active+1}<i/>04</span>
  </div>
  <div className="decor-video-controls"><button type="button" onClick={()=>move(-1)} aria-label="Videoclipul anterior"><ChevronLeft/></button><div className="decor-video-dots">{decorVideos.map((item,index)=><button type="button" key={item.src} className={index===active?'active':''} onClick={()=>setActive(index)} aria-label={'Vezi videoclipul '+(index+1)} aria-current={index===active?'true':undefined}><span/></button>)}</div><button type="button" onClick={()=>move(1)} aria-label="Videoclipul următor"><ChevronRight/></button></div>
  <small>IMAGINI REALE DIN EVENIMENTELE FLORALIS</small>
 </div>;
}
export default function Home(){const s=useStore(),settings=s.data?.settings,[products,setProducts]=useState([]),occasionSwipe=useSwipeRail();useEffect(()=>{api('/products?limit=100').then(r=>setProducts(r.items)).catch(e=>s.notify(e.message,'error'));},[]);if(!settings)return null;const collections=settings.collection_slugs.map(slug=>s.data.categories.find(c=>c.slug===slug)).filter(Boolean),recommended=interleaveFeaturedProducts(products.filter(p=>Number(p.featured)===1),s.data.categories),story=settings.story?.split('\n').filter(Boolean).find(x=>x.startsWith('Floralis'));
return <><Hero/>
<section className="collections-section section reveal"><SectionHeading eyebrow="DESCOPERĂ" title="Colecțiile noastre" link="/magazin" label="Vezi toate categoriile"/><div className="collections">{collections.map((c,i)=><Link key={c.id} to={'/categorie/'+c.slug} className={'collection-card collection-'+i}><div><h3>{c.name==='Nunta'?'Nuntă':c.name==='Craciun'?'Crăciun':c.name}</h3><p>{['Aranjamente de poveste','Purețe și delicatețe','Pentru orice ocazie','Detalii care fac diferența','Magia sărbătorilor'][i]}</p></div><Image src={categoryImage(c)} alt={c.name}/><span className="collection-shine" aria-hidden="true"/><span className="round-arrow"><ArrowRight size={17}/></span></Link>)}</div></section>
<section className="floral-banner reveal"><span className="eyebrow">FLORALIS</span><h2>Frumusețea naturală<br/><em>în fiecare detaliu</em></h2><i/></section>
<section className="decor-home section reveal"><span className="decor-home-bloom decor-home-bloom-one" aria-hidden="true"/><span className="decor-home-bloom decor-home-bloom-two" aria-hidden="true"/><DecorVideoCarousel/><div className="editorial-copy decor-home-copy"><span className="eyebrow">DECORURI CARE DEVIN AMINTIRI</span><h2>Un cadru înflorit pentru<br/><em>momentele care rămân.</em></h2><p className="decor-home-lead">Fiecare eveniment are o energie proprie. Noi o traducem în flori, texturi și lumină, într-un decor creat special pentru povestea, spațiul și oamenii tăi.</p><p>De la nunți și botezuri la aniversări sau întâlniri corporate, gândim conceptul, alegem florile și pregătim fiecare detaliu până la montajul final.</p><div className="decor-home-highlights"><span>Concept personalizat</span><span>Flori alese cu grijă</span><span>Montaj la locație</span></div><p className="decor-home-note">Tu aduci emoția. Noi construim atmosfera.</p><div className="decor-home-actions"><Link className="gold-button decor-primary-cta" to="/decor-floral">Descoperă decorurile<ArrowRight size={18}/></Link><Link className="decor-secondary-cta" to="/contact?subiect=Ofertă decor floral">Cere o propunere<ArrowRight size={17}/></Link></div></div></section>
<section className="recommended-section section reveal"><span className="recommended-watermark" aria-hidden="true">RECOMANDĂRI</span><span className="recommended-orbit recommended-orbit-one" aria-hidden="true"/><span className="recommended-orbit recommended-orbit-two" aria-hidden="true"/><SectionHeading eyebrow="ALESE CU GRIJĂ" title="Un dar, o emoție, o poveste" link="/magazin" label="Descoperă magazinul"/><p className="recommended-intro">O selecție din toate colecțiile Floralis, aleasă pentru a te purta de la gesturile de zi cu zi la momentele care rămân pentru totdeauna.</p><RecommendedCarousel products={recommended} categories={s.data.categories}/></section>
<section className="occasions section reveal"><span className="occasion-bloom occasion-bloom-one" aria-hidden="true"/><span className="occasion-bloom occasion-bloom-two" aria-hidden="true"/><div className="occasion-heading"><span className="eyebrow">FIECARE MOMENT MERITĂ FLORI</span><h2>Pentru toate felurile de <em>„te iubesc”.</em></h2><p>Flori alese pentru emoțiile mari și pentru gesturile mici care rămân în suflet.</p></div><div className="occasion-grid" {...occasionSwipe}>{occasionDefinitions.map(([name,slug,kicker,Icon],index)=>{const category=s.data.categories.find(item=>item.slug===slug);return <Link className="occasion-card" to={'/categorie/'+slug} key={slug}><Image src={categoryImage(category||{slug})} alt={name}/><span className="occasion-card-shade"/><span className="occasion-number">0{index+1}</span><span className="occasion-icon"><Icon size={21} strokeWidth={1.35}/></span><div className="occasion-copy"><small>{kicker}</small><h3>{name}</h3><span className="occasion-discover">Descoperă <ArrowRight size={16}/></span></div></Link>})}</div></section>
<section className="story-home section reveal"><span className="story-home-orbit story-home-orbit-one" aria-hidden="true"/><span className="story-home-orbit story-home-orbit-two" aria-hidden="true"/><div className="story-home-copy"><span className="eyebrow">POVESTEA NOASTRĂ</span><h2>Mai mult decât un atelier.<br/><em>Un loc pentru frumos.</em></h2><p>{story}</p><div className="story-home-values"><span><Leaf size={16}/>Flori alese cu grijă</span><span><Heart size={16}/>Creații cu suflet</span></div><Link className="story-home-cta" to="/despre-noi"><span>Cunoaște povestea Floralis</span><ArrowRight size={18}/></Link></div><div className="story-home-visual"><div className="story-home-frame"><Image src="/assets/floralis/export-bb030fca2f37.webp" alt="Interiorul atelierului Floralis, plin de flori și creații florale"/><span className="story-home-caption">ATELIER FLORAL · TUNARI</span></div><div className="story-home-year"><strong>2017</strong><span>De atunci,<br/>înflorim povești.</span></div><div className="story-home-signature"><i/><span>flori pentru suflet</span></div></div></section>
<section className="why-floralis section reveal"><span className="why-bloom why-bloom-one" aria-hidden="true"/><span className="why-bloom why-bloom-two" aria-hidden="true"/><SectionHeading eyebrow="PROMISIUNEA NOASTRĂ" title="Cu grijă. Cu pasiune. Cu suflet."/><div className="values">{[[Leaf,'Prospețime în fiecare petală','Alegem cu grijă florile, texturile și combinațiile cromatice.'],[Diamond,'Atenție la fiecare detaliu','Fiecare creație are un aer natural, rafinat și armonios.'],[Heart,'Emoții care rămân','Fiecare comandă spune o poveste și merită creată cu suflet.']].map(([Icon,title,text],index)=><article key={title}><span className="why-index">0{index+1}</span><span className="why-icon"><Icon strokeWidth={1}/><i aria-hidden="true"/></span><h3>{title}</h3><p>{text}</p><span className="why-line" aria-hidden="true"/></article>)}</div></section>
<HomeGallery images={settings.gallery}/>
<section className="visit-home section reveal"><span className="visit-orbit visit-orbit-one" aria-hidden="true"/><span className="visit-orbit visit-orbit-two" aria-hidden="true"/><div className="visit-copy"><span className="eyebrow">NE GĂSEȘTI ÎN TUNARI</span><h2>Vino la florăria<br/><em>{settings.store_name||'Floralis — arta florilor'}</em></h2><p className="visit-lead">Descoperă florile de aproape, culorile sezonului și creațiile pregătite în atelierul nostru.</p><div className="visit-address"><span><MapPin size={21}/></span><div><small>ADRESA FLORĂRIEI</small><strong>{settings.address}</strong></div></div><div className="visit-actions"><a className="visit-directions" href="https://www.google.com/maps/search/?api=1&query=Floralis+Tunari+Calea+Bucuresti+9" target="_blank" rel="noreferrer"><Navigation size={18}/><span>Vino la Floralis</span><ArrowRight size={17}/></a><a className="visit-phone" href={'tel:'+settings.phone}><Phone size={18}/><span><small>Contactează-ne</small><strong>{settings.phone}</strong></span></a></div><span className="visit-note"><i/>Te așteptăm cu flori, idei și multă bucurie.</span></div><div className="visit-map-shell"><span className="visit-map-label"><MapPin size={15}/>{settings.store_name||'Floralis — arta florilor'}</span><div className="visit-map-frame"><iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2843.4348774679634!2d26.13912747656769!3d44.547202494152565!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40b21d1e0d2b134d%3A0xd33ec2f79d2c1b85!2sFloralis%20-%20arta%20florilor!5e0!3m2!1sro!2sro!4v1791296794566!5m2!1sro!2sro" title={'Hartă '+(settings.store_name||'Floralis — arta florilor')} allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin"/></div><span className="visit-map-caption">CALEA BUCUREȘTI · TUNARI</span></div></section><Newsletter/></>;}
