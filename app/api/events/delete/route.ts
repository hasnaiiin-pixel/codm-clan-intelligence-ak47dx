import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, isClanWriter, isUuid } from '@/lib/server/codmEventsApi';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type DeleteBody = { id?: string | null };

export async function POST(request: NextRequest) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const ctx = await getUserContext(token);
    const body = (await request.json().catch(() => ({}))) as DeleteBody;
    const eventId = isUuid(body.id) ? body.id : null;
    if (!eventId) return NextResponse.json({ ok: false, error: 'ID evento non valido.' }, { status: 400 });

    const { data: event, error: readError } = await ctx.db
      .from('codm_events')
      .select('id,clan_id,title')
      .eq('id', eventId)
      .maybeSingle();
    if (readError) throw readError;
    if (!event?.id) return NextResponse.json({ ok: true, deleted: true, alreadyDeleted: true, id: eventId }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });

    const clanId = event.clan_id as string;
    const canDelete = isUuid(clanId) ? await isClanWriter(ctx, clanId) : false;
    if (!canDelete) return NextResponse.json({ ok: false, error: 'Permesso mancante: solo owner, coach o staff possono cancellare eventi.' }, { status: 403 });

    const { error: playersDeleteError } = await ctx.db.from('codm_event_players').delete().eq('event_id', eventId);
    if (playersDeleteError) throw playersDeleteError;
    try {
      await ctx.db.from('codm_notifications').delete().contains('metadata', { event_id: eventId });
    } catch {
      // Le notifiche non devono bloccare la cancellazione evento.
    }
    const { error: deleteError } = await ctx.db.from('codm_events').delete().eq('id', eventId);
    if (deleteError) throw deleteError;

    return NextResponse.json({ ok: true, deleted: true, id: eventId, clanId }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Errore cancellazione evento.' }, { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
}
