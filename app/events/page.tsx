"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useCodmAuth } from "@/lib/authRoles";
import { buildGoogleCalendarUrl } from "@/lib/googleCalendar";
import { pushLocalNotification } from "@/lib/clientNotifications";

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
  meetingTime: string;
  startTime: string;
  bans: string;
  status?: string;
  result: string;
  ourScore: string;
  opponentScore: string;
  mvp: string;
};

type MatchPlan = {
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
const DRAFT_KEY = "clan_manager_event_editor_draft_v7_0";
const LOCAL_EVENTS_KEY = "codm_local_events_v7_0";
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
  { value: "scrim", label: "⚔️ Scrim" },
  { value: "torneo", label: "🏆 Torneo" },
  { value: "allenamento", label: "🎯 Allenamento" },
  { value: "ranked", label: "💎 Ranked" },
];

const DEFAULT_TELEGRAM_TEMPLATE =
  "🎮 <b>Clan Manager Evento</b>\n\n<b>{title}</b>\n⏱️ Mancano {minutes} minuti\n🕒 {date}\n📍 {location}\n\n<b>Dettaglio partite:</b>\n{match_details}\n\n<b>Convocati:</b>\n{convocati}\n\n{description}";

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
    meetingTime: "",
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
    teamAName: clanName,
    teamBName: "Clan avversario",
    teamALogo: "/assets/ak47dx-logo.jpeg",
    teamBLogo: "",
    coverImage: "",
    totalMatches: 1,
    lobbyTime: "",
    discordLink: "",
    lobbyLink: "",
    roomNumber: "",
    rounds: [emptyRound(1)],
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
    return {
      ...emptyPlan("AK47DX"),
      ...plan,
      rounds: (plan.rounds || [emptyRound(1)]).map(sanitizeRound),
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
      return {
        ...emptyPlan("AK47DX"),
        ...parsed,
        rounds: (parsed.rounds || [emptyRound(1)]).map(sanitizeRound),
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
  const total = Math.max(
    1,
    Number(plan.totalMatches || plan.rounds.length || 1),
  );
  const rounds = plan.rounds.slice(0, total).map((round, index) => {
    const normalized = sanitizeRound(round, index);
    const outcome = getMatchOutcome(normalized);
    return {
      ...normalized,
      matchCode: normalized.matchCode || makeMatchCode(index + 1),
      status: getMatchStatus(normalized),
      result: outcome,
    };
  });
  return { ...plan, totalMatches: rounds.length, rounds };
}
function buildMatchDetails(plan: MatchPlan) {
  const normalized = normalizePlan(plan);
  return normalized.rounds
    .map((round) => {
      const mode = modeMeta(round.mode);
      const outcome = getMatchOutcome(round);
      return [
        `<b>Partita ${round.n}</b> · Codice ${round.matchCode || "auto"} · ${mode.icon} ${mode.label.replace(/^\S+\s/, "")}`,
        `Dettagli: mappa ${round.map || "Da decidere"} · ${round.scoreType || "Punteggio round"} · target ${round.target || "-"}`,
        `Orari: ritrovo ${round.meetingTime || "-"} · lobby ${round.lobbyOpen || normalized.lobbyTime || "-"} · start ${round.startTime || "-"}`,
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

export default function EventsPage() {
  const auth = useCodmAuth();
  const [events, setEvents] = useState<CodmEvent[]>([]);
  const [eventPlayers, setEventPlayers] = useState<EventPlayerRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [message, setMessage] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(monthKey(new Date()));
  const [eventFilter, setEventFilter] = useState<"future" | "all" | "past">(
    "future",
  );
  const [eventsLoading, setEventsLoading] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [title, setTitle] = useState("Scrim AK47DX vs Clan avversario");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("CODM room");
  const [eventType, setEventType] = useState("scrim");
  const [startsAt, setStartsAt] = useState(
    toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const [endsAt, setEndsAt] = useState(
    toLocalInputValue(new Date(Date.now() + 3 * 60 * 60 * 1000)),
  );
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState("120,60,30,10");
  const [telegramTemplate, setTelegramTemplate] = useState(
    DEFAULT_TELEGRAM_TEMPLATE,
  );
  const [eventNotes, setEventNotes] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [reservePlayers, setReservePlayers] = useState<string[]>([]);
  const [plan, setPlan] = useState<MatchPlan>(() => emptyPlan("AK47DX"));

  const canWrite = auth.canWrite;

  useEffect(() => {
    void loadEvents();
    void loadPlayers();
  }, []);
  useEffect(() => {
    if (auth.clanName)
      setPlan((p) => ({
        ...p,
        teamAName: p.teamAName === "AK47DX" ? auth.clanName : p.teamAName,
      }));
  }, [auth.clanName]);
  useEffect(() => {
    try {
      const cachedEvents =
        localStorage.getItem("clan_manager_events_cache_v7_0") ||
        localStorage.getItem("clan_manager_events_cache_v6_7");
      const localEvents = localStorage.getItem(LOCAL_EVENTS_KEY);
      const mergedCached = [
        ...(cachedEvents ? (JSON.parse(cachedEvents) as CodmEvent[]) : []),
        ...(localEvents ? (JSON.parse(localEvents) as CodmEvent[]) : []),
      ];
      if (mergedCached.length) setEvents(dedupeEvents(mergedCached));
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as any;
        setTitle(draft.title || "Scrim AK47DX vs Clan avversario");
        setDescription(draft.description || "");
        setLocation(draft.location || "CODM room");
        setEventType(draft.eventType || "scrim");
        setStartsAt(
          draft.startsAt ||
            toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)),
        );
        setEndsAt(
          draft.endsAt ||
            toLocalInputValue(new Date(Date.now() + 3 * 60 * 60 * 1000)),
        );
        setTelegramEnabled(draft.telegramEnabled ?? true);
        setReminderMinutes(draft.reminderMinutes || "120,60,30,10");
        setTelegramTemplate(
          draft.telegramTemplate || DEFAULT_TELEGRAM_TEMPLATE,
        );
        setEventNotes(draft.eventNotes || "");
        setSelectedPlayers(
          Array.isArray(draft.selectedPlayers) ? draft.selectedPlayers : [],
        );
        setReservePlayers(
          Array.isArray(draft.reservePlayers) ? draft.reservePlayers : [],
        );
        if (draft.plan)
          setPlan(
            normalizePlan({
              ...emptyPlan(auth.clanName || "AK47DX"),
              ...draft.plan,
            }),
          );
        setEditingEventId(draft.editingEventId || null);
        setMessage(
          "Bozza evento ripristinata: non si perde quando cambi tab Chrome o apri cartelle sul PC.",
        );
      }
    } catch {}
    setDraftReady(true);
  }, []);
  useEffect(() => {
    if (!draftReady || !canWrite) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          draftPayload({
            title,
            description,
            location,
            eventType,
            startsAt,
            endsAt,
            telegramEnabled,
            reminderMinutes,
            telegramTemplate,
            eventNotes,
            selectedPlayers,
            reservePlayers,
            plan,
            editingEventId,
          }),
        );
      } catch {}
    }, 850);
    return () => window.clearTimeout(timer);
  }, [
    draftReady,
    canWrite,
    title,
    description,
    location,
    eventType,
    startsAt,
    endsAt,
    telegramEnabled,
    reminderMinutes,
    telegramTemplate,
    eventNotes,
    selectedPlayers,
    reservePlayers,
    plan,
    editingEventId,
  ]);
  useEffect(() => {
    try {
      if (events.length)
        localStorage.setItem(
          "clan_manager_events_cache_v7_0",
          JSON.stringify(events),
        );
    } catch {}
  }, [events]);

  function getLocalEvents(): CodmEvent[] {
    try {
      return JSON.parse(
        localStorage.getItem(LOCAL_EVENTS_KEY) || "[]",
      ) as CodmEvent[];
    } catch {
      return [];
    }
  }
  function saveLocalEvents(rows: CodmEvent[]) {
    try {
      localStorage.setItem(
        LOCAL_EVENTS_KEY,
        JSON.stringify(rows.slice(0, 150)),
      );
    } catch {}
  }
  function mergeWithLocalEvents(remoteRows: CodmEvent[]) {
    return dedupeEvents([...getLocalEvents(), ...remoteRows]).sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
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
  async function loadEvents() {
    setEventsLoading(true);
    setMessage((m) => (m && m.includes("Bozza") ? m : ""));
    const localRows = getLocalEvents();
    if (localRows.length)
      setEvents((current) => dedupeEvents([...current, ...localRows]));
    try {
      const { data, error } = await supabase
        .from("codm_events")
        .select("*")
        .order("starts_at", { ascending: true })
        .limit(300);
      if (error) throw error;
      const rows = mergeWithLocalEvents((data || []) as CodmEvent[]);
      setEvents(rows);
      const ids = rows
        .filter((e) => !String(e.id).startsWith("local-"))
        .map((e) => e.id)
        .filter(Boolean);
      if (ids.length) {
        const { data: epRows } = await supabase
          .from("codm_event_players")
          .select("event_id,player_id,nickname,status")
          .in("event_id", ids);
        setEventPlayers((epRows || []) as EventPlayerRow[]);
      } else setEventPlayers([]);
    } catch (error) {
      const fallback = mergeWithLocalEvents([]);
      setEvents(fallback);
      if (!fallback.length)
        setMessage(
          error instanceof Error
            ? `Eventi non caricati: ${error.message}`
            : "Eventi non caricati.",
        );
    } finally {
      setEventsLoading(false);
    }
  }

  function parseReminderMinutes() {
    const values = reminderMinutes
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isFinite(n) && n > 0 && n <= 10080);
    return Array.from(new Set(values.length ? values : [120, 10])).sort(
      (a, b) => b - a,
    );
  }
  function toggle(
    setter: (fn: (current: string[]) => string[]) => void,
    id: string,
  ) {
    setter((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }
  function updateRound(index: number, patch: Partial<MatchRound>) {
    setPlan((current) => ({
      ...current,
      rounds: current.rounds.map((round, i) =>
        i === index ? { ...round, ...patch } : round,
      ),
    }));
  }
  function addRound() {
    setPlan((current) => {
      const n = current.rounds.length + 1;
      return {
        ...current,
        totalMatches: n,
        rounds: [...current.rounds, emptyRound(n)],
      };
    });
  }
  function removeRound(index: number) {
    setPlan((current) => {
      const next = current.rounds
        .filter((_, i) => i !== index)
        .map((r, i) => ({
          ...r,
          n: i + 1,
          matchCode: r.matchCode || makeMatchCode(i + 1),
        }));
      return {
        ...current,
        totalMatches: Math.max(1, next.length),
        rounds: next.length ? next : [emptyRound(1)],
      };
    });
  }
  function toggleRoundRoster(
    index: number,
    field: "players" | "reserves",
    nickname: string,
  ) {
    setPlan((current) => ({
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
    reader.onload = () => cb(String(reader.result || ""));
    reader.readAsDataURL(file);
  }
  function resetEditor(clearDraft = false) {
    setEditingEventId(null);
    setTitle("Scrim AK47DX vs Clan avversario");
    setDescription("");
    setLocation("CODM room");
    setEventType("scrim");
    setStartsAt(toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
    setEndsAt(toLocalInputValue(new Date(Date.now() + 3 * 60 * 60 * 1000)));
    setTelegramEnabled(true);
    setReminderMinutes("120,60,30,10");
    setTelegramTemplate(DEFAULT_TELEGRAM_TEMPLATE);
    setEventNotes("");
    setSelectedPlayers([]);
    setReservePlayers([]);
    setPlan(emptyPlan(auth.clanName || "AK47DX"));
    if (clearDraft) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
    }
    setMessage(
      clearDraft
        ? "Editor pulito e bozza locale cancellata."
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
    setReminderMinutes((event.reminder_minutes || [120, 60, 30, 10]).join(","));
    setTelegramTemplate(
      event.telegram_message_template || DEFAULT_TELEGRAM_TEMPLATE,
    );
    setEventNotes(stripOldPlan(event.event_notes || ""));
    setPlan(normalizePlan(eventPlan));
    const starters = eventPlayers
      .filter((r) => r.event_id === event.id && r.status === "titolare")
      .map((r) => r.player_id)
      .filter(Boolean) as string[];
    const reserves = eventPlayers
      .filter((r) => r.event_id === event.id && r.status === "riserva")
      .map((r) => r.player_id)
      .filter(Boolean) as string[];
    setSelectedPlayers(starters);
    setReservePlayers(reserves);
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

  async function createEvent() {
    if (savingEvent) return;
    setSavingEvent(true);
    try {
      if (!canWrite) {
        setMessage("Solo owner, coach o staff possono creare eventi.");
        return;
      }
      if (!title.trim()) {
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
      const convocati = players.filter((p) => selectedPlayers.includes(p.id));
      const reserves = players.filter((p) => reservePlayers.includes(p.id));
      const effectivePlan = normalizePlan(plan);
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
      const fullDescription = [description, convocationsText]
        .filter(Boolean)
        .join("\n\n");
      const googleUrl = buildGoogleCalendarUrl({
        title,
        description: fullDescription,
        location,
        startsAt: startIso,
        endsAt: endIso,
      });
      const effectiveClanId = auth.clanId || "local-ak47dx";
      const basePayload: Record<string, any> = {
        clan_id: effectiveClanId,
        title: title.trim(),
        description: fullDescription || null,
        location: location || null,
        event_type: eventType,
        starts_at: startIso,
        ends_at: endIso,
        telegram_enabled: telegramEnabled,
        reminder_minutes: parseReminderMinutes(),
        telegram_message_template:
          telegramTemplate || DEFAULT_TELEGRAM_TEMPLATE,
        event_notes: planNote(effectivePlan, eventNotes),
        google_calendar_url: googleUrl,
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
      let eventId = editingEventId;
      let error: any = null;
      if (!isSupabaseConfigured) {
        error = new Error(
          "Supabase non configurato: evento salvato solo nella PWA locale.",
        );
      } else if (editingEventId) {
        const update = await supabase
          .from("codm_events")
          .update(payloadWithPlan)
          .eq("id", editingEventId)
          .select("id")
          .single();
        error = update.error;
        if (error && /event_plan|column/i.test(error.message)) {
          const retry = await supabase
            .from("codm_events")
            .update(basePayload)
            .eq("id", editingEventId)
            .select("id")
            .single();
          error = retry.error;
        }
      } else {
        const insertPayload = {
          ...payloadWithPlan,
          created_by: auth.user?.id || null,
        };
        const insert = await supabase
          .from("codm_events")
          .insert(insertPayload)
          .select("id")
          .single();
        error = insert.error;
        eventId = insert.data?.id || null;
        if (error && /event_plan|column/i.test(error.message)) {
          const retry = await supabase
            .from("codm_events")
            .insert({ ...basePayload, created_by: auth.user?.id || null })
            .select("id")
            .single();
          error = retry.error;
          eventId = retry.data?.id || null;
        }
      }
      if (error) {
        const localEvent = buildLocalEventFromPayload({
          ...payloadWithPlan,
          id: editingEventId || `local-${Date.now()}`,
        });
        const nextLocal = [
          localEvent,
          ...getLocalEvents().filter((event) => event.id !== localEvent.id),
        ];
        saveLocalEvents(nextLocal);
        setEvents(mergeWithLocalEvents([]));
        pushLocalNotification({
          type: "event",
          title: editingEventId
            ? "Evento aggiornato in locale"
            : "Evento creato in locale",
          body: `${localEvent.title} · ${new Date(localEvent.starts_at).toLocaleString("it-IT")}`,
          href: "/events",
        });
        setMessage(
          `Evento salvato in locale/PWA. Supabase non ha confermato il salvataggio: ${error.message}`,
        );
        setEditingEventId(null);
        return;
      }
      if (eventId) {
        await supabase
          .from("codm_event_players")
          .delete()
          .eq("event_id", eventId);
        const rows = [
          ...convocati.map((p) => ({
            event_id: eventId,
            clan_id: effectiveClanId,
            player_id: p.id,
            nickname: p.nickname,
            status: "titolare",
          })),
          ...reserves.map((p) => ({
            event_id: eventId,
            clan_id: effectiveClanId,
            player_id: p.id,
            nickname: p.nickname,
            status: "riserva",
          })),
        ];
        if (rows.length) await supabase.from("codm_event_players").insert(rows);
      }
      pushLocalNotification({
        type: "event",
        title: editingEventId ? "Evento aggiornato" : "Nuovo evento creato",
        body: `${title.trim()} · ${new Date(startIso).toLocaleString("it-IT")}`,
        href: "/events",
      });
      setMessage(
        editingEventId
          ? "Evento aggiornato. Badge notifiche aggiornato."
          : "Evento creato. Badge notifiche aggiornato e partite pronte in calendario.",
      );
      setEditingEventId(null);
      await loadEvents();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Errore creazione evento: ${error.message}`
          : "Errore creazione evento.",
      );
    } finally {
      setSavingEvent(false);
    }
  }
  async function deleteEvent(id: string) {
    if (!canWrite)
      return setMessage("Solo staff/coach/owner possono cancellare eventi.");
    if (!confirm("Cancellare evento e convocazioni?")) return;
    if (String(id).startsWith("local-")) {
      saveLocalEvents(getLocalEvents().filter((event) => event.id !== id));
      setEvents(mergeWithLocalEvents([]));
      setMessage("Evento locale cancellato.");
      return;
    }
    const { error } = await supabase.from("codm_events").delete().eq("id", id);
    if (error) return setMessage(error.message);
    setMessage("Evento cancellato.");
    await loadEvents();
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
  const futureEvents = useMemo(
    () =>
      events.filter(
        (e) => new Date(e.starts_at).getTime() >= Date.now() - 60 * 60 * 1000,
      ),
    [events],
  );
  const pastEvents = useMemo(
    () =>
      events
        .filter(
          (e) => new Date(e.starts_at).getTime() < Date.now() - 60 * 60 * 1000,
        )
        .reverse(),
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
    <main className="container wide ak-page-compact events-v64 events-v65">
      <section className="card ak-section-head events-compact-hero">
        <p className="eyebrow">📅 Clan Manager Event Center</p>
        <h1>Eventi, calendario e partite CODM</h1>
        <p className="muted">
          Lista mappe CODM, BAN selezionabili, badge stato, modifica/duplica
          evento e import risultato collegato all’evento.
        </p>
        {message && <div className="notice top-gap">{message}</div>}
        {canWrite && (
          <button
            className="btn event-mobile-create-cta"
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
      </section>

      <section className="card top-gap ak-events-first compact-events-first">
        <div className="section-title">
          <div>
            <h2>Eventi da fare</h2>
            <p className="muted">
              Riepilogo compatto. Apri modifica, duplica o importa risultato
              partita.
            </p>
          </div>
          <button
            className="btn secondary small"
            onClick={() => void loadEvents()}
          >
            {eventsLoading ? "Carico..." : "Aggiorna"}
          </button>
        </div>
        <div className="event-presentation-list top-gap">
          {futureEvents.slice(0, 5).map((event) => (
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
            />
          ))}
          {!futureEvents.length && (
            <p className="empty-state">Nessun evento futuro in programma.</p>
          )}
        </div>
      </section>

      <section className="card top-gap">
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
          <div className="card event-create-v64">
            <div className="section-title">
              <div>
                <h2>
                  {editingEventId
                    ? "Modifica evento / Editor partite"
                    : "Nuovo evento / Editor partite"}
                </h2>
                <p className="muted">
                  I campi risultato sono aggiornati dall’import partita. La
                  bozza resta salvata anche se cambi tab Chrome.
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
                  Reset bozza
                </button>
              </div>
            </div>
            <div className="match-count-toolbar top-gap">
              <span>
                Partite configurate: <b>{plan.rounds.length}</b>
              </span>
              <button
                className="btn small secondary"
                type="button"
                onClick={() => removeRound(plan.rounds.length - 1)}
                disabled={plan.rounds.length <= 1}
              >
                - Togli ultima partita
              </button>
              <small>
                Default 1 partita. Ogni partita è lavorabile e separata.
              </small>
            </div>

            <div className="form top-gap">
              <div className="field">
                <label>Titolo evento</label>
                <input
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-4">
                <div className="field">
                  <label>Inizio</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Fine</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Tipo evento</label>
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
                <div className="field">
                  <label>Luogo</label>
                  <input
                    className="input"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="field">
                  <label>Team A</label>
                  <input
                    className="input"
                    value={plan.teamAName}
                    onChange={(e) =>
                      setPlan((p) => ({ ...p, teamAName: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Team B</label>
                  <input
                    className="input"
                    value={plan.teamBName}
                    onChange={(e) =>
                      setPlan((p) => ({ ...p, teamBName: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-3">
                <div className="field">
                  <label>Logo Team A</label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      readImage(e.target.files?.[0], (url) =>
                        setPlan((p) => ({ ...p, teamALogo: url })),
                      )
                    }
                  />
                  <small className="muted">Seleziona file logo dal PC.</small>
                </div>
                <div className="field">
                  <label>Logo Team B</label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      readImage(e.target.files?.[0], (url) =>
                        setPlan((p) => ({ ...p, teamBLogo: url })),
                      )
                    }
                  />
                  <small className="muted">Logo avversario.</small>
                </div>
                <div className="field">
                  <label>Cover presentazione</label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      readImage(e.target.files?.[0], (url) =>
                        setPlan((p) => ({ ...p, coverImage: url })),
                      )
                    }
                  />
                  <small className="muted">Immagine grande evento.</small>
                </div>
              </div>
              <div className="grid grid-4">
                <div className="field">
                  <label>Tempo lobby generale</label>
                  <input
                    className="input"
                    value={plan.lobbyTime}
                    onChange={(e) =>
                      setPlan((p) => ({ ...p, lobbyTime: e.target.value }))
                    }
                    placeholder="es. 21:45"
                  />
                </div>
                <div className="field">
                  <label>Numero stanza</label>
                  <input
                    className="input"
                    value={plan.roomNumber}
                    onChange={(e) =>
                      setPlan((p) => ({ ...p, roomNumber: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Link Discord</label>
                  <input
                    className="input"
                    value={plan.discordLink}
                    onChange={(e) =>
                      setPlan((p) => ({ ...p, discordLink: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Link lobby</label>
                  <input
                    className="input"
                    value={plan.lobbyLink}
                    onChange={(e) =>
                      setPlan((p) => ({ ...p, lobbyLink: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

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

            <div className="form top-gap">
              <div className="field">
                <label>Descrizione pubblica</label>
                <textarea
                  className="input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-2">
                <div className="field">
                  <label>Reminder minuti</label>
                  <input
                    className="input"
                    value={reminderMinutes}
                    onChange={(e) => setReminderMinutes(e.target.value)}
                  />
                </div>
                <label className="check-line ak-check-card">
                  <input
                    type="checkbox"
                    checked={telegramEnabled}
                    onChange={(e) => setTelegramEnabled(e.target.checked)}
                  />{" "}
                  Reminder Telegram attivo
                </label>
              </div>
              <div className="field">
                <label>Messaggio Telegram</label>
                <textarea
                  className="input"
                  rows={7}
                  value={telegramTemplate}
                  onChange={(e) => setTelegramTemplate(e.target.value)}
                />
                <small className="muted">
                  Usa <b>{"{match_details}"}</b> per inviare Partita 1, Partita
                  2, ecc. con dettagli, orari e convocati.
                </small>
              </div>
              <details className="notice">
                <summary>Anteprima dettaglio partite Telegram</summary>
                <pre className="telegram-preview-box">
                  {telegramPreview || "Nessuna partita compilata."}
                </pre>
              </details>
              <div className="grid grid-2">
                <PlayerPicker
                  title="Titolari evento"
                  players={players}
                  selected={selectedPlayers}
                  toggle={(id) => toggle(setSelectedPlayers, id)}
                />
                <PlayerPicker
                  title="Riserve evento"
                  players={players}
                  selected={reservePlayers}
                  toggle={(id) => toggle(setReservePlayers, id)}
                />
              </div>
              <div className="field">
                <label>Note interne</label>
                <textarea
                  className="input"
                  rows={3}
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                />
              </div>
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
                    : "✅ Crea evento completo"}
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
            <h2>Archivio eventi</h2>
            <p className="muted">
              Caricati: {events.length} • futuri: {futureEvents.length} •
              passati: {pastEvents.length}
            </p>
          </div>
          <select
            className="select compact-select"
            value={eventFilter}
            onChange={(e) =>
              setEventFilter(e.target.value as "future" | "all" | "past")
            }
          >
            <option value="future">Futuri</option>
            <option value="all">Tutti</option>
            <option value="past">Passati</option>
          </select>
        </div>
        <div className="ak-event-list top-gap">
          {visibleEvents.map((event) => {
            const googleUrl =
              event.google_calendar_url ||
              buildGoogleCalendarUrl({
                title: event.title,
                description: event.description || "",
                location: event.location || "",
                startsAt: event.starts_at,
                endsAt: event.ends_at,
              });
            return (
              <article key={event.id} className="ak-event-card">
                <div>
                  <div className="eyebrow">{event.event_type || "evento"}</div>
                  <h3>{event.title}</h3>
                  <p className="muted">
                    {new Date(event.starts_at).toLocaleString("it-IT")}{" "}
                    {event.location ? `• ${event.location}` : ""}
                  </p>
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
                  <a
                    href={googleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn secondary"
                  >
                    Google Calendar
                  </a>
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
    </main>
  );
}

function dedupeEvents(rows: CodmEvent[]) {
  const map = new Map<string, CodmEvent>();
  for (const row of rows) {
    if (!row?.id) continue;
    map.set(row.id, row);
  }
  return Array.from(map.values());
}
function buildLocalEventFromPayload(payload: Record<string, any>): CodmEvent {
  return {
    id: payload.id || `local-${Date.now()}`,
    clan_id: payload.clan_id || "local-ak47dx",
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
function PlayerPicker({
  title,
  players,
  selected,
  toggle,
}: {
  title: string;
  players: PlayerRow[];
  selected: string[];
  toggle: (id: string) => void;
}) {
  return (
    <div className="field">
      <label>{title}</label>
      <div className="ak-player-pick-list">
        {players.map((player) => (
          <label key={player.id} className="ak-player-pick">
            <input
              type="checkbox"
              checked={selected.includes(player.id)}
              onChange={() => toggle(player.id)}
            />
            <span>{player.nickname}</span>
            <small>{player.clan_name || "AK47DX"}</small>
          </label>
        ))}
        {!players.length && <p className="muted">Nessun player nel roster.</p>}
      </div>
    </div>
  );
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
      <div className="grid grid-3 top-gap">
        <div className="field">
          <label>Orario ritrovo</label>
          <input
            className="input"
            value={round.meetingTime}
            onChange={(e) =>
              updateRound(index, { meetingTime: e.target.value })
            }
            placeholder="21:30"
          />
        </div>
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
}: {
  event: CodmEvent;
  plan: MatchPlan;
  starters: string[];
  reserves: string[];
  canWrite: boolean;
  onDelete: (id: string) => Promise<void>;
  onEdit: () => void;
  onDuplicate: () => void;
}) {
  const normalizedPlan = normalizePlan(plan);
  const rounds = normalizedPlan.rounds.slice(
    0,
    Number(normalizedPlan.totalMatches || normalizedPlan.rounds.length || 1),
  );
  return (
    <article className="event-presentation-card event-presentation-card-v65">
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
          🎮 Partite: <b>{rounds.length}</b>
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
                  <strong>Orari:</strong> ritrovo {round.meetingTime || "-"} ·
                  lobby {round.lobbyOpen || normalizedPlan.lobbyTime || "-"} ·
                  partita {round.startTime || "-"}
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
      <div className="grid grid-2 top-gap">
        <div className="notice">
          <b>Titolari evento</b>
          <br />
          {starters.length ? starters.join(", ") : "Da scegliere"}
        </div>
        <div className="notice">
          <b>Riserve evento</b>
          <br />
          {reserves.length ? reserves.join(", ") : "Da scegliere"}
        </div>
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
  return (
    <div className="team-logo-card">
      {logo ? (
        <img src={logo} alt={name} />
      ) : (
        <div className="team-logo-placeholder">
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <strong>{name}</strong>
    </div>
  );
}
