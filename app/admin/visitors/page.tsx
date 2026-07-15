'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCodmAuth } from '@/lib/authRoles';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

type ViewRow = {
  id: string;
  visitor_id: string;
  user_id: string | null;
  path: string;
  referrer: string | null;
  device_type: string | null;
  is_pwa: boolean;
  user_agent: string | null;
  created_at: string;
};

type RangeDays = 7 | 30 | 90;

function dateKey(value: string) {
  return new Date(value).toLocaleDateString('sv-SE');
}

function labelDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

export default function VisitorsAdminPage() {
  const auth = useCodmAuth();
  const [rows, setRows] = useState<ViewRow[]>([]);
  const [days, setDays] = useState<RangeDays>(30);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const canView = auth.role === 'owner' || auth.role === 'coach' || auth.permissions.view_admin_panel || auth.permissions.manage_users;

  useEffect(() => {
    if (auth.loading) return;
    if (!canView || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    void load();
  }, [auth.loading, canView, days]);

  async function load() {
    setLoading(true);
    setMessage('');
    const from = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await supabase
      .from('site_page_views')
      .select('*')
      .gte('created_at', from)
      .order('created_at', { ascending: false })
      .limit(10000);
    if (error) setMessage(`${error.message}. Esegui lo SQL V13.11 incluso nella build.`);
    setRows((data || []) as ViewRow[]);
    setLoading(false);
  }

  const stats = useMemo(() => {
    const unique = new Set(rows.map((row) => row.visitor_id)).size;
    const registered = new Set(rows.filter((row) => row.user_id).map((row) => row.user_id as string)).size;
    const pwa = rows.filter((row) => row.is_pwa).length;
    const mobile = rows.filter((row) => row.device_type === 'mobile').length;
    return { unique, registered, pwa, mobile, views: rows.length };
  }, [rows]);

  const pageRows = useMemo(() => {
    const grouped = new Map<string, { path: string; views: number; visitors: Set<string> }>();
    for (const row of rows) {
      const item = grouped.get(row.path) || { path: row.path, views: 0, visitors: new Set<string>() };
      item.views += 1;
      item.visitors.add(row.visitor_id);
      grouped.set(row.path, item);
    }
    return Array.from(grouped.values())
      .map((item) => ({ path: item.path, views: item.views, visitors: item.visitors.size }))
      .sort((a, b) => b.views - a.views);
  }, [rows]);

  const deviceRows = useMemo(() => {
    const grouped = new Map<string, number>();
    rows.forEach((row) => grouped.set(row.device_type || 'sconosciuto', (grouped.get(row.device_type || 'sconosciuto') || 0) + 1));
    return Array.from(grouped.entries()).map(([device, views]) => ({ device, views })).sort((a, b) => b.views - a.views);
  }, [rows]);

  const dailyRows = useMemo(() => {
    const grouped = new Map<string, { views: number; visitors: Set<string> }>();
    for (const row of rows) {
      const key = dateKey(row.created_at);
      const item = grouped.get(key) || { views: 0, visitors: new Set<string>() };
      item.views += 1;
      item.visitors.add(row.visitor_id);
      grouped.set(key, item);
    }
    const result = Array.from(grouped.entries())
      .map(([day, item]) => ({ day, views: item.views, visitors: item.visitors.size }))
      .sort((a, b) => a.day.localeCompare(b.day));
    const max = Math.max(...result.map((item) => item.views), 1);
    return result.map((item) => ({ ...item, percent: Math.max(3, Math.round((item.views / max) * 100)) }));
  }, [rows]);

  if (auth.loading) return <main className="container"><section className="card"><p>Verifica permessi...</p></section></main>;
  if (!auth.user) return <main className="container"><section className="card"><h1>Accesso richiesto</h1><p>Accedi per visualizzare le statistiche visitatori.</p><a className="btn" href="/login">Vai al login</a></section></main>;
  if (!canView) return <main className="container"><section className="card"><h1>Area riservata</h1><p>Questa pagina è visibile solo a Owner/Admin autorizzati.</p></section></main>;

  return (
    <main className="container wide visitor-admin-page-v1311">
      <section className="card hero-compact gaming-panel">
        <p className="eyebrow">📈 ADMIN ANALYTICS</p>
        <div className="section-title">
          <div>
            <h1>Visitatori e visualizzazioni</h1>
            <p className="muted">Conteggi interni senza indirizzo IP e senza dati venduti a terzi. Il visitatore anonimo usa un identificatore locale.</p>
          </div>
          <select className="select compact-select" value={days} onChange={(event) => setDays(Number(event.target.value) as RangeDays)}>
            <option value={7}>Ultimi 7 giorni</option>
            <option value={30}>Ultimi 30 giorni</option>
            <option value={90}>Ultimi 90 giorni</option>
          </select>
        </div>
        {message && <div className="notice warn top-gap">{message}</div>}
      </section>

      <section className="grid grid-5 top-gap visitor-kpis-v1311">
        <div className="kpi"><span>Visualizzazioni</span><strong>{stats.views}</strong></div>
        <div className="kpi"><span>Visitatori unici</span><strong>{stats.unique}</strong></div>
        <div className="kpi"><span>Utenti registrati</span><strong>{stats.registered}</strong></div>
        <div className="kpi"><span>Visite PWA</span><strong>{stats.pwa}</strong></div>
        <div className="kpi"><span>Visite mobile</span><strong>{stats.mobile}</strong></div>
      </section>

      <section className="card top-gap">
        <h2>Andamento giornaliero</h2>
        {loading ? <p>Caricamento...</p> : (
          <div className="visitor-trend-v1311">
            {dailyRows.map((item) => (
              <div key={item.day} className="visitor-trend-row-v1311">
                <span>{labelDate(item.day)}</span>
                <div><i style={{ width: `${item.percent}%` }} /></div>
                <b>{item.views}</b>
                <small>{item.visitors} visitatori</small>
              </div>
            ))}
            {!dailyRows.length && <p className="muted">Nessuna visita registrata nel periodo.</p>}
          </div>
        )}
      </section>

      <section className="grid grid-2 top-gap">
        <div className="card">
          <h2>Pagine più viste</h2>
          <div className="table-scroll"><table className="table compact"><thead><tr><th>Pagina</th><th>Visualizzazioni</th><th>Visitatori</th></tr></thead><tbody>
            {pageRows.map((row) => <tr key={row.path}><td>{row.path}</td><td>{row.views}</td><td>{row.visitors}</td></tr>)}
            {!pageRows.length && <tr><td colSpan={3}>Nessun dato.</td></tr>}
          </tbody></table></div>
        </div>
        <div className="card">
          <h2>Dispositivi</h2>
          <div className="table-scroll"><table className="table compact"><thead><tr><th>Dispositivo</th><th>Visualizzazioni</th></tr></thead><tbody>
            {deviceRows.map((row) => <tr key={row.device}><td>{row.device}</td><td>{row.views}</td></tr>)}
            {!deviceRows.length && <tr><td colSpan={2}>Nessun dato.</td></tr>}
          </tbody></table></div>
        </div>
      </section>
    </main>
  );
}
