"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCodmAuth, roleLabel } from "@/lib/authRoles";
import { WriteAccessBlock } from "@/components/WriteAccessBlock";
import {
  clearLocalNotifications,
  loadLocalNotifications,
  markAllLocalNotificationsRead,
  markLocalNotificationRead,
  requestCodmNotificationPermission,
  setCodmAppBadge,
  type CodmLocalNotification,
} from "@/lib/clientNotifications";

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

const defaultPrefs: Omit<PreferenceRow, "user_id"> = {
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
  const [prefs, setPrefs] =
    useState<Omit<PreferenceRow, "user_id">>(defaultPrefs);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [localNotifications, setLocalNotifications] = useState<
    CodmLocalNotification[]
  >([]);
  const [permission, setPermission] = useState<
    "default" | "granted" | "denied" | "unsupported"
  >("default");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshLocalNotifications();
    if (typeof window !== "undefined" && "Notification" in window)
      setPermission(
        Notification.permission as "default" | "granted" | "denied",
      );
    else setPermission("unsupported");
    if (auth.user?.id) void load();
  }, [auth.user?.id]);

  function refreshLocalNotifications() {
    const rows = loadLocalNotifications();
    setLocalNotifications(rows);
    void setCodmAppBadge(rows.filter((row) => !row.readAt).length);
  }

  async function load() {
    if (!auth.user?.id) return;
    setLoading(true);
    setMessage("");
    try {
      const { data: prefData } = await supabase
        .from("codm_notification_preferences")
        .select("*")
        .eq("user_id", auth.user.id)
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
        .from("codm_notifications")
        .select("id,type,title,body,read_at,created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setNotifications((rows || []) as NotificationRow[]);
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("codm-server-notifications-changed"));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Errore caricamento notifiche.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function savePrefs() {
    if (!auth.user?.id) return;
    const { error } = await supabase
      .from("codm_notification_preferences")
      .upsert(
        {
          user_id: auth.user.id,
          ...prefs,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    setMessage(error ? error.message : "Preferenze notifiche salvate.");
  }

  async function markRead(notificationId: string) {
    const { error } = await supabase
      .from("codm_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);
    if (error) setMessage(error.message);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("codm-server-notifications-changed"));
    await load();
  }

  async function markAllRead() {
    markAllLocalNotificationsRead();
    refreshLocalNotifications();
    if (!auth.user?.id) {
      setMessage("Notifiche locali segnate come lette.");
      return;
    }
    const { error } = await supabase
      .from("codm_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", auth.user.id)
      .is("read_at", null);
    setMessage(
      error ? error.message : "Tutte le notifiche segnate come lette.",
    );
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("codm-server-notifications-changed"));
    await load();
  }

  function markLocalRead(notificationId: string) {
    markLocalNotificationRead(notificationId);
    refreshLocalNotifications();
  }

  function clearLocal() {
    clearLocalNotifications();
    refreshLocalNotifications();
    setMessage("Notifiche locali e badge PWA cancellati.");
  }

  async function enableBrowserNotifications() {
    const result = await requestCodmNotificationPermission();
    setPermission(
      result === "unsupported"
        ? "unsupported"
        : (result as "default" | "granted" | "denied"),
    );
    setMessage(
      result === "granted"
        ? "Notifiche browser/PWA attivate."
        : result === "denied"
          ? "Permesso notifiche negato dal browser."
          : "Notifiche non supportate su questo dispositivo.",
    );
  }

  const isAdminUser = auth.canManageUsers || String(auth.user?.email || "").trim().toLowerCase() === "hasnaiiin@gmail.com";
  const unreadServer = notifications.filter((row) => !row.read_at).length;
  const unreadLocal = localNotifications.filter((row) => !row.readAt).length;
  const unread = unreadServer + (isAdminUser ? unreadLocal : 0);
  const localStatus = useMemo(
    () =>
      permission === "granted"
        ? "attive"
        : permission === "denied"
          ? "bloccate"
          : permission === "unsupported"
            ? "non supportate"
            : "da attivare",
    [permission],
  );

  if (auth.loading) return <WriteAccessBlock loading />;
  if (!auth.user)
    return (
      <WriteAccessBlock
        role={auth.role}
        title="Login richiesto"
        description="Le notifiche sono personalizzate per utente. Accedi per scegliere cosa ricevere."
      />
    );

  return (
    <main className="container wide ak-page-compact">
      <section className="card ak-section-head">
        <p className="eyebrow">🔔 Centro notifiche</p>
        <h1>Notifiche personalizzabili</h1>
        <p className="muted">
          Scegli cosa ricevere in app, Telegram o email. Il tuo ruolo attuale è{" "}
          <b>{roleLabel(auth.role)}</b>.
        </p>
        {message && <div className="notice top-gap">{message}</div>}
      </section>

      <section className="top-gap ak-notifications-main-grid ak-notifications-v7-3">
        <div className="card ak-notifications-received-card">
          <div className="section-title">
            <h2>Notifiche ricevute</h2>
            <button
              className="btn small secondary"
              type="button"
              onClick={() => void markAllRead()}
            >
              Segna tutte lette
            </button>
          </div>
          <p className="muted">Non lette: {unreadServer}</p>
          {isAdminUser && (
            <>
              <div className="notice top-gap">
                <b>Diagnostica badge PWA:</b> {localStatus} • locali non lette {unreadLocal}.
              </div>
              <div className="auth-block-actions top-gap">
                {permission === "default" && (
                  <button className="btn small" type="button" onClick={() => void enableBrowserNotifications()}>
                    Attiva notifiche telefono
                  </button>
                )}
                <button className="btn small secondary" type="button" onClick={clearLocal}>
                  Pulisci badge locale
                </button>
              </div>
            </>
          )}
          {loading && <p className="muted top-gap">Caricamento...</p>}
          <div className="ak-notification-list top-gap">
            {!loading &&
              notifications.length === 0 &&
              (!isAdminUser || localNotifications.length === 0) && (
                <div className="notice">Nessuna notifica ancora.</div>
              )}
            {isAdminUser && localNotifications.map((row) => (
              <article
                key={row.id}
                className={`ak-notification-card ${row.readAt ? "" : "unread"}`}
              >
                <div>
                  <span className="pill">PWA · {row.type}</span>
                  <h3>{row.title}</h3>
                  <p>{row.body || "-"}</p>
                  <small>
                    {new Date(row.createdAt).toLocaleString("it-IT")}
                  </small>
                </div>
                {!row.readAt && (
                  <button
                    className="btn small secondary"
                    type="button"
                    onClick={() => markLocalRead(row.id)}
                  >
                    Letta
                  </button>
                )}
              </article>
            ))}
            {notifications.map((row) => (
              <article
                key={row.id}
                className={`ak-notification-card ${row.read_at ? "" : "unread"}`}
              >
                <div>
                  <span className="pill">Server · {row.type}</span>
                  <h3>{row.title}</h3>
                  <p>{row.body || "-"}</p>
                  <small>
                    {new Date(row.created_at).toLocaleString("it-IT")}
                  </small>
                </div>
                {!row.read_at && (
                  <button
                    className="btn small secondary"
                    type="button"
                    onClick={() => void markRead(row.id)}
                  >
                    Letta
                  </button>
                )}
              </article>
            ))}
          </div>
        </div>

        <div className="card ak-notifications-preferences-card">
          <h2>Preferenze utente</h2>
          <div className="form top-gap">
            <label className="check-line ak-check-card">
              <input
                type="checkbox"
                checked={prefs.inapp_enabled}
                onChange={(e) =>
                  setPrefs({ ...prefs, inapp_enabled: e.target.checked })
                }
              />{" "}
              Notifiche dentro app
            </label>
            <label className="check-line ak-check-card">
              <input
                type="checkbox"
                checked={prefs.telegram_enabled}
                onChange={(e) =>
                  setPrefs({ ...prefs, telegram_enabled: e.target.checked })
                }
              />{" "}
              Reminder Telegram se sono convocato
            </label>
            <label className="check-line ak-check-card">
              <input
                type="checkbox"
                checked={prefs.email_enabled}
                onChange={(e) =>
                  setPrefs({ ...prefs, email_enabled: e.target.checked })
                }
              />{" "}
              Email future
            </label>
            <label className="check-line ak-check-card">
              <input
                type="checkbox"
                checked={prefs.notification_events}
                onChange={(e) =>
                  setPrefs({ ...prefs, notification_events: e.target.checked })
                }
              />{" "}
              Eventi e convocazioni
            </label>
            <label className="check-line ak-check-card">
              <input
                type="checkbox"
                checked={prefs.notification_reminders}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    notification_reminders: e.target.checked,
                  })
                }
              />{" "}
              Reminder eventi
            </label>
            <label className="check-line ak-check-card">
              <input
                type="checkbox"
                checked={prefs.notification_stats}
                onChange={(e) =>
                  setPrefs({ ...prefs, notification_stats: e.target.checked })
                }
              />{" "}
              Statistiche e riepiloghi
            </label>
            <label className="check-line ak-check-card">
              <input
                type="checkbox"
                checked={prefs.notification_imports}
                onChange={(e) =>
                  setPrefs({ ...prefs, notification_imports: e.target.checked })
                }
              />{" "}
              Import risultati e revisioni
            </label>
            {auth.canManageUsers && (
              <label className="check-line ak-check-card">
                <input
                  type="checkbox"
                  checked={prefs.notification_admin}
                  onChange={(e) =>
                    setPrefs({ ...prefs, notification_admin: e.target.checked })
                  }
                />{" "}
                Notifiche admin/permessi
              </label>
            )}
            <button
              className="btn"
              type="button"
              onClick={() => void savePrefs()}
            >
              Salva preferenze
            </button>
          </div>
        </div>

      </section>
    </main>
  );
}
