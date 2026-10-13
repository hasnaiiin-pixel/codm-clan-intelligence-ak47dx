const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const ts=require('typescript');const root=path.resolve(__dirname,'..');
function txt(p){return fs.readFileSync(path.join(root,p),'utf8')}
function moduleFromTs(file){const code=ts.transpileModule(txt(file),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require,Math,Date});return module.exports;}
const {CODM_MULTIPLAYER_MAPS,CODM_WEAPONS}=moduleFromTs('src/lib/codmTournamentCatalog.ts');
for(const name of ['Saloon','King','Gulag Showers','Stack','Killhouse','Cage'])assert.ok(CODM_MULTIPLAYER_MAPS.includes(name),`Mappa mancante ${name}`);
assert.equal(new Set(CODM_MULTIPLAYER_MAPS).size,CODM_MULTIPLAYER_MAPS.length,'Catalogo mappe duplicato');
assert.ok(CODM_MULTIPLAYER_MAPS.length>=70,'Catalogo non esteso');
assert.ok(Object.keys(CODM_WEAPONS).length>=9,'Categorie armi mancanti');
for(const [category,items] of Object.entries(CODM_WEAPONS))assert.ok(items.length>0,`Categoria vuota ${category}`);
const tour=txt('app/tournament/page.tsx');
assert.match(tour,/const codmMaps: string\[\] = \[\.\.\.CODM_MULTIPLAYER_MAPS\]/);
assert.match(tour,/Torneo delle armi · scelta per categoria/);
assert.match(tour,/Rigenera torneo da iscritti/);
assert.match(tour,/delete clonedRules\.advanced_bracket_v2/);
assert.match(tour,/\.from\('codm_tournament_registrations'\)\.insert\(copy\)/);
const analytics=txt('app/analytics/page.tsx');
assert.match(analytics,/value="ALL">📚 Tutte le stagioni/);
assert.match(analytics,/Σ TOTALE TUTTE LE STAGIONI/);
assert.match(analytics,/scrimSummary\.historical/);
assert.match(analytics,/scrimSummary\.newScrims/);
assert.match(txt('app/version/page.tsx'),/AK47DX_V14_2_FIX(?:18|19|22)_/);
console.log(`OK FIX18: ${CODM_MULTIPLAYER_MAPS.length} mappe unificate, ${Object.keys(CODM_WEAPONS).length} categorie armi, rigenerazione da iscritti, stagione ALL e marker Vercel`);
