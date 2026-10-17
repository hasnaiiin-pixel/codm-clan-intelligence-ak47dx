const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('app/rubrica/page.tsx'),extras=read('app/rubrica/RubricaExtras.tsx'),access=read('app/rubrica/RubricaAccessPanel.tsx'),css=read('app/globals.css'),sql=read('supabase/UPDATE_V14_2_FIX31F_WHATSAPP_RUOLI_HOTFIX.sql'),base=read('supabase/UPDATE_V14_2_FIX31E_RUBRICA_STATO_RUOLI_EXPORT_ACCESSI.sql'),sw=read('public/sw.js');
const checks=[
 ['No invalid pg_catalog.coalesce SQL function',!sql.includes('pg_catalog.coalesce')&&!base.includes('pg_catalog.coalesce')&&sql.includes('COALESCE(pg_catalog.array_length(p_roles,1),0)')],
 ['Roles saved with dedicated RPC',page.includes("supabase.rpc('ak_rubrica_set_secondary_roles'")&&sql.includes('SET secondary_roles=v_clean')],
 ['Role editor is native disclosure closed by default',page.includes('<details className="ak31f-secondary-details')&&!page.includes('open={true}')],
 ['Role selections survive disclosure',page.includes('checked={!!editing.secondary_roles?.includes(r.label)}')&&page.includes('ak31f-selected-roles')],
 ['Secondary roles do not grant app privileges',!sql.includes('clan_role=\'owner\'')],
 ['No per-contact share-phone checkbox',!page.includes('Autorizza la condivisione del numero')&&!page.includes('payload.share_phone=')],
 ['Shared export never depends on per-player phone flag',!sql.includes('c.share_phone=true')&&sql.includes("'phone',c.phone")],
 ['Server requires two staff permissions',sql.includes("ak_rubrica_allowed('export_shared') AND public.ak_rubrica_allowed('view_phone')")&&sql.includes("ak_rubrica_allowed('view_contacts')")],
 ['Exporter-only account can see export tab',page.includes("flags.export_shared&&flags.view_phone")],
 ['WhatsApp includes role, extras, phone and UID',extras.includes('🎖️ Incarichi:')&&extras.includes('👑 Ruolo:')&&extras.includes('🆔 UID:')&&extras.includes('📱 Telefono:')],
 ['WhatsApp output single block with copy control',extras.includes('setContent(text)')&&extras.includes('UN SOLO BLOCCO')&&extras.includes('clipboard.writeText(content)')],
 ['Export only active by default with all option',extras.includes('useState(true)')&&extras.includes('p_only_active:onlyActive')],
 ['Phone permissions granted explicitly to staff',access.includes("k==='export_shared'&&e.target.checked")&&access.includes('view_phone:true')],
 ['Archive/access actions collapsed on mobile',page.includes('<details className="ak31f-admin-tools"')&&page.includes('ak31f-admin-actions')],
 ['Mobile toolbar buttons not broken',css.includes('white-space:nowrap')&&css.includes('.ak31f-main-actions')&&css.includes('grid-template-columns:minmax(0,1fr) auto')],
 ['PWA cache/version bumped',sw.includes('fix31f-rubrica-export-ruoli-mobile')&&read('app/version/page.tsx').includes('FIX31F')],
 ['No personal contact data in incremental migration',!sql.includes('INSERT INTO public.ak_rubrica_contacts')],
 ['Visitors still never expose telephone',!base.slice(base.indexOf('CREATE OR REPLACE FUNCTION public.ak_rubrica_public_directory()'),base.indexOf('CREATE OR REPLACE FUNCTION public.ak_rubrica_export(')).includes('c.phone')],
];
for(const [label,ok] of checks)assert.ok(ok,`FIX31F failed: ${label}`);
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
for(const file of ['app/rubrica/page.tsx','app/rubrica/RubricaExtras.tsx','app/rubrica/RubricaAccessPanel.tsx','app/version/page.tsx']){
 const tree=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(tree.parseDiagnostics.length,0,`TSX parse error ${file}: ${tree.parseDiagnostics.map(d=>d.messageText).join('; ')}`);
}
console.log(`FIX31F: ${checks.length} feature/access-control checks passed + TSX parser passed`);
