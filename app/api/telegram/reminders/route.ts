import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramReminder, plainTextFromTelegramHtml } from '@/lib/server/codmTelegram';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type EventRow = {
  id: string;
  clan_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at?: string | null;
  location: string | null;
  event_type?: string | null;
  type?: string | null;
  telegram_enabled: boolean | null;
  google_calendar_url?: string | null;
  convocations?: any[] | null;
  convocations_text?: string | null;
  reminder_minutes?: number[] | null;
  sent_reminders?: Record<string, string> | null;
  telegram_message_template?: string | null;
  event_notes?: string | null;
  event_plan?: any | null;
};

function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function normalizeReminderMinutes(event: EventRow) {
  const raw = Array.isArray(event.reminder_minutes) && event.reminder_minutes.length ? event.reminder_minutes : [120, 60, 30, 10, 0];
  return Array.from(new Set(raw.map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n <= 43200))).sort((a, b) => b - a);
}

function reminderLabel(minutes: number) {
  if (minutes === 0) return 'iniziato';
  if (minutes % 1440 === 0) return `${minutes / 1440}g`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}

async function createInAppReminderNotifications(supabase: ReturnType<typeof serverSupabase>, event: EventRow, minutes: number, htmlText: string) {
  try {
    const { data: members } = await supabase
      .from('clan_members')
      .select('user_id,role')
      .eq('clan_id', event.clan_id)
      .in('role', ['owner', 'coach', 'staff', 'player']);
    const userIds = Array.from(new Set((members || []).map((row: any) => row.user_id).filter(Boolean)));
    if (!userIds.length) return;
    const rows = userIds.map((userId) => ({
      clan_id: event.clan_id,
      user_id: userId,
      event_id: event.id,
      type: minutes === 0 ? 'event_started' : 'event_reminder',
      title: minutes === 0 ? `Evento iniziato: ${event.title}` : `Reminder ${reminderLabel(minutes)}: ${event.title}`,
      body: plainTextFromTelegramHtml(htmlText).slice(0, 1200),
      message: plainTextFromTelegramHtml(htmlText).slice(0, 1200),
      metadata: { event_id: event.id, minutes, reminder_label: reminderLabel(minutes) },
      dedupe_key: `event:${event.id}:reminder:${minutes}`,
      read_at: null,
      created_at: new Date().toISOString(),
    }));
    await supabase.from('codm_notifications').upsert(rows, { onConflict: 'user_id,dedupe_key' });
  } catch {
    // Notifiche app non devono bloccare Telegram.
  }
}

function inReminderWindow(diffMinutes: number, minutes: number) {
  // Vercel cron ogni 10 minuti: finestra da N a N-10. Per evento iniziato: da 0 a -10.
  if (minutes === 0) return diffMinutes <= 0 && diffMinutes >= -10;
  return diffMinutes <= minutes && diffMinutes >= Math.max(0, minutes - 10);
}

async function processReminders() {
  const supabase = serverSupabase();
  const now = new Date();
  const from = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('codm_events')
    .select('id,clan_id,title,description,starts_at,ends_at,location,event_type,type,telegram_enabled,google_calendar_url,convocations,convocations_text,reminder_minutes,sent_reminders,telegram_message_template,event_notes,event_plan')
    .eq('telegram_enabled', true)
    .gte('starts_at', from)
    .lte('starts_at', until)
    .order('starts_at', { ascending: true });
  if (error) throw error;

  const sent: string[] = [];
  const checked: string[] = [];
  for (const event of ((data || []) as EventRow[])) {
    const startTime = new Date(event.starts_at).getTime();
    if (Number.isNaN(startTime)) continue;
    const diffMinutes = Math.round((startTime - now.getTime()) / 60000);
    const sentMap = event.sent_reminders || {};
    for (const minutes of normalizeReminderMinutes(event)) {
      const key = minutes === 0 ? 'started' : String(minutes);
      checked.push(`${event.title}:${reminderLabel(minutes)}:${diffMinutes}m_left`);
      if (sentMap[key] || !inReminderWindow(diffMinutes, minutes)) continue;
      const telegram = await sendTelegramReminder(event, minutes);
      if (!telegram.ok && !telegram.skipped) throw new Error(telegram.error || 'Telegram reminder non inviato.');
      const htmlText = (await import('@/lib/server/codmTelegram')).renderProfessionalEventTelegram(event, minutes === 0 ? 'started' : 'reminder', { minutes });
      await createInAppReminderNotifications(supabase, event, minutes, htmlText);
      sentMap[key] = new Date().toISOString();
      await supabase.from('codm_events').update({ sent_reminders: sentMap, updated_at: new Date().toISOString() }).eq('id', event.id);
      sent.push(`${event.title}:${reminderLabel(minutes)}`);
    }
  }
  return { sent, checked };
}

export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const given = request.nextUrl.searchParams.get('secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const vercelCron = request.headers.get('x-vercel-cron') === '1' || String(request.headers.get('user-agent') || '').toLowerCase().includes('vercel');
    if (secret && given !== secret && !vercelCron) return NextResponse.json({ ok: false, error: 'Unauthorized cron secret.' }, { status: 401 });
    const result = await processReminders();
    return NextResponse.json({ ok: true, sent: result.sent, count: result.sent.length, checked: result.checked });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Errore reminder Telegram.' }, { status: 500 });
  }
}
