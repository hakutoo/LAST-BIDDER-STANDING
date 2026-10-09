import type { PlayerState } from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';
import { GAME_CONFIG } from '../data/constants';

export function createInitialPlayerState(id: string, name: string, isHost: boolean): PlayerState {
  return {
    id,
    name,
    isHost,
    isAlive: true,
    roleId: null,
    hp: 100,
    maxHp: 100,
    atk: 10,
    def: 5,
    mat: 5,
    mdf: 5,
    spd: 10,
    clt: 0,
    sld: 0,
    evasion: 0,
    g: GAME_CONFIG.INITIAL_G,
    hand: [],
    buffs: [],
    statuses: [],
    lastDamageDealt: 0,
  };
}

export function applyRoleToPlayer(player: PlayerState, roleId: string): void {
  const roleDef = ROLE_DEFINITIONS[roleId];
  if (!roleDef) return;

  player.roleId = roleId;
  player.maxHp = roleDef.initialStats.hp;
  player.hp = roleDef.initialStats.hp;
  player.atk = roleDef.initialStats.atk;
  player.def = roleDef.initialStats.def;
  player.mat = roleDef.initialStats.mat;
  player.mdf = roleDef.initialStats.mdf;
  player.spd = roleDef.initialStats.spd;
  player.clt = roleDef.initialStats.clt || (roleId === 'assassin' ? GAME_CONFIG.ASSASSIN_INITIAL_CLT : 0);
  player.sld = roleDef.initialStats.sld || 0;
  player.evasion = 0;

  // 初期手札5枚の生成
  // ・通常攻撃
  // ・ヒールパウダー ×2
  // ・ユニークカードA
  // ・ユニークカードB
  player.hand = [
    { instanceId: `init_${player.id}_normal`, cardId: 'normal_attack' },
    { instanceId: `init_${player.id}_heal1`, cardId: 'heal_powder' },
    { instanceId: `init_${player.id}_heal2`, cardId: 'heal_powder' },
    { instanceId: `init_${player.id}_uniqueA`, cardId: roleDef.uniqueCardAId },
    { instanceId: `init_${player.id}_uniqueB`, cardId: roleDef.uniqueCardBId },
  ];
}
