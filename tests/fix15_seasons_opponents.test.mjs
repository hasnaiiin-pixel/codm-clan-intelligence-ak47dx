import assert from 'node:assert/strict';
import test from 'node:test';
import { countResults, summarizeSeasons, summarizeOpponents, normalizeOpponent } from '../src/lib/seasonOpponentStats.ts';
const seasons = [
  { id:'old', name:'Stagione storica 2024', is_historical:true },
  { id:'previous', name:'Stagione 1' },
  { id:'active', name:'Stagione 2', is_active:true },
];
const matches = [
  { id:'1', season_id:'old', match_date:'2024-03-01', opponent:' Clan RES ', result:'WIN', match_scope:'series', team_score:3, enemy_score:2, record_quality:'result_only' },
  { id:'2', season_id:'old', match_date:'2024-03-02', opponent:'CLAN   RES', result:'LOSE', match_scope:'series', team_score:1, enemy_score:2, record_quality:'result_only' },
  { id:'3', season_id:'previous', match_date:'2025-03-02', opponent:'Clan RES', result:'WIN', match_scope:'single', team_score:250, enemy_score:200 },
  { id:'4', season_id:'active', match_date:'2026-03-02', opponent:'Clan Test', result:'WIN', match_scope:'series', team_score:2, enemy_score:0 },
  { id:'5', season_id:'active', match_date:'2026-03-03', opponent:'Clan Test', result:'DRAW', match_scope:'single', team_score:150, enemy_score:150 },
  { id:'6', season_id:null, match_date:'2023-01-01', opponent:'Clan RES', result:'WIN', match_scope:'single' },
];
test('All totals include historical, active, old seasons, and unassigned',()=>{
  const total=countResults(matches);
  assert.equal(total.totalRecords,6);
  assert.deepEqual([total.series.played,total.series.wins,total.series.losses,total.series.draws], [3,2,1,0]);
  assert.deepEqual([total.singles.played,total.singles.wins,total.singles.draws], [3,2,1]);
  assert.equal(total.resultOnly,2);
  assert.equal(total.series.wr,66.7);
  assert.equal(total.singles.wr,66.7);
});
test('Season filter isolates only target season',()=>{
  const onlyOld=matches.filter(m=>m.season_id==='old');
  const old=countResults(onlyOld);
  assert.equal(old.series.played,2);
  assert.equal(old.singles.played,0);
  assert.equal(old.series.wr,50);
  const active=countResults(matches.filter(m=>m.season_id==='active'));
  assert.equal(active.series.played,1);
  assert.equal(active.singles.played,1);
});
test('All season summaries reconcile with grand total and include no-season group',()=>{
  const breakdown=summarizeSeasons(matches,seasons);
  assert.equal(breakdown.length,4);
  assert.equal(breakdown.reduce((n,r)=>n+r.totalRecords,0),matches.length);
  assert.equal(breakdown.find(x=>x.name==='Stagione storica 2024')?.series.played,2);
  assert.equal(breakdown.find(x=>x.id==='__UNASSIGNED__')?.singles.played,1);
});
test('Opponent names normalize spaces and case, but distinct scrims remain distinct',()=>{
  assert.equal(normalizeOpponent('  CLAN   res '), 'clan res');
  const clubs=summarizeOpponents(matches);
  assert.equal(clubs.length,2);
  const res=clubs.find(c=>c.key==='clan res');
  assert.ok(res);
  assert.equal(res.series.played,2);
  assert.equal(res.series.wins,1);
  assert.equal(res.series.losses,1);
  assert.equal(res.singles.played,2);
  assert.equal(res.matches.length,4);
  assert.equal(res.matches[0].id,'3');
});
test('One series result 3-2 is not converted into 5 single matches',()=>{
  const only=[matches[0]];
  const result=countResults(only);
  assert.equal(result.series.played,1);
  assert.equal(result.singles.played,0);
});
