import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, isClanWriter, isUuid } from '@/lib/server/codmEventsApi';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type DeleteBody = { id?: string | null };

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

export async function POST(request: NextRequest) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const ctx = await getUserContext(token);
    if (!ctx.admin) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY mancante su Vercel: cancellazione eventi bloccata. Configura la chiave service_role e redeploy.');
    }

    const body = (await request.json().catch(() => ({}))) as DeleteBody;
    const eventId = isUuid(body.id) ? body.id : null;
    if (!eventId) return noStoreJson({ ok: false, error: 'ID evento non valido.' }, { status: 400 });

    const { data: event, error: readError } = await ctx.admin
      .from('codm_events')
      .select('id,clan_id,title')
      .eq('id', eventId)
      .maybeSingle();
    if (readError) throw readError;
    if (!event?.id) return noStoreJson({ ok: true, deleted: true, alreadyDeleted: true, id: eventId, serverMode: 'service-role' });

    const clanId = event.clan_id as string;
    const canDelete = isUuid(clanId) ? await isClanWriter(ctx, clanId) : false;
    if (!canDelete) return noStoreJson({ ok: false, error: 'Permesso mancante: solo owner, coach o staff possono cancellare eventi.' }, { status: 403 });

    const { error: playersDeleteError } = await ctx.admin.from('codm_event_players').delete().eq('event_id', eventId);
    if (playersDeleteError) throw playersDeleteError;

    try {
      await ctx.admin.from('codm_notifications').delete().contains('metadata', { event_id: eventId });
    } catch {
      // Le notifiche non devono bloccare la cancellazione evento.
    }

    const { data: deletedRows, error: deleteError } = await ctx.admin
      .from('codm_events')
      .delete()
      .eq('id', eventId)
      .select('id');
    if (deleteError) throw deleteError;

    return noStoreJson({ ok: true, deleted: true, deletedCount: deletedRows?.length || 0, id: eventId, clanId, serverMode: 'service-role' });
  } catch (error) {
    return noStoreJson({ ok: false, error: error instanceof Error ? error.message : 'Errore cancellazione evento.' }, { status: 500 });
  }
}
