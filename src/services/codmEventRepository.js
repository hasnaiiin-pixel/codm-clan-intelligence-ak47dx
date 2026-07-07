// CODM V7.6 - Database-only event repository.
// Eventi mai salvati in localStorage/PWA: ogni operazione deve passare dal database Supabase.

export async function saveCodmEvent({ supabase, event, players = [] }) {
  if (!supabase?.auth?.getSession) {
    throw new Error('Supabase non configurato: evento non salvato. Gli eventi CODM V7.6 esistono solo nel database.');
  }
  const { data: sessionData } = await supabase.auth.getSession();
  let token = sessionData?.session?.access_token;
  if (!token && supabase.auth.refreshSession) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    token = refreshed?.session?.access_token;
  }
  if (!token) throw new Error('Login richiesto: la PWA non salva eventi locali.');

  const response = await fetch('/api/events/save', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
    },
    body: JSON.stringify({ id: event?.id || null, event, players }),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.ok) throw new Error(json?.error || 'Database non ha confermato il salvataggio evento.');
  return { synced: true, localEvent: json.event, data: json.event, server: json };
}

export async function retryPendingCodmEvents() {
  // V7.6: non esiste più una coda locale pending.
  return { total: 0, synced: 0, failed: 0, disabled: true };
}
