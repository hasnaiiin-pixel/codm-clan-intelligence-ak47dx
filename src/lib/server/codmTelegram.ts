export type TelegramResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  telegramMessageId?: number | null;
  targets?: Array<{
    name: string;
    chatId: string;
    ok: boolean;
    error?: string;
    telegramMessageId?: number | null;
  }>;
};

type MatchRound = {
  n?: number;
  matchCode?: string;
  mode?: string;
  map?: string;
  scoreType?: string;
  target?: string;
  players?: string;
  reserves?: string;
  lobbyOpen?: string;
  startTime?: string;
  bans?: string;
  status?: string;
  result?: string;
  ourScore?: string;
  opponentScore?: string;
  mvp?: string;
  location?: string;
};

type MatchPlan = {
  teamAName?: string;
  teamBName?: string;
  opponentName?: string;
  totalMatches?: number;
  lobbyTime?: string;
  discordLink?: string;
  lobbyLink?: string;
  roomNumber?: string;
  rounds?: MatchRound[];
  globalBans?: string[] | string;
};

type TelegramEvent = {
  id?: string;
  title?: string | null;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  location?: string | null;
  event_type?: string | null;
  type?: string | null;
  telegram_enabled?: boolean | null;
  google_calendar_url?: string | null;
  event_plan?: MatchPlan | null;
  convocations?: Array<{ nickname?: string; role?: string }> | null;
  convocations_text?: string | null;
  event_notes?: string | null;
  result?: Record<string, unknown> | null;
};

function env(name: string) {
  return String(process.env[name] || "").trim();
}

function splitChatIds(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((item) =>
      item
        .trim()
        .replace(/^['"]|['"]$/g, "")
        .replace(/^chat_id\s*=\s*/i, "")
        .replace(/^group\s*[:=]\s*/i, "")
        .replace(/^private\s*[:=]\s*/i, ""),
    )
    .map((item) => {
      const urlMatch = item.match(/[?&]chat_id=([^&]+)/i);
      return urlMatch ? decodeURIComponent(urlMatch[1]) : item;
    })
    .map((item) => item.trim())
    .filter(Boolean);
}

function envChatIds(names: string[]) {
  return names.flatMap((name) => splitChatIds(env(name)));
}

function looksLikeGroupChatId(chatId: string) {
  return chatId.startsWith("-") || chatId.startsWith("@") || chatId.includes("/+");
}

export function telegramChatTargets(target: "all" | "private" | "group" = "all") {
  const privateIds = envChatIds(["TELEGRAM_CHAT_ID", "TELEGRAM_PRIVATE_CHAT_ID"]);
  const groupIds = envChatIds([
    "TELEGRAM_GROUP_CHAT_ID",
    "TELEGRAM_CLAN_GROUP_CHAT_ID",
    "TELEGRAM_GROUP_ID",
    "TELEGRAM_CHAT_ID_GROUP",
    "NEXT_PUBLIC_TELEGRAM_GROUP_CHAT_ID",
  ]);

  // Se per errore in TELEGRAM_CHAT_ID vengono messi due valori, es.
  // "123456789,-1009876543210", separiamo privato e gruppo automaticamente.
  const targets = [
    ...privateIds.map((chatId) => ({
      name: looksLikeGroupChatId(chatId) ? "group" : "private",
      chatId,
    })),
    ...groupIds.map((chatId) => ({ name: "group", chatId })),
  ].filter((item) => target === "all" || item.name === target);

  const seen = new Set<string>();
  return targets.filter((item) => {
    const key = `${item.name}:${item.chatId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function telegramConfigured() {
  return Boolean(env("TELEGRAM_BOT_TOKEN") && telegramChatTargets().length);
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").trim();
}

function compact(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text ? escapeHtml(text) : fallback;
}

function eventDate(value: unknown) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "-";
  return escapeHtml(
    date.toLocaleString("it-IT", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/Rome",
    }),
  );
}

function eventTime(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "-";
  const date = new Date(text);
  if (!Number.isNaN(date.getTime()))
    return escapeHtml(
      date.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Rome",
      }),
    );
  return escapeHtml(text);
}

function planOf(event: TelegramEvent): MatchPlan {
  return event?.event_plan && typeof event.event_plan === "object"
    ? event.event_plan
    : {};
}

function eventTypeLabel(event: TelegramEvent) {
  const raw = String(event.event_type || event.type || "")
    .trim()
    .toLowerCase();
  if (raw.includes("torneo")) return "TORNEO";
  if (raw.includes("allen")) return "ALLENAMENTO";
  if (raw.includes("rank")) return "RANKED";
  return "SCRIM";
}

function teamBName(event: TelegramEvent) {
  const plan = planOf(event);
  return (
    String(plan.teamBName || plan.opponentName || "Da impostare").trim() ||
    "Da impostare"
  );
}

function teamAName(event: TelegramEvent) {
  const plan = planOf(event);
  return String(plan.teamAName || "AK47DX").trim() || "AK47DX";
}

function splitList(value: unknown): string[] {
  if (Array.isArray(value))
    return value
      .map(String)
      .map((x) => x.trim())
      .filter(Boolean);
  return String(value || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function bulletList(value: unknown, fallback = "Da confermare") {
  const items = splitList(value);
  if (!items.length) return fallback;
  return items
    .map((item, index) => `${index + 1}. ${escapeHtml(item)}`)
    .join("\n");
}

function banList(round: MatchRound, plan: MatchPlan) {
  const local = splitList(round.bans);
  const global = splitList(plan.globalBans);
  const all = Array.from(new Set([...local, ...global]));
  if (!all.length) return "Nessun BAN indicato";
  return all.map((item) => `- ${escapeHtml(item)}`).join("\n");
}

function roundModeLabel(mode?: string) {
  const raw = String(mode || "").trim();
  const normalized = raw.toUpperCase();
  const map: Record<string, string> = {
    CED: "Cerca e Distruggi",
    POSTAZIONE: "Postazione",
    DOMINIO: "Dominio",
    CONTROL: "Control",
    TDM: "Team Deathmatch",
    BR: "Battle Royale",
    SCRIM: "Scrim libero",
    KILL_CONFIRMED: "Kill Confirmed",
  };
  return map[normalized] || raw || "Modalità da decidere";
}

function renderRound(round: MatchRound, index: number, plan: MatchPlan) {
  const n = round.n || index + 1;
  const location =
    round.location ||
    plan.roomNumber ||
    plan.lobbyLink ||
    "Private lobby / da confermare";
  const start = round.startTime || "";
  const lobby = round.lobbyOpen || plan.lobbyTime || "";
  const lines = [
    `🎯 <b>PARTITA ${n}</b>`,
    `🕘 <b>Orario:</b> ${compact(start || lobby, "-")}`,
    `🎧 <b>Lobby:</b> ${compact(lobby, "-")}`,
    `🗺️ <b>Mappa:</b> ${compact(round.map, "Da decidere")}`,
    `🎮 <b>Modalità:</b> <b>${escapeHtml(roundModeLabel(round.mode))}</b>`,
    `📍 <b>Dove si gioca:</b> ${compact(location, "-")}`,
    "",
    `👥 <b>Titolari:</b>`,
    bulletList(round.players),
    "",
    `🔁 <b>Riserve:</b>`,
    bulletList(round.reserves),
    "",
    `🚫 <b>BAN:</b>`,
    banList(round, plan),
  ];
  const score =
    round.ourScore || round.opponentScore
      ? `${round.ourScore || "-"} - ${round.opponentScore || "-"}`
      : "";
  if (score || round.result || round.mvp) {
    lines.push(
      "",
      `🏆 <b>Risultato:</b> ${compact(round.result || score, "Da giocare")}`,
    );
    if (score) lines.push(`📊 <b>Score:</b> ${escapeHtml(score)}`);
    if (round.mvp) lines.push(`⭐ <b>MVP:</b> ${escapeHtml(round.mvp)}`);
  }
  return lines.join("\n");
}

function fallbackConvocations(event: TelegramEvent) {
  const starters = (event.convocations || []).filter((p) =>
    String(p.role || "")
      .toLowerCase()
      .includes("titol"),
  );
  const reserves = (event.convocations || []).filter((p) =>
    String(p.role || "")
      .toLowerCase()
      .includes("ris"),
  );
  if (!starters.length && !reserves.length && event.convocations_text) {
    return `👥 <b>Convocati:</b>\n${escapeHtml(event.convocations_text)}`;
  }
  const starterText = starters.length
    ? starters
        .map((p, i) => `${i + 1}. ${escapeHtml(p.nickname || "-")}`)
        .join("\n")
    : "Da confermare";
  const reserveText = reserves.length
    ? reserves
        .map((p, i) => `${i + 1}. ${escapeHtml(p.nickname || "-")}`)
        .join("\n")
    : "Da confermare";
  return `👥 <b>Titolari:</b>\n${starterText}\n\n🔁 <b>Riserve:</b>\n${reserveText}`;
}

function eventNotes(event: TelegramEvent) {
  const notes = String(event.event_notes || event.description || "")
    .replace(/AK_EVENT_PLAN_V[\d_]+::[\s\S]*$/g, "")
    .trim();
  return notes;
}

function eventLink(event: TelegramEvent, plan: MatchPlan) {
  return String(plan.discordLink || plan.lobbyLink || "").trim();
}

export function renderProfessionalEventTelegram(
  event: TelegramEvent,
  mode: "created" | "updated" | "deleted" | "result" | "reminder" | "started",
  options?: { minutes?: number },
) {
  const plan = planOf(event);
  const rounds =
    Array.isArray(plan.rounds) && plan.rounds.length ? plan.rounds : [];
  const lifecycle: Record<typeof mode, string> = {
    created: "🆕 Evento creato",
    updated: "✏️ Evento modificato",
    deleted: "🔴 EVENTO CANCELLATO",
    result: "🏆 Risultato aggiornato",
    reminder: options?.minutes
      ? `⏰ Reminder: mancano ${options.minutes} minuti`
      : "⏰ Reminder evento",
    started: "🚀 Evento iniziato",
  };
  const headline = `${eventTypeLabel(event)} CONTRO ${teamBName(event)}`;
  const lines: string[] = [
    `🎮 <b>CLAN MANAGER AK47DX</b>`,
    "",
    mode === "deleted"
      ? "🔴🔴🔴 <b>EVENTO CANCELLATO</b> 🔴🔴🔴"
      : `<b>${escapeHtml(lifecycle[mode])}</b>`,
    mode === "deleted" ? "━━━━━━━━━━━━━━━━━━━━" : "",
    `<b>${escapeHtml(headline)}</b>`,
    "",
    `📅 <b>Data:</b> ${eventDate(event.starts_at)}`,
    `🆚 <b>Match:</b> ${escapeHtml(teamAName(event))} vs ${escapeHtml(teamBName(event))}`,
    `📍 <b>Dove:</b> ${compact(event.location || plan.roomNumber || plan.lobbyLink || "CODM room")}`,
  ];
  if (plan.lobbyTime)
    lines.push(`🎧 <b>Apertura lobby:</b> ${escapeHtml(plan.lobbyTime)}`);
  if (plan.roomNumber)
    lines.push(`🔢 <b>Room ID:</b> ${escapeHtml(plan.roomNumber)}`);

  if (rounds.length) {
    rounds.forEach((round, index) => {
      lines.push(
        "",
        "━━━━━━━━━━━━━━━━━━━━",
        "",
        renderRound(round, index, plan),
      );
    });
  } else {
    lines.push("", "━━━━━━━━━━━━━━━━━━━━", "", fallbackConvocations(event));
  }

  const link = eventLink(event, plan);
  const notes = eventNotes(event);
  lines.push("", "━━━━━━━━━━━━━━━━━━━━");
  if (link) lines.push("", `🔗 <b>Link:</b> ${escapeHtml(link)}`);
  if (notes) lines.push("", `📝 <b>Note:</b>\n${escapeHtml(notes)}`);
  return lines
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
    .join("\n")
    .slice(0, 3900);
}

export async function sendTelegramHtml(
  text: string,
  options?: { target?: "all" | "private" | "group" },
): Promise<TelegramResult> {
  const token = env("TELEGRAM_BOT_TOKEN");
  const targets = telegramChatTargets(options?.target || "all");
  if (!token || !targets.length) {
    return {
      ok: false,
      skipped: true,
      error:
        `TELEGRAM_BOT_TOKEN e target Telegram mancanti. Target richiesto: ${options?.target || "all"}. Per il gruppo usa TELEGRAM_GROUP_CHAT_ID con ID negativo tipo -100xxxxxxxxxx.`,
    };
  }

  const results: NonNullable<TelegramResult["targets"]> = [];
  for (const target of targets) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: target.chatId,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        },
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) {
        results.push({
          ...target,
          ok: false,
          error: json?.description || `Telegram HTTP ${response.status}`,
        });
      } else {
        results.push({
          ...target,
          ok: true,
          telegramMessageId: json.result?.message_id ?? null,
        });
      }
    } catch (error) {
      results.push({
        ...target,
        ok: false,
        error:
          error instanceof Error ? error.message : "Errore invio Telegram.",
      });
    }
  }

  const successes = results.filter((item) => item.ok);
  if (successes.length) {
    const failed = results.filter((item) => !item.ok);
    return {
      ok: failed.length === 0,
      error: failed.length
        ? `Invio parziale: ${failed.map((item) => `${item.name}: ${item.error || "errore"}`).join(" · ")}`
        : undefined,
      telegramMessageId: successes[0]?.telegramMessageId ?? null,
      targets: results,
    };
  }
  return {
    ok: false,
    error:
      results
        .map((item) => `${item.name}: ${item.error || "errore"}`)
        .join(" · ") || "Nessun invio Telegram riuscito.",
    targets: results,
  };
}

export async function sendTelegramEventLifecycle(
  mode: "created" | "updated" | "deleted" | "result",
  event: TelegramEvent,
): Promise<TelegramResult> {
  if (mode !== "deleted" && event?.telegram_enabled === false)
    return { ok: true, skipped: true };
  return sendTelegramHtml(renderProfessionalEventTelegram(event, mode));
}

export async function sendTelegramReminder(
  event: TelegramEvent,
  minutes: number,
): Promise<TelegramResult> {
  if (event?.telegram_enabled === false) return { ok: true, skipped: true };
  const mode = minutes === 0 ? "started" : "reminder";
  return sendTelegramHtml(
    renderProfessionalEventTelegram(event, mode, { minutes }),
  );
}

export function plainTextFromTelegramHtml(value: string) {
  return stripHtml(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}
