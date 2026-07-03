import { profileRegions, scoreboardRegions, type CropRegion } from './imagePreprocess';

export type CalibrationKind = 'scoreboard_ced' | 'profile_base';
export type CalibratedRegion = CropRegion & { locked?: boolean; label?: string; group?: string };
export type CalibrationTemplateMeta = {
  kind: CalibrationKind;
  templateName: string;
  phoneProfile: string;
  ownerUserId?: string | null;
  ownerName?: string | null;
  updatedAt: string;
  version: 3;
  coordinateSpace: 'content_frame_v1';
};
export type CalibrationTemplateBundle = { meta: CalibrationTemplateMeta; regions: CalibratedRegion[] };

export const SCOREBOARD_CALIBRATION_KEY = 'codm_ocr_template_scoreboard_ced_v2';
export const PROFILE_CALIBRATION_KEY = 'codm_ocr_template_profile_base_v2';
export const ACTIVE_PHONE_KEY_PREFIX = 'codm_ocr_active_phone_profile_';
export const ACTIVE_USER_ID_KEY = 'codm_active_user_id';
export const ACTIVE_USER_NAME_KEY = 'codm_active_user_name';
export const CALIBRATION_LAST_PREFIX = 'codm_ocr_last_active_template_';

const importantScoreboardNames = [
  'SCOREBOARD_RESULT_LABEL', 'SCOREBOARD_SCORE_BLUE', 'SCOREBOARD_SCORE_RED', 'SCOREBOARD_MATCH_DATETIME', 'SCOREBOARD_MODE_MAP',
  'TEAM_BLUE_TABLE_FULL', 'TEAM_RED_TABLE_FULL',
  'BLUE_R1_NICK', 'BLUE_R1_SCORE', 'BLUE_R1_KDA', 'BLUE_R1_IMPACT',
  'BLUE_R2_NICK', 'BLUE_R2_SCORE', 'BLUE_R2_KDA', 'BLUE_R2_IMPACT',
  'BLUE_R3_NICK', 'BLUE_R3_SCORE', 'BLUE_R3_KDA', 'BLUE_R3_IMPACT',
  'BLUE_R4_NICK', 'BLUE_R4_SCORE', 'BLUE_R4_KDA', 'BLUE_R4_IMPACT',
  'BLUE_R5_NICK', 'BLUE_R5_SCORE', 'BLUE_R5_KDA', 'BLUE_R5_IMPACT',
  'RED_R1_NICK', 'RED_R1_SCORE', 'RED_R1_KDA', 'RED_R1_IMPACT',
  'RED_R2_NICK', 'RED_R2_SCORE', 'RED_R2_KDA', 'RED_R2_IMPACT',
  'RED_R3_NICK', 'RED_R3_SCORE', 'RED_R3_KDA', 'RED_R3_IMPACT',
  'RED_R4_NICK', 'RED_R4_SCORE', 'RED_R4_KDA', 'RED_R4_IMPACT',
  'RED_R5_NICK', 'RED_R5_SCORE', 'RED_R5_KDA', 'RED_R5_IMPACT'
];

const importantProfileNames = ['PROFILE_BASE_NICKNAME', 'PROFILE_BASE_LEVEL', 'PROFILE_BASE_UID', 'PROFILE_BASE_LIKES', 'PROFILE_BASE_RANKS', 'PROFILE_LEGENDARY_MG_COUNT', 'PROFILE_LEGENDARY_BR_COUNT', 'PROFILE_LEGENDARY_DMZ_COUNT', 'PROFILE_LEGENDARY_ZOMBIE_COUNT'];

function labelFor(name: string) {
  return name.replace('SCOREBOARD_', '').replace('PROFILE_BASE_', 'PROFILO_').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
}
function groupFor(name: string) {
  if (name.includes('SCOREBOARD')) return 'Header risultato';
  if (name.includes('TEAM_BLUE')) return 'Tabella team blu';
  if (name.includes('TEAM_RED')) return 'Tabella team rosso';
  if (name.startsWith('BLUE_')) return 'Celle team blu';
  if (name.startsWith('RED_')) return 'Celle team rosso';
  if (name.startsWith('PROFILE_LEGENDARY')) return 'Leggendario per modalità';
  if (name.startsWith('PROFILE')) return 'Profilo base';
  return 'Altro';
}

export function defaultScoreboardCalibration(): CalibratedRegion[] {
  return scoreboardRegions().filter((r) => importantScoreboardNames.includes(r.name)).map((r) => ({ ...r, label: labelFor(r.name), group: groupFor(r.name) }));
}
export function defaultProfileCalibration(): CalibratedRegion[] {
  return profileRegions().filter((r) => importantProfileNames.includes(r.name)).map((r) => ({ ...r, label: labelFor(r.name), group: groupFor(r.name) }));
}
export function defaultCalibration(kind: CalibrationKind): CalibratedRegion[] {
  return kind === 'profile_base' ? defaultProfileCalibration() : defaultScoreboardCalibration();
}

function slug(value: string) {
  return (value || 'default').toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'default';
}
export function getActiveUserId() {
  if (typeof window === 'undefined') return 'anonymous';
  return window.localStorage.getItem(ACTIVE_USER_ID_KEY) || 'anonymous';
}
export function getActiveUserName() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(ACTIVE_USER_NAME_KEY) || '';
}
export function setActiveUserContext(userId?: string | null, displayName?: string | null) {
  if (typeof window === 'undefined') return;
  if (userId) window.localStorage.setItem(ACTIVE_USER_ID_KEY, userId);
  if (displayName) window.localStorage.setItem(ACTIVE_USER_NAME_KEY, displayName);
}
export function getActivePhoneProfile(kind: CalibrationKind) {
  if (typeof window === 'undefined') return 'default';
  return window.localStorage.getItem(`${ACTIVE_PHONE_KEY_PREFIX}${kind}`) || 'default';
}
export function setActivePhoneProfile(kind: CalibrationKind, phoneProfile: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${ACTIVE_PHONE_KEY_PREFIX}${kind}`, slug(phoneProfile));
}
function baseKey(kind: CalibrationKind) {
  return kind === 'profile_base' ? PROFILE_CALIBRATION_KEY : SCOREBOARD_CALIBRATION_KEY;
}
function storageKey(kind: CalibrationKind, phoneProfile?: string, userId?: string | null) {
  const user = slug(userId || getActiveUserId());
  const phone = slug(phoneProfile || getActivePhoneProfile(kind));
  return `${baseKey(kind)}_${user}_${phone}`;
}
function lastActiveKey(kind: CalibrationKind, phoneProfile?: string) {
  const phone = slug(phoneProfile || getActivePhoneProfile(kind));
  return `${CALIBRATION_LAST_PREFIX}${kind}_${phone}`;
}
function mergeWithDefaults(defaults: CalibratedRegion[], parsed: Partial<CalibrationTemplateBundle> | CalibratedRegion[], meta: CalibrationTemplateMeta): CalibrationTemplateBundle {
  if (Array.isArray(parsed)) {
    const byName = new Map(parsed.map((r) => [r.name, r]));
    return { meta, regions: defaults.map((r) => clampRegion({ ...r, ...(byName.get(r.name) || {}) })) };
  }
  const byName = new Map((parsed.regions || []).map((r) => [r.name, r]));
  return {
    meta: { ...meta, ...(parsed.meta || {}), phoneProfile: meta.phoneProfile, kind: meta.kind, version: 3, coordinateSpace: 'content_frame_v1' },
    regions: defaults.map((r) => clampRegion({ ...r, ...(byName.get(r.name) || {}) }))
  };
}
function readBundleFromStorage(kind: CalibrationKind, phone: string, defaults: CalibratedRegion[], meta: CalibrationTemplateMeta): CalibrationTemplateBundle | null {
  if (typeof window === 'undefined') return null;
  const keys = [
    storageKey(kind, phone),
    storageKey(kind, phone, 'anonymous'),
    lastActiveKey(kind, phone)
  ];
  for (const key of keys) {
    const saved = window.localStorage.getItem(key);
    if (!saved) continue;
    try {
      return mergeWithDefaults(defaults, JSON.parse(saved), meta);
    } catch {
      // prova chiave successiva
    }
  }
  return null;
}

export function clampRegion(region: CalibratedRegion): CalibratedRegion {
  const x = Math.max(0, Math.min(0.995, Number(region.x) || 0));
  const y = Math.max(0, Math.min(0.995, Number(region.y) || 0));
  const w = Math.max(0.003, Math.min(1 - x, Number(region.w) || 0.01));
  const h = Math.max(0.003, Math.min(1 - y, Number(region.h) || 0.01));
  return { ...region, x, y, w, h };
}

export function loadCalibrationBundle(kind: CalibrationKind, phoneProfile?: string): CalibrationTemplateBundle {
  const defaults = defaultCalibration(kind);
  const phone = slug(phoneProfile || getActivePhoneProfile(kind));
  const meta: CalibrationTemplateMeta = {
    kind,
    templateName: kind === 'profile_base' ? 'Profilo base' : 'Scoreboard CED',
    phoneProfile: phone,
    ownerUserId: getActiveUserId(),
    ownerName: getActiveUserName(),
    updatedAt: new Date().toISOString(),
    version: 3,
    coordinateSpace: 'content_frame_v1'
  };
  if (typeof window === 'undefined') return { meta, regions: defaults };
  const saved = readBundleFromStorage(kind, phone, defaults, meta);
  return saved || { meta, regions: defaults };
}

export function loadCalibration(kind: CalibrationKind, phoneProfile?: string): CalibratedRegion[] {
  return loadCalibrationBundle(kind, phoneProfile).regions;
}
export function saveCalibration(kind: CalibrationKind, regions: CalibratedRegion[], phoneProfile?: string, templateName?: string, ownerName?: string | null) {
  if (typeof window === 'undefined') return;
  const phone = slug(phoneProfile || getActivePhoneProfile(kind));
  setActivePhoneProfile(kind, phone);
  const bundle: CalibrationTemplateBundle = {
    meta: {
      kind,
      templateName: templateName || (kind === 'profile_base' ? 'Profilo base' : 'Scoreboard CED'),
      phoneProfile: phone,
      ownerUserId: getActiveUserId(),
      ownerName: ownerName || getActiveUserName(),
      updatedAt: new Date().toISOString(),
      version: 3,
      coordinateSpace: 'content_frame_v1'
    },
    regions: regions.map(clampRegion)
  };
  const serialized = JSON.stringify(bundle);
  window.localStorage.setItem(storageKey(kind, phone), serialized);
  window.localStorage.setItem(lastActiveKey(kind, phone), serialized);
}
export function resetCalibration(kind: CalibrationKind, phoneProfile?: string) {
  if (typeof window === 'undefined') return;
  const phone = phoneProfile || getActivePhoneProfile(kind);
  window.localStorage.removeItem(storageKey(kind, phone));
  window.localStorage.removeItem(lastActiveKey(kind, phone));
}
export function listCalibrationPhoneProfiles(kind: CalibrationKind): string[] {
  if (typeof window === 'undefined') return ['default'];
  const base = baseKey(kind);
  const found = new Set<string>(['default']);
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i) || '';
    if (key.startsWith(`${base}_`)) found.add(key.split('_').slice(-1)[0]);
    const lastPrefix = `${CALIBRATION_LAST_PREFIX}${kind}_`;
    if (key.startsWith(lastPrefix)) found.add(key.slice(lastPrefix.length));
  }
  return Array.from(found).filter(Boolean).sort();
}
export function exportCalibration(kind: CalibrationKind, phoneProfile?: string) {
  return JSON.stringify(loadCalibrationBundle(kind, phoneProfile), null, 2);
}
export function importCalibration(jsonText: string): { kind: CalibrationKind; regions: CalibratedRegion[]; meta?: CalibrationTemplateMeta } {
  const parsed = JSON.parse(jsonText);
  const kind = (parsed.kind || parsed.meta?.kind || 'scoreboard_ced') as CalibrationKind;
  const regions = (parsed.regions || parsed) as CalibratedRegion[];
  if (!Array.isArray(regions)) throw new Error('Template non valido: manca array regions.');
  return { kind, regions: regions.map(clampRegion), meta: parsed.meta };
}
