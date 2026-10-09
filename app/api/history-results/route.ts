import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const runtime='nodejs';
const MODES=['CED','POSTAZIONE','DOMINIO','CONTROLLO','ALTRO'];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Row={season_id:string;match_date:string;opponent:string;mode:string;map_name?:string|null;result:string;team_score:number;enemy_score:number;match_scope:string;notes?:string|null;screenshot_url?:string|null;source_key?:string|null};
export async function POST(request:NextRequest){
 try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!anon||!secret)return NextResponse.json({error:'Credenziali Supabase server non configurate'},{status:503});
  const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim();
  if(!token)return NextResponse.json({error:'Autenticazione mancante'},{status:401});
  const publicClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await publicClient.auth.getUser(token);
  if(authError||!user)return NextResponse.json({error:'Sessione scaduta'},{status:401});
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const body=await request.json();const clanId=String(body.clan_id||'');
  if(!UUID.test(clanId))return NextResponse.json({error:'Clan non valido'},{status:400});
  if(String(user.email||'').toLowerCase()!=='hasnaiiin@gmail.com'){
   const {data:membership,error:merr}=await db.from('clan_members').select('role,permissions').eq('clan_id',clanId).eq('user_id',user.id).maybeSingle();
   if(merr||!membership||!['owner','coach','staff'].includes(membership.role)||membership.permissions?.insert_results===false)return NextResponse.json({error:'Ruolo insufficiente per importare'},{status:403});
  }
  const rows=body.rows as Row[];
  if(!Array.isArray(rows)||rows.length<1||rows.length>100)return NextResponse.json({error:'Invia da 1 a 100 risultati alla volta'},{status:400});
  const {data:seasons,error:seasonError}=await db.from('codm_seasons').select('id,is_active').in('id',Array.from(new Set(rows.map(r=>r.season_id))));
  if(seasonError)throw seasonError;
  const validIds=new Set((seasons||[]).filter(s=>!s.is_active).map(s=>s.id));
  const payload=[];
  for(const [i,r] of rows.entries()){
   const opponent=String(r.opponent||'').trim(),mode=String(r.mode||'').trim().toUpperCase(),result=String(r.result||'').toUpperCase();
   const a=Number(r.team_score),b=Number(r.enemy_score);
   if(!validIds.has(r.season_id))return NextResponse.json({error:`Riga ${i+1}: scegli una stagione NON attiva`},{status:400});
   if(!opponent||opponent.length>120||!MODES.includes(mode)||!['WIN','LOSE','DRAW'].includes(result)||!['single','series'].includes(r.match_scope)||!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<0||b<0||a>9999||b>9999)return NextResponse.json({error:`Riga ${i+1}: dati incompleti o non validi`},{status:400});
   if((a>b?'WIN':a<b?'LOSE':'DRAW')!==result)return NextResponse.json({error:`Riga ${i+1}: risultato non coerente con ${a}-${b}`},{status:400});
   const dt=new Date(r.match_date);if(!Number.isFinite(dt.valueOf())||dt.valueOf()>Date.now()+86400000)return NextResponse.json({error:`Riga ${i+1}: data non valida`},{status:400});
   const sourceKey=String(r.source_key||'').trim();
   const photo=String(r.screenshot_url||'').trim();
   if(photo && (!/^https:\/\//i.test(photo)||photo.length>2000))return NextResponse.json({error:`Riga ${i+1}: il link foto deve essere HTTPS`},{status:400});
   payload.push({clan_id:clanId,season_id:r.season_id,match_date:dt.toISOString(),match_type:'scrim',mode,map_name:r.map_name||null,opponent,result,team_score:a,enemy_score:b,notes:String(r.notes||'').slice(0,1000),screenshot_url:photo||null,record_quality:'result_only',match_scope:r.match_scope,historical_source_key:sourceKey||null,created_by:user.id});
  }
  // Non sovrascrivere mai un match completo: l'import con chiave già presente viene rifiutato.
  const keys=payload.map(p=>p.historical_source_key).filter(Boolean) as string[];
  if(new Set(keys).size!==keys.length)return NextResponse.json({error:'Chiavi Excel duplicate nel lotto'},{status:409});
  if(keys.length){const {data:existing,error:e}=await db.from('matches').select('historical_source_key').eq('clan_id',clanId).in('historical_source_key',keys);if(e)throw e;if(existing?.length)return NextResponse.json({error:`Risultati già caricati (${existing.length}). Non inseriti duplicati.`},{status:409});}
  const {data,error}=await db.from('matches').insert(payload).select('id');
  if(error)throw error;
  return NextResponse.json({inserted:data?.length||0,ids:(data||[]).map(x=>x.id)});
 }catch(err){return NextResponse.json({error:err instanceof Error?err.message:'Errore importazione'},{status:500})}
}
