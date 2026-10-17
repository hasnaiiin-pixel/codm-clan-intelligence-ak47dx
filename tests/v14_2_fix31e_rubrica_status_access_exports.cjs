const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');const root=path.resolve(__dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const page=read('app/rubrica/page.tsx'), roles=read('app/rubrica/rubricaRoles.ts'), exp=read('app/rubrica/RubricaExtras.tsx'), access=read('app/rubrica/RubricaAccessPanel.tsx'), org=read('app/rubrica/RubricaOrgChart.tsx'), pub=read('app/rubrica/pubblica/page.tsx'), sql=read('supabase/UPDATE_V14_2_FIX31E_RUBRICA_STATO_RUOLI_EXPORT_ACCESSI.sql');
const checks=[
 ['Active grouping solely from status',page.includes("g.tier===5?!isActive(p.clan_status):isActive(p.clan_status)")],
 ['Active role 5 remains in Members',page.includes('g.tier===4?clanRoleTier(p.clan_role)>=4')],
 ['Missing phone/uid merely red',page.includes('ak31-incomplete')&&page.includes('ak31-missing')],
 ['WhatsApp attendance not used for status',!page.match(/(?:whatsapp_group|share_phone)\s*[=]===?\s*true\s*\?\s*['"]Attivo/)],
 ['Status visible selection',page.includes('Stato clan (indipendente da WhatsApp')],
 ['Multi roles on profile',page.includes('secondary_roles?.map')||page.includes('secondary_roles.map')],
 ['Multi roles write through protected RPC',page.includes("supabase.rpc('ak_rubrica_set_secondary_roles'")],
 ['Multi roles strictly secondary to main',sql.includes('btrim(v)<>COALESCE(v_main')],
 ['Clan roles do not confer app privileges',!sql.includes('clan_role=\'owner\'')],
 ['Sharing phone requires explicit consent and permission',sql.includes('c.share_phone=true')&&sql.includes("ak_rubrica_allowed('view_phone')")],
 ['Export checked on server for shared',sql.includes("ak_rubrica_allowed('export_shared')")],
 ['Export checked on server for staff',sql.includes("ak_rubrica_allowed('export_staff')")],
 ['Export one block',exp.includes('setContent(text)')&&exp.includes('UN SOLO BLOCCO')],
 ['Active export server filtered',sql.includes("lower(btrim(c.clan_status))='attivo'")&&exp.includes('p_only_active:onlyActive')],
 ['Staff export includes birth and city',exp.includes('p.birth_date')&&exp.includes('p.city')&&exp.includes('p.notes')],
 ['Export may include history with permission',sql.includes("'history',(")],
 ['Archive and restore',page.includes('ak_rubrica_archive')&&page.includes('ak_rubrica_restore')],
 ['Delete after archive only',sql.includes("RAISE EXCEPTION 'Archivia prima il contatto'")],
 ['Delete blocks orphan photos',sql.includes('storage.objects o')&&sql.includes('Foto archiviate presenti')],
 ['Admin access list with emails',sql.includes('JOIN auth.users u')&&access.includes('ak_rubrica_list_access')],
 ['Owner only grant/revoke',sql.includes('ak31e_rubrica_is_owner()')&&access.includes('ak_rubrica_revoke_access')],
 ['Visitor access default disabled',sql.includes('enabled boolean NOT NULL DEFAULT false')],
 ['Per-contact public consent default off',sql.includes('public_profile_opt_in boolean NOT NULL DEFAULT false')],
 ['Visitor anonymous rpc safe',sql.includes('TO anon,authenticated')&&pub.includes('ak_rubrica_public_directory')],
 ['Visitor never returns phone',!sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.ak_rubrica_public_directory()'),sql.indexOf('CREATE OR REPLACE FUNCTION public.ak_rubrica_export(')).includes('c.phone')],
 ['Member detail redaction',sql.includes('IF NOT public.ak_rubrica_allowed(\'view_private_details\') THEN')],
 ['Organigramma reads status',org.includes("trim().toLowerCase()==='attivo'")],
 ['More roles defined',roles.includes('Vice Capitano')&&roles.includes('Responsabile Statistiche')],
 ['Personal data not committed to source',!sql.includes('7263074356545126437')],
 ['Schema cache refreshed',sql.includes("NOTIFY pgrst,'reload schema'")],
 ['Public policy RLS enabled',sql.includes('ak_rubrica_public_settings ENABLE ROW LEVEL SECURITY')],
 ['No raw table access for visitors',sql.includes('REVOKE ALL ON public.ak_rubrica_public_settings FROM PUBLIC,anon,authenticated')],
 ['Owner cannot revoke own access',sql.includes("p_user_id=auth.uid()")],
 ['User consent verified before public publish',page.includes('public_profile_opt_in')&&page.includes('Consenso verificato')],
 ];
for(const [desc,ok] of checks)assert.ok(ok,'FIX31E '+desc);
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
for(const file of ['app/rubrica/page.tsx','app/rubrica/RubricaExtras.tsx','app/rubrica/RubricaOrgChart.tsx','app/rubrica/RubricaAccessPanel.tsx','app/rubrica/pubblica/page.tsx','app/rubrica/rubricaRoles.ts']){
 const sf=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(sf.parseDiagnostics.length,0,'Invalid TS syntax in '+file+': '+sf.parseDiagnostics.map(d=>d.messageText).join(','));
}
console.log('FIX31E: '+checks.length+' integrity/privacy checks passed + TSX parser passed');
