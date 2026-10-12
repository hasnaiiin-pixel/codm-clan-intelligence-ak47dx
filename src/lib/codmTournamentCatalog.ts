/** CODM multiplayer reference catalog (October 2026). Editable selection; map-mode availability
 * changes by rotation/playlist, so the administrator confirms compatibility for each mode.
 * Sources: https://callofduty.fandom.com/wiki/Call_of_Duty:_Mobile
 * and https://www.callofduty.com/mobile . Future additions can be entered manually.
 */
export const CODM_MULTIPLAYER_MAPS = [
  'Standoff','Killhouse','Nuketown','Raid','Crossfire','Crash','Hijacked','Firing Range','Takeoff',
  'Summit','Scrapyard','Cage','Meltdown','Rust','Saloon','Tunisia','Gulag Showers',
  'Highrise','Shipment 1944','Terminal','Pine','King','Hackney Yard','Nuketown Russia',
  'Reclaim','Shoot House','Shipment','Oasis','Coastal','Dome','Suldal Harbor','Docks',
  'Aniyah Incursion','Slums','Stack','Scrapyard 2019','Monastery','Hovec Sawmill',
  'Vacant','Icebreaker','Nuketown Temple','Hacienda','Hardhat','Miami Strike',
  'Satellite','Khandor Hideout','Apocalypse','Favela','Express','Haunted Hacienda',
  'Crossroads Strike','Crossroads','Diesel','Rush','Arsenal','Armada Strike','Armada',
  'Seaside','Kurohana Metropolis','Memnos Island','Miami Blitz','Atrium',
  'Nuk3town Year of the Dragon','Cheshire Park','Frequency','Collateral Strike',
  'Collateral','Combine','Chase','Infinite Shift','Zoo','Space Transfer Platform',
  'Shipment: Year of the Horse','Standoff Halloween','Winter Raid'
] as const;
export const CODM_WEAPONS:Record<string,readonly string[]> = {
  'Fucili d’assalto (AR)': [
    'M4','AK117','AK-47','Type 25','ASM10','BK57','LK24','M16','ICR-1','Man-O-War','HBRa3',
    'KN-44','HVK-30','DR-H','Peacekeeper MK2','FR .556','AS VAL','CR-56 AMAX','M13','Swordfish',
    'Kilo 141','Oden','Krig 6','EM2','Maddox','FFAR 1','Grau 5.56','Groza','Type 19','BP50',
    'LAG 53','XM4','Vargo-S','RAM-7','Lachmann-556','BAL-27'
  ],
  'Mitragliette (SMG)': [
    'RUS-79U','PDW-57','HG 40','Chicom','MSMC','Razorback','Pharo','GKS','Cordite','QQ9',
    'Fennec','AGR 556','QXR','PP19 Bizon','MX9','CBR4','PPSh-41','MAC-10','KSP 45',
    'Switchblade X9','LAPA','OTs 9','Striker 45','CX-9','TEC-9','ISO','USS 9','VMP','Sten','LC10','FSS Hurricane'
  ],
  'Mitragliatrici leggere (LMG)': [
    'RPD','M4LMG','UL736','S36','Chopper','Holger 26','Hades','PKM','Dingo','Bruen MK9',
    'MG42','RAAL MG','MG 82','DP27'
  ],
  'Cecchini': ['DL Q33','M21 EBR','Arctic .50','XPR-50','Locus','Outlaw','NA-45','Rytec AMR','SVD','Koshka','ZRG 20mm','HDR','LW3-Tundra','3-Line Rifle'],
  'Precisione (Marksman)': ['Kilo Bolt-Action','SKS','SP-R 208','MK2','Type 63','M1 Garand','SO-14'],
  'Fucili a pompa': ['BY15','Striker','HS2126','HS0405','KRM-262','Echo','R9-0','JAK-12','Argus','VLK Rogue','Einhorn Revolving','MX Guardian'],
  'Pistole / secondarie': ['MW11','J358','.50 GS','Renetti','Shorty','Crossbow','L-CAR 9','Dobvra','Nail Gun','Machine Pistol'],
  'Corpo a corpo': ['Knife','Base Melee','Axe','Baseball Bat','Katana','Shovel','Sickle','Wrench','Machete','Prizefighters','Nunchucks','Kali Sticks','Butterfly Knife','Sai','Ballistic Knife','Spear','Karambit'],
  'Lanciarazzi': ['SMRS','FHJ-18','Thumper','D13 Sector'],
};
export function randomFrom<T>(items:readonly T[]):T|null{return items.length?items[Math.floor(Math.random()*items.length)]:null;}
export function eligibleWeapons(selected:Record<string,string[]>):Array<{category:string;name:string}>{
  return Object.entries(selected).flatMap(([category,names])=>names.filter(Boolean).map(name=>({category,name})));
}
