import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: 'Clan Manager',
    version: 'CODM_AK47DX_V6_9_OFFICIAL_STABLE_USERS_PERFORMANCE_MIRZA_PWA',
    routes: [
      '/version',
      '/cache-reset',
      '/events',
      '/ocr-status',
      '/api/telegram/reminders',
      '/api/telegram/status',
      '/api/telegram/test',
      '/api/admin/users',
      '/api/auth/sync-roster',
    ],
  });
}
