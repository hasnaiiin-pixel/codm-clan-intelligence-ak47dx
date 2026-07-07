import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, isClanWriter, isUuid } from '@/lib/server/codmEventsApi';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Body = { id?: string | null; event_plan?: any; event_notes?: string | null };

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
    if (!ctx.admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY mancante su Vercel: aggiornamento risultato evento bloccato.');

    const body = (await request.json().catch(() => ({}))) as Body;
    const eventId = isUuid(body.id) ? body.id : null;
    if (!eventId) return noStoreJson({ ok: false, error: 'ID evento non valido.' }, { status: 400 });

    const { data: existing, error: readError } = await ctx.admin
      .from('codm_events')
      .select('id,clan_id,title')
      .eq('id', eventId)
      .maybeSingle();
    if (readError) throw readError;
    if (!existing?.id || !isUuid(existing.clan_id)) return noStoreJson({ ok: false, error: 'Evento non trovato.' }, { status: 404 });

    const canWrite = await isClanWriter(ctx, existing.clan_id);
    if (!canWrite) return noStoreJson({ ok: false, error: 'Permesso mancante: solo owner, coach o staff possono aggiornare evento.' }, { status: 403 });

    const updatePayload = {
      event_plan: body.event_plan && typeof body.event_plan === 'object' ? body.event_plan : {},
      event_notes: String(body.event_notes || '').trim() || null,
      local_id: null,
      sync_status: 'synced',
      sync_error: null,
      updated_at: new Date().toISOString()
    };

    const { data: event, error } = await ctx.admin
      .from('codm_events')
      .update(updatePayload)
      .eq('id', eventId)
      .select('*')
      .single();
    if (error) throw error;

    return noStoreJson({ ok: true, event, serverMode: 'service-role' });
  } catch (error) {
    return noStoreJson({ ok: false, error: error instanceof Error ? error.message : 'Errore aggiornamento risultato evento.' }, { status: 500 });
  }
}
