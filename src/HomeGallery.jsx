import React,{useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,ChevronLeft,ChevronRight,Maximize2} from 'lucide-react';
import {Dialog,Image} from './components';

const captions=[
 ['Ceremonii în aer liber','Flori care deschid povestea'],
 ['Detalii care rămân','Compoziții create cu grijă'],
 ['Atmosferă de poveste','Fiecare masă devine un tablou'],
 ['Eleganță în fiecare colț','Decoruri pentru momente memorabile'],
];

export default function HomeGallery({images=[]}){
 const [selected,setSelected]=useState(null),gesture=useRef(null),items=images.slice(0,4);
 const move=direction=>setSelected(current=>current===null?null:(current+direction+items.length)%items.length);
 useEffect(()=>{
  if(selected===null)return;
  const keys=event=>{if(event.key==='ArrowLeft')move(-1);if(event.key==='ArrowRight')move(1);};
  window.addEventListener('keydown',keys);
  return()=>window.removeEventListener('keydown',keys);
 },[selected,items.length]);
 return <section className="gallery-home section reveal">
  <span className="gallery-home-word" aria-hidden="true">INSPIRAȚIE</span><span className="gallery-home-ring gallery-home-ring-one" aria-hidden="true"/><span className="gallery-home-ring gallery-home-ring-two" aria-hidden="true"/>
  <div className="gallery-home-heading"><div><span className="eyebrow">DIN LUMEA FLORALIS</span><h2>Puțină inspirație<br/><em>pentru suflet.</em></h2><p>Fragmente din evenimentele și decorurile pe care le-am transformat în amintiri.</p></div><Link className="gallery-home-link" to="/galerie">Descoperă întreaga galerie<ArrowRight size={18}/></Link></div>
  <div className="gallery-home-grid">{items.map((item,index)=>{const [title,text]=captions[index];return <button type="button" className={'gallery-home-card gallery-home-card-'+(index+1)} key={item.url} onClick={()=>setSelected(index)} aria-label={'Mărește fotografia: '+title}><Image src={item.url} alt={title}/><span className="gallery-home-shade"/><span className="gallery-home-index">0{index+1}</span><span className="gallery-home-expand"><Maximize2/></span><span className="gallery-home-caption"><small>{text}</small><strong>{title}</strong></span></button>})}</div>
  <Dialog open={selected!==null} onClose={()=>setSelected(null)} className="home-gallery-lightbox" label="Fotografie mărită din galeria Floralis">
   {selected!==null&&<div className="home-gallery-lightbox-inner" onPointerDown={event=>{gesture.current={x:event.clientX,y:event.clientY};}} onPointerUp={event=>{const start=gesture.current;gesture.current=null;if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.15)move(dx<0?1:-1);}} onPointerCancel={()=>{gesture.current=null;}}>
    <div className="home-gallery-photo"><Image src={items[selected].url} alt={captions[selected][0]} priority/><span className="home-gallery-photo-glow"/></div>
    <button type="button" className="home-gallery-nav home-gallery-prev" onClick={()=>move(-1)} aria-label="Fotografia anterioară"><ChevronLeft/></button><button type="button" className="home-gallery-nav home-gallery-next" onClick={()=>move(1)} aria-label="Fotografia următoare"><ChevronRight/></button>
    <div className="home-gallery-modal-caption"><span><b>{String(selected+1).padStart(2,'0')}</b> / {String(items.length).padStart(2,'0')}</span><div><small>{captions[selected][1]}</small><strong>{captions[selected][0]}</strong></div><i/></div>
   </div>}
  </Dialog>
 </section>;
}
