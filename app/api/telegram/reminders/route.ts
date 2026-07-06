import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type EventRow = {
  id: string;
  clan_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  location: string | null;
  telegram_enabled: boolean | null;
  convocations_text?: string | null;
  reminder_minutes?: number[] | null;
  sent_reminders?: Record<string, string> | null;
  telegram_message_template?: string | null;
  event_notes?: string | null;
  event_plan?: MatchPlan | null;
  reminder_2h_sent_at?: string | null;
  reminder_10m_sent_at?: string | null;
};

type MatchRound = {
  n?: number;
  matchCode?: string;
  mode?: string;
  map?: string;
  scoreType?: string;
  players?: string;
  reserves?: string;
  lobbyOpen?: string;
  meetingTime?: string;
  startTime?: string;
  bans?: string;
  status?: string;
  result?: string;
  ourScore?: string;
  opponentScore?: string;
  mvp?: string;
};
type MatchPlan = {
  teamAName?: string;
  teamBName?: string;
  lobbyTime?: string;
  roomNumber?: string;
  discordLink?: string;
  lobbyLink?: string;
  rounds?: MatchRound[];
};

const PLAN_MARKERS = ['AK_EVENT_PLAN_V6_6::', 'AK_EVENT_PLAN_V6_5::', 'AK_EVENT_PLAN_V6_4::', 'AK_EVENT_PLAN_V6_3::', 'AK_EVENT_PLAN_V6_2::'];
const resultLabels = ['Vinto', 'Perso', 'Pareggiato'];
const statusLabels = ['Da giocare', 'Giocata', 'Risultato caricato'];
const modeLabels: Record<string, string> = {
  CED: '🎯 Cerca e Distruggi',
  POSTAZIONE: '🔥 Postazione',
  DOMINIO: '🏳️ Dominio',
  CONTROL: '🛡️ Control',
  'DM DEATH MATCH': '⚔️ Death Match',
  'PRIMA LINEA': '🚩 Prima linea',
  TDM: '💀 TDM',
  BR: '🪂 Battle Royale',
  SCRIM: '🎮 Scrim libero',
};

function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error('Mancano TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID.');
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`Telegram HTTP ${response.status}: ${await response.text()}`);
}

function safeHtml(value: string | null | undefined) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function scoreNumber(value: string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}
function matchOutcome(round: MatchRound) {
  const our = scoreNumber(round.ourScore);
  const opponent = scoreNumber(round.opponentScore);
  if (our !== null && opponent !== null) {
    if (our > opponent) return 'Vinto';
    if (our < opponent) return 'Perso';
    return 'Pareggiato';
  }
  if (round.result && resultLabels.includes(round.result)) return round.result;
  return '';
}
function matchStatus(round: MatchRound) {
  if (round.status && statusLabels.includes(round.status)) return round.status;
  if (scoreNumber(round.ourScore) !== null && scoreNumber(round.opponentScore) !== null) return 'Risultato caricato';
  if (round.result && resultLabels.includes(round.result)) return 'Risultato caricato';
  if (round.result && statusLabels.includes(round.result)) return round.result;
  return 'Da giocare';
}
function extractPlanFromNotes(notes?: string | null): MatchPlan | null {
  const raw = String(notes || '');
  const marker = PLAN_MARKERS.find((entry) => raw.includes(entry));
  if (!marker) return null;
  try {
    const json = raw.slice(raw.indexOf(marker) + marker.length);
    return JSON.parse(json) as MatchPlan;
  } catch {
    return null;
  }
}
function buildMatchDetailsHtml(event: EventRow) {
  const plan = event.event_plan || extractPlanFromNotes(event.event_notes);
  const rounds = plan?.rounds || [];
  if (!rounds.length) return 'Partite da confermare.';
  return rounds.map((round, index) => {
    const n = round.n || index + 1;
    const mode = modeLabels[round.mode || ''] || safeHtml(round.mode || 'Modalità da decidere');
    const outcome = matchOutcome(round);
    const lines = [
      `<b>Partita ${n}</b> · ID ${safeHtml(round.matchCode || '-')} · ${mode}`,
      `Mappa: ${safeHtml(round.map || 'Da decidere')}`,
      `Ritrovo: ${safeHtml(round.meetingTime || '-')} · Lobby: ${safeHtml(round.lobbyOpen || plan?.lobbyTime || '-')} · Start: ${safeHtml(round.startTime || '-')}`,
      `Stato: ${safeHtml(matchStatus(round))}${outcome ? ` · Esito: ${safeHtml(outcome)}` : ''}`,
      round.ourScore || round.opponentScore ? `Score: ${safeHtml(round.ourScore || '-')} - ${safeHtml(round.opponentScore || '-')}` : '',
      round.players ? `Titolari: ${safeHtml(round.players)}` : '',
      round.reserves ? `Riserve: ${safeHtml(round.reserves)}` : '',
      round.bans ? `🚫 BAN: ${safeHtml(round.bans)}` : '',
      round.mvp ? `MVP: ${safeHtml(round.mvp)}` : '',
    ];
    return lines.filter(Boolean).join('\n');
  }).join('\n\n');
}

function renderReminderText(event: EventRow, minutes: number) {
  const when = new Date(event.starts_at).toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
  const convocati = event.convocations_text?.trim() || 'Da confermare';
  const matchDetails = buildMatchDetailsHtml(event);
  const template = event.telegram_message_template || '🎮 <b>Clan Manager Evento</b>\n\n<b>{title}</b>\n⏱️ Mancano {minutes} minuti\n🕒 {date}\n📍 {location}\n\n<b>Dettaglio partite:</b>\n{match_details}\n\n<b>Convocati:</b>\n{convocati}\n\n{description}';
  return template
    .replaceAll('{title}', safeHtml(event.title))
    .replaceAll('{minutes}', String(minutes))
    .replaceAll('{date}', safeHtml(when))
    .replaceAll('{location}', safeHtml(event.location || 'CODM'))
    .replaceAll('{description}', safeHtml(event.description || 'Preparati per evento clan.'))
    .replaceAll('{convocati}', safeHtml(convocati))
    .replaceAll('{match_details}', matchDetails);
}


async function createInAppReminderNotifications(supabase: ReturnType<typeof serverSupabase>, event: EventRow, minutes: number, text: string) {
  try {
    const { data: eventPlayers } = await supabase
      .from('codm_event_players')
      .select('player_id,nickname')
      .eq('event_id', event.id);

    const playerIds = (eventPlayers || []).map((row: any) => row.player_id).filter(Boolean);
    let userIds: string[] = [];

    if (playerIds.length) {
      const { data: linkedPlayers } = await supabase
        .from('players')
        .select('id,user_id')
        .in('id', playerIds);
      userIds = (linkedPlayers || []).map((row: any) => row.user_id).filter(Boolean);
    }

    // Se non ci sono convocati collegati a utenti, notifica staff/coach/owner del clan.
    if (!userIds.length) {
      const { data: members } = await supabase
        .from('clan_members')
        .select('user_id,role')
        .eq('clan_id', event.clan_id)
        .in('role', ['owner', 'coach', 'staff']);
      userIds = (members || []).map((row: any) => row.user_id).filter(Boolean);
    }

    userIds = Array.from(new Set(userIds));
    if (!userIds.length) return;

    const { data: prefsRows } = await supabase
      .from('codm_notification_preferences')
      .select('user_id,inapp_enabled,notification_reminders')
      .in('user_id', userIds);
    const prefs = new Map((prefsRows || []).map((row: any) => [row.user_id, row]));

    const rows = userIds
      .filter((userId) => {
        const pref = prefs.get(userId);
        return !pref || (pref.inapp_enabled !== false && pref.notification_reminders !== false);
      })
      .map((userId) => ({
        clan_id: event.clan_id,
        user_id: userId,
        type: 'event_reminder',
        title: `Reminder ${minutes}m: ${event.title}`,
        body: text.replace(/<[^>]*>/g, '').slice(0, 1200),
        metadata: { event_id: event.id, minutes },
        dedupe_key: `event:${event.id}:reminder:${minutes}`,
      }));

    if (rows.length) {
      await supabase.from('codm_notifications').upsert(rows, { onConflict: 'user_id,dedupe_key' });
    }
  } catch {
    // Le notifiche in-app non devono bloccare Telegram.
  }
}

function normalizeReminderMinutes(event: EventRow) {
  const raw = Array.isArray(event.reminder_minutes) && event.reminder_minutes.length ? event.reminder_minutes : [120, 10];
  return Array.from(new Set(raw.map(Number).filter((n) => Number.isFinite(n) && n > 0 && n <= 10080))).sort((a, b) => b - a);
}

async function processReminders() {
  const supabase = serverSupabase();
  const now = new Date();
  const maxWindow = 7 * 24 * 60 * 60 * 1000;
  const until = new Date(now.getTime() + maxWindow).toISOString();

  const { data, error } = await supabase
    .from('codm_events')
    .select('id,clan_id,title,description,starts_at,location,telegram_enabled,convocations_text,reminder_minutes,sent_reminders,telegram_message_template,event_notes,event_plan,reminder_2h_sent_at,reminder_10m_sent_at')
    .eq('telegram_enabled', true)
    .gte('starts_at', now.toISOString())
    .lte('starts_at', until)
    .order('starts_at', { ascending: true });
  if (error) throw error;

  const sent: string[] = [];
  const checked: string[] = [];
  const events = (data || []) as EventRow[];
  for (const event of events) {
    const diffMinutes = Math.round((new Date(event.starts_at).getTime() - now.getTime()) / 60000);
    const sentMap = event.sent_reminders || {};
    for (const minutes of normalizeReminderMinutes(event)) {
      const key = String(minutes);
      checked.push(`${event.title}:${minutes}m:${diffMinutes}m_left`);
      // Finestra generosa: il cron gira ogni 10 minuti, quindi manda se siamo tra N e N-10 minuti.
      const inWindow = diffMinutes <= minutes && diffMinutes >= Math.max(0, minutes - 10);
      if (!sentMap[key] && inWindow) {
        const reminderText = renderReminderText(event, minutes);
        await sendTelegram(reminderText);
        await createInAppReminderNotifications(supabase, event, minutes, reminderText);
        sentMap[key] = new Date().toISOString();
        const updatePayload: Record<string, any> = { sent_reminders: sentMap };
        if (minutes === 120 && !event.reminder_2h_sent_at) updatePayload.reminder_2h_sent_at = sentMap[key];
        if (minutes === 10 && !event.reminder_10m_sent_at) updatePayload.reminder_10m_sent_at = sentMap[key];
        await supabase.from('codm_events').update(updatePayload).eq('id', event.id);
        sent.push(`${event.title}:${minutes}m`);
      }
    }
  }
  return { sent, checked };
}

export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const given = request.nextUrl.searchParams.get('secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (secret && given !== secret) return NextResponse.json({ ok: false, error: 'Unauthorized cron secret.' }, { status: 401 });
    const result = await processReminders();
    return NextResponse.json({ ok: true, sent: result.sent, count: result.sent.length, checked: result.checked });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Errore reminder Telegram.' }, { status: 500 });
  }
}
