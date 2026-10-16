const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const f=p=>fs.readFileSync(path.join(root,p),'utf8');
const sql=f('supabase/UPDATE_V14_2_FIX31D_IMPORTA_NON_ABBINATI.sql'),ui=f('app/rubrica/RubricaExtras.tsx'),page=f('app/rubrica/page.tsx');
const checks=[
 ['link/create rpc defined',sql.includes('FUNCTION public.ak_rubrica_resolve_screenshot(')],
 ['server admin permission checks',sql.includes("ak_rubrica_allowed('manage_access')")&&sql.includes("ak_rubrica_allowed('edit_contacts')")&&sql.includes("ak_rubrica_allowed('change_nickname')")],
 ['rpc unauthorized anonymous denied',sql.includes("REVOKE ALL ON FUNCTION public.ak_rubrica_resolve_screenshot(uuid,text,uuid,text) FROM PUBLIC,anon")],
 ['rpc requires selected existing contact',sql.includes('IF p_contact_id IS NULL THEN')],
 ['rpc detects duplicate normalized nickname',sql.includes('v_matches>0')&&sql.includes('ak_rubrica_codm_key(c.nickname)')],
 ['new contacts have no UID phone and pending status',sql.includes("VALUES (v_label,NULL,NULL,'Membro','Da verificare',false,false,false")],
 ['never copies contested LEXO RENDO UID',sql.includes("WHERE c.archived=false AND public.ak_rubrica_codm_key(c.nickname)='LEXO'")&&sql.includes("VALUES('AKঐLEXO',NULL,NULL")],
 ['supabase schema reload',sql.includes("NOTIFY pgrst,'reload schema'")],
 ['UID and phone marked as missing',sql.includes('MANCANTE / DA VERIFICARE')],
 ['UI selection existing',ui.includes('Seleziona un contatto esistente')&&ui.includes('Collega scheda')],
 ['UI import incomplete with admin confirmation',ui.includes('Importa come incompleto')&&ui.includes('window.confirm(msg)')],
 ['UI calls protected rpc',ui.includes("supabase.rpc('ak_rubrica_resolve_screenshot'")],
 ['UI visually flags incomplete',ui.includes('🔴 UID mancante')&&ui.includes('🔴 Telefono mancante')],
 ['UI shows conflict and review note',ui.includes('UID storico in conflitto con RENDO')&&ui.includes('x.review_note')],
 ['passes existing rubrica people',page.includes('people={items}')],
 ['no automatic overwrite of phone and UID',!sql.includes('SET phone=')&&!sql.includes('SET uid=')],
];
checks.forEach(([msg,ok])=>{assert.ok(ok,'FIX31D FAIL '+msg);});
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
for(const name of ['app/rubrica/page.tsx','app/rubrica/RubricaExtras.tsx']){let res=ts.createSourceFile(name,f(name),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);assert.equal(res.parseDiagnostics.length,0,name+' TSX parse');}
console.log('FIX31D: '+checks.length+' checks passed; TypeScript TSX syntax passed');
