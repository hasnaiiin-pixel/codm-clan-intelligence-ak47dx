const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const page=read('app/rubrica/page.tsx'),city=read('app/rubrica/RubricaCitySearch.tsx'),map=read('app/rubrica/RubricaCityMap.tsx'),extra=read('app/rubrica/RubricaExtras.tsx'),sql=read('supabase/UPDATE_V14_2_FIX31B_RUBRICA_MAPPA_SCREENSHOT.sql');
const checks=[
 ['city searched, selected, not free-text',city.includes('geocoding-api.open-meteo.com')&&page.includes("['city','province','country'].includes(key)")],
 ['save coordinates and consent through protected RPC',page.includes("supabase.rpc('ak_rubrica_set_map_location'")&&sql.includes("ak_rubrica_allowed('edit_contacts')")],
 ['private city coordinates',sql.includes('city_lat double precision')&&sql.includes('city_lon double precision')],
 ['map only opted-in coordinates',map.includes('p.map_opt_in===true')&&map.includes('p.city_lat')&&map.includes('p.city_lon')],
 ['genuine basemap attribution',map.includes('tile.openstreetmap.org')&&map.includes('openstreetmap.org/copyright')],
 ['missing data explained',map.includes('Senza città')&&map.includes('Città non autorizzate')],
 ['screenshot proposals loaded on explicit action',extra.includes("supabase.rpc('ak_rubrica_seed_screenshot_names')")&&extra.includes('Carica i nickname')],
 ['screenshot proposals private',sql.includes("ak_rubrica_allowed('manage_access')")&&sql.includes('REVOKE ALL ON FUNCTION public.ak_rubrica_seed_screenshot_names()')],
 ['previous names preserved on apply',read('supabase/UPDATE_V14_2_FIX31_RUBRICA_GAMING_MEMBRI.sql').includes('INSERT INTO public.ak_rubrica_nickname_history')],
 ['no overwrite of UID or phones during screenshot seed',!sql.includes('UPDATE public.ak_rubrica_contacts SET nickname')],
 ['version marker updated',read('app/version/page.tsx').includes('FIX31B')]
];for(const [name,pass] of checks){assert.ok(pass,'FIX31B failed: '+name);console.log('OK',name)}
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}for(const f of ['app/rubrica/page.tsx','app/rubrica/RubricaExtras.tsx','app/rubrica/RubricaCitySearch.tsx','app/rubrica/RubricaCityMap.tsx']){const sf=ts.createSourceFile(f,read(f),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);assert.equal(sf.parseDiagnostics.length,0,'TSX syntax error: '+f)}
console.log(`FIX31B: ${checks.length} checks passed + TSX parse`);
