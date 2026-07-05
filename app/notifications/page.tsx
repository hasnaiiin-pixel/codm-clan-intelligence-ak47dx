'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCodmAuth, roleLabel } from '@/lib/authRoles';
import { WriteAccessBlock } from '@/components/WriteAccessBlock';

type PreferenceRow = {
  user_id: string;
  inapp_enabled: boolean;
  telegram_enabled: boolean;
  email_enabled: boolean;
  notification_events: boolean;
  notification_reminders: boolean;
  notification_stats: boolean;
  notification_imports: boolean;
  notification_admin: boolean;
};

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

const defaultPrefs: Omit<PreferenceRow, 'user_id'> = {
  inapp_enabled: true,
  telegram_enabled: true,
  email_enabled: false,
  notification_events: true,
  notification_reminders: true,
  notification_stats: true,
  notification_imports: true,
  notification_admin: false,
};

export default function NotificationsPage() {
  const auth = useCodmAuth();
  const [prefs, setPrefs] = useState<Omit<PreferenceRow, 'user_id'>>(defaultPrefs);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.user?.id) void load();
  }, [auth.user?.id]);

  async function load() {
    if (!auth.user?.id) return;
    setLoading(true);
    setMessage('');
    try {
      const { data: prefData } = await supabase
        .from('codm_notification_preferences')
        .select('*')
        .eq('user_id', auth.user.id)
        .maybeSingle();
      if (prefData) {
        const row = prefData as PreferenceRow;
        setPrefs({
          inapp_enabled: row.inapp_enabled ?? true,
          telegram_enabled: row.telegram_enabled ?? true,
          email_enabled: row.email_enabled ?? false,
          notification_events: row.notification_events ?? true,
          notification_reminders: row.notification_reminders ?? true,
          notification_stats: row.notification_stats ?? true,
          notification_imports: row.notification_imports ?? true,
          notification_admin: row.notification_admin ?? false,
        });
      }
      const { data: rows, error } = await supabase
        .from('codm_notifications')
        .select('id,type,title,body,read_at,created_at')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setNotifications((rows || []) as NotificationRow[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore caricamento notifiche.');
    } finally {
      setLoading(false);
    }
  }

  async function savePrefs() {
    if (!auth.user?.id) return;
    const { error } = await supabase.from('codm_notification_preferences').upsert({
      user_id: auth.user.id,
      ...prefs,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    setMessage(error ? error.message : 'Preferenze notifiche salvate.');
  }

  async function markRead(notificationId: string) {
    const { error } = await supabase.from('codm_notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId);
    if (error) setMessage(error.message);
    await load();
  }

  async function markAllRead() {
    if (!auth.user?.id) return;
    const { error } = await supabase.from('codm_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', auth.user.id).is('read_at', null);
    setMessage(error ? error.message : 'Tutte le notifiche segnate come lette.');
    await load();
  }

  if (auth.loading) return <WriteAccessBlock loading />;
  if (!auth.user) return <WriteAccessBlock role={auth.role} title="Login richiesto" description="Le notifiche sono personalizzate per utente. Accedi per scegliere cosa ricevere." />;

  const unread = notifications.filter((row) => !row.read_at).length;

  return (
    <main className="container wide ak-page-compact">
      <section className="card ak-section-head">
        <p className="eyebrow">🔔 Centro notifiche</p>
        <h1>Notifiche personalizzabili</h1>
        <p className="muted">Scegli cosa ricevere in app, Telegram o email. Il tuo ruolo attuale è <b>{roleLabel(auth.role)}</b>.</p>
        {message && <div className="notice top-gap">{message}</div>}
      </section>

      <section className="grid grid-2 top-gap">
        <div className="card">
          <h2>Preferenze utente</h2>
          <div className="form top-gap">
            <label className="check-line ak-check-card"><input type="checkbox" checked={prefs.inapp_enabled} onChange={(e) => setPrefs({ ...prefs, inapp_enabled: e.target.checked })} /> Notifiche dentro app</label>
            <label className="check-line ak-check-card"><input type="checkbox" checked={prefs.telegram_enabled} onChange={(e) => setPrefs({ ...prefs, telegram_enabled: e.target.checked })} /> Reminder Telegram se sono convocato</label>
            <label className="check-line ak-check-card"><input type="checkbox" checked={prefs.email_enabled} onChange={(e) => setPrefs({ ...prefs, email_enabled: e.target.checked })} /> Email future</label>
            <label className="check-line ak-check-card"><input type="checkbox" checked={prefs.notification_events} onChange={(e) => setPrefs({ ...prefs, notification_events: e.target.checked })} /> Eventi e convocazioni</label>
            <label className="check-line ak-check-card"><input type="checkbox" checked={prefs.notification_reminders} onChange={(e) => setPrefs({ ...prefs, notification_reminders: e.target.checked })} /> Reminder eventi</label>
            <label className="check-line ak-check-card"><input type="checkbox" checked={prefs.notification_stats} onChange={(e) => setPrefs({ ...prefs, notification_stats: e.target.checked })} /> Statistiche e riepiloghi</label>
            <label className="check-line ak-check-card"><input type="checkbox" checked={prefs.notification_imports} onChange={(e) => setPrefs({ ...prefs, notification_imports: e.target.checked })} /> Import risultati e revisioni</label>
            {auth.canManageUsers && <label className="check-line ak-check-card"><input type="checkbox" checked={prefs.notification_admin} onChange={(e) => setPrefs({ ...prefs, notification_admin: e.target.checked })} /> Notifiche admin/permessi</label>}
            <button className="btn" type="button" onClick={() => void savePrefs()}>Salva preferenze</button>
          </div>
        </div>

        <div className="card">
          <div className="section-title"><h2>Notifiche ricevute</h2><button className="btn small secondary" type="button" onClick={() => void markAllRead()}>Segna tutte lette</button></div>
          <p className="muted">Non lette: {unread}</p>
          {loading && <p className="muted top-gap">Caricamento...</p>}
          <div className="ak-notification-list top-gap">
            {!loading && notifications.length === 0 && <div className="notice">Nessuna notifica ancora.</div>}
            {notifications.map((row) => (
              <article key={row.id} className={`ak-notification-card ${row.read_at ? '' : 'unread'}`}>
                <div>
                  <span className="pill">{row.type}</span>
                  <h3>{row.title}</h3>
                  <p>{row.body || '-'}</p>
                  <small>{new Date(row.created_at).toLocaleString('it-IT')}</small>
                </div>
                {!row.read_at && <button className="btn small secondary" type="button" onClick={() => void markRead(row.id)}>Letta</button>}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
