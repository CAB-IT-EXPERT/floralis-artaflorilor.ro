import React,{useEffect,useState} from 'react';
import {BarChart3,Check,Cookie,ShieldCheck,Sparkles,X} from 'lucide-react';
import {readConsent,saveConsent,updateGoogleConsent} from './analytics';

export default function CookieConsent(){
  const initial=readConsent(),[open,setOpen]=useState(!initial),[advanced,setAdvanced]=useState(false),[choices,setChoices]=useState(initial||{analytics:false,marketing:false});
  useEffect(()=>{
    if(initial)updateGoogleConsent(initial);
    const reopen=()=>{const current=readConsent()||{analytics:false,marketing:false};setChoices(current);setAdvanced(true);setOpen(true);};
    window.addEventListener('floralis:cookie-settings',reopen);
    return()=>window.removeEventListener('floralis:cookie-settings',reopen);
  },[]);
  if(!open)return null;
  const apply=choice=>{setChoices(choice);saveConsent(choice);setOpen(false);setAdvanced(false);};
  return <section className={'cookie-consent '+(advanced?'is-advanced':'')} role="dialog" aria-modal="true" aria-labelledby="cookie-title" data-nosnippet>
    <div className="cookie-consent-glow" aria-hidden="true"/><div className="cookie-consent-icon"><Cookie/></div>
    <div className="cookie-consent-copy"><span>EXPERIENȚĂ FLORALIS</span><h2 id="cookie-title">Tu alegi cum folosim modulele cookie.</h2><p>Folosim module necesare pentru magazin și, doar cu acordul tău, măsurare Analytics și publicitate. Poți schimba alegerea oricând.</p></div>
    {advanced&&<div className="cookie-consent-options">
      <div className="cookie-consent-option is-required"><span><ShieldCheck/></span><div><b>Necesare</b><small>Coș, autentificare și funcțiile esențiale.</small></div><em><Check/>Mereu active</em></div>
      <label className={choices.analytics?'is-enabled':''}><span><BarChart3/></span><div><b>Analiză</b><small>Ne ajută să înțelegem utilizarea magazinului.</small></div><input type="checkbox" checked={choices.analytics} onChange={event=>setChoices(value=>({...value,analytics:event.target.checked}))}/><i><Check/></i></label>
      <label className={choices.marketing?'is-enabled':''}><span><Sparkles/></span><div><b>Marketing</b><small>Măsurarea reclamelor și a conversiilor.</small></div><input type="checkbox" checked={choices.marketing} onChange={event=>setChoices(value=>({...value,marketing:event.target.checked}))}/><i><Check/></i></label>
    </div>}
    <div className="cookie-consent-actions">
      {advanced?<><button type="button" className="cookie-secondary" onClick={()=>apply({analytics:false,marketing:false})}>Doar necesare</button><button type="button" className="cookie-primary" onClick={()=>apply(choices)}>Salvează alegerea<Check/></button></>:<><button type="button" className="cookie-tertiary" onClick={()=>setAdvanced(true)}>Personalizează</button><button type="button" className="cookie-secondary" onClick={()=>apply({analytics:false,marketing:false})}>Doar necesare</button><button type="button" className="cookie-primary" onClick={()=>apply({analytics:true,marketing:true})}>Accept toate<Check/></button></>}
    </div>
    {initial&&<button type="button" className="cookie-consent-close" aria-label="Închide setările cookie" onClick={()=>setOpen(false)}><X/></button>}
  </section>;
}
