import React,{useCallback,useEffect,useRef,useState} from 'react';
import {LoaderCircle,MapPin,Navigation} from 'lucide-react';
import './deferred-map.css';

const EMBED_URL='https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2843.4348774679634!2d26.13912747656769!3d44.547202494152565!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40b21d1e0d2b134d%3A0xd33ec2f79d2c1b85!2sFloralis%20-%20arta%20florilor!5e0!3m2!1sro!2sro!4v1791296794566!5m2!1sro!2sro';
const MAPS_URL='https://www.google.com/maps/search/?api=1&query=Floralis+Calea+Bucuresti+9+Tunari+Ilfov';

export default function DeferredMap({className='',title='Floralis – arta florilor pe Google Maps'}){
  const hostRef=useRef(null),[requested,setRequested]=useState(false),[ready,setReady]=useState(false);
  const requestMap=useCallback(()=>setRequested(true),[]);

  useEffect(()=>{
    if(requested||!hostRef.current)return;
    let idleId=null,timerId=null;
    const loadWhenIdle=()=>{
      if('requestIdleCallback' in window)idleId=window.requestIdleCallback(requestMap,{timeout:1600});
      else timerId=window.setTimeout(requestMap,650);
    };
    if(!('IntersectionObserver' in window)){
      timerId=window.setTimeout(requestMap,1200);
      return()=>window.clearTimeout(timerId);
    }
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){
        observer.disconnect();
        loadWhenIdle();
      }
    },{rootMargin:'140px 0px'});
    observer.observe(hostRef.current);
    return()=>{
      observer.disconnect();
      if(idleId!==null&&'cancelIdleCallback' in window)window.cancelIdleCallback(idleId);
      if(timerId!==null)window.clearTimeout(timerId);
    };
  },[requested,requestMap]);

  return <div ref={hostRef} className={`deferred-map ${ready?'is-ready':''} ${className}`.trim()}>
    {requested&&<iframe src={EMBED_URL} title={title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onLoad={()=>setReady(true)}/>} 
    {!ready&&<div className={`deferred-map-preview ${requested?'is-loading':''}`} role="region" aria-label="Previzualizare hartă Floralis">
      <span className="deferred-map-road deferred-map-road-one" aria-hidden="true"/><span className="deferred-map-road deferred-map-road-two" aria-hidden="true"/><span className="deferred-map-road deferred-map-road-three" aria-hidden="true"/>
      <div className="deferred-map-place"><span className="deferred-map-pin"><MapPin/></span><small>FLORALIS · TUNARI, ILFOV</small><strong>Calea București Nr. 9 · Tunari, Ilfov</strong><span>Harta interactivă se deschide doar când ai nevoie de ea.</span></div>
      <div className="deferred-map-actions">
        <button type="button" onClick={requestMap} disabled={requested}>{requested?<><LoaderCircle className="deferred-map-spinner"/>Se încarcă harta</>:<><MapPin/>Încarcă harta</>}</button>
        <a href={MAPS_URL} target="_blank" rel="noreferrer"><Navigation/>Deschide în Maps</a>
      </div>
    </div>}
  </div>;
}
