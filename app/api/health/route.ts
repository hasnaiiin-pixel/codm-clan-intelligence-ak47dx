import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: 'AK47DX CODM Clan Intelligence',
    version: 'CODM_AK47DX_V4_2_GRAFICA_OCR_RENDER_FIX',
    routes: ['/version', '/cache-reset', '/events', '/ocr-status', '/api/telegram/reminders', '/api/telegram/status'],
  });
}
