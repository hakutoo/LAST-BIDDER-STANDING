export type PassiveType = 
  | 'JUGGERNAUT_PASSIVE'
  | 'BERSERKER_PASSIVE'
  | 'SENTINEL_PASSIVE'
  | 'MAGE_PASSIVE'
  | 'INQUISITOR_PASSIVE'
  | 'SPEEDSTAR_PASSIVE'
  | 'ASSASSIN_PASSIVE'
  | 'AEGIS_PASSIVE';

export interface InitialStats {
  hp: number;
  atk: number;
  def: number;
  mat: number;
  mdf: number;
  spd: number;
  clt?: number;
  sld?: number;
}

export interface RoleDefinition {
  id: string;
  name: string;
  passiveName: string;
  passiveDescription: string;
  passiveType: PassiveType;
  initialStats: InitialStats;
  uniqueCardAId: string;
  uniqueCardBId: string;
  /** キャラクターごとのユニークカード購入価格（G）。全ロールで個別に設定する。 */
  uniqueCardPrices: {
    a: number;
    b: number;
  };
}
