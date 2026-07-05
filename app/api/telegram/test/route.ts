import { NextRequest, NextResponse } from 'next/server';

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error('Mancano TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID in Vercel.');
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`Telegram HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const given = request.nextUrl.searchParams.get('secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (secret && given !== secret) return NextResponse.json({ ok: false, error: 'Unauthorized cron secret.' }, { status: 401 });
    const now = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
    const result = await sendTelegram(`✅ <b>AK47DX Telegram collegato</b>\nTest manuale riuscito.\n🕒 ${now}`);
    return NextResponse.json({ ok: true, route: '/api/telegram/test', result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Errore test Telegram.' }, { status: 500 });
  }
}
