'use client';
import {useEffect,useState} from 'react';
import * as XLSX from 'xlsx';
import {useCodmAuth} from '@/lib/authRoles';
import {supabase} from '@/lib/supabaseClient';

type Season={id:string;name:string;is_active:boolean;is_historical?:boolean};
type Draft={id:string;date:string;season:string;opponent:string;mode:string;map:string;scope:'single'|'series';ours:string;theirs:string;notes:string;players:string;photo:string;sourceKey:string};
const newDraft=():Draft=>({id:Math.random().toString(36).slice(2),date:'',season:'',opponent:'',mode:'ALTRO',map:'',scope:'series',ours:'',theirs:'',notes:'',players:'',photo:'',sourceKey:''});
const get=(r:Record<string,unknown>,...names:string[])=>{for(const n of names){const x=r[n];if(x!==undefined&&String(x).trim()!=='')return String(x).trim()}return ''};
function normalize(r:Record<string,unknown>){return Object.fromEntries(Object.entries(r).map(([k,v])=>[k.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim().replace(/[^A-Z0-9]+/g,'_'),v]));}
const aliases=(m:string)=>{const s=m.toUpperCase().trim().replace(/\s+/g,'_');if(['CERCA_E_DISTRUGGI','SEARCH_AND_DESTROY','S_D'].includes(s))return 'CED';if(s==='CONTROL')return 'CONTROLLO';return ['CED','POSTAZIONE','DOMINIO','CONTROLLO'].includes(s)?s:'ALTRO'};
export default function HistoryImport(){
 const auth=useCodmAuth();const [seasons,setSeasons]=useState<Season[]>([]);const [opponents,setOpponents]=useState<string[]>([]);const [rows,setRows]=useState<Draft[]>([newDraft()]);const [visibleRows,setVisibleRows]=useState(30);const [loading,setLoading]=useState(false);const [message,setMessage]=useState('');
 useEffect(()=>{
  if(!auth.clanId)return;
  let cancelled=false;
  void (async()=>{
    const s=await supabase.from('codm_seasons').select('id,name,is_active,is_historical').order('name');
    if(cancelled)return;
    if(s.error)setMessage(`Stagioni non disponibili: ${s.error.message}`);
    else {setSeasons((s.data||[]) as Season[]);setRows(p=>p.map(x=>({...x,season:x.season||((s.data||[]).find(v=>!v.is_active)?.id||'')})))}
    const known=new Map<string,string>();
    for(let from=0;from<20000;from+=1000){
      const m=await supabase.from('matches').select('opponent').eq('clan_id',auth.clanId).not('opponent','is',null).range(from,from+999);
      if(m.error){setMessage(`Impossibile completare l'archivio clan: ${m.error.message}`);break}
      for(const r of m.data||[]){const n=String(r.opponent||'').trim();if(n&&!known.has(n.toLocaleLowerCase('it')))known.set(n.toLocaleLowerCase('it'),n)}
      if((m.data||[]).length<1000)break;
    }
    if(!cancelled)setOpponents(Array.from(known.values()).sort((a,b)=>a.localeCompare(b,'it')));
  })();
  return ()=>{cancelled=true};
 },[auth.clanId]);
 function change(id:string,patch:Partial<Draft>){setRows(p=>p.map(x=>x.id===id?{...x,...patch}:x))}
 async function loadExcel(file?:File){
  if(!file)return;
  try{
   const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
   const ws=wb.Sheets[wb.SheetNames.find(n=>n.toUpperCase()==='RISULTATI_STORICI')||wb.SheetNames[0]];
   if(!ws)throw new Error('Nessun foglio Excel presente.');
   const arr=XLSX.utils.sheet_to_json<Record<string,unknown>>(ws,{defval:''});
   if(!arr.length)throw new Error('Il foglio non contiene risultati.');
   if(arr.length>1000)throw new Error('Massimo 1000 righe per file Excel.');
   const defaultSeason=seasons.find(x=>x.is_historical&&!x.is_active)||seasons.find(x=>!x.is_active);
   const draft=arr.map((raw,i)=>{
    const r=normalize(raw);const d=newDraft();
    const rawDate=get(r,'DATA','DATE','MATCH_DATE','GIORNO');
    let date=rawDate;
    if(typeof (r.DATA??r.DATE??r.MATCH_DATE)==='number'){
     const parsed=XLSX.SSF.parse_date_code(Number(r.DATA??r.DATE??r.MATCH_DATE));
     date=parsed?`${parsed.y}-${String(parsed.m).padStart(2,'0')}-${String(parsed.d).padStart(2,'0')}`:'';
    }else if(/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate))date=rawDate.split('/').reverse().join('-');
    const score=get(r,'PUNTEGGIO','PUNTEGGIO_FINALE','SCORE','RISULTATO','RISULTATO_FINALE');
    const m=score.match(/(\d+)\s*[-:–]\s*(\d+)/);
    const originalClan=get(r,'CLAN_AVVERSARIO','AVVERSARIO','OPPONENT','CLAN','NOME_CLAN');
    const knownClan=opponents.find(x=>x.toLocaleLowerCase('it')===originalClan.toLocaleLowerCase('it'));
    const seasonName=get(r,'STAGIONE','STAGIONE_STORICA','SEASON');
    const targetSeason=seasons.find(x=>!x.is_active&&(x.id===seasonName||x.name.toLocaleLowerCase('it')===seasonName.toLocaleLowerCase('it')));
    const scope=get(r,'LIVELLO','SCOPE','TIPO_RISULTATO').toUpperCase();
    return {...d,date,season:targetSeason?.id||defaultSeason?.id||'',opponent:knownClan||originalClan,
      mode:aliases(get(r,'MODALITA','MODALITA_CODM','MODE')),map:get(r,'MAPPA','MAPPA_CODM'),
      ours:get(r,'PUNTEGGIO_AK47DX','PUNTEGGIO_NOSTRO','OUR_SCORE','VINTE')||m?.[1]||'',
      theirs:get(r,'PUNTEGGIO_AVVERSARIO','ENEMY_SCORE','PERSE')||m?.[2]||'',
      scope:scope.includes('SINGOL')||scope==='SINGLE'?'single' as const:'series' as const,
      notes:get(r,'NOTE'),players:get(r,'GIOCATORI','PLAYERS','NOMI'),photo:get(r,'FOTO_URL','SCREENSHOT_URL'),
      sourceKey:get(r,'ID_PARTITA','CODICE_PARTITA','MATCH_ID','ID_RISULTATO')?`${file.name}:${get(r,'ID_PARTITA','CODICE_PARTITA','MATCH_ID','ID_RISULTATO')}`:`${file.name}:riga:${i+2}`};
   });
   setRows(draft);setVisibleRows(30);
   setMessage(`${draft.length} risultati caricati da Excel. Verifica i clan suggeriti e la stagione STORICA. Punteggio finale Scrim = serie; puoi correggerlo per ogni riga.`);
  }catch(e){setMessage(e instanceof Error?e.message:'File non leggibile')}
 }
 async function save(){
  if(!auth.clanId)return setMessage('Nessun clan collegato al tuo account.');
  if(!auth.canWrite)return setMessage('Solo lo staff può importare.');
  if(rows.some(r=>!r.season||!r.date||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!r.opponent.trim()||r.ours===''||r.theirs===''))
   return setMessage('Compila data reale, stagione storica, clan e punteggi per ogni riga.');
  setLoading(true);
  const unsaved=[...rows]; let count=0;
  try{
   const {data}=await supabase.auth.getSession();
   while(unsaved.length){
    const batch=unsaved.slice(0,100);
    setMessage(`Importazione in corso: ${count}/${rows.length} risultati salvati...`);
    const response=await fetch('/api/history-results',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session?.access_token||''}`},body:JSON.stringify({clan_id:auth.clanId,rows:batch.map(r=>({season_id:r.season,match_date:new Date(`${r.date}T12:00:00`).toISOString(),opponent:r.opponent,mode:r.mode,map_name:r.map||null,result:Number(r.ours)>Number(r.theirs)?'WIN':Number(r.ours)<Number(r.theirs)?'LOSE':'DRAW',team_score:Number(r.ours),enemy_score:Number(r.theirs),match_scope:r.scope,notes:[r.notes,r.players?'Giocatori (nomi storici): '+r.players:''].filter(Boolean).join(' | '),screenshot_url:r.photo||null,source_key:r.sourceKey||null}))})});
    const v=await response.json();if(!response.ok)throw new Error(`Dopo ${count} inserimenti: ${v.error||'Errore database'}`);
    count+=Number(v.inserted??batch.length);
    unsaved.splice(0,batch.length);
    setRows([...unsaved]);
   }
   setMessage(`${count} risultati storici salvati nello storico e nelle statistiche collettive, senza alterare la stagione attiva.`);
   setRows([newDraft()]);
  }catch(e){setRows(unsaved);setMessage(e instanceof Error?e.message:'Errore importazione: righe non salvate conservate per riprovare.');}
  finally{setLoading(false)}
 }
 if(auth.loading)return <main className="container"><p>Caricamento...</p></main>;
 return <main className="container wide ak-v14"><section className="card gaming-panel"><p className="eyebrow">AK47DX • ARCHIVIO V14</p><h1>Importa risultati storici</h1><p className="muted">Importa anche 1000 risultati Excel in blocchi sicuri da 100, senza inventare K/D/A. I punteggi delle Scrim complete sono serie (es. 3–2), non partite individuali. Scegli una stagione non attiva: la Stagione 2 resterà intatta. Per le partite con statistiche complete usa l’importazione normale.</p><div className="cal-buttons"><a className="btn small secondary" href="/admin/seasons">Gestione stagioni storiche</a><a className="btn small secondary" href="/import/match">Import completo con giocatori</a><a className="btn small secondary" href="/templates/AK47DX_V14_2_RISULTATI_STORICI.xlsx" download>📄 Scarica modello Excel</a><label className="btn small secondary">📥 Importa Excel risultati<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={e=>void loadExcel(e.target.files?.[0])}/></label></div>{message&&<div className="notice top-gap" role="status">{message}</div>}</section>
 <datalist id="ak47dx-opponent-list">{opponents.map(n=><option value={n} key={n}/>)}</datalist>
 <section className="card top-gap"><div className="section-title"><div><h2>Risultati da registrare</h2><p className="muted">Clan già incontrati suggeriti. Il nome già registrato viene riutilizzato anche se scritto in maiuscolo/minuscolo diverso. Scrivi un clan nuovo se non presente. Incontri ripetuti non richiedono Scrim 1 o Scrim 2.</p></div>{auth.canWrite&&<button className="btn small" onClick={()=>setRows(p=>[...p,{...newDraft(),season:seasons.find(x=>x.is_historical&&!x.is_active)?.id||seasons.find(x=>!x.is_active)?.id||''}])}>+ Aggiungi risultato</button>}</div>
 {rows.length>1&&<div className="table-scroll v142-history-overview"><table className="table compact"><thead><tr><th>Data</th><th>Clan avversario</th><th>Modalità</th><th>AK47DX</th><th>Avversario</th><th>Livello</th><th>Stagione</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.date||'Da inserire'}</td><td>{r.opponent||'Da inserire'}</td><td>{r.mode}</td><td>{r.ours||'–'}</td><td>{r.theirs||'–'}</td><td>{r.scope==='series'?'Scrim / serie':'Partita'}</td><td>{seasons.find(x=>x.id===r.season)?.name||'Scegli'}</td></tr>)}</tbody></table></div>}
 {rows.slice(0,visibleRows).map((r,i)=><div className="v14-history-row" key={r.id}><div className="section-title"><b>Risultato {i+1}</b><button className="btn small secondary" onClick={()=>setRows(p=>p.filter(x=>x.id!==r.id))}>Rimuovi</button></div><div className="grid grid-3"><div className="field"><label>Data</label><input className="input" type="date" value={r.date} onChange={e=>change(r.id,{date:e.target.value})}/></div><div className="field"><label>Stagione storica</label><select className="select" value={r.season} onChange={e=>change(r.id,{season:e.target.value})}><option value="">Scegli stagione</option>{seasons.filter(s=>!s.is_active).map(s=><option key={s.id} value={s.id}>{s.name}{s.is_historical?' • storica':''}</option>)}</select></div><div className="field"><label>Clan avversario</label><input className="input" list="ak47dx-opponent-list" value={r.opponent} onChange={e=>change(r.id,{opponent:e.target.value})} placeholder="Cerca o aggiungi clan"/>{r.opponent.trim()&&<small className="muted">{opponents.some(x=>x.toLocaleLowerCase('it')===r.opponent.trim().toLocaleLowerCase('it'))?'✓ Clan già nello storico':'+ Nuovo clan da registrare'}</small>}</div><div className="field"><label>Modalità</label><select className="select" value={r.mode} onChange={e=>change(r.id,{mode:e.target.value})}>{['CED','POSTAZIONE','DOMINIO','CONTROLLO','ALTRO'].map(v=><option key={v} value={v}>{v}</option>)}</select></div><div className="field"><label>Mappa (facoltativa)</label><input className="input" value={r.map} onChange={e=>change(r.id,{map:e.target.value})}/></div><div className="field"><label>Punteggio riferito a</label><select className="select" value={r.scope} onChange={e=>change(r.id,{scope:e.target.value as 'single'|'series'})}><option value="single">Singola partita</option><option value="series">Risultato finale di incontro / serie</option></select></div><div className="field"><label>Punteggio AK47DX</label><input className="input" type="number" min="0" value={r.ours} onChange={e=>change(r.id,{ours:e.target.value})}/></div><div className="field"><label>Punteggio avversario</label><input className="input" type="number" min="0" value={r.theirs} onChange={e=>change(r.id,{theirs:e.target.value})}/></div><div className="field"><label>Esito (automatico)</label><div className="v14-score-preview">{r.ours!==''&&r.theirs!==''?(Number(r.ours)>Number(r.theirs)?'🟢 VINTA':Number(r.ours)<Number(r.theirs)?'🔴 PERSA':'⚪ PAREGGIO'):'Da compilare'}</div></div><div className="field grid-span-3"><label>Link screenshot prova (facoltativo)</label><input className="input" value={r.photo} onChange={e=>change(r.id,{photo:e.target.value})} placeholder="https://..."/></div><div className="field grid-span-3"><label>Nomi giocatori (facoltativi, solo promemoria senza K/D/A)</label><input className="input" value={r.players} onChange={e=>change(r.id,{players:e.target.value})} placeholder="Es. JINWOO, PABLII"/></div><div className="field grid-span-3"><label>Note (facoltative)</label><input className="input" value={r.notes} onChange={e=>change(r.id,{notes:e.target.value})}/></div></div></div>)}
 {rows.length>visibleRows&&<button className="btn secondary top-gap" onClick={()=>setVisibleRows(n=>n+30)}>Mostra altre 30 righe ({rows.length-visibleRows} nascoste)</button>}
 <div className="cal-buttons top-gap"><button className="btn primary" disabled={!auth.canWrite||loading||!rows.length} onClick={()=>void save()}>{loading?'Salvataggio...':`💾 Salva ${rows.length} risultati storici`}</button><a className="btn secondary" href="/matches">Apri storico</a></div></section></main>;
}
