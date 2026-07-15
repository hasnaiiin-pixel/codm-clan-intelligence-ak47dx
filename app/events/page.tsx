"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useCodmAuth } from "@/lib/authRoles";

type MatchRound = {
  n: number;
  matchCode: string;
  mode: string;
  map: string;
  scoreType: string;
  target: string;
  players: string;
  reserves: string;
  lobbyOpen: string;
  startTime: string;
  bans: string;
  status?: string;
  result: string;
  ourScore: string;
  opponentScore: string;
  mvp: string;
};

type MatchPlan = {
  eventStatus?: string;
  matchesDeferred?: boolean;
  teamAName: string;
  teamBName: string;
  teamALogo: string;
  teamBLogo: string;
  coverImage: string;
  totalMatches: number;
  lobbyTime: string;
  discordLink: string;
  lobbyLink: string;
  roomNumber: string;
  rounds: MatchRound[];
};

type CodmEvent = {
  id: string;
  clan_id: string;
  local_id?: string | null;
  sync_status?: "pending" | "synced" | "error" | null;
  sync_error?: string | null;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  event_type: string | null;
  google_calendar_url: string | null;
  telegram_enabled: boolean | null;
  created_at: string;
  convocations?: Array<{ id: string; nickname: string; role?: string }> | null;
  convocations_text?: string | null;
  reminder_minutes?: number[] | null;
  telegram_message_template?: string | null;
  event_notes?: string | null;
  event_plan?: MatchPlan | null;
};

type PlayerRow = {
  id: string;
  nickname: string;
  clan_name?: string | null;
  status?: string | null;
};
type EventPlayerRow = {
  event_id: string;
  player_id: string | null;
  nickname: string;
  status?: string | null;
};
type ModeOption = { value: string; label: string; icon: string; help: string };
type ScoreTypeOption = {
  value: string;
  label: string;
  target: string;
  help: string;
};

const PLAN_MARKER = "AK_EVENT_PLAN_V6_9::";
const OLD_PLAN_MARKERS = [
  "AK_EVENT_PLAN_V6_7::",
  "AK_EVENT_PLAN_V6_6::",
  "AK_EVENT_PLAN_V6_5::",
  "AK_EVENT_PLAN_V6_4::",
  "AK_EVENT_PLAN_V6_3::",
  "AK_EVENT_PLAN_V6_2::",
];
const EVENTS_FORM_VERSION = "V8_2_PRO_TELEGRAM_TEMPLATES";
const LEGACY_EVENT_STORAGE_KEYS = [
  "clan_manager_event_editor_draft_v7_0",
  "clan_manager_events_cache_v7_0",
  "clan_manager_events_cache_v6_7",
  "codm_local_events_v7_0",
  "codm_deleted_events_v7_5",
  "codm_events_form_version",
  "codm_pwa_events",
  "codm_events_draft",
  "codm-events-cache",
  "events_cache",
];
const MAX_LOCAL_IMAGE_DATA_URL_CHARS = 240_000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
function cleanupLegacyEventStorage() {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_EVENT_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {}
    try {
      window.sessionStorage.removeItem(key);
    } catch {}
  }
  try {
    window.dispatchEvent(new CustomEvent("codm-events-db-only"));
  } catch {}
}
function sortEvents(rows: CodmEvent[]) {
  return dedupeEvents(rows).sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}
function compactDataUrlForLocal(value: unknown) {
  if (typeof value !== "string") return value;
  if (!value.startsWith("data:image/")) return value;
  return value.length > MAX_LOCAL_IMAGE_DATA_URL_CHARS ? "" : value;
}
function compactPlanForLocalStorage(plan: MatchPlan | null | undefined) {
  if (!plan || typeof plan !== "object") return plan;
  return {
    ...plan,
    teamALogo: compactDataUrlForLocal(plan.teamALogo) as string,
    teamBLogo: compactDataUrlForLocal(plan.teamBLogo) as string,
    coverImage: compactDataUrlForLocal(plan.coverImage) as string,
  };
}
function compactEventForLocalStorage(event: CodmEvent) {
  return {
    ...event,
    event_plan: compactPlanForLocalStorage(event.event_plan || null),
  } as CodmEvent;
}
function eventWhatsAppMessage(event: CodmEvent, plan?: MatchPlan | null) {
  const normalized = normalizePlan(plan || event.event_plan || emptyPlan());
  const rounds = normalized.rounds || [];
  const startsAt = new Date(event.starts_at);
  const lines = [
    "📢 *EVENTO CLAN AK47DX*",
    "━━━━━━━━━━━━━━━━",
    "",
    `🎮 *${String(event.title || "EVENTO AK47DX").toUpperCase()}*`,
    `📅 Data: ${startsAt.toLocaleDateString("it-IT")}`,
    `⏰ Ora: ${startsAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
    normalized.teamBName ? `🆚 Avversario: ${normalized.teamBName}` : "",
    event.location ? `📍 Luogo: ${event.location}` : "",
    event.description ? `📝 Note: ${event.description}` : "",
  ].filter(Boolean);
  if (rounds.length) {
    lines.push("", "🎯 *PARTITE PROGRAMMATE*");
    rounds.forEach((round, index) => {
      lines.push(`${index + 1}️⃣ ${round.mode || "Modalità da decidere"}`);
      lines.push(`   🗺️ ${round.map || "Mappa da decidere"}${round.startTime ? ` · ⏰ ${round.startTime}` : ""}`);
    });
  }
  lines.push("", "🔥 Prepariamoci e confermiamo la presenza!");
  return lines.join("\n");
}

async function shareEventWhatsApp(event: CodmEvent, plan?: MatchPlan | null) {
  const text = eventWhatsAppMessage(event, plan);
  if (navigator.share) {
    try {
      await navigator.share({ title: event.title, text });
      return;
    } catch {}
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}
const matchStatuses = ["Da giocare", "Giocata", "Risultato caricato"];
const resultLabels = ["Vinto", "Perso", "Pareggiato"];

const modeOptions: ModeOption[] = [
  {
    value: "CED",
    label: "🎯 Cerca e Distruggi",
    icon: "🎯",
    help: "S&D / round",
  },
  {
    value: "POSTAZIONE",
    label: "🔥 Postazione",
    icon: "🔥",
    help: "Hardpoint",
  },
  {
    value: "DOMINIO",
    label: "🏳️ Dominio",
    icon: "🏳️",
    help: "Bandiera e controllo punti",
  },
  {
    value: "CONTROL",
    label: "🛡️ Control",
    icon: "🛡️",
    help: "Attacco / difesa zone",
  },
  {
    value: "DM DEATH MATCH",
    label: "⚔️ Death Match",
    icon: "⚔️",
    help: "Death match",
  },
  {
    value: "PRIMA LINEA",
    label: "🚩 Prima linea",
    icon: "🚩",
    help: "Frontline",
  },
  { value: "TDM", label: "💀 TDM", icon: "💀", help: "Team Deathmatch" },
  {
    value: "KILL_CONFIRMED",
    label: "🏷️ Kill Confirmed",
    icon: "🏷️",
    help: "Dog tags",
  },
  { value: "BR", label: "🪂 Battle Royale", icon: "🪂", help: "Battle Royale" },
  {
    value: "SCRIM",
    label: "🎮 Scrim libero",
    icon: "🎮",
    help: "Modalità scrim",
  },
];

const codmMaps = [
  "Standoff",
  "Raid",
  "Firing Range",
  "Summit",
  "Slums",
  "Hacienda",
  "Takeoff",
  "Meltdown",
  "Crash",
  "Crossfire",
  "Nuketown",
  "Nuketown Russia",
  "Hijacked",
  "Shoot House",
  "Shipment",
  "Rust",
  "Terminal",
  "Highrise",
  "Hackney Yard",
  "Tunisia",
  "Coastal",
  "Express",
  "Dome",
  "Vacant",
  "Scrapyard",
  "Monastery",
  "Khandor Hideout",
  "Suldal Harbor",
  "Arsenal",
  "Diesel",
  "Sawmill",
  "Apocalypse",
  "Miami Strike",
  "Satellite",
  "Favela",
  "Yemen",
  "Kurohana Metropolis",
  "Collateral Strike",
  "Armada Strike",
  "Seaside",
  "Icebreaker",
  "Frequency",
  "Contraband",
  "Arklov Peak",
  "Oasis",
  "Pine",
  "Cage",
  "Reclaim",
  "Aniyah Incursion",
  "Alcatraz",
  "Isolated",
  "Blackout",
];

const scoreTypeOptions: ScoreTypeOption[] = [
  {
    value: "Punteggio round",
    label: "🏁 Punteggio round",
    target: "6 round",
    help: "CED / Control / modalità a round",
  },
  {
    value: "Punteggio",
    label: "📊 Punteggio",
    target: "250 punti",
    help: "Postazione / Dominio / punti obiettivo",
  },
  {
    value: "Kill",
    label: "💀 Kill",
    target: "50 kill",
    help: "TDM / Death match",
  },
  {
    value: "Best of 3",
    label: "🥇 Best of 3",
    target: "2 mappe vinte",
    help: "Serie BO3",
  },
  {
    value: "Best of 5",
    label: "🏆 Best of 5",
    target: "3 mappe vinte",
    help: "Serie BO5",
  },
  {
    value: "Battle Royale",
    label: "🪂 BR piazzamento",
    target: "Top / kill",
    help: "BR con piazzamento e kill",
  },
];

const banOptions = [
  "Armi corpo a corpo vietate",
  "Guantoni da boxe vietati",
  "Prizefighters vietati",
  "Coltello / lama tattica vietata",
  "Machete / ascia vietata",
  "Shotgun vietati",
  "Shorty vietata",
  "NA-45 vietato",
  "Akimbo vietato",
  "Akimbo Fennec vietato",
  "Termite vietata",
  "Molotov vietata",
  "Mina laser vietata",
  "C4 vietato",
  "Granata a concussione vietata",
  "Granata gas vietata",
  "Cryo Bomb vietata",
  "Sensore battito cardiaco vietato",
  "Sistema Trophy limitato",
  "Scudo trasformabile vietato",
  "Scudo balistico vietato",
  "Classe operatore vietata",
  "Abilità operatore vietate",
  "Armatura cinetica vietata",
  "Purificatore vietato",
  "Macchina da guerra vietata",
  "Annientatore vietato",
  "Mitragliatrice Death Machine vietata",
  "Arco Sparrow vietato",
  "Persistenza vietata",
  "Martirio vietato",
  "Linea dura vietata",
  "Silenzio di tomba vietato",
  "UAV vietato",
  "Counter UAV vietato",
  "Shock RC vietato",
  "Hunter Killer vietato",
  "Missile Predator vietato",
  "Torretta sentinella vietata",
  "Sciame vietato",
  "VTOL vietato",
  "Elicottero furtivo vietato",
  "Attacco a grappolo vietato",
  "Napalm vietato",
  "Laser orbitale vietato",
  "Operatori leggendari non consentiti",
  "Skin troppo luminose/non competitive vietate",
];

const eventTypes = [
  { value: "evento", label: "📌 Evento" },
  { value: "scrim", label: "⚔️ Scrim" },
  { value: "torneo", label: "🏆 Torneo" },
  { value: "allenamento", label: "🎯 Allenamento" },
  { value: "ranked", label: "💎 Ranked" },
];

const eventStatusOptions = [
  "Bozza",
  "Da completare",
  "Programmato",
  "In corso",
  "Giocato",
  "Risultato caricato",
  "Annullato",
];

const DEFAULT_TELEGRAM_TEMPLATE = "PROFESSIONAL_EVENT_SUMMARY_V8_2";

function toLocalInputValue(date = new Date(Date.now() + 24 * 60 * 60 * 1000)) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}
function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function modeMeta(value: string) {
  return modeOptions.find((mode) => mode.value === value) || modeOptions[0];
}
function scoreMeta(value: string) {
  return (
    scoreTypeOptions.find((item) => item.value === value) || scoreTypeOptions[0]
  );
}
function makeMatchCode(n = 1) {
  return `CM-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${String(n).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
function emptyRound(n = 1): MatchRound {
  return {
    n,
    matchCode: makeMatchCode(n),
    mode: "CED",
    map: "Standoff",
    scoreType: "Punteggio round",
    target: "6 round",
    players: "",
    reserves: "",
    lobbyOpen: "",
    startTime: "",
    bans: "",
    status: "Da giocare",
    result: "",
    ourScore: "",
    opponentScore: "",
    mvp: "",
  };
}
function emptyPlan(clanName = "AK47DX"): MatchPlan {
  return {
    eventStatus: "Bozza",
    matchesDeferred: true,
    teamAName: clanName,
    teamBName: "",
    teamALogo: "/assets/ak47dx-logo.jpeg",
    teamBLogo: "",
    coverImage: "",
    totalMatches: 0,
    lobbyTime: "",
    discordLink: "",
    lobbyLink: "",
    roomNumber: "",
    rounds: [],
  };
}
function sanitizeRound(raw: Partial<MatchRound>, index: number): MatchRound {
  const base = emptyRound(index + 1);
  const merged = {
    ...base,
    ...raw,
    n: index + 1,
    matchCode: raw.matchCode || base.matchCode,
  } as MatchRound;
  return { ...merged, status: getMatchStatus(merged) };
}
function readPlan(event: CodmEvent): MatchPlan {
  if (event.event_plan && typeof event.event_plan === "object") {
    const plan = event.event_plan as MatchPlan;
    const hasRounds = Array.isArray(plan.rounds) && plan.rounds.length > 0;
    return {
      ...emptyPlan("AK47DX"),
      ...plan,
      matchesDeferred: plan.matchesDeferred ?? !hasRounds,
      totalMatches: plan.matchesDeferred
        ? 0
        : plan.totalMatches || plan.rounds?.length || 0,
      rounds: hasRounds ? (plan.rounds || []).map(sanitizeRound) : [],
    };
  }
  const note = event.event_notes || "";
  const marker = [PLAN_MARKER, ...OLD_PLAN_MARKERS].find((item) =>
    note.includes(item),
  );
  if (marker) {
    const idx = note.indexOf(marker);
    try {
      const parsed = JSON.parse(note.slice(idx + marker.length));
      const hasRounds =
        Array.isArray(parsed.rounds) && parsed.rounds.length > 0;
      return {
        ...emptyPlan("AK47DX"),
        ...parsed,
        matchesDeferred: parsed.matchesDeferred ?? !hasRounds,
        totalMatches: parsed.matchesDeferred
          ? 0
          : parsed.totalMatches || parsed.rounds?.length || 0,
        rounds: hasRounds ? (parsed.rounds || []).map(sanitizeRound) : [],
      };
    } catch {}
  }
  return emptyPlan("AK47DX");
}
function stripOldPlan(notes: string) {
  let output = notes || "";
  for (const marker of [PLAN_MARKER, ...OLD_PLAN_MARKERS]) {
    const idx = output.indexOf(marker);
    if (idx >= 0) output = output.slice(0, idx).trim();
  }
  return output.trim();
}
function planNote(plan: MatchPlan, notes: string) {
  return `${stripOldPlan(notes)}\n\n${PLAN_MARKER}${JSON.stringify(plan)}`.trim();
}
function listFromText(value: string) {
  return String(value || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
function textFromList(values: string[]) {
  return Array.from(
    new Set(values.map((item) => item.trim()).filter(Boolean)),
  ).join(", ");
}
function scoreNumber(value: string) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
function getMatchOutcome(round: MatchRound) {
  const our = scoreNumber(round.ourScore);
  const opponent = scoreNumber(round.opponentScore);
  if (our !== null && opponent !== null) {
    if (our > opponent) return "Vinto";
    if (our < opponent) return "Perso";
    return "Pareggiato";
  }
  if (resultLabels.includes(round.result)) return round.result;
  return "";
}
function getMatchStatus(round: MatchRound) {
  if (
    scoreNumber(round.ourScore) !== null &&
    scoreNumber(round.opponentScore) !== null
  )
    return "Risultato caricato";
  if (round.result && resultLabels.includes(round.result))
    return "Risultato caricato";
  if (round.status && matchStatuses.includes(round.status)) return round.status;
  if (round.result && matchStatuses.includes(round.result)) return round.result;
  return "Da giocare";
}
function normalizePlan(plan: MatchPlan) {
  const deferred = Boolean(plan.matchesDeferred);
  if (deferred) {
    return {
      ...plan,
      eventStatus: plan.eventStatus || "Da completare",
      matchesDeferred: true,
      totalMatches: 0,
      rounds: [],
    };
  }
  const sourceRounds = plan.rounds.length ? plan.rounds : [emptyRound(1)];
  const total = Math.max(
    1,
    Number(plan.totalMatches || sourceRounds.length || 1),
  );
  const rounds = sourceRounds.slice(0, total).map((round, index) => {
    const normalized = sanitizeRound(round, index);
    const outcome = getMatchOutcome(normalized);
    return {
      ...normalized,
      matchCode: normalized.matchCode || makeMatchCode(index + 1),
      status: getMatchStatus(normalized),
      result: outcome,
    };
  });
  return {
    ...plan,
    matchesDeferred: false,
    totalMatches: rounds.length,
    rounds,
  };
}
function buildMatchDetails(plan: MatchPlan) {
  const normalized = normalizePlan(plan);
  if (!normalized.rounds.length) return "";
  return normalized.rounds
    .map((round) => {
      const mode = modeMeta(round.mode);
      const outcome = getMatchOutcome(round);
      return [
        `<b>Partita ${round.n}</b> · Codice ${round.matchCode || "auto"} · ${mode.icon} ${mode.label.replace(/^\S+\s/, "")}`,
        `Dettagli: mappa ${round.map || "Da decidere"} · ${round.scoreType || "Punteggio round"} · target ${round.target || "-"}`,
        `Orari: lobby ${round.lobbyOpen || normalized.lobbyTime || "-"} · partita ${round.startTime || "-"}`,
        `Stato: ${getMatchStatus(round)}${outcome ? ` · Esito: ${outcome}` : ""}${round.ourScore || round.opponentScore ? ` · Score ${round.ourScore || "-"}-${round.opponentScore || "-"}` : ""}`,
        round.players ? `Titolari: ${round.players}` : "Titolari: da scegliere",
        round.reserves ? `Riserve: ${round.reserves}` : "Riserve: da scegliere",
        round.bans ? `🚫 BAN: ${round.bans}` : "",
        round.mvp ? `MVP: ${round.mvp}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}
function draftPayload(args: Record<string, unknown>) {
  return JSON.stringify({ savedAt: new Date().toISOString(), ...args });
}
function resolveRosterPlayersFromPlan(
  plan: MatchPlan,
  availablePlayers: PlayerRow[],
) {
  const lookup = new Map(
    availablePlayers.map((player) => [
      player.nickname.trim().toLowerCase(),
      player,
    ]),
  );
  const entries = plan.rounds.flatMap((round) => [
    ...listFromText(round.players).map((nickname) => ({
      nickname,
      role: "titolare" as const,
    })),
    ...listFromText(round.reserves).map((nickname) => ({
      nickname,
      role: "riserva" as const,
    })),
  ]);
  const resolved = new Map<
    string,
    { id: string; nickname: string; role: "titolare" | "riserva" }
  >();
  for (const entry of entries) {
    const key = entry.nickname.trim().toLowerCase();
    const player = lookup.get(key);
    if (!player?.id) continue;
    if (!resolved.has(player.id)) {
      resolved.set(player.id, {
        id: player.id,
        nickname: player.nickname,
        role: entry.role,
      });
    }
  }
  return Array.from(resolved.values());
}

export default function EventsPage() {
  const auth = useCodmAuth();
  const [events, setEvents] = useState<CodmEvent[]>([]);
  const [eventPlayers, setEventPlayers] = useState<EventPlayerRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [message, setMessage] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(monthKey(new Date()));
  const [eventFilter, setEventFilter] = useState<"future" | "all" | "past">(
    "past",
  );
  const [eventsLoading, setEventsLoading] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [title, setTitle] = useState("Nuovo evento AK47DX");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState("evento");
  const [startsAt, setStartsAt] = useState(
    toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const [endsAt, setEndsAt] = useState(
    toLocalInputValue(new Date(Date.now() + 3 * 60 * 60 * 1000)),
  );
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState(
    "10080,1440,360,120,60,30,10,0",
  );
  const [customReminderValue, setCustomReminderValue] = useState("45");
  const [customReminderUnit, setCustomReminderUnit] = useState<
    "minutes" | "hours" | "days"
  >("minutes");
  const [telegramTemplate, setTelegramTemplate] = useState(
    DEFAULT_TELEGRAM_TEMPLATE,
  );
  const [eventNotes, setEventNotes] = useState("");
  const [plan, setPlan] = useState<MatchPlan>(() => emptyPlan("AK47DX"));
  const planRef = useRef<MatchPlan>(plan);
  const teamAInputRef = useRef<HTMLInputElement | null>(null);
  const teamBInputRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef(title);
  const descriptionRef = useRef(description);
  const locationRef = useRef(location);

  function commitPlan(next: MatchPlan | ((current: MatchPlan) => MatchPlan)) {
    setPlan((current) => {
      const source = planRef.current || current;
      const resolved =
        typeof next === "function"
          ? (next as (current: MatchPlan) => MatchPlan)(source)
          : next;
      planRef.current = resolved;
      return resolved;
    });
  }
  function commitTitle(value: string) {
    titleRef.current = value;
    setTitle(value);
  }
  function commitDescription(value: string) {
    descriptionRef.current = value;
    setDescription(value);
  }
  function commitLocation(value: string) {
    locationRef.current = value;
    setLocation(value);
  }

  const canWrite = auth.canWrite;
  const isAdminUser =
    auth.canManageUsers ||
    String(auth.user?.email || "")
      .trim()
      .toLowerCase() === "hasnaiiin@gmail.com";
  const adminSuffix = (text: string) =>
    isAdminUser
      ? text
      : "Operazione non completata. Controlla connessione/login o chiedi a un admin.";

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    descriptionRef.current = description;
  }, [description]);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    cleanupLegacyEventStorage();
    void loadEvents();
    void loadPlayers();
  }, []);
  useEffect(() => {
    if (auth.clanName)
      commitPlan((p) => ({
        ...p,
        teamAName: p.teamAName === "AK47DX" ? auth.clanName : p.teamAName,
      }));
  }, [auth.clanName]);
  useEffect(() => {
    // V7.6: gli eventi non vengono mai letti o salvati in localStorage.
    // Questa pulizia rimuove dati vecchi della PWA che causavano differenze tra app installata e browser.
    cleanupLegacyEventStorage();
    setDraftReady(true);
  }, []);

  function setDbEvents(rows: CodmEvent[]) {
    setEvents(sortEvents(rows));
  }

  async function saveEventNotification(
    _event: CodmEvent,
    _mode: "created" | "updated" | "sync-error",
  ) {
    // V7.6 database-only: le notifiche evento vengono create dalla API server in public.codm_notifications.
    // Nessuna notifica/evento viene salvato localmente nella PWA.
    if (typeof window !== "undefined")
      window.dispatchEvent(
        new CustomEvent("codm-server-notifications-changed"),
      );
  }
  async function loadPlayers() {
    try {
      const { data } = await supabase
        .from("players")
        .select("id,nickname,clan_name,status")
        .order("nickname");
      setPlayers((data || []) as PlayerRow[]);
    } catch {
      setPlayers([]);
    }
  }
  async function readSessionToken() {
    const { data: sessionData } = await supabase.auth.getSession();
    let token = sessionData.session?.access_token;
    if (!token) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed.session?.access_token;
    }
    return token || null;
  }

  async function loadEvents() {
    setEventsLoading(true);
    setMessage((m) => (m && m.includes("Bozza") ? "" : m));
    cleanupLegacyEventStorage();
    try {
      const token = isSupabaseConfigured ? await readSessionToken() : null;
      if (!token) {
        setEvents([]);
        setEventPlayers([]);
        setMessage(
          "Eventi non caricati: serve login Supabase. La PWA non usa più dati locali.",
        );
        return;
      }
      const response = await fetch(`/api/events/list`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-store, max-age=0",
          Pragma: "no-cache",
        },
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok)
        throw new Error(json?.error || "API eventi non disponibile.");
      setDbEvents((json.events || []) as CodmEvent[]);
      setEventPlayers((json.eventPlayers || []) as EventPlayerRow[]);
    } catch (error) {
      setEvents([]);
      setEventPlayers([]);
      setMessage(
        adminSuffix(
          error instanceof Error
            ? `Eventi non caricati dal database: ${error.message}`
            : "Eventi non caricati dal database.",
        ),
      );
    } finally {
      setEventsLoading(false);
    }
  }

  function parseReminderMinutes() {
    const values = reminderMinutes
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 43200);
    return Array.from(new Set(values.length ? values : [120, 30, 10, 0])).sort(
      (a, b) => b - a,
    );
  }
  function hasReminder(minutes: number) {
    return parseReminderMinutes().includes(minutes);
  }
  function setReminderPreset(minutes: number, checked: boolean) {
    const values = new Set(parseReminderMinutes());
    if (checked) values.add(minutes);
    else values.delete(minutes);
    setReminderMinutes(
      Array.from(values)
        .sort((a, b) => b - a)
        .join(","),
    );
  }
  function addCustomReminder() {
    const base = Math.max(0, Number(customReminderValue || 0));
    if (!Number.isFinite(base) || base <= 0) {
      setMessage("Inserisci un valore reminder valido.");
      return;
    }
    const minutes =
      customReminderUnit === "days"
        ? base * 1440
        : customReminderUnit === "hours"
          ? base * 60
          : base;
    setReminderPreset(Math.round(minutes), true);
    setMessage(
      `Reminder aggiunto: ${customReminderValue} ${customReminderUnit === "days" ? "giorni" : customReminderUnit === "hours" ? "ore" : "minuti"} prima.`,
    );
  }
  function reminderHuman(minutes: number) {
    if (minutes === 0) return "Evento iniziato";
    if (minutes % 1440 === 0) return `${minutes / 1440} giorni prima`;
    if (minutes % 60 === 0) return `${minutes / 60} ore prima`;
    return `${minutes} minuti prima`;
  }
  function updateRound(index: number, patch: Partial<MatchRound>) {
    commitPlan((current) => ({
      ...current,
      rounds: current.rounds.map((round, i) =>
        i === index ? { ...round, ...patch } : round,
      ),
    }));
  }
  function addRound() {
    commitPlan((current) => {
      const source = current.matchesDeferred ? [] : current.rounds;
      const n = source.length + 1;
      return {
        ...current,
        matchesDeferred: false,
        eventStatus:
          current.eventStatus === "Bozza" ||
          current.eventStatus === "Da completare"
            ? "Programmato"
            : current.eventStatus,
        totalMatches: n,
        rounds: [...source, emptyRound(n)],
      };
    });
  }
  function setMatchesDeferred(checked: boolean) {
    commitPlan((current) => {
      if (checked) {
        return {
          ...current,
          matchesDeferred: true,
          eventStatus:
            current.eventStatus === "Programmato"
              ? "Da completare"
              : current.eventStatus || "Da completare",
          totalMatches: 0,
          rounds: [],
        };
      }
      const rounds = current.rounds.length ? current.rounds : [emptyRound(1)];
      return {
        ...current,
        matchesDeferred: false,
        eventStatus:
          current.eventStatus === "Bozza" ||
          current.eventStatus === "Da completare"
            ? "Programmato"
            : current.eventStatus,
        totalMatches: rounds.length,
        rounds,
      };
    });
  }
  function removeRound(index: number) {
    commitPlan((current) => {
      const next = current.rounds
        .filter((_, i) => i !== index)
        .map((r, i) => ({
          ...r,
          n: i + 1,
          matchCode: r.matchCode || makeMatchCode(i + 1),
        }));
      if (!next.length) {
        return {
          ...current,
          matchesDeferred: true,
          eventStatus: "Da completare",
          totalMatches: 0,
          rounds: [],
        };
      }
      return {
        ...current,
        matchesDeferred: false,
        totalMatches: next.length,
        rounds: next,
      };
    });
  }
  function toggleRoundRoster(
    index: number,
    field: "players" | "reserves",
    nickname: string,
  ) {
    commitPlan((current) => ({
      ...current,
      rounds: current.rounds.map((round, i) => {
        if (i !== index) return round;
        const selected = new Set(listFromText(round[field]));
        const otherField = field === "players" ? "reserves" : "players";
        const other = new Set(listFromText(round[otherField]));
        if (selected.has(nickname)) selected.delete(nickname);
        else {
          selected.add(nickname);
          other.delete(nickname);
        }
        return {
          ...round,
          [field]: textFromList(Array.from(selected)),
          [otherField]: textFromList(Array.from(other)),
        };
      }),
    }));
  }
  function readImage(file: File | null | undefined, cb: (url: string) => void) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const original = String(reader.result || "");
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const maxSide = 1024;
            const ratio = Math.min(
              1,
              maxSide / Math.max(img.width || maxSide, img.height || maxSide),
            );
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(
              1,
              Math.round((img.width || maxSide) * ratio),
            );
            canvas.height = Math.max(
              1,
              Math.round((img.height || maxSide) * ratio),
            );
            const ctx = canvas.getContext("2d");
            if (!ctx) return cb(original);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            cb(canvas.toDataURL("image/jpeg", 0.78));
          } catch {
            cb(original);
          }
        };
        img.onerror = () => cb(original);
        img.src = original;
      } catch {
        cb(original);
      }
    };
    reader.readAsDataURL(file);
  }
  function resetEditor(clearDraft = false) {
    setEditingEventId(null);
    setTitle("Nuovo evento AK47DX");
    setDescription("");
    setLocation("");
    setEventType("evento");
    setStartsAt(toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
    setEndsAt(toLocalInputValue(new Date(Date.now() + 3 * 60 * 60 * 1000)));
    setTelegramEnabled(true);
    setReminderMinutes("10080,1440,360,120,60,30,10,0");
    setTelegramTemplate(DEFAULT_TELEGRAM_TEMPLATE);
    setEventNotes("");
    commitPlan(emptyPlan(auth.clanName || "AK47DX"));
    if (clearDraft) cleanupLegacyEventStorage();
    setMessage(
      clearDraft
        ? "Editor pulito. La PWA non conserva bozze/eventi locali."
        : "Editor pronto per nuovo evento.",
    );
  }
  function loadEventIntoEditor(event: CodmEvent, duplicate = false) {
    const eventPlan = readPlan(event);
    setEditingEventId(duplicate ? null : event.id);
    setTitle(duplicate ? `Copia - ${event.title}` : event.title);
    setDescription(stripOldPlan(event.description || ""));
    setLocation(event.location || "CODM room");
    setEventType(event.event_type || "scrim");
    setStartsAt(toLocalInputValue(new Date(event.starts_at)));
    setEndsAt(event.ends_at ? toLocalInputValue(new Date(event.ends_at)) : "");
    setTelegramEnabled(event.telegram_enabled ?? true);
    setReminderMinutes(
      (event.reminder_minutes || [10080, 1440, 360, 120, 60, 30, 10, 0]).join(
        ",",
      ),
    );
    setTelegramTemplate(
      event.telegram_message_template || DEFAULT_TELEGRAM_TEMPLATE,
    );
    setEventNotes(stripOldPlan(event.event_notes || ""));
    commitPlan(normalizePlan(eventPlan));
    setMessage(
      duplicate
        ? "Evento duplicato nell’editor: modifica data/orari e salva come nuovo evento."
        : "Evento aperto in modifica dall’elenco/calendario.",
    );
    setTimeout(
      () =>
        document
          .querySelector(".event-create-v64")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  }

  function isDefaultOpponentName(value: string) {
    const text = value.trim().toLowerCase();
    return (
      !text ||
      text === "clan avversario" ||
      text === "cl clan avversario" ||
      text === "avversario / organizzatore" ||
      text === "avversario/organizzatore" ||
      text === "organizzatore"
    );
  }
  function isAutoEventTitle(value: string) {
    const text = value.trim().toLowerCase();
    return (
      !text ||
      text.includes("clan avversario") ||
      text.startsWith("scrim ak47dx vs") ||
      text.startsWith("scrim ")
    );
  }
  function readPlanFromVisibleForm() {
    const current = planRef.current || plan;
    const teamAFromInput = teamAInputRef.current?.value?.trim();
    const teamBFromInput = teamBInputRef.current?.value?.trim();
    return normalizePlan({
      ...current,
      teamAName:
        teamAFromInput || current.teamAName || auth.clanName || "AK47DX",
      teamBName: teamBFromInput || current.teamBName || "",
    });
  }
  function updateTeamName(side: "A" | "B", value: string) {
    const current = planRef.current || plan;
    const next =
      side === "A"
        ? { ...current, teamAName: value }
        : { ...current, teamBName: value };
    planRef.current = next;
    setPlan(next);
    const teamA = next.teamAName?.trim() || auth.clanName || "AK47DX";
    const teamB = next.teamBName?.trim() || "";
    if (
      side === "B" &&
      !isDefaultOpponentName(teamB) &&
      isAutoEventTitle(titleRef.current || title)
    ) {
      commitTitle(`Scrim ${teamA} vs ${teamB}`);
    }
  }

  async function createEvent() {
    if (savingEvent) return;
    setSavingEvent(true);
    try {
      if (!canWrite) {
        setMessage("Solo owner, coach o staff possono creare eventi.");
        return;
      }
      const currentTitle = (titleRef.current || title).trim();
      const currentDescription = descriptionRef.current ?? description;
      const currentLocation = locationRef.current ?? location;
      const currentPlan = readPlanFromVisibleForm();
      const finalTitle =
        isAutoEventTitle(currentTitle) &&
        !isDefaultOpponentName(currentPlan.teamBName)
          ? `Scrim ${(currentPlan.teamAName || auth.clanName || "AK47DX").trim()} vs ${currentPlan.teamBName.trim()}`
          : currentTitle ||
            `Evento ${(currentPlan.teamAName || auth.clanName || "AK47DX").trim()}`;
      if (!finalTitle) {
        setMessage("Inserisci il titolo evento prima di salvare.");
        return;
      }
      const startDate = new Date(startsAt);
      if (Number.isNaN(startDate.getTime())) {
        setMessage("Data/ora inizio non valida. Controlla il campo Inizio.");
        return;
      }
      const endDate = endsAt ? new Date(endsAt) : null;
      if (endDate && Number.isNaN(endDate.getTime())) {
        setMessage("Data/ora fine non valida. Controlla il campo Fine.");
        return;
      }

      const startIso = startDate.toISOString();
      const endIso = endDate ? endDate.toISOString() : null;
      const effectivePlan = normalizePlan(currentPlan);
      const resolvedRosters = resolveRosterPlayersFromPlan(
        effectivePlan,
        players,
      );
      const convocati = resolvedRosters.filter(
        (entry) => entry.role === "titolare",
      );
      const reserves = resolvedRosters.filter(
        (entry) => entry.role === "riserva",
      );
      const matchDetailsText = buildMatchDetails(effectivePlan).replace(
        /<[^>]*>/g,
        "",
      );
      const convocationsText = [
        convocati.length
          ? `Titolari evento:\n${convocati.map((p) => `• ${p.nickname}`).join("\n")}`
          : "",
        reserves.length
          ? `Riserve evento:\n${reserves.map((p) => `• ${p.nickname}`).join("\n")}`
          : "",
        matchDetailsText ? `Dettaglio partite:\n${matchDetailsText}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      const fullDescription = [currentDescription, convocationsText]
        .filter(Boolean)
        .join("\n\n");
      // V8.2B: non genero più link Google Calendar automatico. I link evento sono solo quelli inseriti manualmente (Discord/Lobby/Note).

      // V8.0: il clan non viene più passato dal client. Lo risolve solo la API server.
      const effectiveClanId = null;
      const remoteEditingId = isUuid(editingEventId) ? editingEventId : null;
      if (editingEventId && !isUuid(editingEventId)) {
        setMessage(
          "Questo evento era locale da una vecchia PWA e non può essere aggiornato. Cancella cache PWA e ricrealo nel database.",
        );
        return;
      }
      const createdBy = isUuid(auth.user?.id) ? auth.user?.id : null;

      const basePayload: Record<string, any> = {
        ...(effectiveClanId ? { clan_id: effectiveClanId } : {}),
        title: finalTitle,
        description: fullDescription || null,
        location: currentLocation || null,
        event_type: eventType,
        starts_at: startIso,
        ends_at: endIso,
        telegram_enabled: telegramEnabled,
        reminder_minutes: parseReminderMinutes(),
        telegram_message_template:
          telegramTemplate || DEFAULT_TELEGRAM_TEMPLATE,
        event_notes: planNote(effectivePlan, eventNotes),
        google_calendar_url: null,
        convocations: convocati
          .map((p) => ({ id: p.id, nickname: p.nickname, role: "titolare" }))
          .concat(
            reserves.map((p) => ({
              id: p.id,
              nickname: p.nickname,
              role: "riserva",
            })),
          ),
        convocations_text: convocationsText || null,
      };
      const payloadWithPlan = { ...basePayload, event_plan: effectivePlan };

      setMessage(
        editingEventId
          ? "Invio aggiornamento evento al database Supabase..."
          : "Invio nuovo evento al database Supabase...",
      );

      let eventId: string | null = remoteEditingId;
      let error: any = null;
      let savedRemoteRow: any = null;
      let savedClanId: string | null = effectiveClanId;
      let apiWarning: string | null = null;
      const serverPlayers = [
        ...convocati.map((p) => ({
          player_id: isUuid(p.id) ? p.id : null,
          nickname: p.nickname,
          status: "titolare",
        })),
        ...reserves.map((p) => ({
          player_id: isUuid(p.id) ? p.id : null,
          nickname: p.nickname,
          status: "riserva",
        })),
      ];

      if (!isSupabaseConfigured) {
        error = new Error(
          "Supabase non configurato: evento non salvato. Da V7.6 gli eventi esistono solo nel database.",
        );
      } else {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          let token = sessionData.session?.access_token;
          if (!token) {
            const { data: refreshed } = await supabase.auth.refreshSession();
            token = refreshed.session?.access_token;
          }
          if (!token) {
            throw new Error(
              "Login richiesto: accedi prima di creare eventi condivisi con il clan. Nella PWA fai logout/login una volta dopo il reset cache.",
            );
          }

          const response = await fetch("/api/events/save", {
            method: "POST",
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              id: remoteEditingId,
              mode: remoteEditingId ? "updated" : "created",
              event: payloadWithPlan,
              players: serverPlayers,
            }),
          });
          const json = await response.json().catch(() => null);
          if (!response.ok || !json?.ok) {
            throw new Error(
              json?.error ||
                "Supabase/API non ha confermato il salvataggio evento.",
            );
          }
          savedRemoteRow = json.event;
          eventId = savedRemoteRow?.id || null;
          savedClanId =
            json.clanId || savedRemoteRow?.clan_id || effectiveClanId || null;
          apiWarning =
            json.warning ||
            (!json.telegram?.ok && json.telegram?.error
              ? `Telegram non inviato: ${json.telegram.error}`
              : null);
        } catch (apiError) {
          error = apiError;
        }
      }

      if (error) {
        setEvents((current) => current.filter((event) => isUuid(event.id)));
        setMessage(
          `Evento NON salvato: il database Supabase non ha confermato. ${error instanceof Error ? error.message : String(error)}`,
        );
        return;
      }

      if (eventId && isUuid(eventId)) {
        const savedEvent = buildLocalEventFromPayload({
          ...payloadWithPlan,
          ...(savedRemoteRow || {}),
          id: eventId,
          clan_id: savedClanId,
          created_at: savedRemoteRow?.created_at || new Date().toISOString(),
          sync_status: "synced",
          sync_error: null,
        });
        await saveEventNotification(
          savedEvent,
          editingEventId ? "updated" : "created",
        );
        await loadEvents();
      }

      setMessage(
        apiWarning && isAdminUser
          ? `${editingEventId ? "Evento aggiornato" : "Evento creato"} e scritto su Supabase. ${apiWarning}`
          : editingEventId
            ? "Evento aggiornato e visibile a tutti."
            : "Evento creato e visibile a tutti.",
      );
      setEditingEventId(null);
    } catch (error) {
      setMessage(
        adminSuffix(
          error instanceof Error
            ? `Errore creazione evento: ${error.message}`
            : "Errore creazione evento.",
        ),
      );
    } finally {
      setSavingEvent(false);
    }
  }
  async function cancelEvent(event: CodmEvent) {
    if (!canWrite)
      return setMessage("Solo staff/coach/owner possono annullare eventi.");
    if (!isUuid(event.id)) return setMessage("Evento non valido nel database.");
    if (
      !confirm(
        `Segnare come ANNULLATO l evento "${event.title}"? Non verrà cancellato e resterà nello storico.`,
      )
    )
      return;
    try {
      const token = await readSessionToken();
      if (!token)
        throw new Error("Login richiesto: fai logout/login e riprova.");
      const cancelledPlan = normalizePlan(readPlan(event));
      cancelledPlan.eventStatus = "Annullato";
      cancelledPlan.rounds = cancelledPlan.rounds.map((round) => ({
        ...round,
        status: "Annullata",
      }));
      const response = await fetch("/api/events/save", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: event.id,
          mode: "updated",
          event: {
            title: event.title,
            description: event.description,
            starts_at: event.starts_at,
            ends_at: event.ends_at,
            location: event.location,
            event_type: event.event_type,
            google_calendar_url: event.google_calendar_url,
            telegram_enabled: event.telegram_enabled,
            convocations: event.convocations || [],
            convocations_text: event.convocations_text,
            reminder_minutes: [],
            telegram_message_template: event.telegram_message_template,
            event_notes: planNote(cancelledPlan, event.event_notes || ""),
            event_plan: cancelledPlan,
          },
          players: eventPlayers
            .filter((row) => row.event_id === event.id)
            .map((row) => ({
              player_id: row.player_id,
              nickname: row.nickname,
              status: row.status || "titolare",
            })),
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok)
        throw new Error(
          json?.error || "Annullamento non confermato dal database.",
        );
      setMessage(
        "Evento annullato. Rimane visibile nello storico come ANNULLATO.",
      );
      await loadEvents();
    } catch (error) {
      setMessage(
        adminSuffix(
          error instanceof Error
            ? `Errore annullamento evento: ${error.message}`
            : "Errore annullamento evento.",
        ),
      );
    }
  }

  async function deleteEvent(id: string) {
    if (!canWrite)
      return setMessage("Solo staff/coach/owner possono cancellare eventi.");
    const eventToDelete = events.find((event) => event.id === id);
    if (!isUuid(id)) {
      setMessage(
        "Questo ID non è nel database. Ho pulito i vecchi dati locali PWA: aggiorna la pagina.",
      );
      cleanupLegacyEventStorage();
      await loadEvents();
      return;
    }
    if (
      !confirm(
        `Cancellare definitivamente evento${eventToDelete?.title ? ` "${eventToDelete.title}"` : ""} dal database Supabase?`,
      )
    )
      return;

    try {
      const token = await readSessionToken();
      if (!token)
        throw new Error(
          "Login richiesto: fai logout/login e riprova cancellazione.",
        );
      const response = await fetch("/api/events/delete", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-store, max-age=0",
          Pragma: "no-cache",
        },
        body: JSON.stringify({ id }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok)
        throw new Error(
          json?.error || "Supabase/API non ha confermato la cancellazione.",
        );
      setMessage("Evento cancellato definitivamente dal database Supabase.");
      window.dispatchEvent(
        new CustomEvent("codm-server-notifications-changed"),
      );
      await loadEvents();
    } catch (error) {
      setMessage(
        adminSuffix(
          error instanceof Error
            ? `Evento NON cancellato: ${error.message}`
            : "Evento NON cancellato.",
        ),
      );
      await loadEvents();
    }
  }

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CodmEvent[]>();
    for (const event of events) {
      const key = new Date(event.starts_at).toISOString().slice(0, 10);
      map.set(key, [...(map.get(key) || []), event]);
    }
    return map;
  }, [events]);
  const calendarDays = useMemo(() => {
    const [year, month] = calendarMonth.split("-").map(Number);
    const first = new Date(year, month - 1, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const key = day.toISOString().slice(0, 10);
      return {
        date: day,
        key,
        currentMonth: day.getMonth() === month - 1,
        events: eventsByDay.get(key) || [],
      };
    });
  }, [calendarMonth, eventsByDay]);

  function eventEndTimestamp(event: CodmEvent) {
    const end = event.ends_at ? new Date(event.ends_at).getTime() : NaN;
    if (Number.isFinite(end)) return end;
    const start = new Date(event.starts_at).getTime();
    return Number.isFinite(start) ? start : 0;
  }

  function isEventStillToDo(event: CodmEvent) {
    const eventPlan = normalizePlan(event.event_plan || emptyPlan());
    const status = String(
      eventPlan.eventStatus || event.event_type || "",
    ).toLowerCase();
    if (/annull|cancel|risultato caricato|chiuso|finito|complet/.test(status))
      return false;
    if (eventEndTimestamp(event) > Date.now()) return true;
    const rounds = Array.isArray(eventPlan.rounds) ? eventPlan.rounds : [];
    if (!rounds.length)
      return /bozza|programm|da completare|da giocare|scrim|evento|allen/i.test(
        status,
      );
    return rounds.some((round) => {
      const roundStatus = String(round.status || "").toLowerCase();
      const hasScore = Boolean(
        round.ourScore || round.opponentScore || round.result || round.mvp,
      );
      return !hasScore && !/risultato|giocata|complet|annull/.test(roundStatus);
    });
  }

  const todoEvents = useMemo(
    () =>
      events
        .filter(isEventStillToDo)
        .sort(
          (a, b) =>
            new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
        ),
    [events],
  );

  function isCancelledEvent(event: CodmEvent) {
    const eventPlan = normalizePlan(event.event_plan || emptyPlan());
    return /annull|cancel/.test(
      String(eventPlan.eventStatus || "").toLowerCase(),
    );
  }
  const cancelledEvents = useMemo(
    () =>
      events
        .filter(isCancelledEvent)
        .sort(
          (a, b) =>
            new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
        ),
    [events],
  );
  const futureEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          !isCancelledEvent(event) && eventEndTimestamp(event) > Date.now(),
      ),
    [events],
  );
  const pastEvents = useMemo(
    () =>
      events
        .filter(
          (event) =>
            !isCancelledEvent(event) && eventEndTimestamp(event) <= Date.now(),
        )
        .sort(
          (a, b) =>
            new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
        ),
    [events],
  );
  const visibleEvents =
    eventFilter === "all"
      ? events
      : eventFilter === "past"
        ? pastEvents
        : futureEvents;
  const telegramPreview = useMemo(
    () => buildMatchDetails(normalizePlan(plan)).replace(/<[^>]*>/g, ""),
    [plan],
  );
  function playersFor(event: CodmEvent, status?: string) {
    const rows = eventPlayers.filter(
      (r) => r.event_id === event.id && (!status || r.status === status),
    );
    if (rows.length) return rows.map((r) => r.nickname);
    return (event.convocations || [])
      .filter((r: any) => !status || r.role === status)
      .map((r) => r.nickname);
  }

  return (
    <main className="container wide ak-page-compact events-v64 events-v65 events-v131">
      <section className="card ak-events-first compact-events-first events-priority-top-v131 events-main-todo-v132">
        <div className="section-title">
          <div>
            <p className="eyebrow">🔥 Visibile subito</p>
            <h2>Eventi da fare / partite programmate</h2>
            <p className="muted">
              Appena apri Eventi vedi qui sopra tutti gli eventi ancora da fare:
              futuri, programmati o senza risultato caricato. Gli eventi passati
              restano sotto e possono ancora ricevere il risultato.
            </p>
          </div>
          <div className="ak-event-toolbar">
            <span className="match-status-pill loaded">
              {todoEvents.length} da fare
            </span>
            <button
              className="btn secondary small"
              onClick={() => void loadEvents()}
            >
              {eventsLoading ? "Carico..." : "Aggiorna"}
            </button>
            {canWrite && (
              <button
                className="btn small"
                type="button"
                onClick={() =>
                  document
                    .querySelector(".event-create-v64")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                ➕ Crea evento
              </button>
            )}
          </div>
        </div>
        {message && <div className="notice top-gap">{message}</div>}
        <div className="event-presentation-list top-gap">
          {todoEvents.map((event) => (
            <EventPresentation
              key={event.id}
              event={event}
              plan={readPlan(event)}
              starters={playersFor(event, "titolare")}
              reserves={playersFor(event, "riserva")}
              canWrite={canWrite}
              onDelete={deleteEvent}
              onEdit={() => loadEventIntoEditor(event)}
              onDuplicate={() => loadEventIntoEditor(event, true)}
              onCancel={() => void cancelEvent(event)}
            />
          ))}
          {!todoEvents.length && (
            <p className="empty-state">
              Nessun evento da fare o senza risultato. Crea un evento oppure
              controlla l’archivio sotto.
            </p>
          )}
        </div>
      </section>

      <section className="card ak-section-head events-compact-hero events-hero-small-v131 top-gap">
        <div className="events-hero-meta">
          <p className="eyebrow">📅 Clan Manager Event Center</p>
          <h1>Eventi, calendario e partite CODM</h1>
          <p className="muted">
            Lista mappe CODM, BAN selezionabili, badge stato, modifica/duplica
            evento e import risultato collegato all’evento.
          </p>
          <div className="events-hero-pills">
            <span className="pill-chip">⚡ Creazione rapida</span>
            <span className="pill-chip">🧠 Sync Supabase</span>
            <span className="pill-chip">📱 Mobile ready</span>
          </div>
        </div>
      </section>

      <section className="card top-gap" id="calendario">
        <div className="section-title">
          <h2>Calendario</h2>
          <input
            className="input month-input"
            type="month"
            value={calendarMonth}
            onChange={(e) => setCalendarMonth(e.target.value)}
          />
        </div>
        <div className="ak-calendar-grid ak-calendar-weekdays">
          {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="ak-calendar-grid">
          {calendarDays.map((day) => (
            <div
              key={day.key}
              className={`ak-calendar-day ${day.currentMonth ? "" : "muted-month"} ${day.events.length ? "has-event" : ""}`}
            >
              <strong>{day.date.getDate()}</strong>
              {day.events.slice(0, 2).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className="calendar-event-open"
                  onClick={() => loadEventIntoEditor(event)}
                >
                  {event.title}
                </button>
              ))}
              {day.events.length > 2 && <em>+{day.events.length - 2}</em>}
            </div>
          ))}
        </div>
      </section>

      <section className="top-gap">
        {canWrite ? (
          <div className="card event-create-v64 event-generic-editor-v13">
            <div className="section-title">
              <div>
                <p className="eyebrow">📌 Evento generico</p>
                <h2>
                  {editingEventId ? "Modifica evento" : "Aggiungi evento"}
                </h2>
                <p className="muted">
                  Prima salvi solo l’evento generale. Le partite si aggiungono
                  dopo, quando sai quante ne dovete giocare.
                </p>
              </div>
              <div className="editor-actions-row">
                <button className="btn small" type="button" onClick={addRound}>
                  + Aggiungi partita
                </button>
                <button
                  className="btn small secondary"
                  type="button"
                  onClick={() => resetEditor(false)}
                >
                  Nuovo
                </button>
                <button
                  className="btn small secondary"
                  type="button"
                  onClick={() => resetEditor(true)}
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="form top-gap generic-event-form-v13">
              <div className="field">
                <label>Nome evento</label>
                <input
                  className="input"
                  value={title}
                  onChange={(e) => commitTitle(e.target.value)}
                  placeholder="Esempio: Scrim AK47DX / Allenamento / Torneo interno"
                />
              </div>

              <div className="grid grid-2 opponent-free-name-v133">
                <div className="field">
                  <label>Nome nostro clan</label>
                  <input
                    className="input"
                    ref={teamAInputRef}
                    value={plan.teamAName || auth.clanName || "AK47DX"}
                    onChange={(e) => updateTeamName("A", e.target.value)}
                    placeholder="AK47DX"
                  />
                </div>
                <div className="field">
                  <label>Nome avversario / organizzatore</label>
                  <input
                    className="input"
                    ref={teamBInputRef}
                    value={plan.teamBName || ""}
                    onChange={(e) => updateTeamName("B", e.target.value)}
                    placeholder="Scrivi il nome che vuoi tu: clan avversario, torneo o organizzatore"
                  />
                  <small className="muted">
                    Non viene più salvato automaticamente “Avversario /
                    Organizzatore”.
                  </small>
                </div>
              </div>

              <div className="grid grid-3">
                <div className="field">
                  <label>Data e ora evento</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Stato evento</label>
                  <select
                    className="select"
                    value={plan.eventStatus || "Bozza"}
                    onChange={(e) =>
                      commitPlan((p) => ({ ...p, eventStatus: e.target.value }))
                    }
                  >
                    {eventStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Tipo</label>
                  <select
                    className="select"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                  >
                    {eventTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Descrizione</label>
                <textarea
                  className="input"
                  rows={3}
                  value={description}
                  onChange={(e) => commitDescription(e.target.value)}
                  placeholder="Note generali evento, informazioni per il clan, regole generali o promemoria."
                />
              </div>

              <div className="grid grid-3 media-event-grid-v13">
                <div className="field">
                  <label>Cover evento</label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      readImage(e.target.files?.[0], (url) =>
                        commitPlan((p) => ({ ...p, coverImage: url })),
                      )
                    }
                  />
                  {plan.coverImage ? (
                    <img
                      className="event-media-preview-v13"
                      src={plan.coverImage}
                      alt="Cover evento"
                    />
                  ) : (
                    <small className="muted">Immagine grande evento.</small>
                  )}
                </div>
                <div className="field">
                  <label>Logo nostro clan</label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      readImage(e.target.files?.[0], (url) =>
                        commitPlan((p) => ({ ...p, teamALogo: url })),
                      )
                    }
                  />
                  {plan.teamALogo ? (
                    <img
                      className="event-logo-preview-v13"
                      src={plan.teamALogo}
                      alt="Logo nostro clan"
                    />
                  ) : (
                    <small className="muted">
                      Seleziona il logo AK47DX/MIRZA.
                    </small>
                  )}
                </div>
                <div className="field">
                  <label>Logo avversario / organizzatore</label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      readImage(e.target.files?.[0], (url) =>
                        commitPlan((p) => ({ ...p, teamBLogo: url })),
                      )
                    }
                  />
                  {plan.teamBLogo ? (
                    <img
                      className="event-logo-preview-v13"
                      src={plan.teamBLogo}
                      alt="Logo avversario"
                    />
                  ) : (
                    <small className="muted">
                      Opzionale: clan avversario o torneo.
                    </small>
                  )}
                </div>
              </div>

              <label className="check-line ak-check-card defer-matches-card-v13">
                <input
                  type="checkbox"
                  checked={Boolean(plan.matchesDeferred)}
                  onChange={(e) => setMatchesDeferred(e.target.checked)}
                />{" "}
                <span>
                  <strong>Aggiungi partite in una fase successiva</strong>
                  <br />
                  <small className="muted">
                    Attivo: salvo evento generico senza convocati, titolari,
                    riserve, BAN o risultati.
                  </small>
                </span>
              </label>

              {plan.matchesDeferred ? (
                <div className="notice generic-event-notice-v13">
                  <strong>Evento generico pronto.</strong> Le partite non sono
                  obbligatorie adesso. Quando saranno definite, apri l’evento e
                  premi “Aggiungi partita”.
                  <div className="top-gap">
                    <button
                      className="btn small"
                      type="button"
                      onClick={addRound}
                    >
                      + Aggiungi prima partita adesso
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="match-count-toolbar top-gap">
                    <span>
                      Partite configurate: <b>{plan.rounds.length}</b>
                    </span>
                    <button
                      className="btn small"
                      type="button"
                      onClick={addRound}
                    >
                      + Aggiungi partita
                    </button>
                    <button
                      className="btn small secondary"
                      type="button"
                      onClick={() => removeRound(plan.rounds.length - 1)}
                      disabled={!plan.rounds.length}
                    >
                      - Togli ultima partita
                    </button>
                    <small>
                      Le partite sono gestite sotto l’evento, una alla volta.
                    </small>
                  </div>

                  <details className="top-gap">
                    <summary>⚙️ Dettagli partita / lobby opzionali</summary>
                    <div className="grid grid-4 top-gap">
                      <div className="field">
                        <label>Numero stanza</label>
                        <input
                          className="input"
                          value={plan.roomNumber}
                          onChange={(e) =>
                            commitPlan((p) => ({
                              ...p,
                              roomNumber: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <label>Link Discord</label>
                        <input
                          className="input"
                          value={plan.discordLink}
                          onChange={(e) =>
                            commitPlan((p) => ({
                              ...p,
                              discordLink: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <label>Link lobby</label>
                        <input
                          className="input"
                          value={plan.lobbyLink}
                          onChange={(e) =>
                            commitPlan((p) => ({
                              ...p,
                              lobbyLink: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <label>Ora lobby generale</label>
                        <input
                          className="input"
                          value={plan.lobbyTime}
                          onChange={(e) =>
                            commitPlan((p) => ({
                              ...p,
                              lobbyTime: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </details>

                  <div className="round-plan-grid top-gap">
                    {plan.rounds.map((round, index) => (
                      <MatchRoundEditor
                        key={`${round.n}-${index}`}
                        round={round}
                        index={index}
                        players={players}
                        updateRound={updateRound}
                        removeRound={removeRound}
                        toggleRoundRoster={toggleRoundRoster}
                      />
                    ))}
                  </div>
                </>
              )}

              <details className="event-advanced-settings-v13 top-gap">
                <summary>
                  🔔 Opzioni avanzate: Telegram, reminder e note interne
                </summary>
                <div className="field top-gap">
                  <label>Note interne</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={eventNotes}
                    onChange={(e) => setEventNotes(e.target.value)}
                  />
                </div>
                <div className="event-notification-settings-block top-gap pro-reminder-panel">
                  <h3>🔔 Telegram e reminder</h3>
                  <p className="muted">
                    Per evento generico il messaggio resta semplice. Quando
                    aggiungi partite, vengono inclusi anche mappe, modalità,
                    titolari, riserve e BAN.
                  </p>
                  <label className="check-line ak-check-card">
                    <input
                      type="checkbox"
                      checked={telegramEnabled}
                      onChange={(e) => setTelegramEnabled(e.target.checked)}
                    />{" "}
                    Telegram attivo per questo evento
                  </label>
                  <div className="reminder-checkbox-grid top-gap">
                    {[
                      [10080, "7 giorni prima"],
                      [4320, "3 giorni prima"],
                      [1440, "1 giorno prima"],
                      [360, "6 ore prima"],
                      [120, "2 ore prima"],
                      [60, "1 ora prima"],
                      [30, "30 minuti prima"],
                      [10, "10 minuti prima"],
                      [0, "Evento iniziato"],
                    ].map(([minutes, label]) => (
                      <label
                        className="check-line reminder-check"
                        key={minutes}
                      >
                        <input
                          type="checkbox"
                          checked={hasReminder(Number(minutes))}
                          onChange={(e) =>
                            setReminderPreset(Number(minutes), e.target.checked)
                          }
                        />{" "}
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="grid grid-3 top-gap">
                    <div className="field">
                      <label>Tempo personalizzato</label>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={customReminderValue}
                        onChange={(e) => setCustomReminderValue(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>Unità</label>
                      <select
                        className="select"
                        value={customReminderUnit}
                        onChange={(e) =>
                          setCustomReminderUnit(
                            e.target.value as "minutes" | "hours" | "days",
                          )
                        }
                      >
                        <option value="minutes">Minuti prima</option>
                        <option value="hours">Ore prima</option>
                        <option value="days">Giorni prima</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Aggiungi</label>
                      <button
                        className="btn small secondary"
                        type="button"
                        onClick={addCustomReminder}
                      >
                        + Reminder
                      </button>
                    </div>
                  </div>
                  <div className="notice compact top-gap">
                    <strong>Reminder attivi:</strong>{" "}
                    {parseReminderMinutes().map(reminderHuman).join(" · ") ||
                      "Nessuno"}
                  </div>
                  {isAdminUser && (
                    <details className="notice">
                      <summary>
                        Anteprima admin dettaglio partite Telegram
                      </summary>
                      <pre className="telegram-preview-box">
                        {telegramPreview ||
                          "Evento generico: nessuna partita compilata."}
                      </pre>
                    </details>
                  )}
                </div>
              </details>

              <button
                className="btn event-save-button"
                type="button"
                disabled={savingEvent}
                onClick={() => void createEvent()}
              >
                {savingEvent
                  ? "Salvataggio..."
                  : editingEventId
                    ? "💾 Aggiorna evento"
                    : plan.matchesDeferred
                      ? "✅ Crea evento generico"
                      : "✅ Crea evento con partite"}
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <h2>Creazione eventi riservata</h2>
            <p className="muted">
              Solo Staff, Coach o Owner possono creare eventi.
            </p>
          </div>
        )}
      </section>

      <section className="card top-gap">
        <div className="section-title">
          <div>
            <h2>Eventi passati / archivio risultati</h2>
            <p className="muted">
              Caricati: {events.length} • da fare: {todoEvents.length} • futuri:{" "}
              {futureEvents.length} • passati: {pastEvents.length} • annullati:{" "}
              {cancelledEvents.length}
            </p>
          </div>
          <select
            className="select compact-select"
            value={eventFilter}
            onChange={(e) =>
              setEventFilter(e.target.value as "future" | "all" | "past")
            }
          >
            <option value="past">Passati automatici</option>
            <option value="future">Futuri</option>
            <option value="all">Tutti</option>
          </select>
        </div>
        <div className="ak-event-list top-gap">
          {visibleEvents.map((event) => {
            const eventPlan = normalizePlan(event.event_plan || emptyPlan());
            const manualLink =
              eventPlan.lobbyLink || eventPlan.discordLink || "";
            return (
              <article
                id={`archive-${event.id}`}
                key={event.id}
                className="ak-event-card"
              >
                <div className="ak-event-copy">
                  <div className="eyebrow">
                    {eventPlan.eventStatus || event.event_type || "evento"}
                  </div>
                  <h3>{event.title}</h3>
                  <p className="muted">
                    {new Date(event.starts_at).toLocaleString("it-IT")}{" "}
                    {event.location ? `• ${event.location}` : ""}
                  </p>
                  <div className="ak-event-mini-pills">
                    <span className="pill-chip">
                      🗓️ {new Date(event.starts_at).toLocaleDateString("it-IT")}
                    </span>
                    {event.location ? (
                      <span className="pill-chip">📍 {event.location}</span>
                    ) : null}
                    <span className="pill-chip">
                      {eventEndTimestamp(event) <= Date.now()
                        ? "📜 Passato"
                        : "🔥 Da fare"}
                    </span>
                  </div>
                  <div className="archive-result-links-v131">
                    {(eventPlan.rounds || []).map((round, index) => (
                      <a
                        key={`${event.id}-${round.n || index + 1}`}
                        className="btn small secondary"
                        href={`/import/match?event=${event.id}&round=${round.n || index + 1}&matchCode=${encodeURIComponent(round.matchCode || "")}`}
                      >
                        Inserisci risultato P{round.n || index + 1}
                      </a>
                    ))}
                    {!(eventPlan.rounds || []).length && canWrite ? (
                      <button
                        className="btn small secondary"
                        type="button"
                        onClick={() => loadEventIntoEditor(event)}
                      >
                        Aggiungi partite/risultato
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="ak-event-actions">
                  <button
                    className="btn secondary"
                    onClick={() => loadEventIntoEditor(event)}
                  >
                    Modifica
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() => loadEventIntoEditor(event, true)}
                  >
                    Duplica
                  </button>
                  <button
                    className="btn whatsapp-btn-v1311"
                    type="button"
                    onClick={() => void shareEventWhatsApp(event, eventPlan)}
                  >
                    🟢 WhatsApp
                  </button>
                  {manualLink ? (
                    <a
                      href={manualLink}
                      target="_blank"
                      rel="noreferrer"
                      className="btn secondary"
                    >
                      Apri link evento
                    </a>
                  ) : null}
                  {canWrite && !isCancelledEvent(event) && (
                    <button
                      className="btn secondary event-cancel-btn-v138"
                      onClick={() => void cancelEvent(event)}
                    >
                      Annulla evento
                    </button>
                  )}
                  {canWrite && (
                    <button
                      className="btn danger secondary"
                      onClick={() => void deleteEvent(event.id)}
                    >
                      Cancella
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {!visibleEvents.length && (
            <p className="empty-state">Nessun evento da mostrare.</p>
          )}
        </div>
      </section>

      <section className="card top-gap cancelled-events-v138">
        <div className="section-title">
          <div>
            <h2>🚫 Eventi annullati</h2>
            <p className="muted">
              Gli eventi annullati non compaiono tra quelli da fare e restano
              consultabili qui.
            </p>
          </div>
          <span className="badge warn">{cancelledEvents.length} annullati</span>
        </div>
        <div className="ak-event-list top-gap">
          {cancelledEvents.map((event) => (
            <article
              className="ak-event-card event-cancelled-card-v138"
              key={`cancelled-${event.id}`}
            >
              <div className="ak-event-copy">
                <div className="eyebrow">ANNULLATO</div>
                <h3>{event.title}</h3>
                <p className="muted">
                  {new Date(event.starts_at).toLocaleString("it-IT")}{" "}
                  {event.location ? `• ${event.location}` : ""}
                </p>
              </div>
              <div className="ak-event-actions">
                <button className="btn whatsapp-btn-v1311" type="button" onClick={() => void shareEventWhatsApp(event, event.event_plan)}>🟢 WhatsApp</button>
                <button
                  className="btn secondary"
                  onClick={() => loadEventIntoEditor(event)}
                >
                  Modifica / riprogramma
                </button>
                {canWrite && (
                  <button
                    className="btn danger secondary"
                    onClick={() => void deleteEvent(event.id)}
                  >
                    Cancella
                  </button>
                )}
              </div>
            </article>
          ))}
          {!cancelledEvents.length && (
            <p className="empty-state">Nessun evento annullato.</p>
          )}
        </div>
      </section>
    </main>
  );
}

function dedupeEvents(rows: CodmEvent[]) {
  const map = new Map<string, CodmEvent>();
  const localKeyToId = new Map<string, string>();
  for (const row of rows) {
    if (!row?.id) continue;
    const localKey = row.local_id ? String(row.local_id) : "";
    if (localKey && localKeyToId.has(localKey)) {
      const previousId = localKeyToId.get(localKey)!;
      const previous = map.get(previousId);
      const chosen =
        isUuid(row.id) || previous?.sync_status !== "synced" ? row : previous;
      map.delete(previousId);
      map.set(chosen.id, chosen);
      localKeyToId.set(localKey, chosen.id);
      continue;
    }
    map.set(row.id, row);
    if (localKey) localKeyToId.set(localKey, row.id);
  }
  return Array.from(map.values());
}
function buildLocalEventFromPayload(payload: Record<string, any>): CodmEvent {
  return {
    id: payload.id || "",
    clan_id: isUuid(payload.clan_id) ? payload.clan_id : "",
    local_id: null,
    sync_status: payload.sync_status || null,
    sync_error: payload.sync_error || null,
    title: payload.title || "Evento CODM",
    description: payload.description || null,
    starts_at: payload.starts_at || new Date().toISOString(),
    ends_at: payload.ends_at || null,
    location: payload.location || null,
    event_type: payload.event_type || "scrim",
    google_calendar_url: payload.google_calendar_url || null,
    telegram_enabled: payload.telegram_enabled ?? true,
    created_at: payload.created_at || new Date().toISOString(),
    convocations: payload.convocations || [],
    convocations_text: payload.convocations_text || null,
    reminder_minutes: payload.reminder_minutes || [120, 60, 30, 10],
    telegram_message_template: payload.telegram_message_template || null,
    event_notes: payload.event_notes || null,
    event_plan: payload.event_plan || emptyPlan("AK47DX"),
  };
}
function RoundRosterPicker({
  title,
  players,
  selected,
  opposite,
  onToggle,
}: {
  title: string;
  players: PlayerRow[];
  selected: string[];
  opposite: string[];
  onToggle: (nickname: string) => void;
}) {
  return (
    <div className="round-roster-box">
      <label>{title}</label>
      <div className="round-roster-picks">
        {players.map((player) => {
          const isSelected = selected.includes(player.nickname);
          const isOpposite = opposite.includes(player.nickname);
          return (
            <button
              key={player.id}
              type="button"
              className={`round-roster-chip ${isSelected ? "active" : ""} ${isOpposite ? "opposite" : ""}`}
              onClick={() => onToggle(player.nickname)}
              title={
                isOpposite
                  ? "Selezionando qui verrà rimosso dall’altro gruppo"
                  : player.nickname
              }
            >
              {isSelected ? "✓ " : ""}
              {player.nickname}
            </button>
          );
        })}
        {!players.length && (
          <span className="muted">Nessun player registrato.</span>
        )}
      </div>
    </div>
  );
}
function BanPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [custom, setCustom] = useState("");
  const selected = listFromText(value);
  function toggleBan(item: string) {
    onChange(
      selected.includes(item)
        ? textFromList(selected.filter((x) => x !== item))
        : textFromList([...selected, item]),
    );
  }
  function addCustom() {
    const clean = custom.trim();
    if (!clean) return;
    onChange(textFromList([...selected, clean]));
    setCustom("");
  }
  return (
    <div className="ban-picker">
      <div className="ban-chip-list">
        {banOptions.map((item) => (
          <button
            key={item}
            type="button"
            className={`ban-chip ${selected.includes(item) ? "active" : ""}`}
            onClick={() => toggleBan(item)}
          >
            {selected.includes(item) ? "✓ " : "🚫 "}
            {item}
          </button>
        ))}
      </div>
      <div className="ban-custom-row">
        <input
          className="input"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Aggiungi BAN manuale"
        />
        <button
          className="btn small secondary"
          type="button"
          onClick={addCustom}
        >
          Aggiungi
        </button>
      </div>
      <small className="muted">
        BAN selezionati: {selected.length ? selected.join(", ") : "nessuno"}
      </small>
    </div>
  );
}
function MatchRoundEditor({
  round,
  index,
  players,
  updateRound,
  removeRound,
  toggleRoundRoster,
}: {
  round: MatchRound;
  index: number;
  players: PlayerRow[];
  updateRound: (index: number, patch: Partial<MatchRound>) => void;
  removeRound: (index: number) => void;
  toggleRoundRoster: (
    index: number,
    field: "players" | "reserves",
    nickname: string,
  ) => void;
}) {
  const meta = modeMeta(round.mode);
  const starters = listFromText(round.players);
  const reserves = listFromText(round.reserves);
  const outcome = getMatchOutcome(round);
  const status = getMatchStatus(round);
  return (
    <article className="match-card-v64">
      <div className="match-card-head">
        <div>
          <p className="eyebrow">
            {meta.icon} {meta.help}
          </p>
          <h3>Partita {round.n}</h3>
          <span className="match-code-pill">ID {round.matchCode}</span>
        </div>
        <div className="match-head-actions">
          <span
            className={`match-status-pill ${status === "Risultato caricato" ? "loaded" : status === "Giocata" ? "played" : ""}`}
          >
            {status}
          </span>
          {outcome && (
            <span className={`match-result-pill ${outcome.toLowerCase()}`}>
              {outcome}
            </span>
          )}
          <button
            className="btn small secondary"
            type="button"
            onClick={() => removeRound(index)}
          >
            Elimina
          </button>
        </div>
      </div>
      <div className="grid grid-4">
        <div className="field">
          <label>Tipologia partita</label>
          <select
            className="select codm-mode-select"
            value={round.mode}
            onChange={(e) => updateRound(index, { mode: e.target.value })}
          >
            {modeOptions.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Mappa CODM</label>
          <select
            className="select codm-map-select"
            value={round.map}
            onChange={(e) => updateRound(index, { map: e.target.value })}
          >
            <option value="">🗺️ Seleziona mappa</option>
            {codmMaps.map((map) => (
              <option key={map} value={map}>
                {map}
              </option>
            ))}
          </select>
          <small className="muted">
            Menu a tendina diretto: clicchi e vedi subito le mappe.
          </small>
        </div>
        <div className="field">
          <label>Tipologia round / punteggio</label>
          <select
            className="select"
            value={round.scoreType}
            onChange={(e) => {
              const metaScore = scoreMeta(e.target.value);
              updateRound(index, {
                scoreType: e.target.value,
                target: round.target || metaScore.target,
              });
            }}
          >
            {scoreTypeOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <small className="muted">{scoreMeta(round.scoreType).help}</small>
        </div>
        <div className="field">
          <label>Punteggio / target</label>
          <input
            className="input"
            value={round.target}
            onChange={(e) => updateRound(index, { target: e.target.value })}
            placeholder={scoreMeta(round.scoreType).target}
          />
        </div>
      </div>
      <div className="grid grid-2 top-gap">
        <div className="field">
          <label>Apertura lobby</label>
          <input
            className="input"
            value={round.lobbyOpen}
            onChange={(e) => updateRound(index, { lobbyOpen: e.target.value })}
            placeholder="21:45"
          />
        </div>
        <div className="field">
          <label>Orario partita</label>
          <input
            className="input"
            value={round.startTime}
            onChange={(e) => updateRound(index, { startTime: e.target.value })}
            placeholder="22:00"
          />
        </div>
      </div>
      <div className="grid grid-2 top-gap">
        <RoundRosterPicker
          title="Formazione titolare da roster app"
          players={players}
          selected={starters}
          opposite={reserves}
          onToggle={(nickname) => toggleRoundRoster(index, "players", nickname)}
        />
        <RoundRosterPicker
          title="Riserve da roster app"
          players={players}
          selected={reserves}
          opposite={starters}
          onToggle={(nickname) =>
            toggleRoundRoster(index, "reserves", nickname)
          }
        />
      </div>
      <div className="field top-gap">
        <label>🚫 BAN partita da lista</label>
        <BanPicker
          value={round.bans}
          onChange={(value) => updateRound(index, { bans: value })}
        />
      </div>
      <div className="grid grid-4 top-gap">
        <div className="field">
          <label>Stato partita</label>
          <select
            className="select"
            value={status}
            onChange={(e) => updateRound(index, { status: e.target.value })}
          >
            {matchStatuses.map((entry) => (
              <option key={entry}>{entry}</option>
            ))}
          </select>
          <small className="muted">Badge visibile anche nel riepilogo.</small>
        </div>
        <div className="field">
          <label>Score nostro clan</label>
          <input
            className="input"
            value={round.ourScore}
            disabled
            placeholder="Automatico da Importa partita"
          />
        </div>
        <div className="field">
          <label>Score avversario</label>
          <input
            className="input"
            value={round.opponentScore}
            disabled
            placeholder="Automatico da Importa partita"
          />
        </div>
        <div className="field">
          <label>MVP partita</label>
          <input
            className="input"
            value={round.mvp}
            disabled
            placeholder="Automatico da Importa partita"
          />
        </div>
      </div>
      <div className="notice">
        <strong>Risultato:</strong>{" "}
        {outcome || "verrà compilato da Carico/Import partita."}
      </div>
    </article>
  );
}
function EventPresentation({
  event,
  plan,
  starters,
  reserves,
  canWrite,
  onDelete,
  onEdit,
  onDuplicate,
  onCancel,
}: {
  event: CodmEvent;
  plan: MatchPlan;
  starters: string[];
  reserves: string[];
  canWrite: boolean;
  onDelete: (id: string) => Promise<void>;
  onEdit: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
}) {
  const normalizedPlan = normalizePlan(plan);
  const statusLabel =
    normalizedPlan.eventStatus ||
    (normalizedPlan.matchesDeferred ? "Da completare" : "Programmato");
  const rounds = normalizedPlan.rounds.slice(
    0,
    Number(normalizedPlan.totalMatches || normalizedPlan.rounds.length || 1),
  );
  return (
    <article
      id={event.id}
      className="event-presentation-card event-presentation-card-v65"
    >
      {normalizedPlan.coverImage && (
        <img
          className="event-cover-image"
          src={normalizedPlan.coverImage}
          alt={`Cover ${event.title}`}
        />
      )}
      <div className="event-versus compact-versus">
        <TeamLogo
          name={normalizedPlan.teamAName}
          logo={normalizedPlan.teamALogo}
        />
        <div className="vs-block">
          <span>VS</span>
          <strong>{new Date(event.starts_at).toLocaleString("it-IT")}</strong>
          <small>
            {normalizedPlan.lobbyTime
              ? `Lobby ${normalizedPlan.lobbyTime}`
              : event.location || "CODM"}
          </small>
        </div>
        <TeamLogo
          name={normalizedPlan.teamBName}
          logo={normalizedPlan.teamBLogo}
        />
      </div>
      <div className="event-meta-grid">
        <span>
          📌 Stato: <b>{statusLabel}</b>
        </span>
        <span>
          🎮 Partite: <b>{rounds.length || "da aggiungere"}</b>
        </span>
        <span>
          🏠 Stanza: <b>{normalizedPlan.roomNumber || "-"}</b>
        </span>
        <span>
          💬 Discord: <b>{normalizedPlan.discordLink ? "presente" : "-"}</b>
        </span>
        <span>
          🔗 Lobby: <b>{normalizedPlan.lobbyLink ? "presente" : "-"}</b>
        </span>
      </div>
      <div className="event-summary-v65">
        {!rounds.length && (
          <div className="event-match-summary generic-event-empty-v13">
            <div className="event-match-summary-head">
              <b>Evento generico</b>
              <span className="match-status-pill played">{statusLabel}</span>
            </div>
            <div className="summary-lines">
              <p>
                <strong>Partite:</strong> da aggiungere in fase successiva.
              </p>
              <p>
                <strong>Descrizione:</strong>{" "}
                {event.description || "Nessuna descrizione inserita."}
              </p>
            </div>
          </div>
        )}
        {rounds.map((round) => {
          const meta = modeMeta(round.mode);
          const outcome = getMatchOutcome(round);
          const status = getMatchStatus(round);
          return (
            <div key={round.n} className="event-match-summary">
              <div className="event-match-summary-head">
                <b>Partita {round.n}</b>
                <span className="match-code-mini">
                  ID {round.matchCode || "-"}
                </span>
                <span
                  className={`match-status-pill ${status === "Risultato caricato" ? "loaded" : status === "Giocata" ? "played" : ""}`}
                >
                  {status}
                </span>
                {outcome && (
                  <span
                    className={`match-result-pill ${outcome.toLowerCase()}`}
                  >
                    {outcome}
                  </span>
                )}
              </div>
              <div className="summary-lines">
                <p>
                  <strong>Dettagli:</strong> {meta.icon}{" "}
                  {meta.label.replace(/^\S+\s/, "")} ·{" "}
                  {round.map || "Mappa da decidere"} ·{" "}
                  {round.scoreType || "Punteggio round"}{" "}
                  {round.target ? `(${round.target})` : ""}
                </p>
                <p>
                  <strong>Orari:</strong> lobby{" "}
                  {round.lobbyOpen || normalizedPlan.lobbyTime || "-"} · partita{" "}
                  {round.startTime || "-"}
                </p>
                <p>
                  <strong>Convocati:</strong>{" "}
                  {round.players || starters.join(", ") || "Da scegliere"}
                </p>
                {round.reserves && (
                  <p>
                    <strong>Riserve:</strong> {round.reserves}
                  </p>
                )}
                {round.bans && (
                  <p className="ban-line">
                    <strong>BAN:</strong> {round.bans}
                  </p>
                )}
                <p>
                  <strong>Risultato:</strong>{" "}
                  {round.ourScore || round.opponentScore
                    ? `${round.ourScore || "-"} - ${round.opponentScore || "-"}`
                    : "Da importare"}{" "}
                  {round.mvp ? `· MVP ${round.mvp}` : ""}
                </p>
              </div>
              <a
                className="btn small secondary"
                href={`/import/match?event=${event.id}&round=${round.n}&matchCode=${encodeURIComponent(round.matchCode || "")}`}
              >
                Importa partita {round.n}
              </a>
            </div>
          );
        })}
      </div>
      <div className="event-card-actions-v65">
        <button className="btn small whatsapp-btn-v1311" type="button" onClick={() => void shareEventWhatsApp(event, normalizedPlan)}>🟢 Condividi WhatsApp</button>
      </div>
      {canWrite && (
        <div className="event-card-actions-v65">
          <button className="btn small secondary" onClick={onEdit}>
            Modifica
          </button>
          <button className="btn small secondary" onClick={onDuplicate}>
            Duplica
          </button>
          <button
            className="btn small secondary event-cancel-btn-v138"
            onClick={onCancel}
          >
            Annulla evento
          </button>
          <button
            className="btn danger secondary small"
            onClick={() => void onDelete(event.id)}
          >
            Cancella
          </button>
        </div>
      )}
    </article>
  );
}
function TeamLogo({ name, logo }: { name: string; logo?: string }) {
  const displayName = String(name || "Da impostare").trim() || "Da impostare";
  return (
    <div className="team-logo-card">
      {logo ? (
        <img src={logo} alt={displayName} />
      ) : (
        <div className="team-logo-placeholder">
          {displayName.slice(0, 2).toUpperCase()}
        </div>
      )}
      <strong>{displayName}</strong>
    </div>
  );
}
