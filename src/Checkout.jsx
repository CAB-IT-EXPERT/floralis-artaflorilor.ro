import React,{useEffect,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {ArrowRight,Building2,Check,CreditCard,Gift,MapPin,PackageCheck,ReceiptText,ShieldCheck,Sparkles,Truck,UserRound,WalletCards} from 'lucide-react';
import {api,money} from './api';
import {useStore} from './context';
import {Empty,Image} from './components';
import './checkout-premium.css';

const emptyFields={first_name:'',last_name:'',email:'',phone:'',street:'',city:'',county:'',postal_code:'',company_name:'',cui:'',registration_number:''};

function splitName(name=''){
 const parts=name.trim().split(/\s+/).filter(Boolean);
 return {first_name:parts.shift()||'',last_name:parts.join(' ')};
}

function Field({label,name,fields,setFields,type='text',required=false,autoComplete,placeholder,className=''}){
 return <label className={'checkout-field '+className}><span>{label}{required&&<b>*</b>}</span><input name={name} type={type} required={required} value={fields[name]||''} autoComplete={autoComplete} placeholder={placeholder} onChange={event=>setFields(current=>({...current,[name]:event.target.value}))}/></label>;
}

export default function Checkout(){
 const store=useStore(),navigate=useNavigate(),profileApplied=useRef(false);
 const [quote,setQuote]=useState(null),[coupon,setCoupon]=useState(''),[applied,setApplied]=useState('');
 const [shipping,setShipping]=useState(''),[payment,setPayment]=useState(''),[identity,setIdentity]=useState('pf');
 const [fields,setFields]=useState(emptyFields),[account,setAccount]=useState(null),[selectedAddress,setSelectedAddress]=useState('manual');
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[idem,setIdem]=useState(()=>crypto.randomUUID());

 useEffect(()=>{
  if(!store.data?.user||profileApplied.current)return;
  profileApplied.current=true;
  setFields(current=>({...current,...splitName(store.data.user.name),email:store.data.user.email||'',phone:store.data.user.phone||''}));
 },[store.data?.user]);
 useEffect(()=>{
  if(!store.data?.user){setAccount(null);return;}
  let active=true;
  api('/account').then(data=>{if(active)setAccount(data);}).catch(()=>{});
  return()=>{active=false;};
 },[store.data?.user?.id]);
 useEffect(()=>{if(!shipping&&store.data?.shipping?.length)setShipping(String(store.data.shipping[0].id));},[store.data?.shipping,shipping]);
 useEffect(()=>{const first=store.data?.payments?.find(method=>Number(method.enabled));if(first&&!payment)setPayment(first.code);},[store.data?.payments,payment]);
 useEffect(()=>{
  if(!shipping||!store.cart.length)return;
  let active=true;
  api('/checkout/quote',{method:'POST',body:{shipping_id:Number(shipping),coupon:applied}}).then(data=>{if(active){setQuote(data);setError('');}}).catch(reason=>{if(active)setError(reason.message);});
  return()=>{active=false;};
 },[shipping,applied,store.cart]);

 const chooseAddress=id=>{
  setSelectedAddress(String(id));
  if(id==='manual'){
   const person=splitName(store.data?.user?.name||'');
   setIdentity('pf');
   setFields(current=>({...emptyFields,...person,email:current.email||store.data?.user?.email||'',phone:store.data?.user?.phone||''}));
   return;
  }
  const address=account?.addresses?.find(item=>String(item.id)===String(id));
  if(!address)return;
  const kind=address.identity_type==='pj'?'pj':'pf';
  setIdentity(kind);
  setFields(current=>({...current,...splitName(address.name),phone:address.phone||current.phone,street:address.street||'',city:address.city||'',county:address.county||'',postal_code:address.postal_code||'',company_name:address.company_name||'',cui:address.cui||'',registration_number:address.registration_number||''}));
 };

 const applyCoupon=async()=>{
  try{const data=await api('/checkout/quote',{method:'POST',body:{shipping_id:Number(shipping),coupon:coupon.trim()}});setApplied(coupon.trim());setQuote(data);setError('');}
  catch(reason){setError(reason.message);}
 };

 const submit=async event=>{
  event.preventDefault();setBusy(true);setError('');
  try{
   const name=[fields.first_name,fields.last_name].filter(Boolean).join(' ').trim();
   const address={name,phone:fields.phone,street:fields.street,city:fields.city,county:fields.county,postal_code:fields.postal_code,identity_type:identity,company_name:identity==='pj'?fields.company_name:'',cui:identity==='pj'?fields.cui:'',registration_number:identity==='pj'?fields.registration_number:''};
   const order=await api('/orders',{method:'POST',body:{address,email:fields.email,shipping_id:Number(shipping),payment_method:payment,coupon:applied,notes:new FormData(event.currentTarget).get('notes')||'',consent,idempotency_key:idem}});
   await store.refresh();
   if(order.checkout_url){window.location.assign(order.checkout_url);return;}
   navigate('/comanda/'+order.number+'?token='+order.token);
  }catch(reason){setError(reason.message);setIdem(crypto.randomUUID());await store.refresh();}
  finally{setBusy(false);}
 };

 if(!store.cart.length)return <Empty title="Coșul tău este gol." text="Alege o creație florală, iar noi vom avea grijă de restul poveștii."/>;
 const enabledPayments=store.data?.payments?.filter(method=>Number(method.enabled))||[];

 return <section className="premium-checkout">
  <div className="checkout-ambient checkout-ambient-one" aria-hidden="true"/><div className="checkout-ambient checkout-ambient-two" aria-hidden="true"/>
  <header className="checkout-hero">
   <span className="checkout-hero-mark"><Sparkles/></span><span className="eyebrow">FINALIZEAZĂ CU GRIJĂ</span>
   <h1>Ultimul pas către<br/><em>un dar memorabil.</em></h1>
   <p>Date clare, plată sigură și fiecare detaliu pregătit cu atenție în atelierul Floralis.</p>
   <div className="checkout-progress" aria-label="Pașii comenzii"><span className="done"><Check/><b>Coș</b></span><i/><span className="active"><b>02</b><strong>Detalii</strong></span><i/><span><b>03</b><strong>Confirmare</strong></span></div>
  </header>

  <form className="premium-checkout-layout" onSubmit={submit}>
   <div className="checkout-form-column">
    <section className="checkout-card checkout-card-person" style={{'--checkout-delay':'0ms'}}>
     <div className="checkout-card-heading"><span><UserRound/></span><div><small>01 · DATELE CLIENTULUI</small><h2>Cine trimite povestea?</h2><p>Alege tipul de client și completează datele folosite pentru comandă.</p></div></div>
     <div className="identity-selector" role="group" aria-label="Tip client">
      <button type="button" className={identity==='pf'?'active':''} aria-pressed={identity==='pf'} onClick={()=>setIdentity('pf')}><UserRound/><span><b>Persoană fizică</b><small>Comandă personală</small></span><Check/></button>
      <button type="button" className={identity==='pj'?'active':''} aria-pressed={identity==='pj'} onClick={()=>setIdentity('pj')}><Building2/><span><b>Persoană juridică</b><small>Date pentru companie</small></span><Check/></button>
     </div>
     {!store.data?.user?<div className="checkout-login-note"><UserRound/><span><b>Ai deja cont Floralis?</b><small>Autentifică-te pentru a completa automat datele și adresele salvate.</small></span><Link to="/cont?next=/checkout">Autentifică-te<ArrowRight/></Link></div>:<div className="checkout-account-note"><Check/><span>Datele sunt preluate din contul tău. Le poți modifica pentru această comandă sau din <Link to="/cont">profilul tău</Link>.</span></div>}
     <div className="checkout-fields-grid">
      <Field label="Prenume" name="first_name" fields={fields} setFields={setFields} required autoComplete="given-name" placeholder="Alexie"/>
      <Field label="Nume" name="last_name" fields={fields} setFields={setFields} required autoComplete="family-name" placeholder="Popescu"/>
      <Field label="Email" name="email" fields={fields} setFields={setFields} type="email" required autoComplete="email" placeholder="nume@email.ro"/>
      <Field label="Telefon" name="phone" fields={fields} setFields={setFields} type="tel" required autoComplete="tel" placeholder="07xx xxx xxx"/>
     </div>
     {identity==='pj'&&<div className="company-fields" key="company-fields"><div className="company-fields-title"><Building2/><span><b>Datele companiei</b><small>Vor fi păstrate în detaliile acestei comenzi.</small></span></div><div className="checkout-fields-grid"><Field label="Denumire companie" name="company_name" fields={fields} setFields={setFields} required autoComplete="organization" placeholder="Compania SRL"/><Field label="CUI / CIF" name="cui" fields={fields} setFields={setFields} required placeholder="RO12345678"/><Field label="Nr. Registrul Comerțului" name="registration_number" fields={fields} setFields={setFields} className="full" placeholder="J23/1234/2026"/></div></div>}
    </section>

    <section className="checkout-card" style={{'--checkout-delay':'90ms'}}>
     <div className="checkout-card-heading"><span><MapPin/></span><div><small>02 · DESTINAȚIA</small><h2>Unde ajung florile?</h2><p>Alege o adresă salvată sau completează una nouă.</p></div></div>
     {store.data?.user&&<div className="saved-addresses" role="list" aria-label="Adrese salvate">
      {account?.addresses?.map((address,index)=><button type="button" role="listitem" key={address.id} className={selectedAddress===String(address.id)?'selected':''} onClick={()=>chooseAddress(address.id)}><span className="saved-address-icon"><MapPin/></span><span><small>{address.identity_type==='pj'?'PERSOANĂ JURIDICĂ':'ADRESA '+String(index+1).padStart(2,'0')}</small><b>{address.company_name||address.name}</b><em>{address.street}, {address.city}</em></span><i><Check/></i></button>)}
      <button type="button" role="listitem" className={'new-address '+(selectedAddress==='manual'?'selected':'')} onClick={()=>chooseAddress('manual')}><span className="saved-address-icon"><MapPin/></span><span><small>ALTĂ DESTINAȚIE</small><b>Completează o adresă nouă</b><em>Datele rămân doar pentru această comandă.</em></span><i><Check/></i></button>
     </div>}
     <div className="checkout-fields-grid checkout-address-grid">
      <Field label="Județ" name="county" fields={fields} setFields={setFields} required autoComplete="address-level1" placeholder="Ilfov"/>
      <Field label="Localitate" name="city" fields={fields} setFields={setFields} required autoComplete="address-level2" placeholder="Tunari"/>
      <Field label="Adresă completă" name="street" fields={fields} setFields={setFields} required autoComplete="street-address" className="wide" placeholder="Stradă, număr, bloc, apartament"/>
      <Field label="Cod poștal" name="postal_code" fields={fields} setFields={setFields} autoComplete="postal-code" placeholder="077180"/>
     </div>
    </section>

    <section className="checkout-card" style={{'--checkout-delay':'180ms'}}>
     <div className="checkout-card-heading"><span><Truck/></span><div><small>03 · LIVRARE ȘI PLATĂ</small><h2>Alege cum continuăm.</h2><p>Costurile și disponibilitatea sunt actualizate direct din setările magazinului.</p></div></div>
     <h3 className="checkout-option-title">Metoda de livrare</h3>
     <div className="checkout-options">{store.data?.shipping?.map(method=><label className={Number(shipping)===Number(method.id)?'selected':''} key={method.id}><input type="radio" name="shipping" value={method.id} checked={Number(shipping)===Number(method.id)} onChange={()=>setShipping(String(method.id))}/><span className="option-icon"><Truck/></span><span><b>{method.name}</b><small>{method.free_threshold_cents?`Gratuit peste ${money(method.free_threshold_cents)}`:'Pregătită cu grijă din atelier'}</small></span><strong>{money(method.price_cents)}</strong><i><Check/></i></label>)}</div>
     <h3 className="checkout-option-title">Metoda de plată</h3>
     <div className="checkout-options payment-options">{enabledPayments.map(method=><label className={payment===method.code?'selected':''} key={method.code}><input type="radio" name="payment_method" value={method.code} checked={payment===method.code} onChange={()=>setPayment(method.code)}/><span className="option-icon">{method.code==='card'?<CreditCard/>:<WalletCards/>}</span><span><b>{method.name}</b><small>{method.code==='card'?'Plată securizată online':'Plătești la primirea comenzii'}</small></span>{method.code==='card'&&<em>RECOMANDAT</em>}<i><Check/></i></label>)}</div>
     <label className="checkout-notes"><span>Un detaliu pentru atelier <small>opțional</small></span><textarea name="notes" maxLength={2000} placeholder="Mesaj pentru destinatar, interval preferat sau alte detalii utile…"/></label>
    </section>
   </div>

   <aside className="checkout-summary">
    <div className="checkout-summary-head"><span><Gift/></span><div><small>COMANDA TA</small><h2>Florile alese</h2></div><b>{store.cart.reduce((total,item)=>total+item.quantity,0)}</b></div>
    <div className="checkout-summary-products">{store.cart.map(item=><article key={item.id}><div><Image src={item.images[0]?.url} alt={item.name}/><span>{item.quantity}</span></div><p><b>{item.name}</b><small>{item.categories?.at(-1)?.name||'Creație Floralis'}</small></p><strong>{money(item.price_cents*item.quantity)}</strong></article>)}</div>
    <div className="checkout-coupon"><span><ReceiptText/></span><input aria-label="Cod cupon" placeholder="Cod de reducere" value={coupon} onChange={event=>setCoupon(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();applyCoupon();}}}/><button type="button" onClick={applyCoupon}>Aplică</button></div>
    {applied&&<p className="checkout-coupon-applied"><Check/>Cuponul <b>{applied}</b> a fost aplicat.</p>}
    <div className="checkout-totals" aria-live="polite"><div><span>Subtotal</span><b>{quote?money(quote.subtotal_cents):'Se calculează…'}</b></div><div><span>Livrare</span><b>{quote?money(quote.shipping_cents):'—'}</b></div>{quote?.discount_cents>0&&<div className="discount"><span>Reducere</span><b>−{money(quote.discount_cents)}</b></div>}<div className="total"><span>Total <small>TVA inclus</small></span><b>{quote?money(quote.total_cents):'—'}</b></div></div>
    <label className={'checkout-consent '+(consent?'checked':'')}><input name="consent" type="checkbox" required checked={consent} onChange={event=>setConsent(event.target.checked)}/><span className="checkout-consent-switch" aria-hidden="true"><i><Check/></i></span><span><b>Am citit și sunt de acord</b><small>Accept <Link to="/termeni-si-conditii">Termenii și condițiile</Link> și <Link to="/confidentialitate">Politica de confidențialitate</Link>.</small></span></label>
    {error&&<p className="checkout-error" role="alert">{error}</p>}
    <button className="checkout-submit" type="submit" disabled={busy||!quote||!payment}><span>{busy?'Pregătim comanda…':'Plasează comanda'}</span><ArrowRight/></button>
    <div className="checkout-assurances"><span><ShieldCheck/><b>Plată protejată</b></span><span><PackageCheck/><b>Pregătire atentă</b></span></div>
    <p className="checkout-fine-print"><ShieldCheck/>Datele tale sunt transmise în siguranță și folosite doar pentru procesarea comenzii.</p>
   </aside>
  </form>
 </section>;
}
