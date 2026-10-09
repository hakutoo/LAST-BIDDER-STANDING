import type { CardCategory } from '../types/cards';

export interface DraftCategoryWeight {
  category: CardCategory;
  weight: number;
}

export const DRAFT_CATEGORY_POOLS: { [key in CardCategory]?: string[] } = {
  STATUS_SMALL: [
    'stat_small_hp',
    'stat_small_atk',
    'stat_small_def',
    'stat_small_mat',
    'stat_small_mdf',
    'stat_small_spd',
    'stat_small_clt',
    'stat_small_sld',
  ],
  STATUS_MEDIUM: [
    'stat_med_hp',
    'stat_med_atk',
    'stat_med_def',
    'stat_med_mat',
    'stat_med_mdf',
    'stat_med_spd',
    'stat_med_clt',
    'stat_med_sld',
  ],
  STATUS_LARGE: [
    'stat_large_hp',
    'stat_large_atk',
    'stat_large_def',
    'stat_large_mat',
    'stat_large_mdf',
    'stat_large_spd',
    'stat_large_clt',
    'stat_large_sld',
  ],
  ACTIVE: [
    'heavy_blade',
    'snake_fang',
    'lightning',
    'life_ritual',
    'iron_wall',
    'mind_shell',
    'death_brand',
    'feather_step',
    'corrosive_poison',
  ],
  COUNTER: [
    'parry_dagger',
    'mirror_coat',
  ],
  HEAL: [
    'draft_heal_powder',
  ],
};

export function getDraftWeights(turn: number): DraftCategoryWeight[] {
  if (turn <= 5) {
    return [
      { category: 'STATUS_SMALL', weight: 35 },
      { category: 'STATUS_MEDIUM', weight: 15 },
      { category: 'STATUS_LARGE', weight: 5 },
      { category: 'ACTIVE', weight: 25 },
      { category: 'COUNTER', weight: 10 },
      { category: 'HEAL', weight: 10 },
    ];
  } else if (turn <= 10) {
    return [
      { category: 'STATUS_SMALL', weight: 20 },
      { category: 'STATUS_MEDIUM', weight: 30 },
      { category: 'STATUS_LARGE', weight: 10 },
      { category: 'ACTIVE', weight: 20 },
      { category: 'COUNTER', weight: 10 },
      { category: 'HEAL', weight: 10 },
    ];
  } else {
    return [
      { category: 'STATUS_SMALL', weight: 5 },
      { category: 'STATUS_MEDIUM', weight: 20 },
      { category: 'STATUS_LARGE', weight: 25 },
      { category: 'ACTIVE', weight: 25 },
      { category: 'COUNTER', weight: 15 },
      { category: 'HEAL', weight: 10 },
    ];
  }
}
