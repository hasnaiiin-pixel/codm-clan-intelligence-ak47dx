import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: 'CLAN MANAGER',
    version: 'CLAN_MANAGER_V8_2_PRO_TELEGRAM_REMINDERS_TEMPLATES_UI',
    routes: [
      '/version',
      '/cache-reset',
      '/events',
      '/events-health',
      '/api/events/list',
      '/api/events/save',
      '/api/events/delete',
      '/api/events/update-result',
      '/api/events/health',
      '/api/telegram/reminders',
      '/api/telegram/status',
      '/api/telegram/test',
      '/api/admin/users',
      '/api/auth/sync-roster',
    ],
  });
}
