import type { StatKey } from './game';

export type CardCategory = 
  | 'NORMAL' 
  | 'HEAL' 
  | 'UNIQUE_A' 
  | 'UNIQUE_B' 
  | 'STATUS_SMALL' 
  | 'STATUS_MEDIUM' 
  | 'STATUS_LARGE' 
  | 'ACTIVE' 
  | 'COUNTER';

export type CardPriority = 'NORMAL' | 'HIGH';

export type TargetType = 'SINGLE_ENEMY' | 'SELF' | 'NONE';

export type CardEffect = 
  | {
      type: 'PHYSICAL_ATTACK';
      baseDamage?: number; // 攻撃固定値 (例: 通常攻撃 10)
      multiplier: number; // ATK * multiplier
      hits?: number; // 攻撃回数 (例: ツインスラッシュ=2)
      consumeSldRate?: number; // シールドクラッシュ用: 消費したSLDの加算
    }
  | {
      type: 'CONSUME_SLD_ATTACK';
      baseDamage?: number;
      multiplier: number;
    }
  | {
      type: 'MAGIC_ATTACK';
      baseDamage?: number; // 魔法攻撃固定値
      multiplier: number; // MAT * multiplier (スペルドレインは MDF)
      scaleStat?: 'MAT' | 'MDF';
      sldBonusMultiplier?: number; // 相手にSLDがある場合最終ダメージ倍率 (例: ライトニング 1.5)
      drainPercent?: number; // 与えた最終ダメージの回復割合 (例: 救命の儀式 100)
    }
  | {
      type: 'HEAL';
      amount: number;
      isPercentMissingHp?: boolean; // 減少HPの割合回復 (リジューブ・パワー 30%)
    }
  | {
      type: 'ADD_MAX_HP';
      amount: number; // 最大HP増加（同値現在HP回復）
      physicalAttackBaseDamage?: number; // ヘビースタンプ: 固定攻撃値 12
      physicalAttackMaxHpPercent?: number; // ヘビースタンプ: 最大HPの20%を物理攻撃値として対象攻撃
    }
  | {
      type: 'ADD_SLD';
      amount: number;
    }
  | {
      type: 'CLEAR_TARGET_SLD'; // 毒蛇の牙用
    }
  | {
      type: 'STAT_BUFF';
      stat: StatKey | 'evasion';
      amount: number;
      duration: number; // 0: このターン中, 1: 次のターン終了時まで
    }
  | {
      type: 'STEAL_STAT'; // スペルドレイン用: 相手のMDF3減らし、自身のMDF3増やす
      stat: StatKey;
      amount: number;
    }
  | {
      type: 'APPLY_STATUS';
      status: 'poison' | 'heavy_wound';
      duration: number; // 通常3ターン
      onlyOnCritical?: boolean; // ヴェノム・エッジ用
    }
  | {
      type: 'PARRY_AND_REFLECT';
      damageType: 'PHYSICAL' | 'MAGIC' | 'ALL';
      reduceRate: number; // 0.5 (パリィスタンス), 1.0 (アンチマギ, パリィダガー, ミラーコート)
      reflectRate: number; // 軽減/無効化分の何%を攻撃者に反射するか (1.0 or 0.5)
      counterAttack?: {
        type: 'PHYSICAL' | 'MAGIC';
        baseDamage?: number; // 反撃固定値 10
        multiplier: number; // ATK 120% または MAT 120%
      };
    }
  | {
      type: 'SELF_DAMAGE';
      amount: number; // 捨身の突撃 10
    }
  | {
      type: 'TEMP_CLT_BUFF';
      amount: number; // 暗殺のビースト +30%
    };

export interface CardDefinition {
  id: string;
  name: string;
  category: CardCategory;
  priority: CardPriority;
  targetType: TargetType;
  description: string;
  effects: CardEffect[];
  // ステータスカード即時適用用
  statusBonus?: {
    stat: StatKey;
    amount: number;
  };
  /**
   * ユニークカード購入価格（G）。
   * 設定した場合はグローバルデフォルト（UNIQUE_CARD_A/B_PRICE）より優先される。
   * UNIQUE_A / UNIQUE_B カード以外には無効。
   */
  price?: number;
}
