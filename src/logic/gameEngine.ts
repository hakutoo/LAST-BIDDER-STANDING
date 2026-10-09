import type { GameState, PublicPlayerInfo, DraftBid, PlayerAction, GameLogEntry } from '../types/game';
import type { ClientSyncData } from '../network/protocol';
import { createInitialPlayerState, applyRoleToPlayer } from './playerInit';
import { calculateTurnGold } from './gold';
import { generateDraftPool, resolveDraftBids } from './draft';
import { buildTurnResolutionSteps, type TurnResolutionStep } from './turnResolver';
import { GAME_CONFIG } from '../data/constants';

export class GameEngine {
  public state: GameState;
  private onStateUpdated: (updatedState: GameState) => void;
  private timerId: any = null;
  private resolutionQueue: TurnResolutionStep[] = [];
  private currentStepIndex: number = 0;

  constructor(roomCode: string, hostId: string, hostName: string, onUpdate: (s: GameState) => void) {
    this.onStateUpdated = onUpdate;
    const resolvedHostName = hostName.trim() || 'プレイヤー1';
    const hostPlayer = createInitialPlayerState(hostId, resolvedHostName, true);

    this.state = {
      roomCode,
      phase: 'LOBBY',
      turn: 0,
      hostId,
      players: { [hostId]: hostPlayer },
      playerOrder: [hostId],
      draftPool: [],
      draftBids: {},
      playerActions: {},
      logs: [{
        id: `init_log`,
        turn: 0,
        text: `ルームが作成されました。(ホスト: ${resolvedHostName})`,
        type: 'system',
      }],
      winnerId: null,
      phaseDeadline: null,
      activeResolutionEvent: null,
    };
  }

  private notify() {
    this.onStateUpdated({ ...this.state });
  }

  // プレイヤー参加
  public addPlayer(id: string, name: string): void {
    if (this.state.phase !== 'LOBBY') return;
    if (this.state.players[id]) return;

    // 名前が空の場合は「プレイヤーN」（N=参加順）を自動付与
    const playerCount = Object.keys(this.state.players).length + 1;
    const resolvedName = name.trim() || `プレイヤー${playerCount}`;

    this.state.players[id] = createInitialPlayerState(id, resolvedName, false);
    this.state.playerOrder.push(id);
    this.addLog(`${resolvedName} が入室しました。`, 'system');
    this.notify();
  }

  // プレイヤー名変更（ロビー中のみ可）
  public renamePlayer(id: string, name: string): void {
    if (this.state.phase !== 'LOBBY') return;
    const player = this.state.players[id];
    if (!player) return;
    const newName = name.trim();
    if (!newName || newName === player.name) return;
    const oldName = player.name;
    player.name = newName;
    this.addLog(`${oldName} が名前を「${newName}」に変更しました。`, 'system');
    this.notify();
  }

  // プレイヤー退出
  public removePlayer(id: string): void {
    const p = this.state.players[id];
    if (p) {
      delete this.state.players[id];
      this.state.playerOrder = this.state.playerOrder.filter(pid => pid !== id);
      this.addLog(`${p.name} が退出しました。`, 'system');
      this.notify();
    }
  }

  // ゲーム開始（ロール選択へ）
  public startRoleSelect(): void {
    if (this.state.phase !== 'LOBBY') return;
    const alivePlayers = Object.values(this.state.players).filter(p => p.isAlive);
    if (alivePlayers.length < 2) return; // 2人未満では開始しない
    this.state.phase = 'ROLE_SELECT';
    this.addLog('ゲームが開始されました。ロールを選択してください。', 'system');
    this.notify();
  }

  // ロール選択
  public selectRole(playerId: string, roleId: string): void {
    if (this.state.phase !== 'ROLE_SELECT') return;
    const player = this.state.players[playerId];
    if (!player) return;

    applyRoleToPlayer(player, roleId);
    this.addLog(`${player.name} がロールを選択しました。`, 'info');

    // 生存している全プレイヤーがロールを選択済みかどうか確認
    // （2人未満の場合は安全のため開始しない）
    const alivePlayers = Object.values(this.state.players).filter(p => p.isAlive);
    const allSelected = alivePlayers.length >= 2 && alivePlayers.every(p => p.roleId !== null);
    if (allSelected) {
      this.startFirstTurn();
    } else {
      this.notify();
    }
  }

  // 1ターン目の開始
  private startFirstTurn(): void {
    this.state.turn = 1;
    this.startDraftPhase();
  }

  // ドラフトフェーズ開始
  private startDraftPhase(): void {
    this.clearTimer();
    this.state.phase = 'DRAFT';
    this.state.draftBids = {};

    // ターン開始時: 生存プレイヤーのG獲得計算（第1ターンは初期Gのみでドラフトに臨むためスキップ）
    if (this.state.turn > 1) {
      for (const player of Object.values(this.state.players)) {
        if (!player.isAlive) continue;
        const breakdown = calculateTurnGold(player);
        player.g += breakdown.total;
        this.addLog(
          `【給与獲得】${player.name} は ${breakdown.total}G を獲得した。(基本給:${breakdown.base}, ボーナス:${breakdown.damageBonus}, 利子:${breakdown.interest}, 救済:${breakdown.catchup})`,
          'system'
        );
      }
    }

    // ドラフトプールの生成
    const aliveCount = Object.values(this.state.players).filter(p => p.isAlive).length;
    this.state.draftPool = generateDraftPool(aliveCount, this.state.turn);
    this.state.phaseDeadline = Date.now() + GAME_CONFIG.DRAFT_TIME_LIMIT_SEC * 1000;

    this.addLog(`=== 第 ${this.state.turn} ターン：ドラフトフェーズ開始 === (制限時間: 60秒)`, 'system');
    this.notify();

    // 60秒タイマー
    this.timerId = setTimeout(() => {
      this.finishDraftPhase();
    }, GAME_CONFIG.DRAFT_TIME_LIMIT_SEC * 1000);
  }

  // ドラフト入札提出（未確定の選択中の入札も保持し、全員が確定した時点で次フェーズへ移行）
  public submitDraftBid(bid: DraftBid): void {
    if (this.state.phase !== 'DRAFT') return;
    this.state.draftBids[bid.playerId] = bid;

    // 生存している全プレイヤーが入札を確定したか確認
    const alivePlayers = Object.values(this.state.players).filter(p => p.isAlive);
    const allConfirmed = alivePlayers.every(p => {
      const b = this.state.draftBids[p.id];
      return b && (b.isConfirmed ?? true);
    });

    if (allConfirmed) {
      this.finishDraftPhase();
    } else if (bid.isConfirmed) {
      this.notify();
    }
  }

  // ドラフト結果の解決とカード選択フェーズへ移行
  private finishDraftPhase(): void {
    this.clearTimer();
    const result = resolveDraftBids(
      this.state.draftPool,
      this.state.draftBids,
      this.state.players,
      this.state.turn
    );
    this.state.players = result.updatedPlayers;
    for (const l of result.logs) {
      this.state.logs.push(l);
    }

    this.startActionPhase();
  }

  // カード選択フェーズ開始
  private startActionPhase(): void {
    this.clearTimer();
    this.state.phase = 'ACTION';
    this.state.playerActions = {};

    // 手札が0枚のプレイヤーは自動スキップ
    for (const p of Object.values(this.state.players)) {
      if (p.isAlive && p.hand.length === 0) {
        this.state.playerActions[p.id] = {
          playerId: p.id,
          cardInstanceId: null,
          targetPlayerId: null,
        };
        this.addLog(`${p.name} は手札が0枚のため行動スキップとなります。`, 'info');
      }
    }

    this.state.phaseDeadline = Date.now() + GAME_CONFIG.ACTION_TIME_LIMIT_SEC * 1000;
    this.addLog(`=== 第 ${this.state.turn} ターン：行動選択フェーズ開始 === (制限時間: 60秒)`, 'system');
    this.notify();

    // 手札0枚等ですでに全員完了している場合
    const alivePlayers = Object.values(this.state.players).filter(p => p.isAlive);
    const allReady = alivePlayers.every(p => !!this.state.playerActions[p.id]);
    if (allReady) {
      this.finishActionPhase();
      return;
    }

    // 60秒タイマー
    this.timerId = setTimeout(() => {
      this.finishActionPhase();
    }, GAME_CONFIG.ACTION_TIME_LIMIT_SEC * 1000);
  }

  // アクション提出
  public submitAction(action: PlayerAction): void {
    if (this.state.phase !== 'ACTION') return;
    this.state.playerActions[action.playerId] = action;

    const alivePlayers = Object.values(this.state.players).filter(p => p.isAlive);
    const allSubmitted = alivePlayers.every(p => !!this.state.playerActions[p.id]);

    if (allSubmitted) {
      this.finishActionPhase();
    } else {
      this.notify();
    }
  }

  // カード選択結果の解決（ステップごとのアニメーション演出開始）
  private finishActionPhase(): void {
    this.clearTimer();
    this.state.phase = 'RESOLVING';

    // 未提出のプレイヤーは「何もしない」
    for (const p of Object.values(this.state.players)) {
      if (p.isAlive && !this.state.playerActions[p.id]) {
        this.state.playerActions[p.id] = {
          playerId: p.id,
          cardInstanceId: null,
          targetPlayerId: null,
        };
      }
    }

    // ターン解決ステップを生成
    this.resolutionQueue = buildTurnResolutionSteps(this.state.players, this.state.playerActions, this.state.turn);
    this.currentStepIndex = 0;

    if (this.resolutionQueue.length === 0) {
      this.finishResolution();
      return;
    }

    this.playNextResolutionStep();
  }

  // 1イベントずつ時間をかけて実行・配信
  private playNextResolutionStep(): void {
    if (this.currentStepIndex >= this.resolutionQueue.length) {
      this.finishResolution();
      return;
    }

    const step = this.resolutionQueue[this.currentStepIndex];
    this.currentStepIndex++;

    this.state.players = step.updatedPlayers;
    this.state.logs.push(step.log);
    this.state.activeResolutionEvent = step.event;
    this.state.winnerId = step.winnerId;

    // イベントタイプに応じた表示待機時間 (ms)
    let delay = 1300;
    if (step.event.type === 'ACTION_START') {
      delay = 1400;
    } else if (step.event.type === 'ATTACK_HIT') {
      delay = step.event.isCritical ? 1600 : 1300;
    } else if (step.event.type === 'ACTION_WAIT') {
      delay = 900;
    } else if (step.event.type === 'EFFECT_EXPIRED') {
      delay = 850;
    } else if (step.event.type === 'DEATH') {
      delay = 1500;
    } else if (step.event.type === 'POISON_DAMAGE') {
      delay = 1100;
    }

    this.notify();

    // 途中でゲームオーバーが決まった場合でも、そのステップを表示した後に終了処理
    if (step.winnerId !== null && this.currentStepIndex >= this.resolutionQueue.length) {
      this.timerId = setTimeout(() => {
        this.finishResolution();
      }, delay);
      return;
    }

    this.timerId = setTimeout(() => {
      this.playNextResolutionStep();
    }, delay);
  }

  // 演出スキップ（残りのステップを即時適用）
  public skipResolution(): void {
    if (this.state.phase !== 'RESOLVING') return;
    this.clearTimer();

    while (this.currentStepIndex < this.resolutionQueue.length) {
      const step = this.resolutionQueue[this.currentStepIndex];
      this.state.players = step.updatedPlayers;
      this.state.logs.push(step.log);
      this.state.winnerId = step.winnerId;
      this.currentStepIndex++;
    }

    this.finishResolution();
  }

  // ターン解決完了後のフェーズ移行
  private finishResolution(): void {
    this.clearTimer();
    this.state.activeResolutionEvent = null;

    if (this.state.winnerId !== null) {
      this.state.phase = 'GAME_OVER';
      this.notify();
    } else {
      this.state.phase = 'ROUND_RESULT';
      this.state.phaseDeadline = Date.now() + 4000; // 4秒ログ確認後、次ターンへ
      this.notify();

      this.timerId = setTimeout(() => {
        this.state.turn += 1;
        this.startDraftPhase();
      }, 4000);
    }
  }

  // 試合の強制終了（ホスト操作）
  public forceEndGame(reason: string = 'ホストにより試合が強制終了されました。'): void {
    this.clearTimer();
    this.state.phase = 'GAME_OVER';
    this.state.winnerId = 'FORCE_QUIT';
    this.state.phaseDeadline = null;
    this.state.activeResolutionEvent = null;
    this.addLog(reason, 'system');
    this.notify();
  }

  // 特定クライアント向けの同期データを生成
  public generateClientSyncData(targetPlayerId: string): ClientSyncData {
    const publicPlayers: { [id: string]: PublicPlayerInfo } = {};
    for (const [id, p] of Object.entries(this.state.players)) {
      publicPlayers[id] = {
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isAlive: p.isAlive,
        roleId: p.roleId,
        hp: p.hp,
        maxHp: p.maxHp,
        atk: p.atk,
        def: p.def,
        mat: p.mat,
        mdf: p.mdf,
        spd: p.spd,
        clt: p.clt,
        sld: p.sld,
        evasion: p.evasion,
        handCount: p.hand.length,
        lastUsedCardId: p.lastUsedCardId,
        statuses: p.statuses,
      };
    }

    const myPlayer = this.state.players[targetPlayerId];

    return {
      phase: this.state.phase,
      turn: this.state.turn,
      hostId: this.state.hostId,
      myId: targetPlayerId,
      players: publicPlayers,
      myG: myPlayer ? myPlayer.g : 0,
      myHand: myPlayer ? myPlayer.hand : [],
      draftPool: this.state.draftPool,
      winnerId: this.state.winnerId,
      logs: this.state.logs.slice(-50), // 最新50件
      phaseDeadline: this.state.phaseDeadline,
      activeResolutionEvent: this.state.activeResolutionEvent,
    };
  }

  private addLog(text: string, type: GameLogEntry['type']) {
    this.state.logs.push({
      id: `log_${Date.now()}_${Math.random()}`,
      turn: this.state.turn,
      text,
      type,
    });
  }

  private clearTimer() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public destroy() {
    this.clearTimer();
  }
}
