const fs=require('fs'),path=require('path'),assert=require('assert');const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const roles=read('app/rubrica/rubricaRoles.ts');const page=read('app/rubrica/page.tsx'),extra=read('app/rubrica/RubricaExtras.tsx'),sql=read('supabase/UPDATE_V14_2_FIX30_RUBRICA_PRO.sql'),loader=read('supabase/UPDATE_V14_2_FIX30_NOMI_SCREENSHOT_PREVIEW.sql'),css=read('app/globals.css');
const tests=[
['roles hierarchy grouped',roles.includes('Fondatori e Capo Clan')&&roles.includes('Staff e Responsabili')],
['legacy status preserved',roles.includes('Direzione / Staff da definire')],
['photo preview separate',page.includes('photos.codm')&&page.includes('photos.personal')],
['private photo storage',page.includes("supabase.storage.from('ak-rubrica-private')")],
['photo uploads restricted',page.includes("image/png")&&page.includes('3*1024*1024')],
['birthdays tabs',page.includes("section==='compleanni'")&&extra.includes('RubricaBirthdayCalendar')],
['calendar no invented births',extra.includes('birthParts')],
['map privacy opt-in',read('app/rubrica/RubricaCityMap.tsx').includes('p.map_opt_in===true')&&page.includes('Mostra il nickname')],
['map no address GPS',read('app/rubrica/RubricaCityMap.tsx').includes('nessun indirizzo')||read('app/rubrica/RubricaCityMap.tsx').includes('nessun indirizzo'.replace('nessun','Nessun'))],
['export complete workbook',extra.includes('Excel completo Admin')&&extra.includes('Storico nickname')],
['export shared workbook',extra.includes('Excel condivisibile')],
['share phone opt-in',extra.includes('p.share_phone')&&page.includes('Autorizza la condivisione')],
['whatsapp single block',extra.includes('setChunks([content])')&&extra.includes('unico testo')],
['roles distinct contacts',sql.includes('public.ak_rubrica_contacts')&&!sql.includes('DROP TABLE')],
['private bucket',sql.includes("'ak-rubrica-private',false")],
['private RLS image select',sql.includes('public.ak_rubrica_allowed')&&sql.includes('CREATE POLICY ak30_rubrica_photo_read')],
['no anon permissions new rpc',sql.includes('FROM PUBLIC,anon')],
['screenshot review admin only',sql.includes("ak_rubrica_allowed('manage_access')")],
['nickname history on accept',sql.includes('INSERT INTO public.ak_rubrica_nickname_history')],
['no UID or phone in screenshot insert',!loader.includes('348 774')&&!loader.includes('6870522628097638401')],
['user confirms matching',extra.includes('p_display_name')&&extra.includes('RubricaMatchReview')],
['bulk images pending only safe',extra.includes("['exact','applied'].includes(x.status)")],
['photo client render dynamic',page.includes('createSignedUrl')],
['secure read no direct table client',!page.includes(".from('ak_rubrica_contacts')")],
['layout mobile',css.includes('.ak30-role-section')&&css.includes('@media(max-width:600px)')],
];
for(const [name,result] of tests){assert(result,'FIX30 failed: '+name);console.log('OK',name)}
console.log('FIX30:',tests.length,'checks passed');
