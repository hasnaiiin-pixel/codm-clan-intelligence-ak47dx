import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: 'AK47DX CODM Clan Intelligence',
    version: 'CODM_AK47DX_V4_3_MOBILE_PERMESSI_OCR_PROGRESS',
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
