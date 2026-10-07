import React,{createContext,useContext,useEffect,useState} from 'react';
import {api} from './api';
import {analyticsItem,pushEcommerce} from './analytics';
const Context=createContext(null);
export const useStore=()=>useContext(Context);
export function StoreProvider({children}){
 const [data,setData]=useState(null),[cart,setCart]=useState([]),[favorites,setFavorites]=useState(()=>{try{return JSON.parse(localStorage.getItem('floralis-favorites')||'[]');}catch{return [];}}),[toast,setToast]=useState(null),[error,setError]=useState(''),[drawer,setDrawer]=useState(false);
 const notify=(message,type='success')=>setToast({message,type,id:Date.now()});
 async function refresh(){const d=await api('/bootstrap');setData(d);if(d.user)setFavorites(d.favorites);const c=await api('/cart');setCart(c.items);return d;}
 useEffect(()=>{refresh().catch(e=>setError(e.message));},[]);
 useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(null),5000);return()=>clearTimeout(id);},[toast]);
 async function add(p,quantity=1){try{const old=cart.find(x=>x.id===p.id);const c=await api('/cart/'+p.id,{method:'PUT',body:{quantity:(old?.quantity||0)+quantity}});setCart(c.items);setDrawer(true);pushEcommerce('add_to_cart',{currency:'RON',value:Number(p.price_cents||0)*quantity/100,items:[analyticsItem(p,quantity)]});return true;}catch(e){notify(e.message,'error');return false;}}
 async function quantity(id,value){try{const old=cart.find(x=>x.id===id),delta=Number(value)-(old?.quantity||0);const c=await api('/cart/'+id,{method:'PUT',body:{quantity:value}});setCart(c.items);if(old&&delta!==0)pushEcommerce(delta>0?'add_to_cart':'remove_from_cart',{currency:'RON',value:Number(old.price_cents||0)*Math.abs(delta)/100,items:[analyticsItem(old,Math.abs(delta))]});}catch(e){notify(e.message,'error');}}
 async function favorite(id){
  const previous=favorites,wasFavorite=previous.includes(id),ids=wasFavorite?previous.filter(x=>x!==id):[...previous,id];
  setFavorites(ids);
  notify(wasFavorite?'Produs eliminat din favorite.':'Produs adăugat la favorite.');
  try{
   if(data?.user)await api('/account/favorites',{method:'PUT',body:{ids}});
   else localStorage.setItem('floralis-favorites',JSON.stringify(ids));
   return true;
  }catch(e){
   setFavorites(previous);
   notify(e.message,'error');
   return false;
  }
 }
 async function afterLogin(){const saved=favorites;const d=await refresh();if(d.user&&saved.length){const ids=[...new Set([...saved,...d.favorites])];await api('/account/favorites',{method:'PUT',body:{ids}});setFavorites(ids);}}
 if(error)return <div className="fatal"><img src="/assets/floralis/logo.png" alt="Floralis"/><h1>Magazinul nu este disponibil momentan.</h1><p>{error}</p><button onClick={()=>location.reload()}>Încearcă din nou</button></div>;
 return <Context.Provider value={{data,cart,favorites,add,quantity,favorite,refresh,afterLogin,notify,drawer,setDrawer}}>{children}{toast&&<div className={'toast '+toast.type} role="status">{toast.message}<button aria-label="Închide notificarea" onClick={()=>setToast(null)}>×</button></div>}</Context.Provider>;
}
