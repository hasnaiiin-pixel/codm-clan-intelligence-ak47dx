import { NextResponse } from 'next/server';
import { telegramChatTargets } from '@/lib/server/codmTelegram';

export async function GET() {
  const targets = telegramChatTargets();
  const required = {
    TELEGRAM_BOT_TOKEN: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    TELEGRAM_CHAT_ID_PRIVATE: Boolean(process.env.TELEGRAM_CHAT_ID),
    TELEGRAM_GROUP_CHAT_ID: Boolean(process.env.TELEGRAM_GROUP_CHAT_ID || process.env.TELEGRAM_CLAN_GROUP_CHAT_ID),
    CRON_SECRET: Boolean(process.env.CRON_SECRET),
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
  const ok = Boolean(required.TELEGRAM_BOT_TOKEN && targets.length && required.NEXT_PUBLIC_SUPABASE_URL && required.SUPABASE_SERVICE_ROLE_KEY);
  return NextResponse.json({
    ok,
    route: '/api/telegram/status',
    reminders_route: '/api/telegram/reminders?secret=CRON_SECRET',
    targets: targets.map((target) => ({ name: target.name, configured: true, chatIdPreview: target.chatId.replace(/.(?=.{4})/g, '*') })),
    required,
    note: ok ? 'Telegram/Supabase presenti. Gli eventi vengono inviati a tutti i target configurati.' : 'Mancano token, chat privata/gruppo o variabili Supabase server.',
  });
}
