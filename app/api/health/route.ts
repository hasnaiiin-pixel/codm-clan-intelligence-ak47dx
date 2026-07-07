import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: 'CLAN MANAGER',
    version: 'CODM_AK47DX_V8_1_EVENTS_EDIT_DELETE_TELEGRAM_CLEAN_FINAL',
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
