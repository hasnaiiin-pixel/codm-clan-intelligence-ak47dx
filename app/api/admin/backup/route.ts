import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { gzipSync } from 'node:zlib';
export const runtime = 'nodejs';
export const maxDuration = 60;
const TABLES = ['clans','clan_members','players','matches','match_player_stats','match_scoreboard_rows','codm_events','codm_event_players','codm_notifications','codm_tournaments','codm_tournament_teams','codm_tournament_players','codm_tournament_registrations','codm_tournament_rules','codm_tournament_matches','codm_tournament_results','codm_tournament_standings','codm_tournament_files','codm_reference_data','codm_seasons'];
const LIMIT_BYTES = 24 * 1024 * 1024;
async function authorized(request: NextRequest) {
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
 if (!url || !anon || !secret) throw new Error('Variabili Supabase mancanti sul server.');
 const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i,'').trim();
 if (!token) return null;
 const publicClient = createClient(url, anon, {auth:{persistSession:false,autoRefreshToken:false}});
 const { data, error } = await publicClient.auth.getUser(token);
 if (error || data.user?.email?.toLowerCase() !== 'hasnaiiin@gmail.com') return null;
 return createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function GET(request: NextRequest) {
 try {
  const db = await authorized(request);
  if (!db) return NextResponse.json({error:'Solo amministratore principale.'},{status:403});
  const dataset: Record<string,unknown[]> = {};
  const counts: Record<string,number> = {};
  for (const table of TABLES) {
   const values: unknown[] = [];
   for(let from=0;from<100000;from+=500) {
    const {data,error}=await db.from(table).select('*').range(from,from+499);
    if(error) {
     if(table === 'codm_seasons' && /does not exist|schema cache/i.test(error.message)) break;
     throw new Error(`Impossibile leggere ${table}: ${error.message}`);
    }
    values.push(...(data||[]));
    if (JSON.stringify(values).length > LIMIT_BYTES) throw new Error(`Tabella ${table} troppo grande per esportazione web: usare pgAdmin.`);
    if((data||[]).length<500)break;
   }
   dataset[table]=values; counts[table]=values.length;
  }
  // I file fisici dello Storage non sono dentro questo archivio: il loro inventario è incluso.
  const {data: buckets, error: bucketError}=await db.storage.listBuckets();
  if(bucketError)throw bucketError;
  const storage: Record<string,unknown[]> = {};
  for(const bucket of buckets||[]) {
    const paths: unknown[]=[];
    const queue=[''];
    while(queue.length) {
      const prefix=queue.shift()!;
      for(let offset=0;offset<10000;offset+=100) {
       const {data,error}=await db.storage.from(bucket.name).list(prefix,{limit:100,offset});
       if(error)throw error;
       for(const file of data||[]) {
         const path=prefix ? `${prefix}/${file.name}` : file.name;
         if(!file.id) queue.push(path); else paths.push({path,size:file.metadata?.size||null});
       }
       if((data||[]).length<100)break;
      }
    }
    storage[bucket.name]=paths;
  }
  const archive={format:'AK47DX-APPLICATION-DATA-V14',created_at:new Date().toISOString(),warning:'Archivio dati applicativi e inventario Storage; non contiene auth.users, password o file fisici. Non sostituisce un backup PostgreSQL + Storage.',counts,tables:dataset,storage_inventory:storage};
  const bytes=gzipSync(Buffer.from(JSON.stringify(archive),'utf8'));
  if(bytes.length > LIMIT_BYTES)throw new Error('Archivio troppo grande per download serverless: utilizzare pgAdmin.');
  return new NextResponse(new Uint8Array(bytes),{headers:{'content-type':'application/gzip','content-disposition':`attachment; filename="AK47DX_DATI_${new Date().toISOString().slice(0,10)}.json.gz"`,'cache-control':'no-store'}});
 } catch(e) {return NextResponse.json({error:e instanceof Error?e.message:'Esportazione fallita'},{status:500});}
}

// Controllo non distruttivo di un backup applicativo prima di un eventuale ripristino.
// NON esegue SQL, non modifica utenti o Storage e non scrive nel database.
export async function POST(request:NextRequest){
 try {
  const db=await authorized(request);
  if(!db)return NextResponse.json({error:'Solo amministratore principale.'},{status:403});
  const bytes=new Uint8Array(await request.arrayBuffer());
  if(bytes.byteLength>LIMIT_BYTES)return NextResponse.json({error:'Archivio troppo grande'},{status:413});
  const {gunzipSync}=await import('node:zlib');
  const uncompressed=gunzipSync(bytes,{maxOutputLength:LIMIT_BYTES});
  const archive=JSON.parse(uncompressed.toString('utf8')) as Record<string,unknown>;
  if(archive.format!=='AK47DX-APPLICATION-DATA-V14'||!archive.tables||typeof archive.tables!=='object'||!archive.counts||typeof archive.counts!=='object')return NextResponse.json({error:'Formato backup non compatibile'},{status:400});
  const tables=archive.tables as Record<string,unknown>;
  for(const [key,value] of Object.entries(tables))if(!Array.isArray(value)||value.length>100000)return NextResponse.json({error:`Tabella ${key} non valida`},{status:400});
  return NextResponse.json({valid:true,created_at:archive.created_at,counts:archive.counts,storageInventory:archive.storage_inventory?Object.keys(archive.storage_inventory as Record<string,unknown>):[],warning:'VERIFICA SOLTANTO: questo archivio non include i file fisici Storage, i ruoli PostgreSQL o gli account Auth. Nessun dato è stato ripristinato.'});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'File backup non valido'},{status:400})}
}
