import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, resolveOfficialClanId, isUuid, noStoreHeaders } from '@/lib/server/codmEventsApi';
import { sendTelegramEventLifecycle } from '@/lib/server/codmTelegram';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Body = { id?: string | null; event_plan?: any; event_notes?: string | null };

function noStoreJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: noStoreHeaders(init?.headers) });
}

export async function POST(request: NextRequest) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const ctx = await getUserContext(token);
    const clanId = await resolveOfficialClanId(ctx, true);
    const body = (await request.json().catch(() => ({}))) as Body;
    const eventId = isUuid(body.id) ? body.id : null;
    if (!eventId) return noStoreJson({ ok: false, error: 'ID evento non valido.' }, { status: 400 });

    const updatePayload = {
      event_plan: body.event_plan && typeof body.event_plan === 'object' ? body.event_plan : {},
      event_notes: String(body.event_notes || '').trim() || null,
      local_id: null,
      sync_status: 'synced',
      sync_error: null,
      updated_at: new Date().toISOString()
    };

    const { data: event, error } = await ctx.admin!
      .from('codm_events')
      .update(updatePayload)
      .eq('id', eventId)
      .eq('clan_id', clanId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!event?.id) throw new Error('Evento non trovato nel database ufficiale AK47DX.');

    const telegram = await sendTelegramEventLifecycle('result', event);
    return noStoreJson({ ok: true, event, telegram, serverMode: 'service-role' });
  } catch (error) {
    return noStoreJson({ ok: false, error: error instanceof Error ? error.message : 'Errore aggiornamento risultato evento.' }, { status: 500 });
  }
}
