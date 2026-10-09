import type { DraftBid, GameLogEntry, GamePhase, PlayerAction, PublicPlayerInfo, CardInstance, DraftCard, BattleEvent } from '../types/game';

// クライアント -> ホスト
export type ClientMessage = 
  | { type: 'JOIN_REQUEST'; playerName: string }
  | { type: 'SET_NAME'; playerName: string }
  | { type: 'SELECT_ROLE'; roleId: string }
  | { type: 'START_GAME' }
  | { type: 'SUBMIT_DRAFT_BID'; bid: DraftBid }
  | { type: 'SUBMIT_ACTION'; action: PlayerAction }
  | { type: 'SKIP_RESOLUTION' };

// ホスト -> クライアント
export interface ClientSyncData {
  phase: GamePhase;
  turn: number;
  hostId: string;
  myId: string;
  players: { [id: string]: PublicPlayerInfo };
  // 本人の非公開情報
  myG: number;
  myHand: CardInstance[];
  // フェーズ固有情報
  draftPool: DraftCard[];
  winnerId: string | null | 'DRAW' | 'FORCE_QUIT';
  logs: GameLogEntry[];
  phaseDeadline: number | null; // 制限時間
  activeResolutionEvent?: BattleEvent | null;
}

export type HostMessage = 
  | { type: 'SYNC_STATE'; data: ClientSyncData }
  | { type: 'JOIN_ACCEPTED'; yourId: string }
  | { type: 'ERROR'; message: string };

export type NetworkMessage = 
  | ({ from: 'CLIENT' } & ClientMessage)
  | ({ from: 'HOST' } & HostMessage);
