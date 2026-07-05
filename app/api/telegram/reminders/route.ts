import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  location: string | null;
  reminder_2h_sent_at: string | null;
  reminder_10m_sent_at: string | null;
  telegram_enabled: boolean | null;
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

function reminderText(event: EventRow, label: string) {
  const when = new Date(event.starts_at).toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
  return `🎮 <b>AK47DX Reminder ${label}</b>\n\n<b>${event.title}</b>\n🕒 ${when}\n📍 ${event.location || 'CODM'}\n\n${event.description || 'Preparati per evento clan.'}`;
}

async function processReminders() {
  const supabase = serverSupabase();
  const now = new Date();
  const until = new Date(now.getTime() + 2 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('codm_events')
    .select('id,title,description,starts_at,location,reminder_2h_sent_at,reminder_10m_sent_at,telegram_enabled')
    .eq('telegram_enabled', true)
    .gte('starts_at', now.toISOString())
    .lte('starts_at', until)
    .order('starts_at', { ascending: true });
  if (error) throw error;

  const sent: string[] = [];
  const events = (data || []) as EventRow[];
  for (const event of events) {
    const diffMinutes = Math.round((new Date(event.starts_at).getTime() - now.getTime()) / 60000);

    if (!event.reminder_2h_sent_at && diffMinutes <= 125 && diffMinutes >= 105) {
      await sendTelegram(reminderText(event, '2 ore prima'));
      await supabase.from('codm_events').update({ reminder_2h_sent_at: new Date().toISOString() }).eq('id', event.id).is('reminder_2h_sent_at', null);
      sent.push(`${event.title}:2h`);
    }

    if (!event.reminder_10m_sent_at && diffMinutes <= 15 && diffMinutes >= 0) {
      await sendTelegram(reminderText(event, '10 minuti prima'));
      await supabase.from('codm_events').update({ reminder_10m_sent_at: new Date().toISOString() }).eq('id', event.id).is('reminder_10m_sent_at', null);
      sent.push(`${event.title}:10m`);
    }
  }
  return sent;
}

export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const given = request.nextUrl.searchParams.get('secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (secret && given !== secret) return NextResponse.json({ ok: false, error: 'Unauthorized cron secret.' }, { status: 401 });
    const sent = await processReminders();
    return NextResponse.json({ ok: true, sent, count: sent.length });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Errore reminder Telegram.' }, { status: 500 });
  }
}
