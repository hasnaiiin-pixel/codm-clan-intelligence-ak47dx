import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, resolveOfficialClanId, isUuid, noStoreHeaders } from '@/lib/server/codmEventsApi';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStoreJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: noStoreHeaders(init?.headers) });
}

export async function GET(request: NextRequest) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const ctx = await getUserContext(token);
    const clanId = await resolveOfficialClanId(ctx, false);
    const eventId = request.nextUrl.searchParams.get('id');
    if (!isUuid(eventId)) return noStoreJson({ ok: false, error: 'ID evento non valido.' }, { status: 400 });

    const { data: event, error } = await ctx.admin!
      .from('codm_events')
      .select('*')
      .eq('id', eventId)
      .eq('clan_id', clanId)
      .maybeSingle();
    if (error) throw error;
    if (!event?.id) return noStoreJson({ ok: false, error: 'Evento non trovato nel database ufficiale AK47DX.' }, { status: 404 });

    const { data: players, error: playersError } = await ctx.admin!
      .from('codm_event_players')
      .select('event_id,player_id,nickname,status')
      .eq('event_id', eventId);
    if (playersError && playersError.code !== '42P01') throw playersError;

    return noStoreJson({ ok: true, event, eventPlayers: players || [], clanId, serverMode: 'service-role' });
  } catch (error) {
    return noStoreJson({ ok: false, error: error instanceof Error ? error.message : 'Errore dettaglio evento.' }, { status: 500 });
  }
}
