import { GAME_CONFIG } from '../data/constants';
import type { PlayerState } from '../types/game';

export interface AttackContext {
  attacker: PlayerState;
  target: PlayerState;
  damageType: 'PHYSICAL' | 'MAGIC';
  rawMultiplier: number;
  scaleStatOverride?: 'MAT' | 'MDF';
  consumeSld?: number; // シールドクラッシュ用
  tempCltBonus?: number; // 暗殺のビースト用
  sldBonusMultiplier?: number; // ライトニング用 (対象にSLDがあれば1.5倍)
}

export interface DamageResult {
  isEvaded: boolean;
  isParried: boolean;
  isCritical: boolean;
  initialAttackValue: number;
  reducedDamage: number;
  finalDamage: number;
  sldDamage: number;
  hpDamage: number;
  reflectedDamage: number;
  counterAttackType?: 'PHYSICAL' | 'MAGIC';
  counterMultiplier?: number;
  berserkerBonus: number;
  spellChargeUsed: boolean;
  inquisitorHealAmount: number;
}

export function calculateDamage(ctx: AttackContext): DamageResult {
  const { attacker, target, damageType, rawMultiplier, scaleStatOverride, consumeSld, tempCltBonus, sldBonusMultiplier } = ctx;

  const result: DamageResult = {
    isEvaded: false,
    isParried: false,
    isCritical: false,
    initialAttackValue: 0,
    reducedDamage: 0,
    finalDamage: 0,
    sldDamage: 0,
    hpDamage: 0,
    reflectedDamage: 0,
    berserkerBonus: 0,
    spellChargeUsed: false,
    inquisitorHealAmount: 0,
  };

  // 1. 回避判定 (物理攻撃のみ、回避判定が最優先)
  if (damageType === 'PHYSICAL') {
    const evasionRate = Math.min(GAME_CONFIG.EVASION_MAX_RATE, Math.max(0, target.evasion));
    if (evasionRate > 0 && Math.random() * 100 < evasionRate) {
      result.isEvaded = true;
      return result; // 回避成功時はカウンターも発動せず完全無効
    }
  }

  // カウンター / パリィ構えバフのチェック
  const parryDaggerBuff = target.buffs.find(b => b.type === 'PARRY_DAGGER');
  const mirrorCoatBuff = target.buffs.find(b => b.type === 'MIRROR_COAT');
  const antiMagiBuff = target.buffs.find(b => b.type === 'ANTI_MAGI');
  const parryStanceBuff = target.buffs.find(b => b.type === 'PARRY_STANCE');

  // パリィダガー (物理完全無効化＆反撃)
  if (damageType === 'PHYSICAL' && parryDaggerBuff) {
    result.isParried = true;
    result.counterAttackType = 'PHYSICAL';
    result.counterMultiplier = 1.0;
    return result;
  }

  // ミラーコート (魔法完全無効化＆反撃)
  if (damageType === 'MAGIC' && mirrorCoatBuff) {
    result.isParried = true;
    result.counterAttackType = 'MAGIC';
    result.counterMultiplier = 1.0;
    return result;
  }

  // 攻撃基本値の計算
  let baseStat = 0;
  if (damageType === 'PHYSICAL') {
    baseStat = attacker.atk;
  } else {
    baseStat = scaleStatOverride === 'MDF' ? attacker.mdf : attacker.mat;
  }

  // 1. カード効果による倍率を計算する
  let currentMultiplier = rawMultiplier;

  // メイジのパッシブ「スペルチャージ」チェック (魔法攻撃かつスペルチャージバフあり)
  const spellChargeBuff = attacker.buffs.find(b => b.type === 'SPELL_CHARGE');
  if (damageType === 'MAGIC' && spellChargeBuff) {
    currentMultiplier *= GAME_CONFIG.MAGE_SPELL_CHARGE_MULTIPLIER;
    result.spellChargeUsed = true;
  }

  let attackValue = baseStat * currentMultiplier;

  // シールドクラッシュの場合、消費したSLDを加算
  if (consumeSld && consumeSld > 0) {
    attackValue += consumeSld;
  }

  // 2. CLT（クリティカル）の判定を行う
  // 物理攻撃のみ、かつ対象にSLDが存在しない場合のみ
  if (damageType === 'PHYSICAL' && target.sld <= 0) {
    let effectiveClt = attacker.clt + (tempCltBonus || 0);
    effectiveClt = Math.min(GAME_CONFIG.CRITICAL_MAX_RATE, Math.max(0, effectiveClt));
    if (effectiveClt > 0 && Math.random() * 100 < effectiveClt) {
      result.isCritical = true;
      // 発生した場合、攻撃値を1.3倍する
      attackValue *= GAME_CONFIG.CRITICAL_DAMAGE_MULTIPLIER;
    }
  }

  result.initialAttackValue = attackValue;

  // 3. 攻撃値を決定する。
  // 4. DEFまたはMDFによる軽減を行う。
  let damageAfterDefense = 0;
  if (damageType === 'PHYSICAL') {
    damageAfterDefense = Math.max(0, attackValue - target.def);
  } else {
    damageAfterDefense = Math.max(0, attackValue - target.mdf);
  }

  // 5. パッシブ効果によるダメージの増減を適用する。
  // バーサーカー「狂乱の刃」: 物理攻撃に3の確定ダメージ（DEF無視）
  if (damageType === 'PHYSICAL' && attacker.roleId === 'berserker') {
    damageAfterDefense += GAME_CONFIG.BERSERKER_FIXED_DAMAGE;
    result.berserkerBonus = GAME_CONFIG.BERSERKER_FIXED_DAMAGE;
  }

  // 6. ダメージ軽減効果を適用する。
  // 6a. ライトニング特効 (対象にSLDがあれば最終ダメ1.5倍)
  if (sldBonusMultiplier && target.sld > 0) {
    damageAfterDefense *= sldBonusMultiplier;
  }

  // 6b. イージス パッシブ「フォートレス・スタンス」: SLD存在中、被ダメージ20%軽減
  if (target.roleId === 'aegis' && target.sld > 0) {
    damageAfterDefense *= (1.0 - GAME_CONFIG.AEGIS_DAMAGE_REDUCTION);
  }

  // 6c. アンチ・マギ (魔法無効化＆50%反射)
  if (damageType === 'MAGIC' && antiMagiBuff) {
    result.isParried = true;
    result.reflectedDamage = Math.floor(damageAfterDefense * 0.5);
    return result; // 対象へのダメージは0
  }

  // 6d. パリィ・スタンス (被ダメージ50%軽減＆軽減分反射)
  if (parryStanceBuff) {
    const reducedAmount = damageAfterDefense * 0.5;
    result.reflectedDamage = Math.floor(reducedAmount);
    damageAfterDefense = damageAfterDefense * 0.5;
  }

  // 7. SLDによるダメージ処理を行う
  // 8. HPへのダメージを適用する
  // 10. 最後に小数点以下を切り捨てる
  const totalDamage = Math.max(0, damageAfterDefense);
  result.reducedDamage = totalDamage;

  if (target.sld > 0) {
    if (totalDamage <= target.sld) {
      result.sldDamage = Math.floor(totalDamage);
      result.hpDamage = 0;
    } else {
      result.sldDamage = target.sld;
      result.hpDamage = Math.floor(totalDamage - target.sld);
    }
  } else {
    result.sldDamage = 0;
    result.hpDamage = Math.floor(totalDamage);
  }

  result.finalDamage = result.sldDamage + result.hpDamage;

  // インクイジターのパッシブ「魔力捕食」: 魔法攻撃によってダメージを受けた場合、受けたダメージの50％最大HP増加＆回復
  if (damageType === 'MAGIC' && target.roleId === 'inquisitor' && result.hpDamage > 0) {
    result.inquisitorHealAmount = Math.floor(result.hpDamage * GAME_CONFIG.INQUISITOR_HEAL_PERCENT);
  }

  return result;
}
