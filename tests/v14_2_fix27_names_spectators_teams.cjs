const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
function compile(f){const a=ts.transpileModule(read(f),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});assert.equal(a.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,`Errore TSX ${f}`);return a.outputText;}
const files=['src/lib/tournamentTeamNames.ts','app/tournament/TeamNameGenerator.tsx','app/tournament/page.tsx','app/tornei/page.tsx','app/tornei/[id]/page.tsx'];files.forEach(compile);
const m={exports:{}};vm.runInNewContext(compile(files[0]),{module:m,exports:m.exports,require,Math,Set,Map,String,Object});
const {nameSuggestions,NAME_CATEGORIES}=m.exports;
assert.equal(NAME_CATEGORIES.length,4);
for(const c of ['animali','motori','codm','simpatici','misto']){const results=nameSuggestions(c,true,6,[],()=>.4);assert.equal(results.length,6);assert.equal(new Set(results).size,6);assert.ok(results.every(x=>x.includes(' ')));}
const pool=nameSuggestions('animali',false,6,[],()=>0);
assert.ok(pool.every(x=>!/^\p{Extended_Pictographic}/u.test(x)));
assert.ok(!nameSuggestions('animali',false,6,[pool[0]],()=>0).includes(pool[0]));
assert.ok(!nameSuggestions('animali',false,6,['🐺 '+pool[0]],()=>0).includes(pool[0]));
const admin=read(files[2]),pub=read(files[4]),list=read(files[3]);
assert.match(admin,/TeamNameGenerator/);assert.match(admin,/onPick=\{name=>setTeamForm/);
assert.match(admin,/async function deleteTeam\(/);assert.match(admin,/\.eq\('tournament_id',selected\.id\)\.select\('id'\)/);
assert.match(admin,/bracketUsesTeam\|\|matches\.some/);assert.match(admin,/confirm\(`/);assert.match(admin,/freshPlan/);
assert.match(pub,/ak27-public-kpis/);assert.match(pub,/ak27-spectator-header/);
assert.match(list,/ak27-index-heading/);
console.log('FIX27: categorie, emoji, filtri, unicità, eliminazione protetta e UI spettatori OK');
