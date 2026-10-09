import { GAME_CONFIG } from '../data/constants';
import type { PlayerState } from '../types/game';

export interface GoldBreakdown {
  base: number;
  damageBonus: number;
  interest: number;
  catchup: number;
  total: number;
}

export function calculateTurnGold(player: PlayerState): GoldBreakdown {
  const base = Math.floor(GAME_CONFIG.BASE_SALARY);
  const damageBonus = Math.floor(player.lastDamageDealt * GAME_CONFIG.DAMAGE_BONUS_RATE);
  const interest = Math.floor(player.g * GAME_CONFIG.INTEREST_RATE);
  const missingHp = Math.max(0, player.maxHp - player.hp);
  const catchup = Math.floor(missingHp * GAME_CONFIG.CATCHUP_RATE);

  // G獲得は各要素をそれぞれ切り捨ててから足す
  const total = base + damageBonus + interest + catchup;

  return {
    base,
    damageBonus,
    interest,
    catchup,
    total,
  };
}
