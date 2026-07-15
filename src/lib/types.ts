export type ClanRole = 'owner' | 'coach' | 'staff' | 'player' | 'viewer';
export type PlayerStatus = 'active' | 'bench' | 'tryout' | 'inactive';
export type MatchResult = 'WIN' | 'LOSE' | 'DRAW';
export type MatchType = 'scrim' | 'ranked' | 'private' | 'training' | 'tournament' | 'br';
export type GameMode =
  | 'CED'
  | 'TDM'
  | 'PRIMA_LINEA'
  | 'DOMINIO'
  | 'POSTAZIONE'
  | 'KILL_CONFIRMED'
  | 'BR_SOLO'
  | 'BR_DUO'
  | 'BR_SQUAD';

export type ProfileImportType = 'profile_base' | 'multiplayer' | 'battle_royale' | 'zombie' | 'dmz';
export type TeamSide = 'ALLY' | 'ENEMY';

export type Player = {
  id: string;
  clan_id: string;
  user_id?: string | null;
  nickname: string;
  uid_codm: string | null;
  avatar_url: string | null;
  clan_name?: string | null;
  account_level?: number | null;
  rank_mp_current: string | null;
  rank_br_current: string | null;
  rank_mp_best?: string | null;
  rank_br_best?: string | null;
  main_role: string | null;
  secondary_role: string | null;
  status: PlayerStatus;
  notes: string | null;
  created_at: string;
};

export type PlayerSnapshot = {
  id: string;
  clan_id: string;
  player_id: string;
  imported_at: string;
  screenshot_url: string | null;
  source_type: string;
  mvp_count: number | null;
  games_count: number | null;
  wins_count?: number | null;
  top3_count: number | null;
  total_kills: number | null;
  kd: number | null;
  avg_accuracy: number | null;
  avg_damage?: number | null;
  zombie_ultimate_defeated?: number | null;
  teammates_saved?: number | null;
  waves_cleared_solo?: number | null;
  extraction_rate?: number | null;
  profit_loss_ratio?: number | null;
  total_wealth?: number | null;
  contracts_completed?: number | null;
  snapshot_data?: Record<string, unknown> | null;
  ocr_raw_text: string | null;
  confidence_score: number | null;
};

export type Match = {
  id: string;
  clan_id: string;
  match_date: string;
  match_type: MatchType;
  mode: GameMode;
  map_name: string | null;
  opponent: string | null;
  result: MatchResult;
  team_score: number | null;
  enemy_score: number | null;
  screenshot_url: string | null;
  screenshot_storage_path?: string | null;
  winning_team?: 'blue' | 'red' | 'draw' | null;
  our_team?: 'blue' | 'red' | null;
  match_notes?: string | null;
  notes: string | null;
  created_at: string;
};

export type MatchPlayerStat = {
  id: string;
  clan_id: string;
  match_id: string;
  player_id: string;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  objective_score: number;
  captures: number;
  defends: number;
  impact?: number | null;
  objective_time_seconds?: number | null;
  objective_time_text?: string | null;
  accuracy_percent?: number | null;
  headshot_percent?: number | null;
  kd_ratio?: number | null;
  raw_kda_text?: string | null;
  team_side?: TeamSide | null;
  rank_position?: number | null;
  is_mvp: boolean;
  rating: number;
  created_at?: string;
  players?: { nickname: string; avatar_url?: string | null; main_role?: string | null; clan_name?: string | null } | null;
  matches?: { mode: GameMode; result: MatchResult; map_name: string | null; match_date: string } | null;
};

export type Loadout = {
  id: string;
  clan_id: string;
  player_id: string | null;
  name: string;
  weapon: string;
  attachments: string[];
  perks: string[];
  lethal: string | null;
  tactical: string | null;
  operator_skill: string | null;
  mode: string | null;
  map_name: string | null;
  slot_index?: number | null;
  secondary_weapon?: string | null;
  scorestreaks?: string[] | null;
  character_name?: string | null;
  screenshot_url?: string | null;
  notes?: string | null;
  active: boolean;
  created_at: string;
  players?: { nickname: string } | null;
};

export type WeaponBuild = {
  id: string;
  clan_id: string;
  player_id: string | null;
  weapon_name: string;
  blueprint_name: string | null;
  muzzle: string | null;
  barrel: string | null;
  optic: string | null;
  stock: string | null;
  perk: string | null;
  laser: string | null;
  underbarrel: string | null;
  ammunition: string | null;
  rear_grip: string | null;
  damage: number | null;
  fire_rate: number | null;
  accuracy: number | null;
  mobility: number | null;
  range: number | null;
  control: number | null;
  screenshot_url: string | null;
  screenshot_storage_path?: string | null;
  winning_team?: 'blue' | 'red' | 'draw' | null;
  our_team?: 'blue' | 'red' | null;
  match_notes?: string | null;
  notes: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      clans: {
        Row: { id: string; name: string; tag: string | null; owner_user_id: string; created_at: string };
        Insert: { id?: string; name: string; tag?: string | null; owner_user_id: string; created_at?: string };
        Update: { name?: string; tag?: string | null; owner_user_id?: string };
      };
      players: {
        Row: Player;
        Insert: Partial<Player> & { clan_id: string; nickname: string };
        Update: Partial<Player>;
      };
      player_snapshots: {
        Row: PlayerSnapshot;
        Insert: Partial<PlayerSnapshot> & { clan_id: string; player_id: string; source_type: string };
        Update: Partial<PlayerSnapshot>;
      };
      matches: {
        Row: Match;
        Insert: Partial<Match> & { clan_id: string; mode: GameMode; result: MatchResult; match_type: MatchType };
        Update: Partial<Match>;
      };
      match_player_stats: {
        Row: MatchPlayerStat;
        Insert: Partial<MatchPlayerStat> & { clan_id: string; match_id: string; player_id: string };
        Update: Partial<MatchPlayerStat>;
      };
      loadouts: {
        Row: Loadout;
        Insert: Partial<Loadout> & { clan_id: string; name: string; weapon: string };
        Update: Partial<Loadout>;
      };
      weapon_builds: {
        Row: WeaponBuild;
        Insert: Partial<WeaponBuild> & { clan_id: string; weapon_name: string };
        Update: Partial<WeaponBuild>;
      };
      screenshot_imports: {
        Row: {
          id: string;
          clan_id: string;
          uploaded_by: string | null;
          import_type: string;
          file_url: string | null;
          ocr_raw_text: string | null;
          parser_status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          clan_id: string;
          uploaded_by?: string | null;
          import_type: string;
          file_url?: string | null;
          ocr_raw_text?: string | null;
          parser_status?: string;
          created_at?: string;
        };
        Update: Record<string, unknown>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
