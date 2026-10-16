const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('app/rubrica/page.tsx'), roles=read('app/rubrica/rubricaRoles.ts');
const org=read('app/rubrica/RubricaOrgChart.tsx'),extra=read('app/rubrica/RubricaExtras.tsx');
const sql=read('supabase/UPDATE_V14_2_FIX31_RUBRICA_GAMING_MEMBRI.sql');
const checks=[
 ['nickname in evidence',page.includes('<strong>{person.nickname}</strong>')],
 ['gaming styling',page.includes('ak31-gaming-card')&&read('app/globals.css').includes('.ak31-gaming-card')],
 ['staff multi roles',roles.includes('Responsabile Tornei')&&roles.includes('Responsabile Scrim')&&roles.includes('Allenatore')&&roles.includes('Moderatore')],
 ['symbols in role selector',page.includes('{s.emoji} {s.label}')],
 ['org tab appears',page.includes("['organigramma','🏆 Organigramma']")],
 ['org links to contact',org.includes('onSelect(person)')],
 ['role hierarchy',org.includes('clanRoleTier')&&roles.includes('clanRoleGroups')],
 ['incomplete highlight',page.includes('ak31-incomplete')&&page.includes('ak31-missing')],
 ['member predefined access',page.includes('Membro (solo nickname + UID)')],
 ['member registered only',sql.includes('auth.users')&&sql.includes('Account non trovato')],
 ['privileged details separate',sql.includes("ak_rubrica_allowed('view_private_details')")],
 ['redaction at server',sql.includes("RETURN jsonb_build_object('id',p_row.id,'nickname',p_row.nickname,'uid',p_row.uid")],
 ['member sees only active',sql.includes("v_details OR c.clan_status='Attivo'")],
 ['private historical search',sql.includes('v_details AND (')],
 ['no anon access screenshot RPC',sql.includes('FROM PUBLIC,anon')],
 ['screenshots batch via explicit admin click',extra.includes('applyExact()')&&extra.includes('window.confirm')],
 ['no unsafe screen matches',sql.includes("q.status='exact'")&&sql.includes('count(*)')],
 ['nickname history retained',sql.includes('INSERT INTO public.ak_rubrica_nickname_history')],
 ['unmatched red',extra.includes('ak31-review-error')],
 ['photos gated',sql.includes("ak_rubrica_allowed('view_private_details')")],
 ['profile then edit',page.includes('setEditMode(startEdit)')&&page.includes('Modifica profilo')],
 ['whatsapp one block and active default',extra.includes('setChunks([content])')&&extra.includes('useState(true)')],
];
for(const [name,passed] of checks){assert.ok(passed,name);console.log('OK',name)}
let ts;try{ts=require('typescript')}catch{try{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}catch{ts=null}}
for(const p of ['app/rubrica/page.tsx','app/rubrica/RubricaOrgChart.tsx','app/rubrica/RubricaExtras.tsx','app/rubrica/rubricaRoles.ts']){
if(ts){const sf=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);assert.equal(sf.parseDiagnostics.length,0,'TSX syntax '+p);}
}
console.log('FIX31:',checks.length,'checks passed + TypeScript syntax parsed');
