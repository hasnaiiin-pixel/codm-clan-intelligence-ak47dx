'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCodmAuth } from '@/lib/authRoles';
import { ContactRound, Search, Plus, Pencil, X, Save, History, ShieldCheck, MessageCircle, Instagram, Facebook, Youtube, Send, ExternalLink, Archive, RefreshCw, Camera, CalendarDays, MapPin, FileDown } from 'lucide-react';
import {RubricaBirthdayCalendar,RubricaMap,RubricaExportCenter,RubricaMatchReview} from './RubricaExtras';
import RubricaOrgChart from './RubricaOrgChart';
import {RUBRICA_ROLES,clanRoleEmoji,clanRoleGroups,clanRoleTier} from './rubricaRoles';

type Contact = {
  id?: string; nickname: string; uid?: string|null; given_name?: string|null; surname?: string|null;
  phone?: string|null; phone_alt?: string|null; whatsapp_name?: string|null;
  birth_date?: string|null; city?: string|null; province?: string|null; country?: string|null;
  clan_role?: string|null; clan_status?: string|null; whatsapp_group?: boolean; share_phone?: boolean; map_opt_in?: boolean; joined_at?: string|null;
  notes?: string|null; codm_photo_url?: string|null; personal_photo_url?: string|null;
  tiktok?: string|null; instagram?: string|null; facebook?: string|null;
  youtube?: string|null; telegram?: string|null; discord?: string|null;
};
type Flags={view_contacts?:boolean;edit_contacts?:boolean;change_nickname?:boolean;view_phone?:boolean;view_social?:boolean;view_notes?:boolean;archive_contacts?:boolean;manage_access?:boolean;view_private_details?:boolean};
type NickHistory={old:string;new:string;at:string};
const EMPTY: Contact={nickname:'',uid:'',given_name:'',surname:'',phone:'',phone_alt:'',whatsapp_name:'',birth_date:'',city:'',province:'',country:'',clan_role:'Membro',clan_status:'Attivo',whatsapp_group:true,share_phone:false,map_opt_in:false,joined_at:'',notes:'',codm_photo_url:'',personal_photo_url:'',tiktok:'',instagram:'',facebook:'',youtube:'',telegram:'',discord:''};
const TEXT_FIELDS=[
  ['nickname','Nickname CODM *'],['uid','UID CODM'],['given_name','Nome'],['surname','Cognome'],
  ['phone','Telefono / WhatsApp'],['whatsapp_name','Nome contatto WhatsApp'],
  ['birth_date','Compleanno (facoltativo)'],['city','Città'],['province','Provincia'],['country','Paese'],['joined_at','Data ingresso'],
  ['tiktok','TikTok (URL o @username)'],['instagram','Instagram (URL o @username)'],
  ['facebook','Facebook (URL o nome account)'],['youtube','YouTube (URL o @handle)'],
  ['telegram','Telegram (URL o @username)'],['discord','Discord (link invito)'],['notes','Note riservate']
] as const;
const PHONE_FIELDS=new Set(['phone','phone_alt','whatsapp_name']);
const SOCIAL_FIELDS=new Set(['tiktok','instagram','facebook','youtube','telegram','discord','personal_photo_url']);
const SAFE_URL=/^https:\/\/[^\s]+$/i;

function safeSocialLink(network:'tiktok'|'instagram'|'facebook'|'youtube'|'telegram'|'discord',raw?:string|null):string|null{
  const value=(raw||'').trim(); if(!value)return null;
  if(SAFE_URL.test(value)){
    try{const u=new URL(value);const allowed:Record<string,string[]>={tiktok:['tiktok.com'],instagram:['instagram.com'],facebook:['facebook.com','fb.com'],youtube:['youtube.com','youtu.be'],telegram:['t.me','telegram.me'],discord:['discord.gg','discord.com']};return u.protocol==='https:'&&allowed[network].some(domain=>u.hostname===domain||u.hostname.endsWith('.'+domain))?u.toString():null;}catch{return null;}
  }
  if(value.includes('/')||value.includes(' ')||value.includes(':'))return null;
  const user=value.replace(/^@/,''); if(!/^[a-z0-9_.-]{2,70}$/i.test(user))return null;
  const domains={tiktok:'https://www.tiktok.com/@',instagram:'https://www.instagram.com/',facebook:'https://www.facebook.com/',youtube:'https://www.youtube.com/@',telegram:'https://t.me/',discord:''};
  return domains[network]?domains[network]+encodeURIComponent(user):null;
}
function whatsappLink(phone?:string|null,nickname?:string):string|null{
  if(!phone)return null;
  const value=phone.replace(/[^+\d]/g,'');
  const digits=(value.startsWith('+')?value.slice(1):value.startsWith('00')?value.slice(2):value.startsWith('39')?value:'39'+value);
  if(!/^\d{8,15}$/.test(digits))return null;
  const message=`Ciao ${nickname||''}, ti scrivo dalla rubrica AK47DX.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
function roleIcon(role?:string|null){return clanRoleEmoji(role);}

export default function RubricaPage(){
  const auth=useCodmAuth();
  const [flags,setFlags]=useState<Flags>({});
  const [items,setItems]=useState<Contact[]>([]);
  const [query,setQuery]=useState('');
  const [section,setSection]=useState<'rubrica'|'compleanni'|'mappa'|'export'|'screenshot'|'organigramma'>('rubrica');
  const [photos,setPhotos]=useState<{codm:string;personal:string}>({codm:'',personal:''});
  const [uploadingPhoto,setUploadingPhoto]=useState(false);
  const [status,setStatus]=useState('');
  const [editing,setEditing]=useState<Contact|null>(null);
  const [editMode,setEditMode]=useState(false);
  const [history,setHistory]=useState<NickHistory[]>([]);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [accessOpen,setAccessOpen]=useState(false);
  const [grantEmail,setGrantEmail]=useState('');
  const [grantFlags,setGrantFlags]=useState<Flags>({view_contacts:true});
  const [reloadKey,setReloadKey]=useState(0);
  const refresh=useCallback(()=>setReloadKey(i=>i+1),[]);
  useEffect(()=>{
    if(!auth.user?.id){setFlags({});setItems([]);return;}
    let live=true;
    void supabase.rpc('ak_rubrica_my_permissions').then(({data,error:rpcError})=>{
      if(!live)return;
      if(rpcError){setFlags({});setError('Rubrica non disponibile. Verifica la migrazione SQL e le autorizzazioni.');}
      else{setFlags((data||{}) as Flags);setError('');}
    });
    return()=>{live=false;};
  },[auth.user?.id]);
  useEffect(()=>{
    if(!flags.view_contacts||!auth.user?.id)return;
    let live=true;setLoading(true);
    const timer=window.setTimeout(()=>{
      void supabase.rpc('ak_rubrica_list',{p_search:query.trim()}).then(({data,error:rpcError})=>{
        if(!live)return;
        setLoading(false);
        if(rpcError)setError(rpcError.message);
        else{setItems(Array.isArray(data)?data as Contact[]:[]);setError('');}
      });
    },250);
    return()=>{live=false;window.clearTimeout(timer);};
  },[flags.view_contacts,auth.user?.id,query,reloadKey]);
  useEffect(()=>{
    if(!editing)return;
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setEditing(null);};
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[editing]);
  useEffect(()=>{
    if(!flags.view_contacts)return;
    const onFocus=()=>refresh();window.addEventListener('focus',onFocus);
    return()=>window.removeEventListener('focus',onFocus);
  },[flags.view_contacts,refresh]);

  async function openContact(person:Contact,startEdit=false){
    setEditMode(startEdit);setEditing({...person});setHistory([]);setStatus('');
    if(person.id&&flags.view_private_details){const {data}=await supabase.rpc('ak_rubrica_nickname_history',{p_contact_id:person.id});setHistory(Array.isArray(data)?data as NickHistory[]:[]);}
  }
  async function save(){
    if(!editing||busy||!flags.edit_contacts)return;
    setBusy(true);setStatus('');
    const payload:Record<string,unknown>={id:editing.id,nickname:editing.nickname.trim()};
    for(const [key] of TEXT_FIELDS){
      if(key==='nickname')continue;
      if(PHONE_FIELDS.has(key)&&!flags.view_phone)continue;
      if(SOCIAL_FIELDS.has(key)&&!flags.view_social)continue;
      if(key==='notes'&&!flags.view_notes)continue;
      const value=editing[key as keyof Contact];
      if(value!==undefined)payload[key]=value;
    }
    payload.clan_role=editing.clan_role;
    payload.clan_status=editing.clan_status;
    payload.whatsapp_group=editing.whatsapp_group;
    if(flags.view_phone)payload.share_phone=!!editing.share_phone;
    payload.map_opt_in=!!editing.map_opt_in;
    const {error:rpcError}=await supabase.rpc('ak_rubrica_save',{p_contact:payload});
    setBusy(false);
    if(rpcError){setStatus(rpcError.message);return;}
    setEditing(null);setStatus('Scheda rubrica salvata.');refresh();
  }
  async function archive(person:Contact){
    if(!person.id||!flags.archive_contacts||busy)return;
    if(!window.confirm(`Archiviare ${person.nickname}? La scheda non verrà eliminata definitivamente.`))return;
    setBusy(true);const {error:rpcError}=await supabase.rpc('ak_rubrica_archive',{p_contact_id:person.id});
    setBusy(false);if(rpcError)setStatus(rpcError.message);else{setEditing(null);refresh();setStatus('Scheda archiviata senza eliminare la cronologia.');}
  }
  async function saveAccess(){
    if(!flags.manage_access||busy||!grantEmail.includes('@'))return;
    setBusy(true);const {error:rpcError}=await supabase.rpc('ak_rubrica_set_access',{p_email:grantEmail.trim(),p_flags:grantFlags});
    setBusy(false);setStatus(rpcError?rpcError.message:'Permessi aggiornati per l’account indicato.');
  }
  const countByStatus=useMemo(()=>items.filter(x=>x.clan_status==='Attivo').length,[items]);
  useEffect(()=>{
    if(!editing)return;
    let mounted=true;
    const resolve=async(raw?:string|null)=>{
      const path=(raw||'').trim();if(!path)return '';
      if(/^https:\/\/[^\s]+$/i.test(path))return path;
      if(!/^(codm|personal)\/[a-z0-9\-/_.]+$/i.test(path))return '';
      const {data,error}=await supabase.storage.from('ak-rubrica-private').createSignedUrl(path,900);
      return error?'':data?.signedUrl||'';
    };
    void Promise.all([resolve(editing.codm_photo_url),flags.view_social?resolve(editing.personal_photo_url):Promise.resolve('')]).then(([codm,personal])=>{if(mounted)setPhotos({codm,personal});});
    return()=>{mounted=false;};
  },[editing?.id,editing?.codm_photo_url,editing?.personal_photo_url,flags.view_social]);
  async function uploadPhoto(kind:'codm'|'personal',file:File){
    if(!editing?.id){setStatus('Prima salva la scheda del nuovo contatto, poi carica le fotografie.');return;}
    if(!flags.edit_contacts||(kind==='personal'&&!flags.view_social))return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>3*1024*1024){setStatus('Foto ammessa: JPG, PNG o WEBP, massimo 3 MB.');return;}
    setUploadingPhoto(true);setStatus('');
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
    const path=`${kind}/${editing.id}/${crypto.randomUUID()}.${ext}`;
    const {error}=await supabase.storage.from('ak-rubrica-private').upload(path,file,{contentType:file.type,upsert:false});
    setUploadingPhoto(false);
    if(error){setStatus('Caricamento foto non riuscito: '+error.message);return;}
    setEditing(p=>p?{...p,[kind==='codm'?'codm_photo_url':'personal_photo_url']:path}:null);
    setStatus('Foto caricata nell’archivio privato. Premi Salva scheda per associarla al contatto.');
  }
  const groups=useMemo(()=>clanRoleGroups.map((g)=>({...g,persons:items.filter(p=>g.tier===5?p.clan_status!=='Attivo'||clanRoleTier(p.clan_role)===5:p.clan_status==='Attivo'&&clanRoleTier(p.clan_role)===g.tier)})),[items]);


  if(auth.loading)return <main className="container top-gap"><section className="card">Verifica accesso Rubrica Clan...</section></main>;
  if(!auth.user)return <main className="container top-gap"><section className="card"><h1>🔒 Rubrica Clan</h1><p>Accedi al sito per verificare le autorizzazioni.</p><a href="/login" className="btn">Accedi</a></section></main>;
  if(!flags.view_contacts)return <main className="container top-gap"><section className="card"><h1>🔒 Rubrica Clan riservata</h1><p>Solo gli account autorizzati possono accedere ai contatti. {error}</p><p className="muted">Se sei amministratore, controlla che il tuo account abbia il ruolo Owner in Supabase e che lo script Rubrica sia stato eseguito.</p></section></main>;
  return <main className="container ak-rubrica top-gap">
    <section className="card ak-rubrica-head">
      <div><span className="ak-rubrica-overline">AK47DX · AREA RISERVATA</span><h1><ContactRound size={26} aria-hidden/> Rubrica Clan</h1><p>🎮 Nickname in gioco sempre in evidenza · Ruoli, organigramma e profili CODM.</p></div>
      <div className="ak-rubrica-count"><b>{items.length}</b><span>Contatti · {countByStatus} attivi</span></div>
    </section>
    <nav className="ak30-nav" aria-label="Sezioni Rubrica Clan">
      {([['rubrica','🎮 Giocatori'],['organigramma','🏆 Organigramma'],...(flags.view_private_details?[['compleanni','🎂 Compleanni'],['mappa','📍 Mappa'],['export','📤 Esportazioni']]:[]),...(flags.manage_access?[['screenshot','🎮 Nomi da screenshot']]:[])] as [typeof section,string][]).map(([id,name])=><button type="button" className={'ak30-navbutton'+(section===id?' active':'')} key={id} onClick={()=>{setQuery('');setSection(id);}}>{name}</button>)}
    </nav>
    {section==='rubrica'&&<>
    <section className="card ak-rubrica-controls">
      <label className="ak-rubrica-search"><Search size={18} aria-hidden/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cerca nickname, UID, nome o vecchio nickname" aria-label="Cerca contatti"/></label>
      <button type="button" className="btn secondary" onClick={refresh} disabled={loading} title="Aggiorna elenco"><RefreshCw size={16} aria-hidden/> Aggiorna</button>
      {flags.edit_contacts&&<button type="button" className="btn" onClick={()=>void openContact({...EMPTY},true)}><Plus size={16} aria-hidden/> Nuovo contatto</button>}
      {flags.manage_access&&<button type="button" className="btn secondary" onClick={()=>setAccessOpen(!accessOpen)}><ShieldCheck size={16} aria-hidden/> Permessi</button>}
    </section>
    {status&&<p className="notice" role="status">{status}</p>}{error&&<p className="notice" role="alert">{error}</p>}
    {accessOpen&&flags.manage_access&&<section className="card ak-rubrica-access"><h2>🔐 Autorizza account registrato</h2><p className="muted">Solo Owner può concedere o revocare l'accesso. Il giocatore deve già avere un account AK47DX.</p>
      <div className="ak31-access-presets"><button type="button" className="btn secondary" onClick={()=>{setGrantFlags({view_contacts:true});}}>🎮 Membro (solo nickname + UID)</button><button type="button" className="btn secondary" onClick={()=>{setGrantFlags({view_contacts:true,view_private_details:true});}}>🔧 Personalizza Staff</button></div><p className="muted">Membro: deve avere un account già registrato e autorizzato. Nessun telefono, foto personale, data di nascita, città o note.</p><label>Email account<input className="input" value={grantEmail} type="email" onChange={e=>setGrantEmail(e.target.value)} placeholder="email dell'account registrato"/></label>
      <div className="ak-rubrica-flags">{([['view_contacts','Vedere nickname CODM, UID e ruolo'],['view_private_details','Vedere dettagli anagrafici, compleanni e città'],['edit_contacts','Modificare contatti'],['change_nickname','Cambiare nickname'],['view_phone','Leggere telefoni / WhatsApp'],['view_social','Leggere social / foto personali'],['view_notes','Leggere note private'],['archive_contacts','Archiviare schede']] as const).map(([k,lab])=><label key={k}><input type="checkbox" checked={!!grantFlags[k]} onChange={e=>setGrantFlags(p=>({...p,[k]:e.target.checked}))}/>{lab}</label>)}</div>
      <button className="btn" disabled={busy||!grantEmail.trim()} onClick={()=>void saveAccess()}>Salva autorizzazioni</button>
      <p className="muted">Per revocare l'accesso, disattiva tutte le autorizzazioni e salva. I permessi sono verificati anche dal database.</p>
    </section>}
    {loading&&<p className="muted">Aggiornamento contatti...</p>}
    {groups.map(group=>group.persons.length?<section key={group.title} className="ak30-role-section">
      <h2>{group.title}<small>{group.persons.length} giocatori</small></h2>
      <div className="ak-rubrica-grid">{group.persons.map(person=>{
        const whats=flags.view_phone?whatsappLink(person.phone,person.nickname):null;
        return <article key={person.id} className={'card ak-rubrica-tile ak31-gaming-card'+((!person.nickname.trim()||!person.uid?.trim()||(flags.view_phone&&!person.phone?.trim()))?' ak31-incomplete':'')}>
          <button type="button" className="ak-rubrica-person" onClick={()=>void openContact(person)} aria-label={`Apri scheda ${person.nickname}`}>
            <span className="ak-rubrica-avatar" aria-hidden="true">{roleIcon(person.clan_role)}</span>
            <span className="ak-rubrica-person-text"><strong>{person.nickname}</strong><small>{roleIcon(person.clan_role)} {person.clan_role||'Membro'} · {person.clan_status||'Attivo'}</small><small className={!person.uid?.trim()?'ak31-missing':''}>🕹️ UID: {person.uid||'MANCANTE'}</small>{flags.view_phone&&!person.phone?.trim()&&<small className="ak31-missing">📞 Telefono mancante</small>}</span><Pencil size={17} aria-hidden/>
          </button>
          <div className="ak-rubrica-socials">{whats&&<a className="ak-rubrica-social ak-rubrica-whatsapp" href={whats} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> WhatsApp</a>}{flags.view_social&&<SocialLinks person={person}/>}</div>
        </article>;
      })}</div>
    </section>:null)}
    {!loading&&!items.length&&<div className="card ak-rubrica-empty">{query?'Nessun giocatore trovato.':'Non ci sono ancora contatti.'}</div>}
    </>}
    {section==='organigramma'&&<RubricaOrgChart people={items} onSelect={(person)=>{const current=items.find(p=>p.id===person.id);if(current)void openContact(current);}}/>}
    {section==='compleanni'&&flags.view_private_details&&<RubricaBirthdayCalendar people={items}/>} 
    {section==='mappa'&&flags.view_private_details&&<RubricaMap people={items}/>} 
    {section==='export'&&flags.view_private_details&&<RubricaExportCenter permissions={flags}/>} 
    {section==='screenshot'&&flags.manage_access&&<RubricaMatchReview onRefresh={refresh}/>}
    {editing&&<div className="ak-rubrica-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditing(null);}}>
      <section role="dialog" aria-modal="true" aria-labelledby="rubrica-dialog-title" className="ak-rubrica-modal">
        <header className="ak-rubrica-modal-head"><div><span className="ak-rubrica-overline">SCHEDA PRIVATA</span><h2 id="rubrica-dialog-title">{editMode?(editing.id?'Modifica giocatore':'Nuovo giocatore'):'Profilo giocatore'}</h2><p>{editing.nickname||'Inserisci dati del nuovo contatto'}</p></div><button type="button" className="btn secondary" onClick={()=>setEditing(null)} aria-label="Chiudi popup"><X size={18}/></button></header>
        {status&&<p className="notice" role="status">{status}</p>}
        {!flags.view_private_details&&<div className="ak31-member-profile"><h3>{roleIcon(editing.clan_role)} {editing.nickname}</h3><p>🕹️ UID: {editing.uid||'Non disponibile'}</p><p>{editing.clan_role||'Membro'}</p></div>}
        {flags.view_private_details&&<div className="ak30-photos">
          <div className="ak30-photo-box"><b>🎮 Foto profilo CODM</b><div className="ak30-photo-frame">{photos.codm?<img alt={`Avatar CODM di ${editing.nickname}`} src={photos.codm}/>:<Camera size={34} aria-label="Foto CODM non caricata"/>}</div>{flags.edit_contacts&&editMode&&<label className="btn secondary">Carica foto CODM<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingPhoto||!editing.id} hidden onChange={e=>{const f=e.target.files?.[0];if(f)void uploadPhoto('codm',f);e.currentTarget.value='';}}/></label>}</div>
          {flags.view_social&&<div className="ak30-photo-box"><b>🙋 Foto personale</b><div className="ak30-photo-frame">{photos.personal?<img alt={`Foto personale di ${editing.nickname}`} src={photos.personal}/>:<Camera size={34} aria-label="Foto personale non caricata"/>}</div>{flags.edit_contacts&&editMode&&<label className="btn secondary">Carica foto personale<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingPhoto||!editing.id} hidden onChange={e=>{const f=e.target.files?.[0];if(f)void uploadPhoto('personal',f);e.currentTarget.value='';}}/></label>}</div>}
        </div>}
        {flags.view_private_details&&!editMode&&<div className="ak31-readonly-profile">
          <h3>🎮 {editing.nickname}</h3><p><b>🕹️ UID:</b> {editing.uid||'Non indicato'}</p><p><b>Ruolo:</b> {roleIcon(editing.clan_role)} {editing.clan_role||'Membro'}</p>
          {flags.view_phone&&<p><b>📞 Telefono:</b> {editing.phone||'Non indicato'}</p>}
          <p><b>📍 Località:</b> {[editing.city,editing.country].filter(Boolean).join(', ')||'Non indicata'}</p><p><b>🎂 Compleanno:</b> {editing.birth_date||'Non indicato'}</p>
        </div>}
        {flags.view_private_details&&editMode&&<div className="ak-rubrica-form-grid">
          {TEXT_FIELDS.filter(([key])=>!(PHONE_FIELDS.has(key)&&!flags.view_phone)&&!(SOCIAL_FIELDS.has(key)&&!flags.view_social)&&!(key==='notes'&&!flags.view_notes)).map(([key,label])=>{
            const val=String(editing[key as keyof Contact]??'');
            const disabled=!flags.edit_contacts||(key==='nickname'&&!!editing.id&&!flags.change_nickname);
            const inputType=key==='birth_date'||key==='joined_at'?'date':key.includes('url')?'url':'text';
            const header:Record<string,string>={nickname:'Identità CODM',given_name:'Dati anagrafici',phone:'Numeri e WhatsApp',codm_photo_url:'Foto profilo',tiktok:'Social network',notes:'Note amministrative'};
            return <Fragment key={key}>{header[key]&&<h3 className="ak-rubrica-section-label">{header[key]}</h3>}<label className={key==='notes'?'ak-rubrica-wide':''}><span>{label}</span>{key==='notes'?<textarea className="textarea" value={val} disabled={disabled} maxLength={3000} rows={3} onChange={e=>setEditing(p=>p?{...p,[key]:e.target.value}:null)}/>:<input className="input" autoFocus={key==='nickname'} value={val} disabled={disabled} type={inputType} onChange={e=>setEditing(p=>p?{...p,[key]:e.target.value}:null)} placeholder={key==='uid'?'Solo cifre':undefined}/>}</label></Fragment>;
          })}
          <label><span>Ruolo nel clan</span><select className="select" disabled={!flags.edit_contacts} value={editing.clan_role||'Membro'} onChange={e=>setEditing(p=>p?{...p,clan_role:e.target.value}:null)}>{RUBRICA_ROLES.map(s=><option key={s.label} value={s.label}>{s.emoji} {s.label}</option>)}</select></label>
          <label><span>Stato clan</span><select className="select" disabled={!flags.edit_contacts} value={editing.clan_status||'Attivo'} onChange={e=>setEditing(p=>p?{...p,clan_status:e.target.value}:null)}><option>Attivo</option><option>Non in clan</option></select></label>
          <label className="ak-rubrica-check"><input type="checkbox" disabled={!flags.edit_contacts} checked={!!editing.map_opt_in} onChange={e=>setEditing(p=>p?{...p,map_opt_in:e.target.checked}:null)}/> Autorizzazione alla mappa: mostra soltanto città e Paese</label>
          {flags.view_phone&&<label className="ak-rubrica-check"><input type="checkbox" disabled={!flags.edit_contacts} checked={!!editing.share_phone} onChange={e=>setEditing(p=>p?{...p,share_phone:e.target.checked}:null)}/> Autorizza la condivisione del numero nella versione WhatsApp per tutti</label>}
          <label className="ak-rubrica-check"><input type="checkbox" disabled={!flags.edit_contacts} checked={editing.whatsapp_group!==false} onChange={e=>setEditing(p=>p?{...p,whatsapp_group:e.target.checked}:null)}/> Presente nel gruppo WhatsApp</label>
        </div>}
        {!flags.view_private_details&&<p className="muted">👤 Accesso membro: vengono mostrati solo nickname CODM, UID e ruolo. Per dettagli privati serve un'autorizzazione specifica.</p>}
        {flags.view_social&&flags.view_private_details&&<div className="ak-rubrica-modal-social"><SocialLinks person={editing}/></div>}
        {editing.id&&flags.view_private_details&&<section className="ak-rubrica-history"><h3><History size={17} aria-hidden/> Storico nickname CODM</h3>{history.length?history.map((h,i)=><p key={i}><b>{h.old}</b> → <b>{h.new}</b><small> · {new Date(h.at).toLocaleString('it-IT')}</small></p>):<p className="muted">Nessun cambio nickname registrato.</p>}</section>}
        <footer className="ak-rubrica-modal-actions">
          {flags.edit_contacts&&flags.view_private_details&&!editMode&&<button type="button" className="btn" onClick={()=>setEditMode(true)}><Pencil size={16}/> Modifica profilo</button>}
          {flags.edit_contacts&&flags.view_private_details&&editMode&&<button className="btn" disabled={busy||!editing.nickname.trim()} type="button" onClick={()=>void save()}><Save size={16}/> {busy?'Salvataggio...':'Salva scheda'}</button>}
          {editing.id&&editMode&&flags.archive_contacts&&flags.view_private_details&&<button className="btn danger" disabled={busy} type="button" onClick={()=>void archive(editing)}><Archive size={16}/> Archivia</button>}
          <button className="btn secondary" type="button" onClick={()=>setEditing(null)}>Chiudi</button>
          {flags.view_phone&&flags.view_private_details&&whatsappLink(editing.phone,editing.nickname)&&<a className="btn ak-rubrica-whatsapp" href={whatsappLink(editing.phone,editing.nickname)!} target="_blank" rel="noopener noreferrer"><MessageCircle size={17}/> Scrivi WhatsApp</a>}
        </footer>
        <p className="muted ak-rubrica-note">WhatsApp apre una chat con testo preparato: l'invio deve essere confermato manualmente. Le schede restano in un database privato separato dalle statistiche.</p>
      </section>
    </div>}
  </main>;
}
function SocialLinks({person}:{person:Contact}){
  const links=[
    {key:'tiktok',label:'TikTok',icon:<span aria-hidden>♪</span>},
    {key:'instagram',label:'Instagram',icon:<Instagram size={17}/>},
    {key:'facebook',label:'Facebook',icon:<Facebook size={17}/>},
    {key:'youtube',label:'YouTube',icon:<Youtube size={17}/>},
    {key:'telegram',label:'Telegram',icon:<Send size={17}/>},
    {key:'discord',label:'Discord',icon:<ExternalLink size={17}/>},
  ] as const;
  return <>{links.map(link=>{const href=safeSocialLink(link.key,person[link.key]);return href?<a className="ak-rubrica-social ak-rubrica-social-icon" href={href} key={link.key} target="_blank" rel="noopener noreferrer" aria-label={`Apri ${link.label} di ${person.nickname}`} title={link.label}>{link.icon}</a>:null;})}</>;
}
