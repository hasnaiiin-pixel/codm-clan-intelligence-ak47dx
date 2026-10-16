'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function transpile(f){
  const result=ts.transpileModule(read(f),{fileName:f,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}});
  assert.deepEqual((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[],`${f}: TSX syntax failed`);
}
transpile('app/tornei/[id]/page.tsx');transpile('app/tornei/page.tsx');transpile('app/version/page.tsx');
const ui=read('app/tornei/[id]/page.tsx');const css=read('app/globals.css');const sql=read('supabase/UPDATE_V14_2_FIX28_SPECTATOR_DETAILS.sql');
// Detail page: correct tournament RPC, advanced and legacy brackets, assigned and allowed weapons.
assert.match(ui,/codm_fix26_public_tournament/);
assert.match(ui,/p_tournament_id:id/);
assert.match(ui,/const hasBracket=Boolean\(plan\|\|legacyElimination\.length\)/);
assert.match(ui,/BracketFlowBoard/);
assert.match(ui,/legacyElimination\.map\(classicCard\)/);
assert.match(ui,/assignments\[m\.key\]/);
assert.match(ui,/weapon=\{m\.weapon\}/);
assert.match(ui,/weapon=\{a\?\.weapon\}/);
assert.match(ui,/Armi da utilizzare/);
assert.match(ui,/normalizeWeapons\(data\?\.tournament\.allowed_weapons\)/);
// Group team name and smaller player names; two columns on desktop, one on mobile.
assert.match(ui,/ak28-groups-grid/);
assert.match(ui,/ak28-group-team/);
assert.match(ui,/playerNames\(teams,r\.team\)/);
assert.match(css,/\.ak28-groups-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css,/@media\(max-width:790px\)\{\.ak28-groups-grid/);
// Uniform fixtures, centered VS and meta details.
assert.match(css,/\.ak28-fixture-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);grid-auto-rows:1fr/);
assert.match(css,/\.ak28-fixture-vs\{display:grid;place-items:center/);
assert.match(css,/\.ak28-fixture-meta\{margin-top:auto;display:flex;flex-wrap:wrap;justify-content:center/);
assert.match(ui,/matches\.filter\(m=>m\.score_a!=null&&m\.score_b!=null\)\.map\(classicCard\)/);
assert.match(ui,/plan\?\.matches\.filter\(m=>results\[m\.key\]\)\.map\(bracketCard\)/);
// No raw match notes or personal data are exposed in the SQL public API.
assert.match(sql,/'allowed_weapons'/);
assert.match(sql,/'weapon',case when position\('Arma sorteggiata:'/);
assert.match(sql,/notify pgrst, 'reload schema'/);
assert.doesNotMatch(sql,/'notes',\s*m\.notes/);
assert.doesNotMatch(sql,/signup_controller_name|public_signup_uid|public_signup_given_name/);
assert.match(read('app/version/page.tsx'),/FIX(?:28|29|30)/);
assert.match(read('public/sw.js'),/fix(?:28|29|30)/);
console.log('FIX28: armi, gironi 2x2, tabellone legacy e v2, calendario uniforme, visibilità solo pubblica e cache OK.');
