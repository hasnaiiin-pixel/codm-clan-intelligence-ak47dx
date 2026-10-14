'use client';

import { useState } from 'react';
import type { PublicSignup } from './TournamentSignupAdmin';
import {resolveBracket, type BracketPlan, type BracketResult} from '@/lib/advancedBracket';
import {tournamentMatchCodes} from '@/lib/tournamentMatchCodes';
import {buildFlowLayout, FLOW_CARD_WIDTH, FLOW_CARD_HEIGHT} from './BracketFlowBoard';

type Team = {id:string;name:string;captain?:string|null;status?:string|null;players?:string[]|null;reserves?:string[]|null};
type Registration = {id:string;nickname?:string|null;status?:string|null;created_at?:string;team_id?:string|null};
type Match = {id:string;phase?:string|null;group_name?:string|null;team_a?:string|null;team_b?:string|null;match_time?:string|null;mode?:string|null;map_name?:string|null;score_limit?:number|null;score_a?:number|null;score_b?:number|null;winner?:string|null;status?:string|null;notes?:string|null;next_match_id?:string|null};
type Group = {name:string;finished:boolean;qualifying:number;standings:Array<{team:string;played:number;wins:number;draws:number;losses:number;points:number;diff:number}>};
type Tournament={name:string;format?:string|null;type?:string|null;tournament_date?:string|null;rules?:Record<string,any>|null};
type Props={tournament:Tournament;publicSignups:PublicSignup[];registrations:Registration[];teams:Team[];matches:Match[];groups:Group[];canWrite:boolean};

function cell(value:unknown):string|number {
  if (typeof value==='number' && Number.isFinite(value)) return value;
  // Formula injection protection in CSV/XLSX; UID is retained as a text cell.
  const text=String(value??'');
  return /^[\s\u0000-\u001f]*[=+\-@]/.test(text)?`'${text}`:text;
}
function groupForTeam(name:string,groupLookup:Map<string,string>){return groupLookup.get(name)||'';}
function rowsFor(props:Props){
  const {tournament,publicSignups,registrations,teams,matches,groups}=props;
  const byRegistration=new Set(publicSignups.map(r=>r.registration_id).filter(Boolean));
  const groupLookup=new Map<string,string>();
  for(const g of groups)for(const s of g.standings)groupLookup.set(s.team,g.name);
  const teamLookup=new Map<string,string>();
  for(const t of teams)for(const nick of [...(t.players||[]),...(t.reserves||[])])teamLookup.set(nick.toLocaleLowerCase('it-IT'),t.name);
  const registrationRows = [
    ...publicSignups.map((r,i)=>[i+1,r.surname,r.given_name,r.nickname,r.uid,r.status,r.created_at,teamLookup.get(r.nickname.toLocaleLowerCase('it-IT'))||'',groupForTeam(teamLookup.get(r.nickname.toLocaleLowerCase('it-IT'))||r.nickname,groupLookup),'Pubblica']),
    ...registrations.filter(r=>!byRegistration.has(r.id)).map((r,i)=>[publicSignups.length+i+1,'','',r.nickname||'','',r.status||'',r.created_at||'',teamLookup.get(String(r.nickname||'').toLocaleLowerCase('it-IT'))||'',groupLookup.get(r.nickname||'')||'','Profilo / Staff'])
  ];
  const teamRows=teams.flatMap(t=>[...(t.players||[]).map((p,i)=>[t.name,i+1,p,'Titolare',t.captain||'',t.status||'',groupLookup.get(t.name)||'',publicSignups.find(r=>r.nickname.toLowerCase()===p.toLowerCase())?.uid||'']),
    ...(t.reserves||[]).map((p,i)=>[t.name,i+1,p,'Riserva',t.captain||'',t.status||'',groupLookup.get(t.name)||'',publicSignups.find(r=>r.nickname.toLowerCase()===p.toLowerCase())?.uid||''])]);
  const standings=groups.flatMap(g=>g.standings.map((s,i)=>[g.name,i+1,s.team,s.played,s.wins,s.draws,s.losses,s.points,s.diff,i<g.qualifying?'Qualificato':'',g.finished?'Definitivo':'Provvisorio']));
  const fixture=(m:Match)=>[m.phase||'',m.group_name||'',m.team_a||'Da definire',m.team_b||'Da definire',m.match_time||'',m.mode||'',m.map_name||'',m.score_limit??'',m.status||'',m.score_a??'',m.score_b??'',m.winner||''];
  const isPlayed=(m:Match)=>m.score_a!=null&&m.score_b!=null;
  const isWinners=(m:Match)=>/^W(?:-|\d)|Winners/i.test(String(m.phase||'')) || /^W-R/i.test(String(m.group_name||''));
  const isLosers=(m:Match)=>/^L(?:-|\d)|Losers/i.test(String(m.phase||'')) || /^L-R/i.test(String(m.group_name||''));
  const grouped = matches.filter(m=>String(m.phase||'')==='Girone');
  const winners=matches.filter(m=>isWinners(m)),losers=matches.filter(m=>isLosers(m));
  const bracketH=['Fase','Girone/Turno','Squadra A','Squadra B','Data/Ora','Modalità','Mappa','Limite','Stato','Punti A','Punti B','Vincitore'];
  const advanced=props.tournament.rules?.advanced_bracket_v2;
  const plan=(advanced?.version===2&&advanced.plan?.matches?advanced.plan:null) as BracketPlan|null;
  const advancedRows:(string|number)[][]=[];
  if(plan){
    const results=(advanced.results||{}) as Record<string,BracketResult>;
    const assignments=(advanced.assignments||{}) as Record<string,{mode?:string;map?:string;weapon?:string;at?:string;scoreLimit?:number}>;
    const resolved=resolveBracket(plan,results);
    const short=tournamentMatchCodes(plan);
    const teamName=(id:string|null)=>id?(plan.teams.find(t=>t.id===id)?.name||id):'Da definire';
    for(const m of plan.matches){const state=resolved.get(m.key);const a=assignments[m.key];const result=results[m.key];
      advancedRows.push([m.lane,short[m.key]||m.key,m.name,teamName(state?.teamA||null),teamName(state?.teamB||null),
        a?.at||'',a?.mode||'',a?.map||'',a?.weapon||'',a?.scoreLimit||'',
        result?.scoreA??'',result?.scoreB??'',m.winnerTo?(short[m.winnerTo]||m.winnerTo):'Campione',m.loserTo?(short[m.loserTo]||m.loserTo):'Fine percorso']);
    }
  }
  const advancedHeaders=['Tab.','Codice','Turno','Squadra A / origine','Squadra B / origine','Data/Ora','Modalità','Mappa','Arma','Limite','Score A','Score B','Vincente →','Perdente →'];
  const sheets:[string,(string|number)[][]][]=[
    ['Riepilogo',[['Campo','Valore'],['Torneo',tournament.name],['Formato',tournament.format||''],['Tipologia',tournament.type||''],['Data',tournament.tournament_date||''],['Esportato il',new Date().toLocaleString('it-IT')],['Iscritti',registrationRows.length],['Squadre',teams.length],['Gironi',groups.length],['Partite',matches.length]]],
    ['Iscritti',[['N','Cognome','Nome','Nickname CODM','UID','Stato','Data iscrizione','Squadra','Girone','Origine'],...registrationRows]],
    ['Squadre',[['Squadra','Numero','Nickname','Ruolo','Capitano','Stato','Girone','UID'],...teamRows]],
    ['Gironi',[['Girone','Squadra A','Squadra B','Data/Ora','Esito'],...grouped.map(m=>[m.group_name||'A',m.team_a||'',m.team_b||'',m.match_time||'',isPlayed(m)?`${m.score_a}-${m.score_b}`:'Da giocare'])]],
    ['Classifiche',[['Girone','Posizione','Squadra','PG','V','P','S','Punti','Differenza','Passaggio','Stato'],...standings]],
    ['Calendario',[bracketH,...[...matches].sort((a,b)=>String(a.match_time||'').localeCompare(String(b.match_time||''))).map(fixture)]],
    ['Risultati',[bracketH,...matches.filter(isPlayed).map(fixture)]],
    ['Qualificati',[['Girone','Posizione','Squadra','Stato'],...groups.flatMap(g=>g.standings.slice(0,g.qualifying).map((r,i)=>[g.name,i+1,g.finished?r.team:`${i+1}° Girone ${g.name}`,g.finished?'Qualificato':'Previsto']))]],
    ['Winners',plan?[advancedHeaders,...advancedRows.filter(r=>r[0]==='W')]:[bracketH,...winners.map(fixture)]],
    ['Losers & Finale',plan?[advancedHeaders,...advancedRows.filter(r=>r[0]!=='W')]:[bracketH,...matches.filter(m=>isLosers(m)||/final/i.test(String(m.phase||''))).map(fixture)]]
  ];
  return sheets;
}
function csv(rows:(string|number)[][]){return '\ufeff'+rows.map(row=>row.map(raw=>`"${String(cell(raw)).replace(/"/g,'""')}"`).join(';')).join('\r\n');}
function download(content:string,mime:string,fileName:string){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fileName;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function safeBase(value:string){return value.normalize('NFKD').replace(/[^a-zA-Z0-9_-]/g,'_').replace(/_+/g,'_').slice(0,44)||'AK47DX_Torneo';}

export default function TournamentExportCenter(props:Props){
  const [busy,setBusy]=useState('');const [message,setMessage]=useState('');
  const basename=safeBase(props.tournament.name)+'_FIX24';
  const sheets=()=>rowsFor(props);
  async function exportXlsx(){if(!props.canWrite)return;setBusy('excel');setMessage('');try{
    const XLSX=await import('xlsx');const wb=XLSX.utils.book_new();
    for(const [name,rows] of sheets()){
      const ws=XLSX.utils.aoa_to_sheet(rows.map(r=>r.map(cell)));
      ws['!cols']=rows[0].map((_,i)=>({wch:Math.min(42,Math.max(12,...rows.slice(0,200).map(r=>String(r[i]??'').length+2)))}));
      XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31));
    }
    XLSX.writeFile(wb,`${basename}_COMPLETO.xlsx`);
    setMessage('Excel esportato: 10 fogli aggiornati.');
  }catch(e){setMessage(`Esportazione non riuscita: ${e instanceof Error?e.message:String(e)}`);}finally{setBusy('');}}
  function exportCsv(){if(!props.canWrite)return;const row=sheets()[1][1];download(csv(row),'text/csv;charset=utf-8',`${basename}_ISCRITTI.csv`);setMessage('CSV iscritti esportato.');}
  async function exportPdf(){setBusy('pdf');setMessage('');try{
    const {jsPDF}=await import('jspdf');const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    const sections=sheets().filter(([name])=>['Riepilogo','Squadre','Gironi','Classifiche','Calendario','Risultati'].includes(name));
    let first=true;
    for(const [title,raw] of sections){if(!first)pdf.addPage();first=false;
      pdf.setFillColor(12,19,34);pdf.rect(0,0,297,27,'F');pdf.setTextColor(255,255,255);pdf.setFontSize(16);pdf.text('AK47DX | '+title.toUpperCase(),12,12);
      pdf.setFontSize(9);pdf.text(props.tournament.name.slice(0,80),12,20);
      const colCount=Math.max(1,raw[0]?.length||1);const colW=273/colCount;
      pdf.setFontSize(8);pdf.setTextColor(20,31,48);let y=36;
      for(const [ix,row] of raw.entries()){
        const text=row.map(v=>String(v??'').replace(/\s+/g,' '));
        const lines=text.map(v=>pdf.splitTextToSize(v,Math.max(12,colW-3)) as string[]);
        const h=Math.max(7,Math.min(24,Math.max(...lines.map(x=>Math.min(x.length,3)))*4+2));
        if(y+h>194){pdf.addPage();y=17;}
        if(ix===0){pdf.setFillColor(225,233,245);pdf.rect(12,y-4,273,h,'F');pdf.setFont('helvetica','bold');}
        else pdf.setFont('helvetica','normal');
        lines.forEach((chunks,col)=>pdf.text(chunks.slice(0,3),13+col*colW,y,{maxWidth:Math.max(12,colW-3)}));
        y+=h;
      }
    }
    pdf.save(`${basename}_PUBBLICO.pdf`);setMessage('PDF pubblico generato, senza cognomi e UID.');
  }catch(e){setMessage(`Errore PDF: ${e instanceof Error?e.message:String(e)}`);}finally{setBusy('');}}

  async function exportBracketPdf(){
    if(!props.tournament.rules?.advanced_bracket_v2?.plan){setMessage('Genera e salva il tabellone avanzato prima di esportare il grafico.');return;}
    setBusy('bracket');setMessage('');
    try{
      const {jsPDF}=await import('jspdf');
      const saved=props.tournament.rules.advanced_bracket_v2;
      const plan=saved.plan as BracketPlan;
      const resolution=resolveBracket(plan,(saved.results||{}) as Record<string,BracketResult>);
      const layout=buildFlowLayout(plan);const codes=tournamentMatchCodes(plan);
      const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a3'});
      const pageW=420,pageH=297,margin=12;
      const teamName=(id:string|null)=>id?(plan.teams.find(t=>t.id===id)?.name||id):'Da definire';
      const cards=[...layout.positions.values()];
      const draw=(label:string,yStart:number,yEnd:number,first:boolean)=>{
        if(!first)pdf.addPage();
        pdf.setFillColor(11,16,28);pdf.rect(0,0,pageW,pageH,'F');
        pdf.setTextColor(245,246,255);pdf.setFontSize(14);pdf.text(`AK47DX | ${label}`,margin,10);
        pdf.setFontSize(8);pdf.text(props.tournament.name.slice(0,65),pageW-margin,10,{align:'right'});
        const viewH=yEnd-yStart;
        const scale=Math.min((pageW-2*margin)/layout.width,(pageH-28)/viewH);
        const x0=margin,y0=18;
        const P=(x:number,y:number):[number,number]=>[x0+x*scale,y0+(y-yStart)*scale];
        // Linee dal centro destro del match di origine alla destinazione; colori identici alla FIX23.
        for(const link of layout.links){
          const from=layout.positions.get(link.from),to=layout.positions.get(link.to);
          if(!from||!to||from.y>yEnd||from.y+FLOW_CARD_HEIGHT<yStart||to.y>yEnd||to.y+FLOW_CARD_HEIGHT<yStart)continue;
          const [sx,sy]=P(from.x+FLOW_CARD_WIDTH,from.y+FLOW_CARD_HEIGHT/2);
          const [tx,ty]=P(to.x,to.y+FLOW_CARD_HEIGHT/2);
          const rgb=link.kind==='loss'?[245,164,93]:link.kind==='final'?[232,198,106]:[91,156,245];
          pdf.setDrawColor(rgb[0],rgb[1],rgb[2]);pdf.setLineWidth(.4);pdf.line(sx,sy,tx,ty);
          // Punta della freccia verso il match di destinazione.
          pdf.line(tx,ty,tx-1.8,ty-1.1);pdf.line(tx,ty,tx-1.8,ty+1.1);
        }
        for(const node of cards){
          const {match}=node;if(node.y<yStart||node.y+FLOW_CARD_HEIGHT>yEnd)continue;
          const [x,y]=P(node.x,node.y);const w=FLOW_CARD_WIDTH*scale,h=FLOW_CARD_HEIGHT*scale;
          const rgb=match.lane==='W'?[77,119,195]:match.lane==='L'?[189,120,66]:[215,177,74];
          pdf.setFillColor(26,39,60);pdf.setDrawColor(rgb[0],rgb[1],rgb[2]);pdf.roundedRect(x,y,w,h,1.1,1.1,'FD');
          const details=resolution.get(match.key);
          pdf.setFont('helvetica','bold');pdf.setTextColor(245,245,250);
          pdf.setFontSize(Math.max(2.4,Math.min(7,scale*21)));
          pdf.text(String(codes[match.key]||match.key),x+1.8,y+Math.max(3,scale*24));
          pdf.setFont('helvetica','normal');pdf.setFontSize(Math.max(2.2,Math.min(6,scale*16)));
          const clip=(v:string)=>v.slice(0,Math.max(8,Math.floor(w/1.6)));
          pdf.text(clip(teamName(details?.teamA||null)),x+1.8,y+Math.max(5,scale*65));
          pdf.text('VS',x+w/2,y+Math.max(7,scale*85),{align:'center'});
          pdf.text(clip(teamName(details?.teamB||null)),x+1.8,y+Math.max(9,scale*109));
        }
        pdf.setTextColor(163,178,201);pdf.setFontSize(8);pdf.text('Blu = Winners | Arancione = Losers | Oro = Grand Final',margin,pageH-7);
      };
      draw('TABELLONE COMPLETO',0,layout.height,true);
      // Le pagine supplementari aumentano la leggibilità per i bracket lunghi.
      if(layout.height>1000){
        const step=1250;
        for(let start=0;start<layout.height;start+=step)draw(`DETTAGLIO ${Math.floor(start/step)+1}`,Math.max(0,start-100),Math.min(layout.height,start+step),false);
      }
      pdf.save(`${basename}_TABELLONE_A3.pdf`);
      setMessage('Tabellone con frecce esportato in PDF A3, con pagine aggiuntive per bracket grandi.');
    }catch(e){setMessage(`Errore PDF tabellone: ${e instanceof Error?e.message:String(e)}`);}finally{setBusy('');}
  }

  return <section className="card ak24-admin-card top-gap">
    <div className="section-title"><div><h2>📁 Export Center · FIX24</h2><p className="muted">Dati del torneo attualmente selezionato. Il PDF pubblico non include cognomi o UID.</p></div></div>
    <div className="ak24-export-actions"><button className="btn" disabled={!props.canWrite||!!busy} onClick={()=>void exportXlsx()}>📊 {busy==='excel'?'Preparazione…':'Esporta tutto Excel (10 fogli)'}</button><button className="btn secondary" disabled={!props.canWrite||!!busy} onClick={exportCsv}>📄 Iscritti CSV</button><button className="btn secondary" disabled={!!busy} onClick={()=>void exportPdf()}>🖨️ {busy==='pdf'?'Preparazione…':'PDF pubblico torneo'}</button><button className="btn secondary" disabled={!!busy} onClick={()=>void exportBracketPdf()}>🏆 PDF tabellone con frecce</button></div>
    <p className="muted">Excel e CSV: solo staff autorizzato (contengono dati anagrafici e UID). PDF pubblico: riepilogo, squadre, gironi, classifiche, calendario e risultati, senza informazioni personali. PDF tabellone: schema grafico con frecce Winners/Losers/Finale.</p>
    {message&&<p className="notice" role="status">{message}</p>}
  </section>;
}
