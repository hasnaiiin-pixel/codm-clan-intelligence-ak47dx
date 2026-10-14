/** Nomi locali e innocui: non sono tag giocatore e non modificano gli iscritti. */
export const NAME_CATEGORIES = [
  {id:'animali',label:'🐺 Animali', names:['Lupi Lunari','Pantere Ombra','Aquile Reali','Volpi Veloci','Tigri Selvagge','Orsi Polari','Falchi Ribelli','Cobra Sprint','Leoni Rampanti','Pinguini Tattici','Gatti Ninja','Corvi Notturni','Squali Urbani','Tori Fulmine','Lontre Audaci','Ricci Ribelli']},
  {id:'motori',label:'🏎️ Auto e motori', names:['Turbo Rossi','Bolidi Notturni','Pistoni Ribelli','Drift Kings','Gomme Fumanti','Motori Furiosi','Nitro Squad','Cambio Rapido','Rally Fantasma','Spoiler Club','Cavalli Motore','Sprint GT','Quattro Ruote','Marce Ribelli','Formula Lampo','Offroad Team']},
  {id:'codm',label:'🎮 Divertenti CODM', names:['Ping Impossibile','Respawn Express','Camper in Fuga','Ultimo Caricatore','Lobby Sbagliata','Mirino Storto','Granate a Caso','Reload Infinito','No Scope Club','Rush del Lunedì','Team Lag','Headshot Mancato','Spawn Confuso','Cecchini Distratti','Primi Eliminati','Fuoco Amico']},
  {id:'simpatici',label:'😄 Nomi simpatici', names:['Banana Commando','Sparapippe','Team Biscotto','Patatine Elite','I Quasi Pro','Panda Party','Tostapane Squad','Pizza Tattica','Gli Sbadigli','Gelati Ribelli','I Disordinati','Cocomeri Sprint','Sushi Volante','Squadra Ciabatta','Pollo Tattico','Pigiama Force']},
] as const;
export type NameCategory = typeof NAME_CATEGORIES[number]['id']|'misto';
const SYMBOLS:Record<Exclude<NameCategory,'misto'>,readonly string[]>={
 animali:['🐺','🐆','🦅','🦊','🐯','🐻','🦅','🐍','🦁','🐧','🐱','🐦‍⬛','🦈','🐂','🦦','🦔'],
 motori:['🏎️','🚘','🚗','🏁','🛞','🏍️','⚡','🔧','🚙','🏎️','🐎','🏁','🚘','🚗','🏎️','🚙'],
 codm:['📶','🔁','🎯','🔫','🎮','🎯','💣','🔄','🔭','⚡','📡','🎯','🕹️','🔭','🎮','💥'],
 simpatici:['🍌','🎯','🍪','🍟','🏆','🐼','🍞','🍕','🥱','🍦','🥒','🍉','🍣','🩴','🐔','😴']
};
export function nameSuggestions(category:NameCategory,withEmoji:boolean,count:number,excluded:string[]=[],random:()=>number=Math.random):string[]{
 const clean=(value:string)=>value.replace(/^[^\p{L}\p{N}]+/u,'').trim().toLocaleLowerCase('it-IT');
 const banned=new Set(excluded.map(clean));
 const options=NAME_CATEGORIES.flatMap(c=>category==='misto'||c.id===category?c.names.map((name,index)=>({name,emoji:SYMBOLS[c.id][index]})):[]);
 const available=options.filter(x=>!banned.has(clean(x.name)));
 const output:string[]=[];
 for(let n=0;n<Math.min(Math.max(0,count),available.length);n++){
  const idx=Math.min(available.length-1,Math.max(0,Math.floor(random()*available.length)));
  const item=available.splice(idx,1)[0];output.push(withEmoji?`${item.emoji} ${item.name}`:item.name);
 }
 return output;
}
