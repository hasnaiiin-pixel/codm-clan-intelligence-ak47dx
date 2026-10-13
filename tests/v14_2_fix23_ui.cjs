const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const ts=require('typescript');
const transpile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
for(const file of ['app/tournament/BracketFlowBoard.tsx','app/tournament/AdvancedTournamentCalendar.tsx','app/tournament/AdvancedBracketCenter.tsx','app/tournament/page.tsx','src/lib/tournamentMatchCodes.ts']){
 const t=transpile(file); const errors=(t.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 assert.equal(errors.length,0,`Errore TSX ${file}: ${errors.map(e=>e.messageText).join(',')}`);
}
function loadModule(file,inject={}){
 const transpiled=transpile(file).outputText;
 const mod={exports:{}};
 vm.runInNewContext(transpiled,{module:mod,exports:mod.exports,require:name=>{
  if(inject[name])return inject[name];
  if(name==='react')return {useMemo:f=>f(),useRef:()=>({current:null}),useState:v=>[v,()=>{}],useEffect:()=>{}};
  if(name==='react/jsx-runtime')return {jsx:()=>null,jsxs:()=>null};
  return require(name);
 },Map,Set,Array,Math,Date,Number,String,Object});
 return mod.exports;
}
const engine=loadModule('src/lib/advancedBracket.ts');
const codes=loadModule('src/lib/tournamentMatchCodes.ts');
const board=loadModule('app/tournament/BracketFlowBoard.tsx',{'@/lib/tournamentMatchCodes':codes});
for(const n of [8,16,24,32,64]){
 const teams=Array.from({length:n},(_,i)=>({id:`t${i+1}`,name:`Squadra ${i+1}`,seed:i+1}));
 const plan=engine.buildAdvancedBracket(teams);
 const layout=board.buildFlowLayout(plan);
 const codeMap=codes.tournamentMatchCodes(plan);
 assert.equal(layout.positions.size,plan.matches.length);
 assert.equal(new Set(Object.values(codeMap)).size,plan.matches.length);
 assert.equal(codeMap['GF-BO3'],'GF');
 assert.ok(Object.values(codeMap).some(x=>x==='W1'));
 assert.ok(Object.values(codeMap).some(x=>x==='L1'));
 assert.ok(layout.links.some(link=>link.kind==='loss'&&link.crossLane));
 assert.ok(layout.links.some(link=>link.kind==='final'));
 const gf=layout.positions.get('GF-BO3');
 assert.ok(gf,'Finale presente');
 assert.ok([...layout.positions.values()].filter(x=>x.match.lane!=='GF').every(x=>gf.x>x.x),'GF sempre a destra');
 assert.ok(layout.positions.get(plan.matches.find(x=>x.lane==='L').key).y>layout.positions.get(plan.matches.find(x=>x.lane==='W').key).y,'Losers sotto Winners');
 assert.ok(layout.links.every(l=>l.path.startsWith('M')),'frecce SVG corrette');
 console.log(`OK ${n} squadre: ${plan.matches.length} incontri · ${layout.links.length} frecce · Winners/Losers/Finale uniti`);
}
const page=fs.readFileSync('app/tournament/page.tsx','utf8');
const calendar=fs.readFileSync('app/tournament/AdvancedTournamentCalendar.tsx','utf8');
const css=fs.readFileSync('app/globals.css','utf8');
assert.match(page,/ak23-results-list/);
assert.match(calendar,/shortCodes\[m.key\]/);
assert.match(css,/ak23-view-switch/);
assert.match(css,/ak23-result-card/);
assert.match(css,/\.v14-group-card \.table-scroll\{overflow-x:visible/);
assert.match(css,/\.ak23-match \.ak23-vs/);
assert.match(fs.readFileSync('app/version/page.tsx','utf8'),/FIX23/);
console.log('OK FIX23: codici W/L/GF, una panoramica, card VS, gironi, calendario e risultati');
