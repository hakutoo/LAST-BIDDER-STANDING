export type StatKey = 'HP' | 'ATK' | 'DEF' | 'MAT' | 'MDF' | 'SPD' | 'CLT' | 'SLD';

export interface CardInstance {
  instanceId: string;
  cardId: string;
}

export interface ActiveBuff {
  id: string;
  type: 'STAT_BUFF' | 'SPELL_CHARGE' | 'PARRY_STANCE' | 'ANTI_MAGI' | 'PARRY_DAGGER' | 'MIRROR_COAT';
  stat?: StatKey | 'evasion';
  amount?: number;
  duration: number; // 0: 今ターン終了時まで, 1: 次のターン終了時まで, -1: 発動まで永続 (スペルチャージ等)
  sourcePlayerId?: string;
}

export interface ActiveStatus {
  type: 'poison' | 'heavy_wound';
  remainingTurns: number; // 付与時3
}

export interface PlayerState {
  id: string;
  name: string;
  isHost: boolean;
  isAlive: boolean;
  roleId: string | null;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  mat: number;
  mdf: number;
  spd: number;
  clt: number; // 0 - 100
  sld: number;
  evasion: number; // 0 - 100
  g: number;
  hand: CardInstance[];
  buffs: ActiveBuff[];
  statuses: ActiveStatus[];
  lastDamageDealt: number; // 前のターンに与えたダメージ (G計算用)
  lastUsedCardId?: string; // 直前に使用したカード (公開情報)
}

// 他プレイヤーに送信する公開情報
export interface PublicPlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  isAlive: boolean;
  roleId: string | null;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  mat: number;
  mdf: number;
  spd: number;
  clt: number;
  sld: number;
  evasion: number;
  handCount: number;
  lastUsedCardId?: string;
  statuses: ActiveStatus[];
}

export type GamePhase = 
  | 'LOBBY' 
  | 'ROLE_SELECT' 
  | 'DRAFT' 
  | 'ACTION' 
  | 'RESOLVING' 
  | 'ROUND_RESULT' 
  | 'GAME_OVER';

export interface DraftCard {
  instanceId: string;
  cardId: string;
}

export interface DraftBid {
  playerId: string;
  bids: { [cardInstanceId: string]: number }; // cardInstanceId -> 入札G
  uniquePurchases?: string[]; // 購入するユニークカードのcardIdリスト
  isConfirmed?: boolean; // 入札が確定済みかどうか (未確定の選択中でも入札状態を保持するために使用)
}

export interface PlayerAction {
  playerId: string;
  cardInstanceId: string | null; // null は「何もしない」
  targetPlayerId: string | null;
}

export interface GameLogEntry {
  id: string;
  turn: number;
  text: string;
  type: 'info' | 'damage' | 'heal' | 'status' | 'death' | 'draft' | 'system';
}

export type ResolutionEventType =
  | 'ACTION_START'
  | 'ACTION_WAIT'
  | 'ATTACK_HIT'
  | 'ATTACK_EVADED'
  | 'ATTACK_PARRIED'
  | 'COUNTER_ATTACK'
  | 'HEAL'
  | 'BUFF'
  | 'STATUS_APPLIED'
  | 'PASSIVE'
  | 'POISON_DAMAGE'
  | 'SUDDEN_DEATH'
  | 'DEATH'
  | 'EFFECT_EXPIRED';

export interface BattleEvent {
  id: string;
  type: ResolutionEventType;
  actorId?: string;
  actorName?: string;
  targetId?: string;
  targetName?: string;
  cardId?: string;
  cardName?: string;
  title: string;
  description: string;
  damage?: number;
  hpDamage?: number;
  sldDamage?: number;
  healAmount?: number;
  isCritical?: boolean;
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  turn: number;
  hostId: string;
  players: { [id: string]: PlayerState };
  playerOrder: string[];
  // ROLE_SELECT開始時点で確定したプレイヤーIDリスト（全員選択済み判定用）
  roleSelectPlayerIds: string[];
  draftPool: DraftCard[];
  draftBids: { [playerId: string]: DraftBid };
  playerActions: { [playerId: string]: PlayerAction };
  logs: GameLogEntry[];
  winnerId: string | null | 'DRAW' | 'FORCE_QUIT'; // null = 未決着, 'DRAW' = 引き分け, 'FORCE_QUIT' = 強制終了
  phaseDeadline: number | null; // UNIX timestamp ms
  activeResolutionEvent: BattleEvent | null;
}
