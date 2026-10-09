import type { CardDefinition } from '../types/cards';

export const CARD_DEFINITIONS: { [id: string]: CardDefinition } = {
  // === デフォルトカード ===
  normal_attack: {
    id: 'normal_attack',
    name: '通常攻撃',
    category: 'NORMAL',
    priority: 'NORMAL',
    targetType: 'SINGLE_ENEMY',
    description: 'ATKの50％を攻撃値とした物理攻撃を行う。使用後は消費される。',
    effects: [
      { type: 'PHYSICAL_ATTACK', multiplier: 0.5 },
    ],
  },
  heal_powder: {
    id: 'heal_powder',
    name: 'ヒールパウダー',
    category: 'HEAL',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'HPを15回復する。回復量は最大HPを超えない。重傷時は半減。',
    effects: [
      { type: 'HEAL', amount: 15 },
    ],
  },

  // === ジャガーノート ===
  unique_juggernaut_a: {
    id: 'unique_juggernaut_a',
    name: 'リジューブ・パワー',
    category: 'UNIQUE_A',
    priority: 'HIGH',
    targetType: 'SELF',
    description: '自身の減少HPの30％を即座に回復する。',
    effects: [
      { type: 'HEAL', amount: 30, isPercentMissingHp: true },
    ],
  },
  unique_juggernaut_b: {
    id: 'unique_juggernaut_b',
    name: 'ヘビースタンプ',
    category: 'UNIQUE_B',
    priority: 'NORMAL',
    targetType: 'SINGLE_ENEMY',
    description: '自身の最大HPを15増加させ同値回復。その後対象に自身の最大HPの20％の物理攻撃を行う。',
    effects: [
      { type: 'ADD_MAX_HP', amount: 15, physicalAttackMaxHpPercent: 0.2 },
    ],
  },

  // === バーサーカー ===
  unique_berserker_a: {
    id: 'unique_berserker_a',
    name: 'ツイン・スラッシュ',
    category: 'UNIQUE_A',
    priority: 'NORMAL',
    targetType: 'SINGLE_ENEMY',
    description: 'ATKの70％を攻撃値とした物理攻撃を2回行う。',
    effects: [
      { type: 'PHYSICAL_ATTACK', multiplier: 0.7, hits: 2 },
    ],
  },
  unique_berserker_b: {
    id: 'unique_berserker_b',
    name: '捨身の突撃',
    category: 'UNIQUE_B',
    priority: 'NORMAL',
    targetType: 'SINGLE_ENEMY',
    description: 'ATKの150％を攻撃値とした物理攻撃を行う。攻撃判定終了後、自身は10ダメージを受ける。',
    effects: [
      { type: 'PHYSICAL_ATTACK', multiplier: 1.5 },
      { type: 'SELF_DAMAGE', amount: 10 },
    ],
  },

  // === センチネル ===
  unique_sentinel_a: {
    id: 'unique_sentinel_a',
    name: 'パリィ・スタンス',
    category: 'UNIQUE_A',
    priority: 'HIGH',
    targetType: 'SELF',
    description: 'このターン中、受けるダメージを50％軽減し、軽減したダメージを攻撃してきたプレイヤーへ反射する。',
    effects: [
      { type: 'PARRY_AND_REFLECT', damageType: 'ALL', reduceRate: 0.5, reflectRate: 1.0 },
    ],
  },
  unique_sentinel_b: {
    id: 'unique_sentinel_b',
    name: 'リベンジ',
    category: 'UNIQUE_B',
    priority: 'NORMAL',
    targetType: 'SINGLE_ENEMY',
    description: 'DEFの120％を攻撃値とした物理攻撃を行う。',
    effects: [
      { type: 'PHYSICAL_ATTACK', multiplier: 1.2 }, // 処理時にscale DEF
    ],
  },

  // === メイジ ===
  unique_mage_a: {
    id: 'unique_mage_a',
    name: 'マナチャージ',
    category: 'UNIQUE_A',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'このターン中、自身のMDFを10増加させる。次回魔法攻撃の威力が1.75倍になる。',
    effects: [
      { type: 'STAT_BUFF', stat: 'MDF', amount: 10, duration: 0 },
    ],
  },
  unique_mage_b: {
    id: 'unique_mage_b',
    name: 'ギガフレア',
    category: 'UNIQUE_B',
    priority: 'NORMAL',
    targetType: 'SINGLE_ENEMY',
    description: 'MATの130％を攻撃値とした魔法攻撃を行う。',
    effects: [
      { type: 'MAGIC_ATTACK', multiplier: 1.3, scaleStat: 'MAT' },
    ],
  },

  // === インクイジター ===
  unique_inquisitor_a: {
    id: 'unique_inquisitor_a',
    name: 'スペルドレイン',
    category: 'UNIQUE_A',
    priority: 'NORMAL',
    targetType: 'SINGLE_ENEMY',
    description: '対象のMDFを3減少させ自身のMDFを3増加させる。その後自身のMDFの100％を攻撃値として魔法攻撃を行う。',
    effects: [
      { type: 'STEAL_STAT', stat: 'MDF', amount: 3 },
      { type: 'MAGIC_ATTACK', multiplier: 1.0, scaleStat: 'MDF' },
    ],
  },
  unique_inquisitor_b: {
    id: 'unique_inquisitor_b',
    name: 'アンチ・マギ',
    category: 'UNIQUE_B',
    priority: 'HIGH',
    targetType: 'SELF',
    description: 'このターン中、自身が受ける魔法攻撃を無効化する。無効化したダメージの50％を攻撃者へ反射する。',
    effects: [
      { type: 'PARRY_AND_REFLECT', damageType: 'MAGIC', reduceRate: 1.0, reflectRate: 0.5 },
    ],
  },

  // === スピードスター ===
  unique_speedstar_a: {
    id: 'unique_speedstar_a',
    name: 'アクセル・ビート',
    category: 'UNIQUE_A',
    priority: 'HIGH',
    targetType: 'SINGLE_ENEMY',
    description: 'ATKの75％を攻撃値とした物理攻撃を行う。パッシブにより2回発動。',
    effects: [
      { type: 'PHYSICAL_ATTACK', multiplier: 0.75 },
    ],
  },
  unique_speedstar_b: {
    id: 'unique_speedstar_b',
    name: 'ウィンドヴェール',
    category: 'UNIQUE_B',
    priority: 'HIGH',
    targetType: 'SELF',
    description: '次のターン終了時までSPDを7増加し、回避率を25％増加させる。パッシブにより2回発動。',
    effects: [
      { type: 'STAT_BUFF', stat: 'SPD', amount: 7, duration: 1 },
      { type: 'STAT_BUFF', stat: 'evasion', amount: 25, duration: 1 },
    ],
  },

  // === アサシン ===
  unique_assassin_a: {
    id: 'unique_assassin_a',
    name: '暗殺のビースト',
    category: 'UNIQUE_A',
    priority: 'NORMAL',
    targetType: 'SINGLE_ENEMY',
    description: '自身のCLTを30％増加させた状態で、ATKの100％を攻撃値とした物理攻撃を行う。',
    effects: [
      { type: 'TEMP_CLT_BUFF', amount: 30 },
      { type: 'PHYSICAL_ATTACK', multiplier: 1.0 },
    ],
  },
  unique_assassin_b: {
    id: 'unique_assassin_b',
    name: 'ヴェノム・エッジ',
    category: 'UNIQUE_B',
    priority: 'NORMAL',
    targetType: 'SINGLE_ENEMY',
    description: 'ATKの60％を攻撃値とした物理攻撃を行う。クリティカル発生時、対象に毒を付与する。',
    effects: [
      { type: 'PHYSICAL_ATTACK', multiplier: 0.6 },
      { type: 'APPLY_STATUS', status: 'poison', duration: 3, onlyOnCritical: true },
    ],
  },

  // === イージス ===
  unique_aegis_a: {
    id: 'unique_aegis_a',
    name: 'イージス・シェル',
    category: 'UNIQUE_A',
    priority: 'HIGH',
    targetType: 'SELF',
    description: 'SLDを25付与する。',
    effects: [
      { type: 'ADD_SLD', amount: 25 },
    ],
  },
  unique_aegis_b: {
    id: 'unique_aegis_b',
    name: 'シールドクラッシュ',
    category: 'UNIQUE_B',
    priority: 'NORMAL',
    targetType: 'SINGLE_ENEMY',
    description: '自身のSLDをすべて消費する。ATKの100％に加え消費したSLDを加算した物理攻撃を行う。',
    effects: [
      { type: 'CONSUME_SLD_ATTACK', multiplier: 1.0 },
    ],
  },

  // === ステータスカード【小】 ===
  stat_small_hp: {
    id: 'stat_small_hp',
    name: 'HP【小】',
    category: 'STATUS_SMALL',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: '最大HPを15増加させ、同値回復する。',
    effects: [],
    statusBonus: { stat: 'HP', amount: 15 },
  },
  stat_small_atk: {
    id: 'stat_small_atk',
    name: 'ATK【小】',
    category: 'STATUS_SMALL',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'ATKを2増加させる。',
    effects: [],
    statusBonus: { stat: 'ATK', amount: 2 },
  },
  stat_small_def: {
    id: 'stat_small_def',
    name: 'DEF【小】',
    category: 'STATUS_SMALL',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'DEFを2増加させる。',
    effects: [],
    statusBonus: { stat: 'DEF', amount: 2 },
  },
  stat_small_mat: {
    id: 'stat_small_mat',
    name: 'MAT【小】',
    category: 'STATUS_SMALL',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'MATを2増加させる。',
    effects: [],
    statusBonus: { stat: 'MAT', amount: 2 },
  },
  stat_small_mdf: {
    id: 'stat_small_mdf',
    name: 'MDF【小】',
    category: 'STATUS_SMALL',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'MDFを2増加させる。',
    effects: [],
    statusBonus: { stat: 'MDF', amount: 2 },
  },
  stat_small_spd: {
    id: 'stat_small_spd',
    name: 'SPD【小】',
    category: 'STATUS_SMALL',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'SPDを2増加させる。',
    effects: [],
    statusBonus: { stat: 'SPD', amount: 2 },
  },
  stat_small_clt: {
    id: 'stat_small_clt',
    name: 'CLT【小】',
    category: 'STATUS_SMALL',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'CLTを10％増加させる。',
    effects: [],
    statusBonus: { stat: 'CLT', amount: 10 },
  },
  stat_small_sld: {
    id: 'stat_small_sld',
    name: 'SLD【小】',
    category: 'STATUS_SMALL',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'SLDを5増加させる（最大SLDまで）。',
    effects: [],
    statusBonus: { stat: 'SLD', amount: 5 },
  },

  // === ステータスカード【中】 ===
  stat_med_hp: {
    id: 'stat_med_hp',
    name: 'HP【中】',
    category: 'STATUS_MEDIUM',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: '最大HPを30増加させ、同値回復する。',
    effects: [],
    statusBonus: { stat: 'HP', amount: 30 },
  },
  stat_med_atk: {
    id: 'stat_med_atk',
    name: 'ATK【中】',
    category: 'STATUS_MEDIUM',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'ATKを5増加させる。',
    effects: [],
    statusBonus: { stat: 'ATK', amount: 5 },
  },
  stat_med_def: {
    id: 'stat_med_def',
    name: 'DEF【中】',
    category: 'STATUS_MEDIUM',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'DEFを4増加させる。',
    effects: [],
    statusBonus: { stat: 'DEF', amount: 4 },
  },
  stat_med_mat: {
    id: 'stat_med_mat',
    name: 'MAT【中】',
    category: 'STATUS_MEDIUM',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'MATを5増加させる。',
    effects: [],
    statusBonus: { stat: 'MAT', amount: 5 },
  },
  stat_med_mdf: {
    id: 'stat_med_mdf',
    name: 'MDF【中】',
    category: 'STATUS_MEDIUM',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'MDFを4増加させる。',
    effects: [],
    statusBonus: { stat: 'MDF', amount: 4 },
  },
  stat_med_spd: {
    id: 'stat_med_spd',
    name: 'SPD【中】',
    category: 'STATUS_MEDIUM',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'SPDを4増加させる。',
    effects: [],
    statusBonus: { stat: 'SPD', amount: 4 },
  },
  stat_med_clt: {
    id: 'stat_med_clt',
    name: 'CLT【中】',
    category: 'STATUS_MEDIUM',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'CLTを20％増加させる。',
    effects: [],
    statusBonus: { stat: 'CLT', amount: 20 },
  },
  stat_med_sld: {
    id: 'stat_med_sld',
    name: 'SLD【中】',
    category: 'STATUS_MEDIUM',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'SLDを10増加させる（最大SLDまで）。',
    effects: [],
    statusBonus: { stat: 'SLD', amount: 10 },
  },

  // === ステータスカード【大】 ===
  stat_large_hp: {
    id: 'stat_large_hp',
    name: 'HP【大】',
    category: 'STATUS_LARGE',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: '最大HPを50増加させ、同値回復する。',
    effects: [],
    statusBonus: { stat: 'HP', amount: 50 },
  },
  stat_large_atk: {
    id: 'stat_large_atk',
    name: 'ATK【大】',
    category: 'STATUS_LARGE',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'ATKを8増加させる。',
    effects: [],
    statusBonus: { stat: 'ATK', amount: 8 },
  },
  stat_large_def: {
    id: 'stat_large_def',
    name: 'DEF【大】',
    category: 'STATUS_LARGE',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'DEFを7増加させる。',
    effects: [],
    statusBonus: { stat: 'DEF', amount: 7 },
  },
  stat_large_mat: {
    id: 'stat_large_mat',
    name: 'MAT【大】',
    category: 'STATUS_LARGE',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'MATを9増加させる。',
    effects: [],
    statusBonus: { stat: 'MAT', amount: 9 },
  },
  stat_large_mdf: {
    id: 'stat_large_mdf',
    name: 'MDF【大】',
    category: 'STATUS_LARGE',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'MDFを7増加させる。',
    effects: [],
    statusBonus: { stat: 'MDF', amount: 7 },
  },
  stat_large_spd: {
    id: 'stat_large_spd',
    name: 'SPD【大】',
    category: 'STATUS_LARGE',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'SPDを7増加させる。',
    effects: [],
    statusBonus: { stat: 'SPD', amount: 7 },
  },
  stat_large_clt: {
    id: 'stat_large_clt',
    name: 'CLT【大】',
    category: 'STATUS_LARGE',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'CLTを35％増加させる。',
    effects: [],
    statusBonus: { stat: 'CLT', amount: 35 },
  },
  stat_large_sld: {
    id: 'stat_large_sld',
    name: 'SLD【大】',
    category: 'STATUS_LARGE',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'SLDを18増加させる（最大SLDまで）。',
    effects: [],
    statusBonus: { stat: 'SLD', amount: 18 },
  },

  // === アクティブカード ===
  heavy_blade: {
    id: 'heavy_blade',
    name: 'ヘビーブレード',
    category: 'ACTIVE',
    priority: 'NORMAL',
    targetType: 'SINGLE_ENEMY',
    description: 'ATKの120％を攻撃値とした物理攻撃を行う。',
    effects: [
      { type: 'PHYSICAL_ATTACK', multiplier: 1.2 },
    ],
  },
  snake_fang: {
    id: 'snake_fang',
    name: '毒蛇の牙',
    category: 'ACTIVE',
    priority: 'NORMAL',
    targetType: 'SINGLE_ENEMY',
    description: '対象のSLDを0にする。その後、ATKの80％を攻撃値とした物理攻撃を行う。',
    effects: [
      { type: 'CLEAR_TARGET_SLD' },
      { type: 'PHYSICAL_ATTACK', multiplier: 0.8 },
    ],
  },
  lightning: {
    id: 'lightning',
    name: 'ライトニング',
    category: 'ACTIVE',
    priority: 'NORMAL',
    targetType: 'SINGLE_ENEMY',
    description: 'MATの100％を攻撃値とした魔法攻撃を行う。対象にSLDが存在する場合、最終ダメージを1.5倍にする。',
    effects: [
      { type: 'MAGIC_ATTACK', multiplier: 1.0, scaleStat: 'MAT', sldBonusMultiplier: 1.5 },
    ],
  },
  life_ritual: {
    id: 'life_ritual',
    name: '救命の儀式',
    category: 'ACTIVE',
    priority: 'NORMAL',
    targetType: 'SINGLE_ENEMY',
    description: 'MATの80％を攻撃値とした魔法攻撃を行う。対象に与えた最終ダメージの100％だけ自身のHPを回復する。',
    effects: [
      { type: 'MAGIC_ATTACK', multiplier: 0.8, scaleStat: 'MAT', drainPercent: 100 },
    ],
  },
  iron_wall: {
    id: 'iron_wall',
    name: 'アイアンウォール',
    category: 'ACTIVE',
    priority: 'HIGH',
    targetType: 'SELF',
    description: 'SLDを20付与する。さらに、このターン中DEFを5増加させる。',
    effects: [
      { type: 'ADD_SLD', amount: 20 },
      { type: 'STAT_BUFF', stat: 'DEF', amount: 5, duration: 0 },
    ],
  },
  mind_shell: {
    id: 'mind_shell',
    name: 'マインドシェル',
    category: 'ACTIVE',
    priority: 'HIGH',
    targetType: 'SELF',
    description: 'SLDを20付与する。さらに、このターン中MDFを5増加させる。',
    effects: [
      { type: 'ADD_SLD', amount: 20 },
      { type: 'STAT_BUFF', stat: 'MDF', amount: 5, duration: 0 },
    ],
  },
  death_brand: {
    id: 'death_brand',
    name: '死神の烙印',
    category: 'ACTIVE',
    priority: 'NORMAL',
    targetType: 'SINGLE_ENEMY',
    description: 'MATの50％を攻撃値とした魔法攻撃を行う。対象に重傷を付与する（3ターン）。',
    effects: [
      { type: 'MAGIC_ATTACK', multiplier: 0.5, scaleStat: 'MAT' },
      { type: 'APPLY_STATUS', status: 'heavy_wound', duration: 3 },
    ],
  },
  feather_step: {
    id: 'feather_step',
    name: 'フェザーステップ',
    category: 'ACTIVE',
    priority: 'HIGH',
    targetType: 'SELF',
    description: '次のターン終了時までSPDを10増加させる。',
    effects: [
      { type: 'STAT_BUFF', stat: 'SPD', amount: 10, duration: 1 },
    ],
  },
  corrosive_poison: {
    id: 'corrosive_poison',
    name: '腐食の毒薬',
    category: 'ACTIVE',
    priority: 'NORMAL',
    targetType: 'SINGLE_ENEMY',
    description: 'MATの50％を攻撃値とした魔法攻撃を行う。対象に毒を付与する（3ターン）。',
    effects: [
      { type: 'MAGIC_ATTACK', multiplier: 0.5, scaleStat: 'MAT' },
      { type: 'APPLY_STATUS', status: 'poison', duration: 3 },
    ],
  },

  // === カウンター・罠カード ===
  parry_dagger: {
    id: 'parry_dagger',
    name: 'パリィダガー',
    category: 'COUNTER',
    priority: 'HIGH',
    targetType: 'SELF',
    description: 'このターン中、自身への物理攻撃を無効化する。無効化成功時、ATKの100％の物理攻撃で反撃する。',
    effects: [
      {
        type: 'PARRY_AND_REFLECT',
        damageType: 'PHYSICAL',
        reduceRate: 1.0,
        reflectRate: 0,
        counterAttack: { type: 'PHYSICAL', multiplier: 1.0 },
      },
    ],
  },
  mirror_coat: {
    id: 'mirror_coat',
    name: 'ミラーコート',
    category: 'COUNTER',
    priority: 'HIGH',
    targetType: 'SELF',
    description: 'このターン中、自身への魔法攻撃を無効化する。無効化成功時、MATの100％の魔法攻撃で反撃する。',
    effects: [
      {
        type: 'PARRY_AND_REFLECT',
        damageType: 'MAGIC',
        reduceRate: 1.0,
        reflectRate: 0,
        counterAttack: { type: 'MAGIC', multiplier: 1.0 },
      },
    ],
  },

  // ドラフト用ヒールパウダー (効果はデフォルトと同じ)
  draft_heal_powder: {
    id: 'draft_heal_powder',
    name: 'ヒールパウダー',
    category: 'HEAL',
    priority: 'NORMAL',
    targetType: 'SELF',
    description: 'HPを15回復する。回復量は最大HPを超えない。重傷時は半減。',
    effects: [
      { type: 'HEAL', amount: 15 },
    ],
  },
};

export interface CardStatContext {
  atk?: number;
  def?: number;
  mat?: number;
  mdf?: number;
  spd?: number;
  clt?: number;
  sld?: number;
  hp?: number;
  maxHp?: number;
}

/**
 * カードの説明文内の能力値参照（例: ATKの80%, 最大HPの20%）に、
 * 現在のプレイヤー能力値に基づいた実効数値を追記する。
 * 例: ATK 20のプレイヤーの場合、「ATKの80%の物理攻撃」→「ATKの80%(=16)の物理攻撃」
 */
export function formatCardDescription(
  description: string,
  stats?: CardStatContext | null
): string {
  if (!description) return '';
  // すでに (=...) が付与されている場合は一旦除去して最新の能力値で再計算可能にする
  const clean = description.replace(/[（\(]=[0-9.]+[）\)]/g, '');
  if (!stats) return clean;

  const regex = /(自身の)?(最大HP|減少HP|ATK|DEF|MAT|MDF|SPD|CLT|SLD|HP)の(\d+(?:\.\d+)?)([%％])/g;
  return clean.replace(regex, (match, prefix, stat, percent, symbol) => {
    let baseValue: number | undefined;
    switch (stat) {
      case 'ATK':
        baseValue = stats.atk;
        break;
      case 'DEF':
        baseValue = stats.def;
        break;
      case 'MAT':
        baseValue = stats.mat;
        break;
      case 'MDF':
        baseValue = stats.mdf;
        break;
      case 'SPD':
        baseValue = stats.spd;
        break;
      case 'CLT':
        baseValue = stats.clt;
        break;
      case 'SLD':
        baseValue = stats.sld;
        break;
      case '最大HP':
        baseValue = stats.maxHp ?? stats.hp;
        break;
      case '減少HP': {
        const max = stats.maxHp ?? stats.hp;
        const cur = stats.hp ?? max;
        if (max !== undefined && cur !== undefined) {
          baseValue = Math.max(0, max - cur);
        }
        break;
      }
      case 'HP':
        baseValue = stats.hp;
        break;
    }

    if (baseValue === undefined) {
      return match;
    }

    const calculated = baseValue * (parseFloat(percent) / 100);
    const rounded = Math.round(calculated * 100) / 100;
    return `${prefix ?? ''}${stat}の${percent}${symbol}(=${rounded})`;
  });
}

export function getCardDescription(
  card: CardDefinition,
  stats?: CardStatContext | null
): string {
  return formatCardDescription(card.description, stats);
}
