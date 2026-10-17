'use client';
import {useCallback,useEffect,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {ShieldCheck,RefreshCw,Trash2,Save,Globe,Lock} from 'lucide-react';
type Flags=Record<string,boolean>;
type Grant={user_id:string;email:string;flags:Flags;updated_at:string};
type PublicSettings={enabled:boolean;show_nickname:boolean;show_uid:boolean;show_role:boolean};
const ALL_FLAGS:[string,string][]=[
 ['view_contacts','🎮 Nickname CODM e UID'],['view_private_details','📒 Anagrafica, compleanni, città'],
 ['view_phone','📞 Leggere numeri telefonici'],['view_social','🌐 Social e foto private'],
 ['view_notes','📝 Note private'],['export_shared','📋 Esportazione WhatsApp/Excel con numeri'],
 ['export_staff','🔒 Esportazione Staff'],['edit_contacts','✏️ Modificare schede'],
 ['change_nickname','🎮 Cambiare nickname CODM'],['archive_contacts','📁 Archiviare contatti']];
const EMPTY:Flags={view_contacts:true};
export default function RubricaAccessPanel(){
 const [grants,setGrants]=useState<Grant[]>([]);
 const [email,setEmail]=useState('');const [flags,setFlags]=useState<Flags>({...EMPTY});
 const [pub,setPub]=useState<PublicSettings>({enabled:false,show_nickname:true,show_uid:true,show_role:false});
 const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{
  const [g,p]=await Promise.all([supabase.rpc('ak_rubrica_list_access'),supabase.rpc('ak_rubrica_public_admin_settings')]);
  if(g.error||p.error){setNotice('Verifica la migrazione FIX31E: '+(g.error?.message||p.error?.message));return;}
  setGrants(Array.isArray(g.data)?g.data as Grant[]:[]);
  setPub({...{enabled:false,show_nickname:true,show_uid:true,show_role:false},...(p.data||{})});
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 async function save(){if(!email.includes('@')||busy)return;setBusy(true);
  const {error}=await supabase.rpc('ak_rubrica_set_access',{p_email:email.trim(),p_flags:flags});setBusy(false);
  setNotice(error?'Autorizzazioni NON salvate: '+error.message:'Autorizzazioni aggiornate per '+email);if(!error)void refresh();
 }
 async function revoke(g:Grant){if(busy||!window.confirm(`Revocare TUTTI i permessi Rubrica a ${g.email}?`))return;
  setBusy(true);const {error}=await supabase.rpc('ak_rubrica_revoke_access',{p_user_id:g.user_id});setBusy(false);
  setNotice(error?error.message:'Accesso revocato a '+g.email);if(!error)void refresh();
 }
 async function savePublic(){if(busy)return;setBusy(true);const {error}=await supabase.rpc('ak_rubrica_set_public_settings',{p_settings:pub});setBusy(false);
  setNotice(error?'Visibilità non aggiornata: '+error.message:'Visibilità pubblica aggiornata. Sono visibili solo i profili con consenso individuale.');if(!error)void refresh();
 }
 return <section className="card ak31e-admin-panel"><header className="ak31e-panel-title"><ShieldCheck size={22}/><div><h2>🔐 Gestione accessi Rubrica</h2><p>Solo Owner. Ruoli CODM e permessi del sito sono indipendenti.</p></div><button type="button" className="btn secondary" onClick={()=>void refresh()}><RefreshCw size={15}/> Aggiorna</button></header>
  {notice&&<p className="notice" role="status">{notice}</p>}
  <h3>Account già autorizzati ({grants.length})</h3>
  <div className="ak31e-access-list">{grants.map(g=><article className="ak31e-access-row" key={g.user_id}>
    <div><strong>{g.email}</strong><small>Ultima modifica: {new Date(g.updated_at).toLocaleString('it-IT')}</small><div className="ak31e-chips">{ALL_FLAGS.filter(([k])=>g.flags?.[k]).map(([k,l])=><span key={k}>{l}</span>)}{!Object.values(g.flags||{}).some(Boolean)&&<span>Accesso negato</span>}</div></div>
    <div className="ak31e-access-actions"><button type="button" className="btn secondary" onClick={()=>{setEmail(g.email);setFlags({...g.flags});}}>✏️ Modifica</button><button type="button" className="btn danger" disabled={busy} onClick={()=>void revoke(g)}><Trash2 size={15}/> Revoca</button></div>
  </article>)}{!grants.length&&<p className="muted">Nessun permesso individuale registrato. L'Owner conserva accesso automatico.</p>}</div>
  <div className="ak31e-access-editor"><h3>Concedi o modifica accesso</h3><p className="muted">Per autorizzare l'esportazione condivisibile con telefoni, abilita sia «Esportazione WhatsApp/Excel con numeri» sia «Leggere numeri telefonici». Non servono consensi nella singola scheda. I permessi dell'app restano indipendenti dai ruoli CODM.</p><label>Account registrato (email)<input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email già registrata"/></label>
  <div className="ak31e-access-actions"><button type="button" className="btn secondary" onClick={()=>setFlags({view_contacts:true})}>🎮 Membro: solo nickname e UID</button><button type="button" className="btn secondary" onClick={()=>setFlags({view_contacts:true,view_private_details:true})}>🛡️ Staff: personalizza</button></div>
  <div className="ak31e-role-choices">{ALL_FLAGS.map(([k,label])=><label key={k}><input type="checkbox" checked={!!flags[k]} onChange={e=>setFlags(f=>({...f,[k]:e.target.checked,...(k==='export_shared'&&e.target.checked?{view_phone:true}:{}),...(k==='view_phone'&&!e.target.checked?{export_shared:false}:{})}))}/><span>{label}</span></label>)}</div>
  <button type="button" className="btn" disabled={busy||!email.includes('@')} onClick={()=>void save()}><Save size={16}/> Salva permessi</button></div>
  <div className="ak31e-public-settings"><h3><Globe size={19}/> Visibilità visitatori non registrati</h3><p className="muted">Disattivata per default. Mostra soltanto profili di giocatori attivi autorizzati individualmente alla pubblicazione. Mai telefoni, anagrafica, compleanni o città.</p>
  <label className="ak-rubrica-check"><input type="checkbox" checked={pub.enabled} onChange={e=>setPub(p=>({...p,enabled:e.target.checked}))}/> Abilita pagina Rubrica pubblica</label>
  <div className="ak31e-role-choices">{([['show_nickname','🎮 Nickname CODM'],['show_uid','🕹️ UID'],['show_role','👑 Ruolo Clan']] as const).map(([k,label])=><label key={k}><input type="checkbox" disabled={!pub.enabled} checked={pub[k]} onChange={e=>setPub(p=>({...p,[k]:e.target.checked}))}/>{label}</label>)}</div>
  <button type="button" className="btn secondary" disabled={busy} onClick={()=>void savePublic()}><Lock size={16}/> Salva visibilità pubblica</button>
  <p className="muted">Anteprima visitatori: <a href="/rubrica/pubblica" target="_blank" rel="noreferrer">Apri pagina pubblica</a>. Abilita anche il consenso individuale nel profilo di ciascun giocatore.</p></div>
 </section>;
}
