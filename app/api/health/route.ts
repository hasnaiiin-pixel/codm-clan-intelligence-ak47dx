import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: 'Clan Manager',
    version: 'CODM_AK47DX_V6_7_CLAN_HQ_RULES_MAP_BAN_FLOW',
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
