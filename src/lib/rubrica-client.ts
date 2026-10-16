import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;
export function rubricaClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Configura NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabase) supabase = createClient(url, key);
  return supabase;
}

export const GROUPS = [
  ['principale', 'Clan principale'], ['secondario', 'Clan secondario'],
  ['inattivo', 'Inattivi'], ['ex', 'Ex membri'], ['altro', 'Altri contatti']
] as const;
export type Group = (typeof GROUPS)[number][0];
export type Permission = 'view' | 'edit' | 'nick' | 'export' | 'private' | 'manage';
export type Presence = 'da_verificare'|'attivo'|'non_in_clan';
export const PRESENCES: [Presence,string][] = [['da_verificare','Da verificare'],['attivo','Attivo'],['non_in_clan','Non in clan']];
export type Contact = {
  presence_status:Presence; whatsapp_group_member:boolean|null; deleted_at:string|null; source_ref:string|null;
  id: string; nickname: string; uid: string | null; status: Group;
  clan_role: string; joined_on: string | null; avatar_path: string | null;
  created_at?: string; updated_at?: string;
};
export type Personal = {
  contact_id: string; whatsapp_contact:string; map_lat:number|null; map_lon:number|null; map_opt_in:boolean; first_name: string; last_name: string; alias: string;
  phone: string; phone_share_approved:boolean; phone_share_approved_at:string|null; phone_share_approved_by:string|null; second_phone: string; city: string; country: string; province: string;
  birth_day: number | null; birth_month: number | null; birth_year: number | null;
  notes: string; private_photo_path: string | null;
};
export type NickHistory = {
  id: number; contact_id: string; old_nickname: string; new_nickname: string;
  changed_at: string; changed_by: string | null;
};
export const emptyPersonal = (contactId=''): Personal => ({
  contact_id: contactId, whatsapp_contact:'',map_lat:null,map_lon:null,map_opt_in:false, first_name: '', last_name: '', alias: '', phone: '', second_phone: '',
  phone_share_approved:false,phone_share_approved_at:null,phone_share_approved_by:null,city: '', country: '', province: '', birth_day: null, birth_month: null, birth_year: null,
  notes: '', private_photo_path: null
});
export function normalizeText(value: unknown): string {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('it-IT').trim();
}
export function showBirth(p?: Personal) {
  if (!p?.birth_day || !p?.birth_month) return '—';
  return [String(p.birth_day).padStart(2,'0'),String(p.birth_month).padStart(2,'0'),p.birth_year ?? ''].filter(Boolean).join('/');
}
export function nextBirthday(p?:Personal): number {
  if (!p?.birth_day || !p?.birth_month) return 999;
  const now=new Date(); const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let next=new Date(now.getFullYear(),p.birth_month-1,p.birth_day);
  if(next<today)next=new Date(now.getFullYear()+1,p.birth_month-1,p.birth_day);
  return Math.round((next.getTime()-today.getTime())/86400000);
}

export type RubricaEvent={ id:string;title:string;description:string;starts_on:string;ends_on:string;yearly:boolean;created_at:string; };
export type RubricaNotice={id:string;role_id:string;kind:'birthday'|'event';title:string;occasion_date:string;days_before:number;created_at:string;};

// Ruolo NEL CLAN (non coincide con il ruolo di autorizzazione dell'account del sito).
export const CLAN_ROLES = [
 ['','Da assegnare','◯'],
 ['capo_clan','Capo Clan','👑'],
 ['co_capo','Co-Capo Clan','⭐'],
 ['vice_capo','Vice Capo','🛡️'],
 ['staff','Staff','🔧'],
 ['membro','Membro','🎮'],
 ['dirigenza_da_verificare','Direzione / Staff da definire','👑'],
 ['dirigenza_staff_da_definire','Direzione / Staff: Capo, Co-Capo, Vice o Staff da assegnare','👑'],
] as const;
export function clanRoleInfo(v:string){
 if(v === 'Capo / Co-capo / Vicecapo (da verificare)') return CLAN_ROLES[7];
 if(v === 'dirigenza_da_verificare') return CLAN_ROLES[7];
 return CLAN_ROLES.find(r=>r[0]===v) || CLAN_ROLES[0];
}

/** Crea il link diretto alla chat. Il chiamante DEVE prima superare il controllo di accesso
 * al telefono (private oppure export+numero condivisibile autorizzato).
 * Non aggiunge automaticamente un prefisso internazionale su numeri ambigui.
 */
export function whatsappChatUrl(phone: string | null | undefined): string | null {
 const raw = (phone || '').normalize('NFKC').trim();
 if (!raw) return null;
 const cleaned = raw.replace(/[\s\u200b-\u200f\u202a-\u202e()\-.]/g, '');
 let digits = '';
 if (/^\+[1-9]\d{6,14}$/.test(cleaned)) digits=cleaned.slice(1);
 else if (/^00[1-9]\d{6,14}$/.test(cleaned)) digits=cleaned.slice(2);
 else if (/^3\d{9}$/.test(cleaned)) digits='39'+cleaned; // mobile italiano, es. 3xxxxxxxxx
 else if (/^39\d{10}$/.test(cleaned)) digits=cleaned;
 // Il numero deve essere coerente con il formato internazionale E.164 (max 15 cifre).
 if (!/^[1-9]\d{6,14}$/.test(digits)) return null;
 return `https://wa.me/${digits}`;
}
