import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, resolveClanId, isUuid, supabaseUrl } from '@/lib/server/codmEventsApi';

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
    const clanId = await resolveClanId(ctx, null, false).catch(() => null);
    let eventsCount: number | null = null;
    let sampleIds: string[] = [];
    if (ctx.admin && isUuid(clanId)) {
      const { count } = await ctx.admin.from('codm_events').select('id', { count: 'exact', head: true }).eq('clan_id', clanId);
      eventsCount = count || 0;
      const { data } = await ctx.admin.from('codm_events').select('id').eq('clan_id', clanId).order('created_at', { ascending: false }).limit(5);
      sampleIds = (data || []).map((row: any) => row.id).filter(Boolean);
    }
    return noStoreJson({
      ok: true,
      mode: ctx.admin ? 'service-role' : 'missing-service-role',
      database: 'supabase',
      supabaseUrlConfigured: Boolean(supabaseUrl()),
      table: 'public.codm_events',
      resolvedClanId: clanId,
      userEmail: ctx.email,
      userId: ctx.userId,
      eventsCount,
      sampleIds,
      localEventsEnabled: false,
      clientClanIdAccepted: false,
      message: ctx.admin ? 'Eventi V8.0: database unico via Vercel API + Supabase service role.' : 'SUPABASE_SERVICE_ROLE_KEY mancante: eventi non affidabili.'
    });
  } catch (error) {
    return noStoreJson({ ok: false, error: error instanceof Error ? error.message : 'Health eventi non disponibile.' }, { status: 500 });
  }
}
