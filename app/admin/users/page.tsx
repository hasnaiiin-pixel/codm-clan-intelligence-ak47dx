"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useCodmAuth,
  roleLabel,
  CODM_PERMISSION_KEYS,
  defaultPermissionsForRole,
  type CodmRole,
  type CodmPermissionKey,
  type CodmPermissions,
} from "@/lib/authRoles";
import { WriteAccessBlock } from "@/components/WriteAccessBlock";

type AdminUserRow = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  display_name?: string | null;
  player_nickname?: string | null;
  codm_uid?: string | null;
  member_id?: string | null;
  role: CodmRole | "registered";
  player_id?: string | null;
  roster_status?: string | null;
  clan_name?: string | null;
  pending_request_id?: string | null;
  pending_status?: string | null;
  permissions?: Partial<CodmPermissions> | null;
};

type PlayerLinkOption = {
  id: string;
  nickname: string;
  uid_codm?: string | null;
  user_id?: string | null;
  clan_name?: string | null;
  status?: string | null;
  source?: "roster" | "stats";
};

type Diagnostics = {
  auth_users: number;
  profiles: number;
  clan_members: number;
  roster_players: number;
  pending_requests: number;
  synced: number;
  service_role: boolean;
  requester?: string | null;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  message?: string;
  users?: AdminUserRow[];
  diagnostics?: Diagnostics;
  clan?: { id: string; name?: string | null; tag?: string | null };
  players?: PlayerLinkOption[];
};

const roleOptions: CodmRole[] = ["viewer", "player", "staff", "coach", "owner"];
const statusOptions = ["active", "tryout", "bench", "inactive"];
const permissionLabels: Record<CodmPermissionKey, string> = {
  view_events: "Vede eventi",
  create_events: "Crea eventi",
  edit_events: "Modifica eventi",
  delete_events: "Cancella eventi",
  insert_results: "Inserisce risultati",
  view_stats: "Vede statistiche",
  manage_players: "Gestisce giocatori",
  link_accounts: "Associa account",
  manage_users: "Gestisce utenti",
  manage_telegram: "Gestisce Telegram",
  view_admin_panel: "Vede admin panel",
};

function permissionsFor(row: AdminUserRow): CodmPermissions {
  const role = row.role === "registered" ? "registered" : row.role;
  return {
    ...defaultPermissionsForRole(role as CodmRole),
    ...(row.permissions || {}),
  } as CodmPermissions;
}

function dateLabel(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("it-IT");
  } catch {
    return "-";
  }
}

function roleBadgeClass(role: string) {
  if (role === "owner") return "loaded";
  if (role === "coach" || role === "staff") return "played";
  return "";
}

export default function AdminUsersPage() {
  const auth = useCodmAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [clanLabel, setClanLabel] = useState("AK47DX");
  const [playerOptions, setPlayerOptions] = useState<PlayerLinkOption[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const token = auth.session?.access_token || "";

  const apiFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const response = await fetch(url, {
        ...init,
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init?.headers || {}),
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false)
        throw new Error(data?.error || `HTTP ${response.status}`);
      return data as ApiResponse;
    },
    [token],
  );

  const load = useCallback(
    async (sync = false) => {
      if (!token) return;
      setLoading(true);
      setMessage(
        sync ? "Sincronizzo utenti registrati con roster e ruoli..." : "",
      );
      try {
        const data = await apiFetch(`/api/admin/users${sync ? "?sync=1" : ""}`);
        setUsers(data.users || []);
        setPlayerOptions(data.players || []);
        setDiagnostics(data.diagnostics || null);
        setClanLabel(`${data.clan?.tag || data.clan?.name || "AK47DX"}`);
        if (sync || data.diagnostics?.synced)
          setMessage(
            `Lista aggiornata. Sync completato: ${data.diagnostics?.synced || 0} utenti.`,
          );
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Errore caricamento utenti.",
        );
      } finally {
        setLoading(false);
      }
    },
    [apiFetch, token],
  );

  useEffect(() => {
    if (auth.canManageUsers && token) void load(false);
  }, [auth.canManageUsers, token, load]);

  const filteredUsers = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return users;
    return users.filter((row) =>
      [
        row.email,
        row.display_name,
        row.player_nickname,
        row.codm_uid,
        row.role,
        row.clan_name,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(clean),
      ),
    );
  }, [users, query]);

  const needsSync = useMemo(
    () => users.filter((user) => !user.player_id || !user.member_id).length,
    [users],
  );

  async function syncAll() {
    if (!token) return;
    setSyncing(true);
    setMessage("Sync completo in corso: Auth → Profili → Roster → Ruoli...");
    try {
      const result = await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ action: "syncAll" }),
      });
      setMessage(result.message || "Sync completato.");
      await load(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Errore sync utenti.",
      );
    } finally {
      setSyncing(false);
    }
  }

  async function updateRole(row: AdminUserRow, role: CodmRole) {
    setMessage("Aggiorno ruolo...");
    try {
      const result = await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          action: "updateRole",
          userId: row.id,
          role,
          email: row.email,
        }),
      });
      setMessage(result.message || "Ruolo aggiornato.");
      await load(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Errore aggiornamento ruolo.",
      );
    }
  }

  async function linkPlayerToUser(row: AdminUserRow, playerId: string) {
    setMessage(
      playerId
        ? "Associo account registrato al player CODM..."
        : "Rimuovo associazione player/account...",
    );
    try {
      const result = await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          action: "linkPlayer",
          userId: row.id,
          playerId,
          email: row.email,
        }),
      });
      setMessage(result.message || "Associazione aggiornata.");
      await load(false);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Errore associazione account/player.",
      );
    }
  }

  async function updatePermission(
    row: AdminUserRow,
    key: CodmPermissionKey,
    value: boolean,
  ) {
    const next = { ...permissionsFor(row), [key]: value };
    setUsers((current) =>
      current.map((item) =>
        item.id === row.id ? { ...item, permissions: next } : item,
      ),
    );
    setMessage("Aggiorno permessi utente...");
    try {
      const result = await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          action: "updatePermissions",
          userId: row.id,
          permissions: next,
          email: row.email,
        }),
      });
      setMessage(result.message || "Permessi aggiornati.");
      await load(false);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Errore aggiornamento permessi. Esegui prima lo script SQL V13.1 permessi.",
      );
      await load(false);
    }
  }

  async function deleteUser(row: AdminUserRow) {
    if (row.email?.toLowerCase() === "hasnaiiin@gmail.com")
      return setMessage("Admin principale non cancellabile.");
    if (
      !confirm(
        `Cancellare ${row.email || row.player_nickname || "utente"} da Auth/roster?`,
      )
    )
      return;
    setMessage("Cancello utente...");
    try {
      const result = await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          action: "deleteUser",
          userId: row.id,
          playerId: row.player_id,
          email: row.email,
        }),
      });
      setMessage(result.message || "Utente cancellato.");
      await load(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Errore cancellazione utente.",
      );
    }
  }

  async function updateRosterStatus(row: AdminUserRow, status: string) {
    if (!row.player_id)
      return setMessage("Prima sincronizza il player nel roster.");
    setMessage("Aggiorno stato roster...");
    try {
      const result = await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          action: "setRosterStatus",
          playerId: row.player_id,
          status,
        }),
      });
      setMessage(result.message || "Stato roster aggiornato.");
      await load(false);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Errore aggiornamento stato roster.",
      );
    }
  }

  if (auth.loading) return <WriteAccessBlock loading />;
  if (!auth.canManageUsers) {
    return (
      <WriteAccessBlock
        role={auth.role}
        title="Solo Owner può gestire utenti"
        description="L’admin principale è hasnaiiin@gmail.com. Da questa pagina si vedono utenti registrati, roster e ruoli solo con permesso Owner."
      />
    );
  }

  return (
    <main className="container wide admin-users-stable">
      <section className="card ak-section-head">
        <p className="eyebrow">🔐 Clan Manager Owner Center</p>
        <h1>Gestione utenti, ruoli e roster</h1>
        <p className="muted">
          Lista reale da Supabase Auth tramite API sicura server. Qui associ
          account registrati ai player del roster oppure ai nomi trovati nelle
          statistiche/import; se il player non esiste viene creato
          automaticamente.
        </p>
        <div className="top-gap admin-toolbar-v69">
          <button
            className="btn small"
            onClick={() => void load(false)}
            disabled={loading}
          >
            {loading ? "Carico..." : "Aggiorna lista"}
          </button>
          <button
            className="btn small secondary"
            onClick={() => void syncAll()}
            disabled={syncing}
          >
            {syncing ? "Sync..." : "Sincronizza Auth → Roster"}
          </button>
          <input
            className="input admin-search-v69"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca email, nome, nickname, UID, ruolo..."
          />
        </div>
        {message && <div className="notice top-gap">{message}</div>}
      </section>

      <section className="grid grid-4 top-gap admin-diagnostic-grid-v69">
        <div className="card">
          <p className="eyebrow">Clan</p>
          <h2>{clanLabel}</h2>
          <p className="muted">TAG ufficiale assegnato ai player.</p>
        </div>
        <div className="card">
          <p className="eyebrow">Auth users</p>
          <h2>{diagnostics?.auth_users ?? "-"}</h2>
          <p className="muted">Account registrati reali.</p>
        </div>
        <div className="card">
          <p className="eyebrow">Roster</p>
          <h2>{diagnostics?.roster_players ?? "-"}</h2>
          <p className="muted">Giocatori presenti nel roster.</p>
        </div>
        <div className="card">
          <p className="eyebrow">Da sincronizzare</p>
          <h2>{needsSync}</h2>
          <p className="muted">Account senza membro o player collegato.</p>
        </div>
      </section>

      <section className="card top-gap">
        <div className="section-title">
          <div>
            <h2>Utenti registrati</h2>
            <p className="muted">
              Cambia ruolo e stato roster. hasnaiiin@gmail.com resta sempre
              Owner.
            </p>
          </div>
          <span className="match-status-pill loaded">
            {filteredUsers.length} utenti
          </span>
          <span className="match-status-pill played">
            {playerOptions.length} player associabili
          </span>
        </div>

        {loading && (
          <p className="notice top-gap">Caricamento lista utenti...</p>
        )}
        {!loading && !filteredUsers.length && (
          <p className="empty-state">
            Nessun utente visibile. Controlla SUPABASE_SERVICE_ROLE_KEY in
            Vercel e premi Sincronizza.
          </p>
        )}

        <div className="admin-users-list-v69 top-gap">
          {filteredUsers.map((row) => (
            <article key={row.id} className="admin-user-card-v69">
              <div className="admin-user-main-v69">
                <div>
                  <div className="eyebrow">Account</div>
                  <h3>
                    {row.player_nickname ||
                      row.display_name ||
                      row.email ||
                      "Utente registrato"}
                  </h3>
                  <p className="muted">
                    {row.email || "-"} · UID {row.codm_uid || "-"}
                  </p>
                </div>
                <div className="admin-user-badges-v69">
                  <span
                    className={`match-status-pill ${roleBadgeClass(row.role)}`}
                  >
                    {row.role === "registered"
                      ? "Registrato"
                      : roleLabel(row.role as CodmRole)}
                  </span>
                  <span
                    className={`match-status-pill ${row.player_id ? "loaded" : ""}`}
                  >
                    {row.player_id ? "Nel roster" : "No roster"}
                  </span>
                  <span
                    className={`match-status-pill ${row.member_id ? "played" : ""}`}
                  >
                    {row.member_id ? "Membro clan" : "No membro"}
                  </span>
                </div>
              </div>

              <div className="grid grid-4 top-gap">
                <div className="field">
                  <label>Nome registrato</label>
                  <input
                    className="input"
                    value={row.display_name || "-"}
                    disabled
                  />
                </div>
                <div className="field">
                  <label>Nome in gioco</label>
                  <input
                    className="input"
                    value={row.player_nickname || "-"}
                    disabled
                  />
                </div>
                <div className="field">
                  <label>Data registrazione</label>
                  <input
                    className="input"
                    value={dateLabel(row.created_at)}
                    disabled
                  />
                </div>
                <div className="field">
                  <label>Ultimo accesso</label>
                  <input
                    className="input"
                    value={dateLabel(row.last_sign_in_at)}
                    disabled
                  />
                </div>
              </div>

              <div className="grid grid-4 top-gap">
                <div className="field">
                  <label>Ruolo app</label>
                  <select
                    className="select"
                    value={row.role === "registered" ? "player" : row.role}
                    disabled={
                      row.email?.toLowerCase() === "hasnaiiin@gmail.com"
                    }
                    onChange={(event) =>
                      void updateRole(row, event.target.value as CodmRole)
                    }
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                  {row.email?.toLowerCase() === "hasnaiiin@gmail.com" && (
                    <small className="muted">
                      Admin principale bloccato come Owner.
                    </small>
                  )}
                </div>
                <div className="field">
                  <label>Stato roster</label>
                  <select
                    className="select"
                    value={row.roster_status || "active"}
                    onChange={(event) =>
                      void updateRosterStatus(row, event.target.value)
                    }
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Associa account registrato</label>
                  <select
                    className="select"
                    value={row.player_id || ""}
                    onChange={(event) =>
                      void linkPlayerToUser(row, event.target.value)
                    }
                  >
                    <option value="">Nessun player collegato</option>
                    {playerOptions.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.nickname}
                        {player.uid_codm ? ` · UID ${player.uid_codm}` : ""}
                        {player.source === "stats"
                          ? " · da statistiche/crea player"
                          : ""}
                        {player.user_id && player.user_id !== row.id
                          ? " · già collegato"
                          : ""}
                      </option>
                    ))}
                  </select>
                  <small className="muted">
                    La lista include roster + nomi trovati nelle statistiche. Vale anche per l’admin principale: puoi spostare il tuo account sul player corretto con statistiche. Se scegli un nome da statistiche, viene creato il player e collegato all’account.
                  </small>
                </div>
                <div className="field">
                  <label>Azioni</label>
                  <button
                    className="btn small danger"
                    type="button"
                    disabled={
                      row.email?.toLowerCase() === "hasnaiiin@gmail.com"
                    }
                    onClick={() => void deleteUser(row)}
                  >
                    🗑️ Cancella
                  </button>
                  <small className="muted">
                    Promuovi/declassa dal menu ruolo.
                  </small>
                </div>
              </div>

              <details className="notice compact top-gap admin-permissions-v131">
                <summary>
                  Permessi granulari: cosa può fare e cosa può vedere
                </summary>
                <div className="permissions-flag-grid-v131 top-gap">
                  {CODM_PERMISSION_KEYS.map((key) => {
                    const checked = permissionsFor(row)[key];
                    const locked =
                      row.email?.toLowerCase() === "hasnaiiin@gmail.com";
                    return (
                      <label
                        className="check-line permission-flag-v131"
                        key={key}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={(event) =>
                            void updatePermission(
                              row,
                              key,
                              event.target.checked,
                            )
                          }
                        />
                        {permissionLabels[key]}
                      </label>
                    );
                  })}
                </div>
                <small className="muted">
                  I flag permettono di dare permessi precisi senza dover rendere
                  tutti Owner.
                </small>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section className="card top-gap admin-only-debug">
        <details>
          <summary>Diagnostica admin</summary>
          <pre className="diagnostic-pre-v69">
            {JSON.stringify(diagnostics || {}, null, 2)}
          </pre>
        </details>
      </section>
    </main>
  );
}
