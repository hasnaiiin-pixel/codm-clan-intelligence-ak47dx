const fs=require('fs'),assert=require('assert'),path=require('path'),ts=require('typescript'),Module=require('module');
const lib=path.join(__dirname,'../src/lib');const cache={};
function load(name){if(cache[name])return cache[name].exports;const file=path.join(lib,name+'.ts'),js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const mod={exports:{}};cache[name]=mod;new Function('require','module','exports',js)((id)=>id.startsWith('./')?load(id.slice(2)):require(id),mod,mod.exports);return mod.exports;}
const {groupScrims,summarizeScrims}=load('scrimAggregation');
const times=['2026-09-04T18:00:00Z','2026-09-04T18:50:00Z','2026-09-04T19:15:00Z','2026-09-04T20:20:00Z','2026-09-04T23:15:00Z'];
const mk=(i,extra={})=>({id:'m'+i,match_date:times[i],season_id:'historical-season',clan_id:'AK47DX',opponent:'Clan ONEPIECE',match_scope:'single',record_quality:'complete',result:i===2?'LOSE':'WIN',...extra});
const hist=new Set(['historical-season']);
const grouped=groupScrims(times.map((_,i)=>mk(i)),hist);
assert.strictEqual(grouped.length,1,'5 partite dettagliate nella stagione storica devono essere UNA Scrim');
assert.strictEqual(grouped[0].matchCount,5);
assert.strictEqual(grouped[0].result,'WIN');
const imported=[mk(0,{id:'legacy-1',match_scope:'series',record_quality:'result_only'}),mk(1,{id:'legacy-2',match_scope:'series',record_quality:'result_only'})];
assert.strictEqual(groupScrims(imported,hist).length,2,'2 risultati storici importati = 2 Scrim');
const broken=groupScrims([...times.map((_,i)=>mk(i)),mk(0,{id:'other-season',season_id:'different'}),mk(0,{id:'different-clan',opponent:'Clan C'})],hist);
assert.strictEqual(broken.length,3,'separare stagione e clan');
const next=groupScrims([...times.map((_,i)=>mk(i)),mk(0,{id:'nextday',match_date:'2026-09-05T18:00:00Z'})],hist);
assert.strictEqual(next.length,2,'oltre 24h dalla prima = nuova Scrim');
assert.strictEqual(summarizeScrims(grouped).played,1);
console.log('FIX19 OK: dettagli 5→1 Scrim anche in stagione storica; import storico 1→1; nuovi 24h; separazione avversari/stagione.');
