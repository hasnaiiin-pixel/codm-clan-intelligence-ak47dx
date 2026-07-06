import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: 'Clan Manager',
    version: 'CODM_AK47DX_V6_6_CLAN_MANAGER_EVENTS_PERSIST_ROSTER_RULES',
    routes: [
      '/version',
      '/cache-reset',
      '/events',
      '/ocr-status',
      '/api/telegram/reminders',
      '/api/telegram/status',
      '/api/telegram/test',
    ],
  });
}
