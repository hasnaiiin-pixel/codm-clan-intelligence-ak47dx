import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, resolveOfficialClanId, isUuid, noStoreHeaders } from '@/lib/server/codmEventsApi';
import { sendTelegramEventLifecycle } from '@/lib/server/codmTelegram';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type DeleteBody = { id?: string | null };

function noStoreJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: noStoreHeaders(init?.headers) });
}

async function safeDeleteRelated(admin: any, eventId: string) {
  const warnings: string[] = [];
  try {
    const { error } = await admin.from('codm_event_players').delete().eq('event_id', eventId);
    if (error && error.code !== '42P01') warnings.push(`codm_event_players: ${error.message}`);
  } catch (error: any) {
    if (error?.code !== '42P01') warnings.push(`codm_event_players: ${error?.message || String(error)}`);
  }
  try {
    const { error } = await admin.from('codm_notifications').delete().contains('metadata', { event_id: eventId });
    if (error && error.code !== '42P01') warnings.push(`codm_notifications: ${error.message}`);
  } catch (error: any) {
    if (error?.code !== '42P01') warnings.push(`codm_notifications: ${error?.message || String(error)}`);
  }
  return warnings;
}

export async function POST(request: NextRequest) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const ctx = await getUserContext(token);
    const clanId = await resolveOfficialClanId(ctx, true);
    const body = (await request.json().catch(() => ({}))) as DeleteBody;
    const eventId = isUuid(body.id) ? body.id : null;
    if (!eventId) return noStoreJson({ ok: false, error: 'ID evento non valido.' }, { status: 400 });

    const { data: event, error: readError } = await ctx.admin!
      .from('codm_events')
      .select('*')
      .eq('id', eventId)
      .eq('clan_id', clanId)
      .maybeSingle();
    if (readError) throw readError;
    if (!event?.id) return noStoreJson({ ok: true, deleted: true, alreadyDeleted: true, id: eventId, clanId, serverMode: 'service-role' });

    const relatedWarnings = await safeDeleteRelated(ctx.admin!, eventId);
    const { data: rpcDeleted, error: rpcError } = await ctx.admin!.rpc('codm_delete_event_hard', { p_event_id: eventId });
    if (rpcError) {
      const { data: deletedRows, error: deleteError } = await ctx.admin!
        .from('codm_events')
        .delete()
        .eq('id', eventId)
        .eq('clan_id', clanId)
        .select('id');
      if (deleteError) throw deleteError;
      if (!deletedRows?.length) throw new Error(`Supabase non ha cancellato nessuna riga. RPC: ${rpcError.message}`);
    } else if (Number(rpcDeleted || 0) < 1) {
      throw new Error('Supabase non ha cancellato nessuna riga tramite funzione hard delete.');
    }

    const telegram = await sendTelegramEventLifecycle('deleted', event);
    return noStoreJson({ ok: true, deleted: true, deletedCount: Number(rpcDeleted || 1), id: eventId, clanId, telegram, warnings: relatedWarnings, serverMode: 'service-role' });
  } catch (error) {
    return noStoreJson({ ok: false, error: error instanceof Error ? error.message : 'Errore cancellazione evento.' }, { status: 500 });
  }
}
