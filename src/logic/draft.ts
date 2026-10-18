import type { CardDefinition } from '../types/cards';
import type { DraftCard, DraftBid, PlayerState, GameLogEntry } from '../types/game';
import { CARD_DEFINITIONS } from '../data/cards';
import { ROLE_DEFINITIONS } from '../data/roles';
import { DRAFT_CATEGORY_POOLS, getDraftWeights } from '../data/draftProbabilities';
import { GAME_CONFIG } from '../data/constants';

// ドラフト用のカードプールから1枚ランダム抽選
export function drawRandomDraftCard(turn: number): string {
  const weights = getDraftWeights(turn);
  const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
  let rand = Math.random() * totalWeight;

  let selectedCategory = weights[0].category;
  for (const item of weights) {
    if (rand < item.weight) {
      selectedCategory = item.category;
      break;
    }
    rand -= item.weight;
  }

  const pool = DRAFT_CATEGORY_POOLS[selectedCategory] || ['normal_attack'];
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

// ターン開始時のドラフトプール生成 (プレイヤー数 + 2枚)
export function generateDraftPool(playerCount: number, turn: number): DraftCard[] {
  const count = playerCount + 2;
  const pool: DraftCard[] = [];
  for (let i = 0; i < count; i++) {
    const cardId = drawRandomDraftCard(turn);
    pool.push({
      instanceId: `draft_${turn}_${i}_${Math.random().toString(36).substring(2, 9)}`,
      cardId,
    });
  }
  return pool;
}

export interface DraftResolveResult {
  updatedPlayers: { [id: string]: PlayerState };
  logs: GameLogEntry[];
}

export interface DraftResolutionStep {
  event: import('../types/game').DraftResolutionEvent;
  logs: GameLogEntry[];
  updatedPlayers: { [id: string]: PlayerState };
}

// ユニークカードの価格取得
// 優先順位: カード固有価格（CardDefinition.price）> ロール定義価格（RoleDefinition.uniqueCardPrices）
export function getUniqueCardPrice(cardId: string, roleId?: string): number {
  const def = CARD_DEFINITIONS[cardId];
  if (!def) return 0;

  if (def.category === 'UNIQUE_A') {
    // カード固有価格が設定されていればそちらを優先
    if (def.price !== undefined) return def.price;
    // ロール定義の価格
    if (roleId) {
      const roleDef = ROLE_DEFINITIONS[roleId];
      if (roleDef) return roleDef.uniqueCardPrices.a;
    }
  }

  if (def.category === 'UNIQUE_B') {
    // カード固有価格が設定されていればそちらを優先
    if (def.price !== undefined) return def.price;
    // ロール定義の価格
    if (roleId) {
      const roleDef = ROLE_DEFINITIONS[roleId];
      if (roleDef) return roleDef.uniqueCardPrices.b;
    }
  }

  return 0;
}

// ドラフト解決の二段階ステップ列を生成
export function buildDraftResolutionSteps(
  draftPool: DraftCard[],
  bids: { [playerId: string]: DraftBid },
  players: { [id: string]: PlayerState },
  turn: number
): {
  steps: DraftResolutionStep[];
  initialLogs: GameLogEntry[];
  finalPlayers: { [id: string]: PlayerState };
} {
  const updatedPlayers: { [id: string]: PlayerState } = JSON.parse(JSON.stringify(players));
  const initialLogs: GameLogEntry[] = [];
  const steps: DraftResolutionStep[] = [];

  // 1. 各プレイヤーのユニークカード購入処理（購入履歴はログ非公開）
  for (const playerId of Object.keys(bids)) {
    const player = updatedPlayers[playerId];
    if (!player || !player.isAlive) continue;

    const playerBidObj = bids[playerId];
    if (playerBidObj?.uniquePurchases && playerBidObj.uniquePurchases.length > 0) {
      for (const cardId of playerBidObj.uniquePurchases) {
        const cardDef = CARD_DEFINITIONS[cardId];
        if (!cardDef) continue;
        const price = getUniqueCardPrice(cardId, player.roleId);
        if (player.g >= price) {
          player.g -= price;
          const instanceId = `unique_buy_${turn}_${player.id}_${Math.random().toString(36).substring(2, 8)}`;
          addCardToHand(player, cardDef, instanceId, initialLogs, turn);
        }
      }
    }
  }

  // 2. 各ドラフトカードについて「二段階（入札開示 ➔ 落札確定＆獲得メッセージ）」ステップを生成
  const totalCards = draftPool.length;

  for (let cardIdx = 0; cardIdx < totalCards; cardIdx++) {
    const draftCard = draftPool[cardIdx];
    const cardDef = CARD_DEFINITIONS[draftCard.cardId];
    if (!cardDef) continue;

    // 全生存プレイヤーの入札情報を収集
    const cardBids: { playerId: string; originalBid: number; effectiveBid: number }[] = [];
    const playerBidInfos: import('../types/game').DraftPlayerBidInfo[] = [];

    for (const player of Object.values(updatedPlayers)) {
      if (!player.isAlive) continue;

      const playerBidObj = bids[player.id];
      const rawBid = playerBidObj?.bids?.[draftCard.instanceId];
      const bidAmount = Math.max(0, Number(rawBid) || 0);
      let effectiveBid = bidAmount;

      if (bidAmount > 0) {
        // ジャガーノートのパッシブ「大富豪の療養」: 回復カード入札時、自身の入札Gを1.25倍として扱う
        if (player.roleId === 'juggernaut' && (cardDef.category === 'HEAL' || cardDef.id === 'draft_heal_powder')) {
          effectiveBid = Math.floor(bidAmount * GAME_CONFIG.JUGGERNAUT_BID_MULTIPLIER);
        }
        cardBids.push({ playerId: player.id, originalBid: bidAmount, effectiveBid });
      }

      playerBidInfos.push({
        playerId: player.id,
        playerName: player.name,
        roleId: player.roleId,
        bidAmount,
        effectiveBid,
        isWinner: false,
      });
    }

    // 勝者判定
    let winnerEntry: { playerId: string; originalBid: number; effectiveBid: number } | null = null;
    let winner: PlayerState | null = null;

    if (cardBids.length > 0) {
      let maxEffectiveBid = 0;
      for (const b of cardBids) {
        const eff = Number(b.effectiveBid);
        if (eff > maxEffectiveBid) {
          maxEffectiveBid = eff;
        }
      }

      const highestBidders = cardBids.filter(b => Number(b.effectiveBid) === maxEffectiveBid);
      winnerEntry = highestBidders[Math.floor(Math.random() * highestBidders.length)];
      winner = updatedPlayers[winnerEntry.playerId];

      // 勝者フラグの更新
      const winningInfo = playerBidInfos.find(p => p.playerId === winnerEntry!.playerId);
      if (winningInfo) {
        winningInfo.isWinner = true;
      }
    }

    // === 段階1: 入札額の開示（プレイヤー一覧表示） ===
    const revealBids = playerBidInfos.map(b => ({ ...b, isWinner: false })); // 段階1ではまだ勝者強調しない
    steps.push({
      event: {
        step: 'BIDS_REVEAL',
        cardIndex: cardIdx + 1,
        totalCards,
        cardInstanceId: draftCard.instanceId,
        cardId: cardDef.id,
        cardName: cardDef.name,
        bids: revealBids,
        winnerId: winner?.id || null,
        message: '各プレイヤーの入札額が開示されました。',
      },
      logs: [],
      updatedPlayers: JSON.parse(JSON.stringify(updatedPlayers)),
    });

    // === 段階2: 勝ったプレイヤーを強調して表示し、獲得したことを示すメッセージを表示 ===
    const step2Logs: GameLogEntry[] = [];
    let announceMsg = '';
    let statChangeText: string | undefined = undefined;

    if (winner && winnerEntry) {
      // 落札者のGを消費
      winner.g = Math.max(0, winner.g - winnerEntry.originalBid);

      const isJgBonus = (winner.roleId === 'juggernaut' && winnerEntry.effectiveBid > winnerEntry.originalBid);
      const jgBonusText = isJgBonus ? ` (ジャガーノート実効: ${winnerEntry.effectiveBid}G)` : '';

      step2Logs.push({
        id: `draft_log_${Math.random()}`,
        turn,
        text: `【ドラフト】${winner.name} が「${cardDef.name}」を ${winnerEntry.originalBid}G${jgBonusText} で落札しました。`,
        type: 'draft',
      });

      // 獲得カードの処理
      if (cardDef.statusBonus) {
        // ステータスカード
        const stat = cardDef.statusBonus.stat;
        if (stat === 'HP') {
          const prevMaxHp = winner.maxHp;
          const prevHp = winner.hp;
          applyStatusCardBonus(winner, cardDef);
          statChangeText = `(最大HP: ${prevMaxHp} → ${winner.maxHp}, HP: ${prevHp} → ${winner.hp})`;
        } else if (stat === 'CLT') {
          const prevClt = winner.clt;
          applyStatusCardBonus(winner, cardDef);
          statChangeText = `(${prevClt}% → ${winner.clt}%)`;
        } else {
          const prop = stat.toLowerCase() as 'atk' | 'def' | 'mat' | 'mdf' | 'spd' | 'sld';
          const prevVal = winner[prop];
          applyStatusCardBonus(winner, cardDef);
          const newVal = winner[prop];
          statChangeText = `(${prevVal} → ${newVal})`;
        }

        step2Logs.push({
          id: `draft_log_${Math.random()}`,
          turn,
          text: `【ステータス反映】${winner.name} の ${cardDef.statusBonus.stat} が増加しました。${statChangeText}`,
          type: 'info',
        });

        announceMsg = `🎉 ${winner.name} が ${winnerEntry.originalBid}G で落札！ ${cardDef.name} により ${cardDef.statusBonus.stat} が増加しました！`;
      } else {
        // 通常カードを手札に追加
        addCardToHand(winner, cardDef, draftCard.instanceId, step2Logs, turn);
        announceMsg = `🎉 ${winner.name} が ${winnerEntry.originalBid}G で落札し、「${cardDef.name}」を獲得しました！`;
      }
    } else {
      // 入札者なし
      step2Logs.push({
        id: `draft_log_${Math.random()}`,
        turn,
        text: `【ドラフト】「${cardDef.name}」には入札がありませんでした。`,
        type: 'draft',
      });
      announceMsg = `「${cardDef.name}」には入札がなかったため、流札となりました。`;
    }

    steps.push({
      event: {
        step: 'WINNER_ANNOUNCE',
        cardIndex: cardIdx + 1,
        totalCards,
        cardInstanceId: draftCard.instanceId,
        cardId: cardDef.id,
        cardName: cardDef.name,
        bids: playerBidInfos, // 勝者フラグが立っている
        winnerId: winner?.id || null,
        winnerName: winner?.name,
        winningBid: winnerEntry?.originalBid,
        effectiveWinningBid: winnerEntry?.effectiveBid,
        isJuggernautBonus: (winner?.roleId === 'juggernaut' && (winnerEntry?.effectiveBid || 0) > (winnerEntry?.originalBid || 0)),
        message: announceMsg,
        statChangeText,
      },
      logs: step2Logs,
      updatedPlayers: JSON.parse(JSON.stringify(updatedPlayers)),
    });
  }

  return { steps, initialLogs, finalPlayers: updatedPlayers };
}

// ドラフトの入札結果を一括解決（既存互換）
export function resolveDraftBids(
  draftPool: DraftCard[],
  bids: { [playerId: string]: DraftBid },
  players: { [id: string]: PlayerState },
  turn: number
): DraftResolveResult {
  const { steps, initialLogs, finalPlayers } = buildDraftResolutionSteps(draftPool, bids, players, turn);
  const logs: GameLogEntry[] = [...initialLogs];

  for (const step of steps) {
    for (const l of step.logs) {
      logs.push(l);
    }
  }

  return { updatedPlayers: finalPlayers, logs };
}

// ステータスカードの即時ボーナス適用
function applyStatusCardBonus(player: PlayerState, cardDef: CardDefinition) {
  if (!cardDef.statusBonus) return;
  const { stat, amount } = cardDef.statusBonus;

  switch (stat) {
    case 'HP':
      player.maxHp += amount;
      player.hp = Math.min(player.maxHp, player.hp + amount);
      break;
    case 'ATK':
      player.atk += amount;
      break;
    case 'DEF':
      player.def += amount;
      break;
    case 'MAT':
      player.mat += amount;
      break;
    case 'MDF':
      player.mdf += amount;
      break;
    case 'SPD':
      player.spd = Math.max(0, player.spd + amount);
      break;
    case 'CLT': {
      // アサシン パッシブ「死線見切り」: 獲得するCLT上昇量を1.25倍
      let gain = amount;
      if (player.roleId === 'assassin') {
        gain *= GAME_CONFIG.ASSASSIN_CLT_BONUS_MULTIPLIER;
      }
      player.clt = Math.min(GAME_CONFIG.CRITICAL_MAX_RATE, player.clt + gain);
      break;
    }
    case 'SLD': {
      // 最大値は自身の最大HPと同じ。超過は打ち止め
      player.sld = Math.min(player.maxHp, player.sld + amount);
      break;
    }
  }
}

// 手札追加と上限15枚超過時のランダム破棄
function addCardToHand(
  player: PlayerState,
  cardDef: CardDefinition,
  instanceId: string,
  logs: GameLogEntry[],
  turn: number
) {
  const newCard = { instanceId, cardId: cardDef.id };
  player.hand.push(newCard);

  // 手札上限超過チェック
  if (player.hand.length > GAME_CONFIG.HAND_LIMIT) {
    const discardIndex = Math.floor(Math.random() * player.hand.length);
    const discardedCard = player.hand.splice(discardIndex, 1)[0];
    const discardedDef = CARD_DEFINITIONS[discardedCard.cardId];
    logs.push({
      id: `draft_log_${Math.random()}`,
      turn,
      text: `【手札上限超過】${player.name} の手札が15枚を超えたため、ランダムに「${discardedDef?.name || 'カード'}」が破棄されました。`,
      type: 'info',
    });
  }
}
