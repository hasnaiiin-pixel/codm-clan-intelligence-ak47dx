// npm run test:bracket64 — deterministic structural and progression tests for N=5..64.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require('typescript');
const target=path.join(__dirname,'../src/lib/advancedBracket.ts');
const compiled=ts.transpileModule(fs.readFileSync(target,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},fileName:target}).outputText;
const mod={exports:{}};vm.runInNewContext(compiled,{module:mod,exports:mod.exports,require,console,Date,Set,Map,Error,Math,Number,Array,String,Object}, {filename:'advancedBracket.js'});
const {buildAdvancedBracket,resolveBracket,validateBracketResult,autoCapacity,seedSlots}=mod.exports;
let checked=0;
for(let n=5;n<=64;n++){
  const teams=Array.from({length:n},(_,i)=>({id:`id${i+1}`,name:`Team ${i+1}`,seed:i+1}));
  for(const cap of [8,16,32,64].filter(c=>c>=n)){
    const plan=buildAdvancedBracket(teams,cap); const winners=plan.matches.filter(x=>x.lane==='W'),losers=plan.matches.filter(x=>x.lane==='L');
    assert.equal(winners.length,n-1);assert.equal(losers.length,n-3);assert.equal(plan.matches.length,2*n-3);
    assert.equal(plan.byes,cap-n);assert.equal(plan.matches.filter(m=>[m.a,m.b].some(s=>s.ref==='BYE')).length,0);
    assert.equal(plan.matches.filter(m=>m.lane==='GF').length,1);
    assert.equal(winners.at(-1).loserTo,null);
    const reachable=new Set(plan.matches.map(x=>x.key));
    for(const m of plan.matches)for(const source of [m.a,m.b])if(source.type!=='team')assert(reachable.has(source.ref));
    let results={};
    for(let iteration=0;iteration<2*n;iteration++){
      let state=resolveBracket(plan,results),added=0;
      for(const m of plan.matches){const match=state.get(m.key);if(!results[m.key]&&match.teamA&&match.teamB){results[m.key]=m.bestOf===3?{scoreA:2,scoreB:1}:{scoreA:1,scoreB:0};added++}}
      if(!added)break;
    }
    const final=resolveBracket(plan,results).get('GF-BO3');
    assert(final.completed&&final.winner&&final.loser);
    assert.equal(Object.keys(results).length,2*n-3);
    const champ=plan.teams.find(t=>t.id===final.winner);assert(champ);
    assert.throws(()=>validateBracketResult(plan,results,'GF-BO3',1,1));
    checked++;
  }
}
assert.equal(seedSlots(8).join(','),'1,8,4,5,2,7,3,6');
assert.equal(autoCapacity(11),16);assert.equal(autoCapacity(23),32);assert.equal(autoCapacity(37),64);assert.equal(autoCapacity(53),64);
for(const n of [11,23,37,53]){
  const plan=buildAdvancedBracket(Array.from({length:n},(_,i)=>({id:String(i+1),name:`T${i+1}`,seed:i+1})));
  assert.equal(plan.matches.length,2*n-3);
}
console.log(`OK: ${checked} diverse configurazioni 5–64; Winners/Losers/GF, BYE, avanzamenti, grand final, teste di serie, 11/23/37/53`);
