import React,{useEffect,useRef} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight} from 'lucide-react';
import './hero.css';

function BenefitIcon({kind}) {
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind==='diamond' ? <><path d="M4 17 12 5h24l8 12-20 27Z"/><path d="M4 17h40M12 5l5 12 7-12 7 12 5-12M17 17l7 27 7-27"/></> : kind==='truck' ? <><path d="M3 8h26v27H13M3 8v27h3M29 14h9l7 11v10h-5M29 35h4M32 17h5l5 8H32Z"/><circle cx="9.5" cy="35" r="4"/><circle cx="36.5" cy="35" r="4"/></> : <><path d="M13 45C14 26 28 19 38 3M16 32C10 26 10 17 14 11c6 9 8 14 2 21ZM20 26C18 14 30 7 42 3c-2 12-9 24-22 23ZM18 37c7-10 15-11 23-10-5 8-12 13-23 10Z"/></>}
  </svg>;
}

export default function Hero() {
  const heroRef=useRef(null);
  useEffect(()=>{
    const desktop=window.matchMedia('(min-width: 768px)');
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(!desktop.matches||reduced.matches)return;
    let frame=0;
    const update=()=>{
      if(frame)return;
      frame=window.requestAnimationFrame(()=>{
        frame=0;
        const hero=heroRef.current;
        if(!hero)return;
        const offset=Math.min(46,Math.max(0,-hero.getBoundingClientRect().top*.085));
        hero.style.setProperty('--hero-parallax',offset+'px');
      });
    };
    update();
    window.addEventListener('scroll',update,{passive:true});
    return()=>{window.removeEventListener('scroll',update);if(frame)window.cancelAnimationFrame(frame);};
  },[]);
  return <section ref={heroRef} className="floralis-hero" aria-labelledby="floralis-hero-title">
    <picture className="floralis-hero-background">
      <source media="(max-width: 767px)" srcSet="/assets/floralis/hero-mobile.webp"/>
      <img src="/assets/floralis/hero-desktop.webp" width="1774" height="887" alt="" fetchPriority="high" loading="eager" decoding="async"/>
    </picture>
    <div className="floralis-hero-content">
      <p className="floralis-hero-eyebrow"><span>Flori pentru</span><strong>momente care contează</strong></p>
      <h1 id="floralis-hero-title">
        Mai mult<br/>decât flori,
        <em>emoții în dar.</em>
      </h1>
      <p className="floralis-hero-description">Aranjamente florale premium, create cu pasiune pentru cele mai frumoase momente din viața ta.</p>
      <Link className="floralis-hero-button" to="/magazin"><span>Descoperă colecțiile</span><ArrowRight aria-hidden="true"/></Link>
      <ul className="floralis-hero-benefits" aria-label="Grija Floralis pentru fiecare comandă">
        <li><BenefitIcon kind="diamond"/><span>Aranjamente<br/>premium</span></li>
        <li><BenefitIcon kind="truck"/><span>Livrare rapidă<br/>în toată țara</span></li>
        <li><BenefitIcon kind="leaf"/><span>Flori proaspete<br/>și atent selecționate</span></li>
      </ul>
    </div>
    <div className="floralis-hero-signature" aria-hidden="true">ARTĂ<br/>EMOȚIE<br/>ELEGANȚĂ<span/></div>
  </section>;
}
