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
    if (!ctx.admin) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY mancante su Vercel: eventi disabilitati per evitare dati diversi tra PWA e browser.');
    }

    // V8.0: il client NON può scegliere clan_id. Il clan ufficiale viene risolto solo lato server.
    const clanId = await resolveClanId(ctx, null, false);
    if (!isUuid(clanId)) {
      return noStoreJson({
        ok: true,
        events: [],
        eventPlayers: [],
        clanId: null,
        serverMode: 'service-role',
        warning: 'Nessun clan Supabase collegato a questo utente. Eventi non mostrati.'
      });
    }

    const { data: events, error: eventsError } = await ctx.admin
      .from('codm_events')
      .select('*')
      .eq('clan_id', clanId)
      .order('starts_at', { ascending: true })
      .limit(500);
    if (eventsError) throw eventsError;

    const eventIds = (events || []).map((event: any) => event.id).filter((id: unknown): id is string => isUuid(String(id)));
    let eventPlayers: any[] = [];
    if (eventIds.length) {
      const { data, error } = await ctx.admin
        .from('codm_event_players')
        .select('event_id,player_id,nickname,status')
        .in('event_id', eventIds);
      if (error) throw error;
      eventPlayers = data || [];
    }

    return noStoreJson({ ok: true, events: events || [], eventPlayers, clanId, serverMode: 'service-role', clientClanIdAccepted: false });
  } catch (error) {
    return noStoreJson({ ok: false, error: error instanceof Error ? error.message : 'Errore caricamento eventi.' }, { status: 500 });
  }
}
