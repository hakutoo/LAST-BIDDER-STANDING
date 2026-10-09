import type { CardDefinition } from '../types/cards';
import type { DraftCard, DraftBid, PlayerState, GameLogEntry } from '../types/game';
import { CARD_DEFINITIONS } from '../data/cards';
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

// ユニークカードの価格取得
export function getUniqueCardPrice(cardId: string): number {
  const def = CARD_DEFINITIONS[cardId];
  if (!def) return 0;
  if (def.category === 'UNIQUE_A') {
    return GAME_CONFIG.UNIQUE_CARD_A_PRICE;
  }
  if (def.category === 'UNIQUE_B') {
    return GAME_CONFIG.UNIQUE_CARD_B_PRICE;
  }
  return 0;
}

// ドラフトの入札結果を解決
export function resolveDraftBids(
  draftPool: DraftCard[],
  bids: { [playerId: string]: DraftBid },
  players: { [id: string]: PlayerState },
  turn: number
): DraftResolveResult {
  const updatedPlayers: { [id: string]: PlayerState } = JSON.parse(JSON.stringify(players));
  const logs: GameLogEntry[] = [];

  // 1. 各プレイヤーのユニークカード購入処理（購入履歴はログ非公開）
  for (const playerId of Object.keys(bids)) {
    const player = updatedPlayers[playerId];
    if (!player || !player.isAlive) continue;

    const playerBidObj = bids[playerId];
    if (playerBidObj?.uniquePurchases && playerBidObj.uniquePurchases.length > 0) {
      for (const cardId of playerBidObj.uniquePurchases) {
        const cardDef = CARD_DEFINITIONS[cardId];
        if (!cardDef) continue;
        const price = getUniqueCardPrice(cardId);
        if (player.g >= price) {
          player.g -= price;
          const instanceId = `unique_buy_${turn}_${player.id}_${Math.random().toString(36).substring(2, 8)}`;
          addCardToHand(player, cardDef, instanceId, logs, turn);
        }
      }
    }
  }

  // 各ドラフトカードについて最高入札者を判定
  for (const draftCard of draftPool) {
    const cardDef = CARD_DEFINITIONS[draftCard.cardId];
    if (!cardDef) continue;

    // このカードに対する各プレイヤーの実効入札額を収集
    const cardBids: { playerId: string; originalBid: number; effectiveBid: number }[] = [];

    for (const playerId of Object.keys(bids)) {
      const player = updatedPlayers[playerId];
      if (!player || !player.isAlive) continue;

      const playerBidObj = bids[playerId];
      const bidAmount = playerBidObj?.bids?.[draftCard.instanceId] || 0;
      if (bidAmount > 0) {
        let effectiveBid = bidAmount;
        // ジャガーノートのパッシブ「大富豪の療養」: 回復カード入札時、自身の入札Gを1.25倍として扱う
        if (player.roleId === 'juggernaut' && (cardDef.category === 'HEAL' || cardDef.id === 'draft_heal_powder')) {
          effectiveBid = bidAmount * GAME_CONFIG.JUGGERNAUT_BID_MULTIPLIER;
        }
        cardBids.push({ playerId, originalBid: bidAmount, effectiveBid });
      }
    }

    if (cardBids.length === 0) {
      logs.push({
        id: `draft_log_${Math.random()}`,
        turn,
        text: `【ドラフト】「${cardDef.name}」には入札がありませんでした。`,
        type: 'draft',
      });
      continue;
    }

    // 最高実効入札額を特定
    let maxEffectiveBid = 0;
    for (const b of cardBids) {
      if (b.effectiveBid > maxEffectiveBid) {
        maxEffectiveBid = b.effectiveBid;
      }
    }

    // 最高額をつけたプレイヤーたち（同額入札の可能性あり）
    const highestBidders = cardBids.filter(b => b.effectiveBid === maxEffectiveBid);

    // 同額入札の場合はランダムに1人決定
    const winnerEntry = highestBidders[Math.floor(Math.random() * highestBidders.length)];
    const winner = updatedPlayers[winnerEntry.playerId];

    // 落札者のGを消費
    winner.g = Math.max(0, winner.g - winnerEntry.originalBid);

    logs.push({
      id: `draft_log_${Math.random()}`,
      turn,
      text: `【ドラフト】${winner.name} が「${cardDef.name}」を ${winnerEntry.originalBid}G で落札しました。`,
      type: 'draft',
    });

    // 獲得カードの処理
    if (cardDef.statusBonus) {
      // ステータスカード: 即時ステータス反映（手札には入らない）
      const stat = cardDef.statusBonus.stat;
      let changeText = '';
      if (stat === 'HP') {
        const prevMaxHp = winner.maxHp;
        const prevHp = winner.hp;
        applyStatusCardBonus(winner, cardDef);
        changeText = `(最大HP: ${prevMaxHp} → ${winner.maxHp}, HP: ${prevHp} → ${winner.hp})`;
      } else if (stat === 'CLT') {
        const prevClt = winner.clt;
        applyStatusCardBonus(winner, cardDef);
        changeText = `(${prevClt}% → ${winner.clt}%)`;
      } else {
        const prop = stat.toLowerCase() as 'atk' | 'def' | 'mat' | 'mdf' | 'spd' | 'sld';
        const prevVal = winner[prop];
        applyStatusCardBonus(winner, cardDef);
        const newVal = winner[prop];
        changeText = `(${prevVal} → ${newVal})`;
      }

      logs.push({
        id: `draft_log_${Math.random()}`,
        turn,
        text: `【ステータス反映】${winner.name} の ${cardDef.statusBonus.stat} が増加しました。${changeText}`,
        type: 'info',
      });
    } else {
      // 通常のカード: 手札に追加
      addCardToHand(winner, cardDef, draftCard.instanceId, logs, turn);
    }
  }

  return { updatedPlayers, logs };
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
