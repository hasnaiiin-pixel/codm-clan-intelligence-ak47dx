'use client';
import {useMemo,useState} from 'react';
import {MapPin,Map as MapIcon} from 'lucide-react';
export type MapContact={id?:string;nickname:string;city?:string|null;country?:string|null;city_lat?:number|null;city_lon?:number|null;map_opt_in?:boolean};
const W=760,H=370;
const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
function mercator(lat:number,lon:number,z:number){const scale=256*2**z;const a=clamp(lat,-85,85)*Math.PI/180;return {x:(lon+180)/360*scale,y:(1-Math.log(Math.tan(a)+1/Math.cos(a))/Math.PI)/2*scale};}
export default function RubricaCityMap({people}:{people:MapContact[]}){
 const [active,setActive]=useState<string|null>(null);
 const pins=useMemo(()=>people.filter((p):p is MapContact & {city_lat:number;city_lon:number}=>p.map_opt_in===true&&!!p.city&&!!p.country&&typeof p.city_lat==='number'&&Number.isFinite(p.city_lat)&&typeof p.city_lon==='number'&&Number.isFinite(p.city_lon)&&Math.abs(p.city_lat)<=85&&Math.abs(p.city_lon)<=180),[people]);
 const prep=useMemo(()=>{
  if(!pins.length)return null;
  // World-wrap not needed for this clan-size view; bbox is fitted with safe minimum zoom.
  let zoom=2;for(let z=2;z<=11;z++){
   const m=pins.map(p=>mercator(p.city_lat,p.city_lon,z));const w=Math.max(...m.map(x=>x.x))-Math.min(...m.map(x=>x.x));const h=Math.max(...m.map(x=>x.y))-Math.min(...m.map(x=>x.y));if(w<W-155&&h<H-100)zoom=z;else break;
  }
  const m=pins.map(p=>mercator(p.city_lat,p.city_lon,zoom));const cx=(Math.min(...m.map(x=>x.x))+Math.max(...m.map(x=>x.x)))/2;const cy=(Math.min(...m.map(x=>x.y))+Math.max(...m.map(x=>x.y)))/2;
  const left=cx-W/2,top=cy-H/2;const tileX=Math.floor(left/256),tileY=Math.floor(top/256);const n=2**zoom;
  const tiles: {x:number;y:number;url:string;key:string}[]=[];
  for(let yy=tileY;yy<=Math.ceil((top+H)/256);yy++)for(let xx=tileX;xx<=Math.ceil((left+W)/256);xx++){
    if(yy<0||yy>=n)continue;tiles.push({x:xx*256-left,y:yy*256-top,url:`https://tile.openstreetmap.org/${zoom}/${((xx%n)+n)%n}/${yy}.png`,key:`${xx}_${yy}`});
  }
  return {tiles,pts:pins.map((p,i)=>({...p,x:m[i].x-left,y:m[i].y-top}))};
 },[pins]);
 const noConsent=people.filter(p=>!!p.city&&!!p.country&&!p.map_opt_in).length;
 const missingCity=people.filter(p=>!p.city||!p.country).length;
 const missingCoords=people.filter(p=>p.map_opt_in&&p.city&&p.country&&!(typeof p.city_lat==='number'&&typeof p.city_lon==='number')).length;
 return <section className="card ak30-panel"><header className="ak30-between"><div><h2>🗺️ Mappa Rubrica Clan</h2><p className="muted">Visibili solo le città autorizzate. Posizioni approssimative, nessun indirizzo o tracciamento GPS.</p></div><strong>{pins.length} posizioni</strong></header>
 {prep?<div className="ak31b-map"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Mappa dei ${pins.length} giocatori con località autorizzata`}>
 <rect width={W} height={H} fill="#203149"/>{prep.tiles.map(tile=><image key={tile.key} href={tile.url} x={tile.x} y={tile.y} width="256" height="256" preserveAspectRatio="none"/>)}
 {prep.pts.map(p=><g key={p.id||p.nickname} transform={`translate(${clamp(p.x,12,W-12)},${clamp(p.y,12,H-12)})`} onClick={()=>setActive(active===p.nickname?null:p.nickname)} style={{cursor:'pointer'}}><circle r="12" fill="#db4a44" stroke="#fff" strokeWidth="3"/><circle r="3.5" fill="white"/><text x="15" y="4" fill="#111d31" stroke="#f4f9ff" strokeWidth="4" paintOrder="stroke" fontSize="14" fontWeight="bold">{p.nickname}</text><title>{p.nickname} — {p.city}, {p.country}</title></g>)}
 </svg><small className="ak31b-map-attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a></small></div>:<div className="ak31b-map-empty"><MapIcon size={38}/><strong>Nessun giocatore visualizzabile</strong><p>Apri un profilo → Modifica → Cerca città → scegli il risultato → attiva il consenso → Salva scheda.</p></div>}
 <div className="ak30-citylist">{prep?.pts.map(p=><button type="button" className="btn secondary" key={p.id||p.nickname} onClick={()=>setActive(active===p.nickname?null:p.nickname)}><MapPin size={14}/> {p.nickname} · {p.city}{active===p.nickname?', '+p.country:''}</button>)}</div>
 <div className="ak31b-map-stats"><span>📍 Senza città: {missingCity}</span><span>🔒 Città non autorizzate: {noConsent}</span><span>⚠️ Posizioni da selezionare nuovamente: {missingCoords}</span></div>
 {missingCoords>0&&<p className="notice">Alcuni profili hanno il consenso precedente ma non le coordinate: apri il profilo, cerca e seleziona nuovamente la città, poi salva.</p>}
 </section>;
}
