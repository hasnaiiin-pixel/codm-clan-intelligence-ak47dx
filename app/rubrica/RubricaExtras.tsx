'use client';
import {useEffect,useMemo,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {Download,Copy,CalendarDays,MapPin,Check,AlertCircle} from 'lucide-react';
import {clanRoleEmoji,clanRoleTier} from './rubricaRoles';
import RubricaCityMap from './RubricaCityMap';

export type RubricaContact={id?:string;nickname:string;uid?:string|null;given_name?:string|null;surname?:string|null;phone?:string|null;phone_alt?:string|null;whatsapp_name?:string|null;birth_date?:string|null;city?:string|null;province?:string|null;country?:string|null;city_lat?:number|null;city_lon?:number|null;clan_role?:string|null;secondary_roles?:string[]|null;clan_status?:string|null;whatsapp_group?:boolean;share_phone?:boolean;map_opt_in?:boolean;joined_at?:string|null;notes?:string|null;codm_photo_url?:string|null;personal_photo_url?:string|null;tiktok?:string|null;instagram?:string|null;facebook?:string|null;youtube?:string|null;telegram?:string|null;discord?:string|null};
export type RubricaFlags={view_contacts?:boolean;edit_contacts?:boolean;change_nickname?:boolean;view_phone?:boolean;view_social?:boolean;view_notes?:boolean;manage_access?:boolean;export_shared?:boolean;export_staff?:boolean;view_private_details?:boolean};
const months=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const birthParts=(v:string|null|undefined)=>{if(!v||!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;const m=Number(v.slice(5,7)),d=Number(v.slice(8,10));return m>=1&&m<=12&&d>=1&&d<=31?{m,d}:null;};
export function RubricaBirthdayCalendar({people}:{people:RubricaContact[]}){
 const now=new Date();const [date,setDate]=useState({m:now.getMonth(),y:now.getFullYear()});
 const birthdayPeople=useMemo(()=>people.filter(c=>birthParts(c.birth_date)),[people]);
 const days=new Date(date.y,date.m+1,0).getDate();const offset=(new Date(date.y,date.m,1).getDay()+6)%7;
 const upcoming=useMemo(()=>birthdayPeople.map(c=>{const b=birthParts(c.birth_date)!;const current=new Date(now.getFullYear(),b.m-1,b.d);if(current.getTime()<new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime())current.setFullYear(now.getFullYear()+1);return {...c,when:current};}).sort((a,b)=>a.when.getTime()-b.when.getTime()).slice(0,10),[birthdayPeople]);
 return <section className="card ak30-panel"><header className="ak30-between"><div><h2>🎂 Calendario compleanni</h2><p className="muted">Sono mostrati soltanto i compleanni già inseriti nelle schede private.</p></div><strong>{birthdayPeople.length} registrati</strong></header>
 <div className="ak30-between"><button className="btn secondary" onClick={()=>setDate(p=>p.m===0?{m:11,y:p.y-1}:{m:p.m-1,y:p.y})}>← Mese</button><h3>{months[date.m]} {date.y}</h3><button className="btn secondary" onClick={()=>setDate(p=>p.m===11?{m:0,y:p.y+1}:{m:p.m+1,y:p.y})}>Mese →</button></div>
 <div className="ak30-calendar">{['L','M','M','G','V','S','D'].map((s,i)=><b key={i} className="ak30-weekday">{s}</b>)}{Array.from({length:offset},(_,i)=><span key={'empty'+i} className="ak30-day empty"/>)}{Array.from({length:days},(_,i)=>{const d=i+1;const persons=birthdayPeople.filter(c=>{const b=birthParts(c.birth_date)!;return b.d===d&&b.m===date.m+1;});return <div key={d} className={'ak30-day'+(persons.length?' has-birthday':'')}><b>{d}</b>{persons.map(c=><small key={c.id||c.nickname} title={c.nickname}>🎂 {c.nickname}</small>)}</div>;})}</div>
 <h3>Prossimi compleanni</h3><div className="ak30-upcoming">{upcoming.length?upcoming.map(c=><div key={c.id||c.nickname}><span>🎂 <b>{c.nickname}</b></span><span>{c.when.toLocaleDateString('it-IT',{day:'2-digit',month:'long'})}</span></div>):<p className="muted">Non ci sono ancora date di compleanno nelle schede.</p>}</div>
 </section>;
}
// FIX31B: mappa vera, basata sulle coordinate città salvate per ogni contatto.
export function RubricaMap({people}:{people:RubricaContact[]}){return <RubricaCityMap people={people}/>;}
const shareRow=(p:RubricaContact)=>`${clanRoleEmoji(p.clan_role)} *${p.nickname}*${p.clan_role?' ('+p.clan_role+')':''}${p.secondary_roles?.length?' · '+p.secondary_roles.map(r=>clanRoleEmoji(r)+' '+r).join(', '):''}\n🕹️ UID: ${p.uid||'🔴 Mancante'}\n📞 Telefono: ${p.phone||'Non condiviso / non autorizzato'}`;
export function RubricaExportCenter({permissions}:{permissions:RubricaFlags}){
 const [isBusy,setBusy]=useState(false);const [notice,setNotice]=useState('');const [content,setContent]=useState('');
 const [full,setFull]=useState(false);const [onlyActive,setOnlyActive]=useState(true);
 async function getExport(mode:'staff'|'shared'):Promise<RubricaContact[]>{
  const {data,error}=await supabase.rpc('ak_rubrica_export',{p_mode:mode,p_only_active:onlyActive});
  if(error)throw error;return Array.isArray(data)?data as RubricaContact[]:[];
 }
 const staffRow=(p:RubricaContact)=>`${shareRow(p)}\n🙋 Nome: ${[p.given_name,p.surname].filter(Boolean).join(' ')||'—'}\n📞 Telefono riservato: ${p.phone||'—'}\n💬 Nome WhatsApp: ${p.whatsapp_name||'—'}\n🎂 Compleanno: ${p.birth_date||'—'}\n📍 Città: ${[p.city,p.province,p.country].filter(Boolean).join(', ')||'—'}\n📅 Entrata: ${p.joined_at||'—'}\n🟢 Clan: ${p.clan_status||'—'} | Gruppo WA: ${p.whatsapp_group?'Sì':'No'}\n📝 Note: ${p.notes||'—'}\n🌐 Social: ${[p.tiktok,p.instagram,p.facebook,p.youtube,p.telegram,p.discord].filter(Boolean).join(' · ')||'—'}\n🎮 Foto CODM: ${p.codm_photo_url?'Presente':'—'} | Foto personale: ${p.personal_photo_url?'Presente':'—'}\n🕰️ Storico: ${((p as RubricaContact & {history?:{old:string;new:string;at:string}[]}).history||[]).map(h=>h.old+' → '+h.new).join(' · ')||'—'}`;
 async function makeWhatsApp(priv:boolean){setBusy(true);try{
  const people=await getExport(priv?'staff':'shared');
  const title=`🐺 *AK47DX | RUBRICA CLAN*\n${onlyActive?'SOLO ATTIVI':'TUTTI I CONTATTI'} · ${priv?'🔒 STAFF RISERVATA':'🎮 CONDIVISIBILE'}\n\n`;
  let lastTier=-1;const lines:string[]=[];
  for(const p of people){const tier=clanRoleTier(p.clan_role)>=5&&onlyActive?4:clanRoleTier(p.clan_role);if(tier!==lastTier){lines.push(['\n👑 *FONDATORE E CAPI*','\n⭐ *CO-CAPI E VICE*','\n🔧 *STAFF*','\n⚠️ *RUOLI DA VERIFICARE*','\n🎮 *MEMBRI*','\n📁 *ALTRI*'][Math.min(tier,5)]);lastTier=tier;}lines.push(priv?staffRow(p):shareRow(p));}
  const text=title+lines.join('\n────────────\n');setContent(text);setFull(priv);
  setNotice(`Rubrica pronta: ${people.length} contatti, unico blocco di ${text.length} caratteri. ${priv?'Dati riservati: condividere solo con Staff autorizzato.':'I telefoni sono inclusi soltanto se esplicitamente autorizzati nella singola scheda.'}`);
 }catch(e){setNotice('Esportazione non riuscita: '+(e instanceof Error?e.message:String(e)));}finally{setBusy(false);}}
 async function makeExcel(priv:boolean){setBusy(true);try{
  const people=await getExport(priv?'staff':'shared');const XLSX=await import('xlsx');const wb=XLSX.utils.book_new();
  const shared=people.map(p=>({'Ruolo':p.clan_role||'Membro','Incarichi secondari':(p.secondary_roles||[]).join(', '),'Nickname CODM':p.nickname,'UID':p.uid||'','Telefono autorizzato':p.phone||''}));
  const privateRows=people.map(p=>({'Nickname CODM':p.nickname,'UID':p.uid||'','Ruolo principale':p.clan_role||'', 'Incarichi secondari':(p.secondary_roles||[]).join(', '),'Nome':p.given_name||'','Cognome':p.surname||'','Telefono':p.phone||'','WhatsApp':p.whatsapp_name||'','Compleanno':p.birth_date||'','Città':p.city||'','Provincia':p.province||'','Paese':p.country||'','Stato Clan':p.clan_status||'','Nel gruppo WhatsApp':p.whatsapp_group?'Sì':'No','Data ingresso':p.joined_at||'','Condivisione telefono':p.share_phone?'Sì':'No','Consenso mappa':p.map_opt_in?'Sì':'No','TikTok':p.tiktok||'','Instagram':p.instagram||'','Facebook':p.facebook||'','YouTube':p.youtube||'','Telegram':p.telegram||'','Discord':p.discord||'','Note':p.notes||'','Foto CODM':p.codm_photo_url?'Presente':'','Foto personale':p.personal_photo_url?'Presente':'','Storico nickname':((p as RubricaContact & {history?:{old:string;new:string}[]}).history||[]).map(h=>h.old+' → '+h.new).join(' | ')}));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(priv?privateRows:shared),'Rubrica');
  if(priv){XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(privateRows.filter(p=>p['Stato Clan']==='Attivo')),'Attivi');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(privateRows.filter(p=>p['Stato Clan']!=='Attivo')),'Altri');}
  for(const name of wb.SheetNames){const ws=wb.Sheets[name];ws['!cols']=Array.from({length:priv?26:5},(_,i)=>({wch:i===0?25:22}));}
  XLSX.writeFile(wb,priv?'AK47DX_RUBRICA_STAFF_PRIVATA.xlsx':'AK47DX_RUBRICA_CONDIVISIBILE.xlsx');
  setNotice(`Excel ${priv?'Staff':'condivisibile'} generato: ${people.length} contatti. File privato: non pubblicare su GitHub.`);
 }catch(e){setNotice('Excel non generato: '+(e instanceof Error?e.message:String(e)));}finally{setBusy(false);}}
 return <section className="card ak30-panel"><h2>📤 Esportazioni Rubrica</h2><p className="muted">FIX31E: filtri applicati dal database. I telefoni nella versione condivisibile richiedono sia l'autorizzazione del giocatore sia i tuoi permessi di lettura/esportazione.</p>
 <label className="ak-rubrica-check"><input type="checkbox" checked={onlyActive} onChange={e=>setOnlyActive(e.target.checked)}/> Solo giocatori ATTIVI nel clan (predefinito)</label>
 <div className="ak30-export-actions">{permissions.export_shared&&<><button disabled={isBusy} className="btn" onClick={()=>void makeExcel(false)}><Download size={16}/> Excel condivisibile</button><button disabled={isBusy} className="btn secondary" onClick={()=>void makeWhatsApp(false)}><Copy size={16}/> WhatsApp condivisibile</button></>}
 {permissions.export_staff&&permissions.view_private_details&&<><button disabled={isBusy} className="btn" onClick={()=>void makeExcel(true)}><Download size={16}/> Excel completo Staff</button><button disabled={isBusy} className="btn secondary" onClick={()=>void makeWhatsApp(true)}><Copy size={16}/> WhatsApp Staff completo</button></>}</div>
 {notice&&<p className="notice" role="status">{notice}</p>}{content&&<div className="ak30-shareparts"><h3>{full?'🔒 Testo Staff completo':'🎮 Testo condivisibile'} · UN SOLO BLOCCO</h3><div className="ak30-between"><b>Rubrica completa pronta per WhatsApp</b><button className="btn secondary" type="button" onClick={()=>{void navigator.clipboard.writeText(content).then(()=>setNotice('Tutto il testo copiato in un unico blocco.')).catch(()=>setNotice('Seleziona il testo e usa Copia.'));}}><Copy size={14}/> Copia tutto</button></div><textarea rows={12} className="textarea" readOnly value={content} aria-label="Rubrica WhatsApp in unico blocco"/></div>}
 </section>;
}
type Candidate={id:string;source_name:string;full_nickname?:string|null;match_nickname:string|null;match_contact_id:string|null;status:string;review_note:string|null};
export function RubricaMatchReview({onRefresh,people}:{onRefresh:()=>void;people:RubricaContact[]}){
 const [items,setItems]=useState<Candidate[]>([]),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [names,setNames]=useState<Record<string,string>>({});
 const [links,setLinks]=useState<Record<string,string>>({});
 const [avatarProgress,setAvatarProgress]=useState('');
 const [bulkNotice,setBulkNotice]=useState('');
 const load=()=>{void supabase.rpc('ak_rubrica_screenshot_queue').then(({data,error})=>{if(error)setNotice(error.message);else{setItems(Array.isArray(data)?data:[]);setNotice('');}});};
 async function seedNames(){setBusy(true);setBulkNotice('');const {data,error}=await supabase.rpc('ak_rubrica_prepare_codm_names');setBusy(false);
  if(error){setBulkNotice('Caricamento non riuscito: '+error.message+'. Applica SQL FIX31B su Supabase.');return;}
  const r=(data||{}) as {proposte?:number;diretti_da_confermare?:number;da_verificare?:number};setBulkNotice(`Proposte: ${r.proposte??0}; diretti: ${r.diretti_da_confermare??0}; da verificare: ${r.da_verificare??0}. Controlla il tag CODM prima di confermare.`);load();}
 useEffect(()=>{load();},[]);
 const approve=async(id:string)=>{setBusy(true);const item=items.find(x=>x.id===id);const {error}=await supabase.rpc('ak_rubrica_accept_screenshot',{p_candidate_id:id,p_display_name:(names[id]??item?.full_nickname??item?.source_name??'').trim()});setBusy(false);if(error)setNotice(error.message);else{load();onRefresh();setNotice('Nickname aggiornato e vecchio nome aggiunto alla cronologia.');}};
 async function resolveMissing(id:string,action:'link'|'create'){
  const item=items.find(x=>x.id===id);
  if(!item||item.match_contact_id||busy)return;
  const contactId=links[id]||null;
  if(action==='link'&&!contactId){setNotice('Seleziona prima il profilo gia presente nella rubrica.');return;}
  const displayName=(names[id]??item.full_nickname??item.source_name).trim();
  const msg=action==='create'
    ?`Creare ${displayName} come NUOVA scheda DA VERIFICARE? UID, telefono e stato attivo NON verranno inventati. Se esiste gia con un altro nome, usa Collega.`
    :`Collegare ${item.source_name} al profilo selezionato? UID e telefono esistenti NON verranno modificati. Dovrai confermare il nickname dopo.`;
  if(!window.confirm(msg))return;
  setBusy(true);
  const {data,error}=await supabase.rpc('ak_rubrica_resolve_screenshot',{
   p_candidate_id:id,p_action:action,p_contact_id:action==='link'?contactId:null,p_display_name:displayName
  });
  setBusy(false);
  if(error){setNotice('Associazione non riuscita: '+error.message+' (verifica SQL FIX31D)');return;}
  const saved=(data||{}) as {missing_uid?:boolean;missing_phone?:boolean};
  const missing=[saved.missing_uid?'UID':'',saved.missing_phone?'telefono':''].filter(Boolean);
  setNotice(`Scheda ${action==='create'?'creata':'collegata'}; da verificare: ${missing.length?missing.join(', '):'identita e dati associati'}. Conferma nome solo dopo il controllo.`);
  load();onRefresh();
 }
 async function applyExact(){
  const candidates=items.filter(x=>x.status==='exact'&&x.match_contact_id);
  if(!candidates.length){setBulkNotice('Nessun abbinamento sicuro ancora da applicare.');return;}
  if(!window.confirm(`Confermare ${candidates.length} nickname dagli screenshot abbinati direttamente? I nuovi nomi comprenderanno il tag AKঐ proposto: prima controlla i simboli con le immagini. I vecchi nomi restano nello storico; i casi dubbi sono esclusi.`))return;
  setBusy(true);setBulkNotice('');
  const {data,error}=await supabase.rpc('ak_rubrica_apply_exact_codm_names');
  setBusy(false);
  if(error){setBulkNotice('Importazione non riuscita: '+error.message);return;}
  setBulkNotice(`${data??0} nomi CODM associati ai contatti esistenti. I casi ambigui non sono stati modificati. Controlla eventuali caratteri CODM diversi dalle immagini.`);
  load();onRefresh();
 }
 async function uploadAvatars(files:FileList|null){
   if(!files?.length||busy)return;
   const unique=new Map<string,File>();
   for(const f of Array.from(files)){const hit=f.name.match(/^\d{2}_\d{2}__(.+)\.(?:jpg|png|webp)$/i);if(hit&&!unique.has(hit[1]))unique.set(hit[1],f);}
   const allowed=items.filter(x=>x.match_contact_id&&['exact','applied'].includes(x.status));
   const uploadList=allowed.filter(x=>unique.has(x.source_name));
   if(!uploadList.length){setNotice('Nessun avatar abbinato in modo sicuro. Controlla l’elenco da verificare.');return;}
   if(!window.confirm(`Associare ${uploadList.length} immagini CODM ai profili individuati? Non vengono modificate fotografie personali né UID.`))return;
   setBusy(true);let ok=0;const failed:string[]=[];
   for(const item of uploadList){
     try{
       const file=unique.get(item.source_name)!;
       if(file.size>3145728||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Formato/dimensione non validi');
       const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
       const path=`codm/${item.match_contact_id}/${crypto.randomUUID()}.${ext}`;
       const uploaded=await supabase.storage.from('ak-rubrica-private').upload(path,file,{contentType:file.type,upsert:false});
       if(uploaded.error)throw uploaded.error;
       const saved=await supabase.rpc('ak_rubrica_save',{p_contact:{id:item.match_contact_id,nickname:item.match_nickname, codm_photo_url:path}});
       if(saved.error)throw saved.error;ok++;
     }catch(e){failed.push(item.source_name+': '+(e instanceof Error?e.message:'errore'));}
     setAvatarProgress(`${ok+failed.length}/${uploadList.length} · associate ${ok}`);
   }
   setBusy(false);onRefresh();setNotice(`Avatar associati: ${ok}/${uploadList.length}. ${failed.length?'Da verificare: '+failed.slice(0,4).join('; '):'Nessun errore segnalato.'}`);
 }
 return <section className="card ak30-panel"><h2>🎮 Nomi CODM dagli screenshot</h2><p className="muted">FIX31D: importa anche nomi non abbinati come schede incomplete e collega profili esistenti. FIX31C: riconosce il giocatore anche se il nome inizia con il tag AK + simboli. La colonna “Nome CODM proposto” contiene il tag del clan, ma i caratteri decorativi sono da verificare sulle immagini prima di confermare. UID e telefoni non vengono modificati.</p><div className="ak30-stats"><span>Abbinati: {items.filter(x=>x.match_contact_id).length}</span><span>Da verificare: {items.filter(x=>!x.match_contact_id).length}</span></div><div className="ak30-bulkavatar"><label className="btn secondary">📸 Importa foto CODM dagli screenshot<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={busy} onChange={e=>{void uploadAvatars(e.target.files);e.currentTarget.value='';}}/></label><small>Prima estrai la cartella avatars dello ZIP privato. Il sistema abbina solo i nickname individuati con sicurezza; gli altri restano da verificare.</small>{avatarProgress&&<strong>{avatarProgress}</strong>}</div>
 {notice&&<p className="notice">{notice}</p>}
 <div className="ak31-import-summary"><button type="button" className="btn secondary" disabled={busy} onClick={()=>void seedNames()}>📥 Ricalcola nomi e abbinamenti con tag AK</button><button type="button" className="btn" disabled={busy||!items.some(i=>i.status==='exact'&&i.match_contact_id)} onClick={()=>void applyExact()}>🎮 Salva nomi CODM completi per gli abbinamenti diretti</button><p className="muted">Non importa nomi ambigui, senza corrispondenza o con UID in conflitto: restano da verificare singolarmente.</p>{bulkNotice&&<p className="notice" role="status">{bulkNotice}</p>}</div>
 <div className="ak30-reviewlist">{items.map(x=><div key={x.id} className={"ak30-reviewrow"+((x.status!=='exact'&&x.status!=='applied')?" ak31-review-error":"")}><span><strong>{x.source_name}</strong><small>Nome CODM proposto: {x.full_nickname||'Da verificare'}</small><small>Attualmente in rubrica: {x.match_nickname||'Non abbinato'}</small></span><span className="ak30-pill">{x.status==='exact'?'Abbinamento trovato':x.status==='applied'?'Applicato':'⚠️ Da verificare'}</span>{x.status!=='applied'&&<input className="input ak30-nickedit" aria-label={`Nome CODM corretto per ${x.source_name}`} value={names[x.id]??x.full_nickname??x.source_name} onChange={e=>setNames(p=>({...p,[x.id]:e.target.value}))} title="Controlla i simboli CODM prima della conferma"/>}
 {x.match_contact_id&&x.status!=='applied'&&<button className="btn secondary" disabled={busy} onClick={()=>void approve(x.id)}><Check size={15}/> Conferma nome</button>}
 {!x.match_contact_id&&x.status!=='applied'&&<div className="ak31-resolve-actions">
   <span className="ak31-missing">🔴 Nessun profilo collegato: UID e telefono non verificati</span>
   <select className="input" value={links[x.id]||''} aria-label={`Collega ${x.source_name} a contatto esistente`} onChange={e=>setLinks(v=>({...v,[x.id]:e.target.value}))}>
     <option value="">Seleziona un contatto esistente…</option>
     {people.filter(p=>p.id).sort((a,b)=>a.nickname.localeCompare(b.nickname,'it')).map(p=><option key={p.id} value={p.id}>{p.nickname}{p.uid?' · UID presente':' · UID mancante'}</option>)}
   </select>
   <button className="btn secondary" disabled={busy||!links[x.id]} onClick={()=>void resolveMissing(x.id,'link')}>🔗 Collega scheda</button>
   <button className="btn" disabled={busy} onClick={()=>void resolveMissing(x.id,'create')}>➕ Importa come incompleto</button>
 </div>}
 {x.match_contact_id&&(()=>{const person=people.find(p=>p.id===x.match_contact_id);return <span className="ak31-review-missing">{!person?.uid?.trim()?'🔴 UID mancante · ':''}{person&&!person.phone?.trim()?'🔴 Telefono mancante · ':''}{x.source_name.toUpperCase()==='LEXO'?'⚠ UID storico in conflitto con RENDO · ':''}{x.status!=='applied'?'Verifica prima di confermare':''}</span>;})()}
 {x.review_note&&x.status!=='applied'&&<small className="ak31-review-note">{x.review_note}</small>}</div>)}</div>{items.length===0&&<p className="muted">Nessun candidato caricato. Applica prima lo script SQL dei nickname FIX30.</p>}</section>;
}
