import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
// Test puri con node --experimental-strip-types, senza dipendere da Next/Supabase.
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ak47dx-scrim-'));
const dep=fs.readFileSync(new URL('../src/lib/seasonOpponentStats.ts',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/lib/scrimAggregation.ts',import.meta.url),'utf8').replace("from './seasonOpponentStats'","from './seasonOpponentStats.ts'");
fs.writeFileSync(path.join(tmp,'seasonOpponentStats.ts'),dep);
fs.writeFileSync(path.join(tmp,'scrimAggregation.ts'),main);
const {groupScrims,summarizeScrims}=await import(pathToFileURL(path.join(tmp,'scrimAggregation.ts')).href);
const match=(id,day,opp,result,opts={})=>({id,match_date:day,opponent:opp,result,match_scope:'single',season_id:'s2',clan_id:'clan',record_quality:'complete',...opts});

test('Due risultati storici contro lo stesso clan sono due Scrim anche nello stesso giorno',()=>{
  const matches=[match('oldA','2025-01-01T10:00:00Z','CLAN RES','WIN',{record_quality:'result_only',match_scope:'series',team_score:2,enemy_score:1,season_id:'s1'}),match('oldB','2025-01-01T11:00:00Z','Clan  res','LOSE',{record_quality:'result_only',match_scope:'series',team_score:0,enemy_score:3,season_id:'s1'})];
  const sc=groupScrims(matches);
  assert.equal(sc.length,2);assert.equal(summarizeScrims(sc).historical,2);assert.equal(summarizeScrims(sc).matches,0);
});
test('Nuove partite, diverse modalita/mappe, stesso avversario entro 24h = una Scrim',()=>{
  const matches=[match('a','2026-10-12T10:00:00Z','Clan A','WIN'),match('b','2026-10-12T12:00:00Z','clan  a','LOSE',{mode:'CED'}),match('c','2026-10-13T09:00:00Z','Clan A','WIN',{mode:'DOMINIO'})];
  const [sc]=groupScrims(matches);assert.deepEqual([sc.matchCount,sc.wins,sc.losses,sc.result,sc.score],[3,2,1,'WIN','2–1']);
  assert.equal(groupScrims(matches).length,1);
});
test('Le 24h partono dalla prima partita e non si estendono concatenando',()=>{
  const matches=[match('a','2026-10-12T10:00:00Z','Clan A','WIN'),match('b','2026-10-13T09:00:00Z','Clan A','LOSE'),match('c','2026-10-13T12:00:00Z','Clan A','WIN')];
  assert.deepEqual(groupScrims(matches).map(s=>s.matchCount).sort(),[1,2]);
});
test('Stagioni e clan diversi non vengono uniti, e dati senza avversario restano individuali',()=>{
  const matches=[match('a','2026-10-12','Clan A','WIN'),match('b','2026-10-12','Clan A','LOSE',{season_id:'s1'}),match('c','2026-10-12','Clan B','WIN'),match('d','2026-10-12','','WIN'),match('e','2026-10-12','','LOSE'),match('f','2026-10-12','Clan A','WIN',{clan_id:'other'})];
  assert.equal(groupScrims(matches).length,6);
});
test('Anche le partite complete della stagione storica contano ciascuna una Scrim',()=>{
  const matches=[match('a','2024-06-05T09:00:00Z','Clan A','WIN',{season_id:'archive'}),match('b','2024-06-05T10:00:00Z','Clan A','LOSE',{season_id:'archive'})];
  assert.equal(summarizeScrims(groupScrims(matches,new Set(['archive']))).historical,2);
});
test('Un risultato storico 3-2 con cinque partite reali collegate temporalmente si conta una volta',()=>{
  const history=match('history','2026-10-12T10:00:00Z','Clan A','WIN',{match_scope:'series',record_quality:'result_only',team_score:3,enemy_score:2});
  const details=['WIN','WIN','LOSE','WIN','LOSE'].map((r,i)=>match(String(i),'2026-10-12T'+String(10+i).padStart(2,'0')+':00:00Z','Clan A',r));
  const grouped=groupScrims([history,...details]);assert.equal(grouped.length,1);assert.equal(grouped[0].matchCount,5);assert.equal(grouped[0].matchIds.length,6);
});
test('Storiche + nuove + stagioni = totale coerente e per-clan separato',()=>{
  const m=[match('h1','2024-01-01','CLAN A','WIN',{season_id:'old',record_quality:'result_only'}),match('h2','2024-02-01','clan a','LOSE',{season_id:'old',record_quality:'result_only'}),match('n1','2026-10-12T10:00:00Z','Clan A','WIN'),match('n2','2026-10-12T12:00:00Z','Clan A','WIN'),match('n3','2026-10-12T10:00:00Z','Clan B','LOSE')];
  const scrims=groupScrims(m);const total=summarizeScrims(scrims);
  assert.deepEqual([total.played,total.historical,total.newScrims,total.wins,total.losses],[4,2,2,2,2]);
  assert.equal(scrims.filter(s=>s.opponentKey==='clan a').length,3);
  assert.equal(scrims.filter(s=>s.seasonId==='old').length+scrims.filter(s=>s.seasonId==='s2').length,total.played);
});
