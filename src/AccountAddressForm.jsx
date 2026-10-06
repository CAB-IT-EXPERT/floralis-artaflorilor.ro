import React,{useState} from 'react';
import {Building2,Save,UserRound} from 'lucide-react';
import {api} from './api';
import {useStore} from './context';

export default function AccountAddressForm({onSaved}){
 const store=useStore(),[identity,setIdentity]=useState('pf'),[busy,setBusy]=useState(false);
 return <form className="account-form account-address-form" onSubmit={async event=>{
  event.preventDefault();setBusy(true);
  try{const body=Object.fromEntries(new FormData(event.currentTarget));body.identity_type=identity;if(identity==='pf'){body.company_name='';body.cui='';body.registration_number='';}await api('/account/addresses',{method:'POST',body});event.currentTarget.reset();setIdentity('pf');await onSaved();store.notify('Adresa a fost salvată.');}
  catch(error){store.notify(error.message,'error');}
  finally{setBusy(false);}
 }}>
  <h3><Save/>Adaugă o adresă</h3>
  <div className="account-identity-selector" role="group" aria-label="Tipul adresei"><button type="button" className={identity==='pf'?'active':''} aria-pressed={identity==='pf'} onClick={()=>setIdentity('pf')}><UserRound/>Persoană fizică</button><button type="button" className={identity==='pj'?'active':''} aria-pressed={identity==='pj'} onClick={()=>setIdentity('pj')}><Building2/>Persoană juridică</button></div>
  <div className="form-grid">
   <label>Nume și prenume<input name="name" required autoComplete="name"/></label><label>Telefon<input name="phone" type="tel" required autoComplete="tel"/></label>
   {identity==='pj'&&<div className="account-address-company"><label>Denumire companie<input name="company_name" required autoComplete="organization"/></label><label>CUI / CIF<input name="cui" required placeholder="RO12345678"/></label><label className="full">Nr. Registrul Comerțului<input name="registration_number" placeholder="J23/1234/2026"/></label></div>}
   <label>Adresă<input name="street" required autoComplete="street-address"/></label><label>Localitate<input name="city" required autoComplete="address-level2"/></label><label>Județ<input name="county" required autoComplete="address-level1"/></label><label>Cod poștal<input name="postal_code" autoComplete="postal-code"/></label>
  </div>
  <button className="gold-button" disabled={busy}><Save/>{busy?'Se salvează…':'Salvează adresa'}</button>
 </form>;
}
