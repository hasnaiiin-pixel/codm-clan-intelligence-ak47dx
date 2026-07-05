import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: 'AK47DX CODM Clan Intelligence',
    version: 'CODM_AK47DX_V4_1_UI_TELEGRAM_OCR_ALLINEATO',
    routes: ['/version', '/cache-reset', '/events', '/ocr-status', '/api/telegram/reminders', '/api/telegram/status'],
  });
}
