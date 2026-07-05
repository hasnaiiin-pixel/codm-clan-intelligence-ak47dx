import { NextResponse } from 'next/server';

export async function GET() {
  const required = {
    TELEGRAM_BOT_TOKEN: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    TELEGRAM_CHAT_ID: Boolean(process.env.TELEGRAM_CHAT_ID),
    CRON_SECRET: Boolean(process.env.CRON_SECRET),
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
  const ok = Object.values(required).every(Boolean);
  return NextResponse.json({
    ok,
    route: '/api/telegram/status',
    reminders_route: '/api/telegram/reminders?secret=CRON_SECRET',
    required,
    note: ok ? 'Variabili Telegram/Supabase presenti.' : 'Mancano una o più variabili Vercel server.',
  });
}
