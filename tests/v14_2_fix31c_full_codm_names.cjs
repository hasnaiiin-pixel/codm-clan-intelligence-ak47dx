const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sql=read('supabase/UPDATE_V14_2_FIX31C_NICKNAME_CODM_COMPLETI.sql');const ui=read('app/rubrica/RubricaExtras.tsx');
const checks=[
['strips initial AK prefix with decorative chars only',sql.includes("'^(AK|ѦҞ)[^A-Z0-9]+'")],
['normalizes punctuation for matching',sql.includes("'[^A-Z0-9]', '', 'g'")],
['uses unique canonical match',sql.includes('v_count=1')&&sql.includes('length(public.ak_rubrica_codm_key(v.source_name))>=3')],
['preserves existing verified decorative tag',sql.includes('v_full:=v_current;')],
['no automatic updates from staging',!sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.ak_rubrica_prepare_codm_names()'),sql.indexOf('CREATE OR REPLACE FUNCTION public.ak_rubrica_screenshot_queue()')).includes('UPDATE public.ak_rubrica_contacts')],
['full name field staged',sql.includes('ADD COLUMN IF NOT EXISTS full_nickname')],
['includes tag proposal from screenshots',sql.includes("'AKঐ' || v.source_name")],
['bulk apply uses full nickname, not short source',sql.includes('SET nickname=s.full_nickname')&&!sql.includes('SET nickname=btrim(s.source_name)')],
['does not modify UID or phone',!sql.includes('SET uid=')&&!sql.includes('SET phone=')],
['nickname history retained',sql.includes('INSERT INTO public.ak_rubrica_nickname_history')],
['role and permissions checked at server',sql.includes("public.ak_rubrica_allowed('manage_access')")],
['protects from duplicate names',sql.includes('lower(c.nickname)=lower(s.full_nickname)')],
['frontend seeds with corrected rpc',ui.includes("supabase.rpc('ak_rubrica_prepare_codm_names')")],
['frontend applies corrected rpc',ui.includes("supabase.rpc('ak_rubrica_apply_exact_codm_names')")],
['frontend shows full nickname proposal',ui.includes('Nome CODM proposto: {x.full_nickname')],
['individual confirmation defaults to full nickname',ui.includes('item?.full_nickname??item?.source_name')],
['other unverifiable mappings left for review',sql.includes("status=CASE WHEN status='applied' AND v_current=v_full THEN 'applied' ELSE 'review' END")],
['SQL cache refresh',sql.includes("NOTIFY pgrst,'reload schema'")],
];
for(const [label,pass] of checks){assert.ok(pass,'FIX31C failed: '+label);console.log('OK',label)}
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const src=ts.createSourceFile('app/rubrica/RubricaExtras.tsx',ui,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);assert.equal(src.parseDiagnostics.length,0,'TSX parsing failed');
console.log('FIX31C:',checks.length,'checks passed + TSX parse');
