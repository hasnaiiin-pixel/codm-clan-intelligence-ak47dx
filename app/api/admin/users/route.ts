import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAIN_ADMIN_EMAIL = "hasnaiiin@gmail.com";
const DEFAULT_CLAN_NAME = "AK47DX";
const DEFAULT_CLAN_TAG = "AK47DX";
const DEFAULT_PLAYER_ROLE = "player";

type CodmRole = "viewer" | "player" | "staff" | "coach" | "owner";
const allowedRoles: CodmRole[] = [
  "viewer",
  "player",
  "staff",
  "coach",
  "owner",
];
type PermissionKey =
  | "view_events"
  | "create_events"
  | "edit_events"
  | "delete_events"
  | "insert_results"
  | "view_stats"
  | "manage_players"
  | "link_accounts"
  | "manage_users"
  | "manage_telegram"
  | "view_admin_panel";
const permissionKeys: PermissionKey[] = [
  "view_events",
  "create_events",
  "edit_events",
  "delete_events",
  "insert_results",
  "view_stats",
  "manage_players",
  "link_accounts",
  "manage_users",
  "manage_telegram",
  "view_admin_panel",
];
const emptyPermissions = Object.fromEntries(
  permissionKeys.map((key) => [key, false]),
) as Record<PermissionKey, boolean>;
const fullPermissions = Object.fromEntries(
  permissionKeys.map((key) => [key, true]),
) as Record<PermissionKey, boolean>;
const defaultPermissionsByRole: Record<
  CodmRole | "registered",
  Record<PermissionKey, boolean>
> = {
  registered: { ...emptyPermissions, view_events: true, view_stats: true },
  viewer: { ...emptyPermissions, view_events: true, view_stats: true },
  player: { ...emptyPermissions, view_events: true, view_stats: true },
  staff: {
    ...emptyPermissions,
    view_events: true,
    create_events: true,
    edit_events: true,
    insert_results: true,
    view_stats: true,
    manage_players: true,
  },
  coach: {
    ...emptyPermissions,
    view_events: true,
    create_events: true,
    edit_events: true,
    delete_events: true,
    insert_results: true,
    view_stats: true,
    manage_players: true,
    link_accounts: true,
    manage_telegram: true,
    view_admin_panel: true,
  },
  owner: fullPermissions,
};

type AdminClient = any;

type ClanRow = {
  id: string;
  name?: string | null;
  tag?: string | null;
  owner_user_id?: string | null;
};
type AuthUserLite = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  user_metadata?: Record<string, any> | null;
};

function normalizeEmail(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isMainAdminEmail(value?: string | null) {
  return normalizeEmail(value) === MAIN_ADMIN_EMAIL;
}

function normalizePermissions(
  role: CodmRole | "registered",
  raw?: Record<string, unknown> | null,
) {
  const base = {
    ...(defaultPermissionsByRole[role] || defaultPermissionsByRole.registered),
  };
  if (!raw || typeof raw !== "object") return base;
  for (const key of permissionKeys) {
    if (Object.prototype.hasOwnProperty.call(raw, key))
      base[key] = Boolean(raw[key]);
  }
  return base;
}

function cleanPermissions(raw: unknown) {
  const input =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(
    permissionKeys.map((key) => [key, Boolean(input[key])]),
  ) as Record<PermissionKey, boolean>;
}

function normalizeNickname(value: unknown) {
  return String(value || "").trim();
}

function playerOptionKey(nickname: string) {
  return nickname.trim().toLowerCase();
}

function virtualStatPlayerId(nickname: string) {
  return `stat:${encodeURIComponent(nickname)}`;
}

function nicknameFromVirtualPlayerId(value: string) {
  if (!value.startsWith("stat:")) return "";
  try {
    return decodeURIComponent(value.slice(5)).trim();
  } catch {
    return value.slice(5).trim();
  }
}

function buildPlayerOptions(players: any[], statRows: any[], clan: ClanRow) {
  const known = new Set<string>();
  const options: any[] = [];
  for (const player of players || []) {
    const nickname = normalizeNickname(player.nickname);
    if (!nickname) continue;
    known.add(playerOptionKey(nickname));
    options.push({ ...player, source: "roster" });
  }
  const statNames = new Map<string, any>();
  for (const row of statRows || []) {
    const nickname = normalizeNickname(
      row?.players?.nickname || row?.nickname_resolved || row?.nickname_raw,
    );
    if (!nickname) continue;
    const key = playerOptionKey(nickname);
    if (known.has(key) || statNames.has(key)) continue;
    statNames.set(key, {
      id: virtualStatPlayerId(nickname),
      nickname,
      uid_codm: null,
      user_id: null,
      clan_name:
        row?.players?.clan_name || clan.tag || clan.name || DEFAULT_CLAN_TAG,
      status: "from_stats",
      source: "stats",
    });
  }
  return [...options, ...Array.from(statNames.values())].sort((a, b) =>
    String(a.nickname || "").localeCompare(String(b.nickname || ""), "it"),
  );
}

async function createOrFindPlayerFromStats(
  admin: AdminClient,
  clan: ClanRow,
  nickname: string,
) {
  const clean = normalizeNickname(nickname);
  if (!clean)
    throw Object.assign(new Error("Nome player statistiche mancante."), {
      status: 400,
    });
  const clanName = clan.tag || clan.name || DEFAULT_CLAN_TAG;
  const { data: existing, error: existingError } = await admin
    .from("players")
    .select("id,nickname,uid_codm")
    .eq("clan_id", clan.id)
    .eq("nickname", clean)
    .limit(1);
  if (existingError) throw existingError;
  if (existing?.[0]?.id) return existing[0];
  const { data: created, error } = await admin
    .from("players")
    .insert({
      clan_id: clan.id,
      nickname: clean,
      uid_codm: null,
      clan_name: clanName,
      status: "active",
      notes:
        "Creato da Gestione utenti V13.2: nome trovato nelle statistiche/import risultati e poi associato ad account registrato.",
    })
    .select("id,nickname,uid_codm")
    .single();
  if (error) throw error;
  return created;
}

async function backfillScoreboardPlayerLinks(
  admin: AdminClient,
  playerId: string,
  nickname: string,
) {
  const clean = normalizeNickname(nickname);
  if (!clean) return;
  const updates = [
    admin
      .from("match_scoreboard_rows")
      .update({ player_id: playerId })
      .is("player_id", null)
      .eq("nickname_resolved", clean),
    admin
      .from("match_scoreboard_rows")
      .update({ player_id: playerId })
      .is("player_id", null)
      .eq("nickname_raw", clean),
  ];
  const results = await Promise.allSettled(updates);
  for (const result of results) {
    if (
      result.status === "fulfilled" &&
      result.value?.error &&
      !/does not exist|schema cache|column/i.test(
        result.value.error.message || "",
      )
    )
      throw result.value.error;
  }
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    throw new Error(
      "Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
    );
  return createClient<any>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function anonClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey)
    throw new Error(
      "Mancano NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  return createClient<any>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireRequester(request: NextRequest) {
  const token = (request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token)
    throw Object.assign(new Error("Login mancante. Fai accesso come Owner."), {
      status: 401,
    });
  const { data, error } = await anonClient(token).auth.getUser();
  if (error || !data.user?.id)
    throw Object.assign(new Error("Sessione non valida."), { status: 401 });
  return data.user;
}

async function getOrCreateClan(
  admin: AdminClient,
  ownerUserId?: string | null,
): Promise<ClanRow> {
  const { data: clans, error } = await admin
    .from("clans")
    .select("id,name,tag,owner_user_id,created_at")
    .or(
      `name.ilike.${DEFAULT_CLAN_NAME},tag.ilike.${DEFAULT_CLAN_TAG},tag.ilike.AK`,
    )
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  let clan = clans?.[0] as ClanRow | undefined;
  if (!clan?.id) {
    if (!ownerUserId)
      throw new Error("Clan non trovato e owner non disponibile per crearlo.");
    const { data: created, error: createError } = await admin
      .from("clans")
      .insert({
        name: DEFAULT_CLAN_NAME,
        tag: DEFAULT_CLAN_TAG,
        owner_user_id: ownerUserId,
      })
      .select("id,name,tag,owner_user_id")
      .single();
    if (createError) throw createError;
    clan = created as ClanRow;
  }
  if (!clan?.id) throw new Error("Clan non trovato.");
  return clan;
}

async function assertOwner(admin: AdminClient, requester: any, clanId: string) {
  if (isMainAdminEmail(requester.email)) return true;
  const { data, error } = await admin
    .from("clan_members")
    .select("role")
    .eq("clan_id", clanId)
    .eq("user_id", requester.id)
    .maybeSingle();
  if (error) throw error;
  if (data?.role !== "owner")
    throw Object.assign(
      new Error("Solo Owner può vedere e modificare la gestione utenti."),
      { status: 403 },
    );
  return true;
}

async function listAuthUsers(admin: AdminClient): Promise<AuthUserLite[]> {
  const users: AuthUserLite[] = [];
  for (let page = 1; page <= 6; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 500,
    });
    if (error) throw error;
    const batch = (data?.users || []) as AuthUserLite[];
    users.push(...batch);
    if (batch.length < 500) break;
  }
  return users;
}

function nicknameFromUser(user: AuthUserLite) {
  const meta = user.user_metadata || {};
  return String(
    meta.player_nickname ||
      meta.codm_nickname ||
      meta.nickname ||
      meta.name ||
      meta.display_name ||
      user.email?.split("@")[0] ||
      "Player",
  ).trim();
}

function displayNameFromUser(user: AuthUserLite) {
  const meta = user.user_metadata || {};
  return String(
    meta.display_name ||
      meta.name ||
      user.email?.split("@")[0] ||
      nicknameFromUser(user),
  ).trim();
}

function codmUidFromUser(user: AuthUserLite) {
  const meta = user.user_metadata || {};
  return meta.codm_uid ? String(meta.codm_uid).trim() : null;
}

async function safeUpsertProfile(admin: AdminClient, user: AuthUserLite) {
  const payload = {
    id: user.id,
    email: user.email || null,
    display_name: displayNameFromUser(user),
    player_nickname: nicknameFromUser(user),
    codm_uid: codmUidFromUser(user),
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin
    .from("profiles")
    .upsert(payload, { onConflict: "id" });
  if (
    error &&
    /email|player_nickname|codm_uid|updated_at/i.test(error.message)
  ) {
    await admin
      .from("profiles")
      .upsert(
        { id: user.id, display_name: payload.display_name },
        { onConflict: "id" },
      );
  } else if (error) throw error;
}

async function ensurePlayerForUser(
  admin: AdminClient,
  clan: ClanRow,
  user: AuthUserLite,
) {
  const nickname = nicknameFromUser(user) || "Player";
  const uid = codmUidFromUser(user);
  const clanTag = clan.tag || clan.name || DEFAULT_CLAN_TAG;

  const { data: existingByUser, error: byUserError } = await admin
    .from("players")
    .select("id,nickname")
    .eq("clan_id", clan.id)
    .eq("user_id", user.id)
    .limit(1);
  if (byUserError && !/user_id/i.test(byUserError.message)) throw byUserError;

  const existingId = existingByUser?.[0]?.id;
  const payload = {
    clan_id: clan.id,
    user_id: user.id,
    nickname,
    uid_codm: uid,
    clan_name: clanTag,
    status: "active",
    notes: `Sync automatico V6.9 · email=${user.email || "-"} · sorgente=Supabase Auth`,
  };

  if (existingId) {
    const { error } = await admin
      .from("players")
      .update(payload)
      .eq("id", existingId);
    if (error) throw error;
    return existingId as string;
  }

  const { data: existingByNickname, error: byNameError } = await admin
    .from("players")
    .select("id")
    .eq("clan_id", clan.id)
    .eq("nickname", nickname)
    .limit(1);
  if (byNameError) throw byNameError;

  if (existingByNickname?.[0]?.id) {
    const { error } = await admin
      .from("players")
      .update(payload)
      .eq("id", existingByNickname[0].id);
    if (error) throw error;
    return existingByNickname[0].id as string;
  }

  const { data: created, error } = await admin
    .from("players")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return created?.id as string;
}

async function syncAuthUsersToClan(
  admin: AdminClient,
  clan: ClanRow,
  authUsers: AuthUserLite[],
) {
  let synced = 0;
  for (const user of authUsers) {
    if (!user.id) continue;
    await safeUpsertProfile(admin, user);
    const role: CodmRole = isMainAdminEmail(user.email)
      ? "owner"
      : DEFAULT_PLAYER_ROLE;
    const { error: memberError } = await admin
      .from("clan_members")
      .upsert(
        { clan_id: clan.id, user_id: user.id, role },
        { onConflict: "clan_id,user_id" },
      );
    if (memberError) throw memberError;
    await ensurePlayerForUser(admin, clan, user);
    synced += 1;
  }
  return synced;
}

async function selectClanMembers(admin: AdminClient, clanId: string) {
  let result = await admin
    .from("clan_members")
    .select("id,clan_id,user_id,role,permissions,created_at")
    .eq("clan_id", clanId)
    .limit(1000);
  if (result.error && /permissions|column/i.test(result.error.message || "")) {
    result = await admin
      .from("clan_members")
      .select("id,clan_id,user_id,role,created_at")
      .eq("clan_id", clanId)
      .limit(1000);
  }
  if (result.error) throw result.error;
  return result.data || [];
}

export async function GET(request: NextRequest) {
  try {
    const requester = await requireRequester(request);
    const admin = serviceClient();
    const clan = await getOrCreateClan(admin, requester.id);
    await assertOwner(admin, requester, clan.id);

    const authUsers = await listAuthUsers(admin);
    let synced = 0;
    if (request.nextUrl.searchParams.get("sync") === "1") {
      synced = await syncAuthUsersToClan(admin, clan, authUsers);
    }

    const [{ data: profiles }, members, { data: players }, { data: requests }] =
      await Promise.all([
        admin
          .from("profiles")
          .select(
            "id,email,display_name,player_nickname,codm_uid,created_at,updated_at",
          )
          .limit(1000),
        selectClanMembers(admin, clan.id),
        admin
          .from("players")
          .select(
            "id,clan_id,user_id,nickname,uid_codm,clan_name,status,created_at",
          )
          .eq("clan_id", clan.id)
          .order("nickname")
          .limit(1000),
        admin
          .from("clan_invite_requests")
          .select(
            "id,clan_id,user_id,nickname,uid_codm,social_contact,status,linked_player_id,created_at",
          )
          .eq("clan_id", clan.id)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

    const statRowsResult = await admin
      .from("match_scoreboard_rows")
      .select(
        "player_id,nickname_resolved,nickname_raw,players(nickname,uid_codm,clan_name,user_id,status)",
      )
      .limit(5000);
    const statRows =
      statRowsResult.error &&
      !/does not exist|schema cache|relation/i.test(
        statRowsResult.error.message || "",
      )
        ? []
        : statRowsResult.data || [];
    const playerOptions = buildPlayerOptions(players || [], statRows, clan);

    const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
    const memberByUser = new Map(
      (members || []).map((m: any) => [m.user_id, m]),
    );
    const playerByUser = new Map(
      (players || [])
        .filter((p: any) => p.user_id)
        .map((p: any) => [p.user_id, p]),
    );
    const pendingByUser = new Map(
      (requests || [])
        .filter((r: any) => r.user_id && r.status === "pending")
        .map((r: any) => [r.user_id, r]),
    );

    const rows = authUsers.map((user) => {
      const profile: any = profileById.get(user.id) || {};
      const member: any = memberByUser.get(user.id) || null;
      const player: any = playerByUser.get(user.id) || null;
      const pending: any = pendingByUser.get(user.id) || null;
      const role = (
        isMainAdminEmail(user.email) ? "owner" : member?.role || "registered"
      ) as CodmRole | "registered";
      const permissions = isMainAdminEmail(user.email)
        ? fullPermissions
        : normalizePermissions(role, member?.permissions);
      return {
        id: user.id,
        email: user.email || profile.email || null,
        created_at: user.created_at || profile.created_at || null,
        last_sign_in_at: user.last_sign_in_at || null,
        display_name: profile.display_name || displayNameFromUser(user),
        player_nickname:
          player?.nickname || profile.player_nickname || nicknameFromUser(user),
        codm_uid: player?.uid_codm || profile.codm_uid || codmUidFromUser(user),
        member_id: member?.id || null,
        role,
        player_id: player?.id || null,
        roster_status: player?.status || null,
        clan_name:
          player?.clan_name || clan.tag || clan.name || DEFAULT_CLAN_TAG,
        pending_request_id: pending?.id || null,
        pending_status: pending?.status || null,
        permissions,
      };
    });

    return NextResponse.json({
      ok: true,
      clan,
      users: rows,
      players: playerOptions,
      requests: requests || [],
      diagnostics: {
        auth_users: authUsers.length,
        profiles: profiles?.length || 0,
        clan_members: members?.length || 0,
        roster_players: players?.length || 0,
        pending_requests: (requests || []).filter(
          (r: any) => r.status === "pending",
        ).length,
        synced,
        service_role: true,
        requester: requester.email,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Errore gestione utenti." },
      { status: error?.status || 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const requester = await requireRequester(request);
    const admin = serviceClient();
    const clan = await getOrCreateClan(admin, requester.id);
    await assertOwner(admin, requester, clan.id);

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "syncAll") {
      const authUsers = await listAuthUsers(admin);
      const synced = await syncAuthUsersToClan(admin, clan, authUsers);
      return NextResponse.json({
        ok: true,
        message: `Sync completato: ${synced} utenti registrati allineati a roster e permessi.`,
        synced,
      });
    }

    if (action === "updateRole") {
      const userId = String(body.userId || "");
      const role = String(body.role || "") as CodmRole;
      if (!userId || !allowedRoles.includes(role))
        throw Object.assign(new Error("Ruolo o utente non valido."), {
          status: 400,
        });
      const finalRole: CodmRole =
        String(body.email || "").toLowerCase() === MAIN_ADMIN_EMAIL
          ? "owner"
          : role;
      const { error } = await admin
        .from("clan_members")
        .upsert(
          { clan_id: clan.id, user_id: userId, role: finalRole },
          { onConflict: "clan_id,user_id" },
        );
      if (error) throw error;
      return NextResponse.json({
        ok: true,
        message: `Ruolo aggiornato a ${finalRole}.`,
      });
    }

    if (action === "updatePermissions") {
      const userId = String(body.userId || "");
      const email = String(body.email || "").toLowerCase();
      if (!userId)
        throw Object.assign(new Error("Utente mancante."), { status: 400 });
      if (email === MAIN_ADMIN_EMAIL)
        throw Object.assign(
          new Error("Admin principale mantiene tutti i permessi."),
          { status: 400 },
        );
      const { data: existing } = await admin
        .from("clan_members")
        .select("role")
        .eq("clan_id", clan.id)
        .eq("user_id", userId)
        .maybeSingle();
      const existingRole = String(existing?.role || "") as CodmRole;
      const role: CodmRole = allowedRoles.includes(existingRole)
        ? existingRole
        : DEFAULT_PLAYER_ROLE;
      const permissions = cleanPermissions(body.permissions);
      const { error } = await admin
        .from("clan_members")
        .upsert(
          { clan_id: clan.id, user_id: userId, role, permissions },
          { onConflict: "clan_id,user_id" },
        );
      if (error) {
        if (/permissions|column/i.test(error.message || ""))
          throw Object.assign(
            new Error(
              "Colonna permissions mancante. Esegui supabase/UPDATE_V13_1_USER_PERMISSIONS.sql in Supabase SQL Editor.",
            ),
            { status: 400 },
          );
        throw error;
      }
      return NextResponse.json({
        ok: true,
        message: "Permessi granulari aggiornati.",
      });
    }

    if (action === "linkPlayer") {
      const userId = String(body.userId || "");
      const playerId = String(body.playerId || "");
      const email = String(body.email || "").toLowerCase();
      if (!userId)
        throw Object.assign(new Error("Utente mancante."), { status: 400 });
      if (email === MAIN_ADMIN_EMAIL)
        throw Object.assign(
          new Error(
            "Admin principale non modificabile da associazione manuale.",
          ),
          { status: 400 },
        );
      await admin
        .from("players")
        .update({ user_id: null })
        .eq("clan_id", clan.id)
        .eq("user_id", userId);
      if (!playerId)
        return NextResponse.json({
          ok: true,
          message: "Associazione player/account rimossa.",
        });
      let player: any = null;
      if (playerId.startsWith("stat:")) {
        const nickname = nicknameFromVirtualPlayerId(playerId);
        player = await createOrFindPlayerFromStats(admin, clan, nickname);
        await backfillScoreboardPlayerLinks(
          admin,
          player.id,
          player.nickname || nickname,
        );
      } else {
        const { data, error: playerError } = await admin
          .from("players")
          .select("id,nickname,uid_codm")
          .eq("clan_id", clan.id)
          .eq("id", playerId)
          .maybeSingle();
        if (playerError) throw playerError;
        player = data;
      }
      if (!player?.id)
        throw Object.assign(
          new Error("Player CODM non trovato nel roster/statistiche."),
          { status: 404 },
        );
      const { error } = await admin
        .from("players")
        .update({ user_id: userId, status: "active" })
        .eq("clan_id", clan.id)
        .eq("id", player.id);
      if (error) throw error;
      const profileUpdate = await admin.from("profiles").upsert(
        {
          id: userId,
          player_nickname: player.nickname || null,
          codm_uid: player.uid_codm || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      if (
        profileUpdate.error &&
        !/player_nickname|codm_uid|updated_at|schema cache/i.test(
          profileUpdate.error.message || "",
        )
      )
        throw profileUpdate.error;
      return NextResponse.json({
        ok: true,
        message: `Account collegato al player ${player.nickname || player.id}.`,
      });
    }

    if (action === "deleteUser") {
      const userId = String(body.userId || "");
      const email = String(body.email || "").toLowerCase();
      if (!userId)
        throw Object.assign(new Error("Utente mancante."), { status: 400 });
      if (email === MAIN_ADMIN_EMAIL)
        throw Object.assign(new Error("Admin principale non cancellabile."), {
          status: 400,
        });
      await admin
        .from("clan_members")
        .delete()
        .eq("clan_id", clan.id)
        .eq("user_id", userId);
      await admin
        .from("players")
        .delete()
        .eq("clan_id", clan.id)
        .eq("user_id", userId);
      await admin.from("profiles").delete().eq("id", userId);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
      return NextResponse.json({
        ok: true,
        message: "Utente cancellato da Auth, roster e membri clan.",
      });
    }

    if (action === "setRosterStatus") {
      const playerId = String(body.playerId || "");
      const status = String(body.status || "active");
      if (!playerId)
        throw Object.assign(new Error("Player mancante."), { status: 400 });
      const { error } = await admin
        .from("players")
        .update({ status })
        .eq("id", playerId)
        .eq("clan_id", clan.id);
      if (error) throw error;
      return NextResponse.json({
        ok: true,
        message: `Stato roster aggiornato a ${status}.`,
      });
    }

    throw Object.assign(new Error("Azione admin non riconosciuta."), {
      status: 400,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Errore aggiornamento utenti." },
      { status: error?.status || 500 },
    );
  }
}
