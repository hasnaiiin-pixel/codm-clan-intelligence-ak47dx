import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, resolveClanId, isUuid } from '@/lib/server/codmEventsApi';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStoreJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
      ...(init?.headers || {})
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const ctx = await getUserContext(token);
    if (!ctx.admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY mancante su Vercel: dettaglio evento bloccato.');

    const eventId = request.nextUrl.searchParams.get('id');
    if (!isUuid(eventId)) return noStoreJson({ ok: false, error: 'ID evento non valido.' }, { status: 400 });
    const clanId = await resolveClanId(ctx, null, false);
    if (!isUuid(clanId)) return noStoreJson({ ok: false, error: 'Clan Supabase non valido.' }, { status: 403 });

    const { data: event, error } = await ctx.admin
      .from('codm_events')
      .select('*')
      .eq('id', eventId)
      .eq('clan_id', clanId)
      .maybeSingle();
    if (error) throw error;
    if (!event?.id) return noStoreJson({ ok: false, error: 'Evento non trovato nel clan corrente.' }, { status: 404 });

    const { data: players, error: playersError } = await ctx.admin
      .from('codm_event_players')
      .select('event_id,player_id,nickname,status')
      .eq('event_id', eventId);
    if (playersError) throw playersError;

    return noStoreJson({ ok: true, event, eventPlayers: players || [], clanId, serverMode: 'service-role' });
  } catch (error) {
    return noStoreJson({ ok: false, error: error instanceof Error ? error.message : 'Errore dettaglio evento.' }, { status: 500 });
  }
}
