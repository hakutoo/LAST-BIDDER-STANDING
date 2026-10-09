import { calculateDamage } from './logic/damage';
import { calculateTurnGold } from './logic/gold';
import { resolveDraftBids } from './logic/draft';
import { resolveTurn, buildTurnResolutionSteps } from './logic/turnResolver';
import { createInitialPlayerState, applyRoleToPlayer } from './logic/playerInit';
import { GameEngine } from './logic/gameEngine';
import { formatCardDescription, getCardDescription, CARD_DEFINITIONS } from './data/cards';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✓ ${msg}`);
}

console.log('=== 1. ダメージ計算テスト ===');

// テスト1: 物理攻撃の基本計算 (ATK 20, DEF 5 => 15)
{
  const p1 = createInitialPlayerState('p1', 'P1', false);
  const p2 = createInitialPlayerState('p2', 'P2', false);
  p1.atk = 20;
  p2.def = 5;
  p2.sld = 0;

  const res = calculateDamage({
    attacker: p1,
    target: p2,
    damageType: 'PHYSICAL',
    rawMultiplier: 1.0,
  });
  assert(res.finalDamage === 15, `物理攻撃ダメージ期待値15、実際: ${res.finalDamage}`);
}

// テスト2: CLTは対象にSLDがある場合は発生しない
{
  const p1 = createInitialPlayerState('p1', 'P1', false);
  const p2 = createInitialPlayerState('p2', 'P2', false);
  p1.atk = 20;
  p1.clt = 100; // 100%クリティカル
  p2.def = 5;
  p2.sld = 10; // SLDあり

  const res = calculateDamage({
    attacker: p1,
    target: p2,
    damageType: 'PHYSICAL',
    rawMultiplier: 1.0,
  });
  assert(!res.isCritical, 'SLDが存在するためCLTは発生しない');
  assert(res.finalDamage === 15, `SLDありダメージ期待値15 (SLD: 10, HP: 5)、実際: ${res.finalDamage}`);
  assert(res.sldDamage === 10, 'SLDダメージ10');
  assert(res.hpDamage === 5, 'HPダメージ5');
}

// テスト3: バーサーカーの確定+3ダメージ (DEF無視加算)
{
  const p1 = createInitialPlayerState('p1', 'P1', false);
  applyRoleToPlayer(p1, 'berserker');
  p1.atk = 10;
  const p2 = createInitialPlayerState('p2', 'P2', false);
  p2.def = 20; // DEFがATKより大きい場合 (10 - 20 = 0 + 3 = 3)
  p2.sld = 0;

  const res = calculateDamage({
    attacker: p1,
    target: p2,
    damageType: 'PHYSICAL',
    rawMultiplier: 1.0,
  });
  assert(res.finalDamage === 3, `バーサーカー確定3ダメージ、実際: ${res.finalDamage}`);
}

// テスト4: メイジのスペルチャージ (1.75倍)
{
  const p1 = createInitialPlayerState('p1', 'P1', false);
  applyRoleToPlayer(p1, 'mage');
  p1.mat = 20;
  p1.buffs.push({ id: 'b1', type: 'SPELL_CHARGE', duration: -1 });

  const p2 = createInitialPlayerState('p2', 'P2', false);
  p2.mdf = 5;
  p2.sld = 0;

  // 20 * 1.0 * 1.75 = 35 - 5 = 30
  const res = calculateDamage({
    attacker: p1,
    target: p2,
    damageType: 'MAGIC',
    rawMultiplier: 1.0,
  });
  assert(res.finalDamage === 30, `スペルチャージ魔法ダメージ期待値30、実際: ${res.finalDamage}`);
}

// テスト5: イージスのSLD存在時20%軽減
{
  const p1 = createInitialPlayerState('p1', 'P1', false);
  p1.atk = 20;
  const p2 = createInitialPlayerState('p2', 'P2', false);
  applyRoleToPlayer(p2, 'aegis');
  p2.def = 0;
  p2.sld = 50;

  // 20 * (1 - 0.2) = 16
  const res = calculateDamage({
    attacker: p1,
    target: p2,
    damageType: 'PHYSICAL',
    rawMultiplier: 1.0,
  });
  assert(res.finalDamage === 16, `イージス軽減ダメージ期待値16、実際: ${res.finalDamage}`);
}

console.log('\n=== 2. G獲得計算テスト ===');
// 各要素を切り捨ててから足す:
// 基本給10 + 前ターン与ダメ(35)*0.1(3.5 => 3) + 利子(25)*0.1(2.5 => 2) + 減少HP(25)*0.1(2.5 => 2)
// 合計 = 10 + 3 + 2 + 2 = 17
{
  const p = createInitialPlayerState('p', 'P', false);
  p.maxHp = 100;
  p.hp = 75; // 減少HP 25
  p.g = 25; // 利子 2.5
  p.lastDamageDealt = 35; // ダメージボーナス 3.5

  const breakdown = calculateTurnGold(p);
  assert(breakdown.base === 10, `基本給期待値10、実際: ${breakdown.base}`);
  assert(breakdown.damageBonus === 3, `ダメージボーナス切り捨て期待値3、実際: ${breakdown.damageBonus}`);
  assert(breakdown.interest === 2, `利子切り捨て期待値2、実際: ${breakdown.interest}`);
  assert(breakdown.catchup === 2, `救済切り捨て期待値2、実際: ${breakdown.catchup}`);
  assert(breakdown.total === 17, `ターンG期待値17、実際: ${breakdown.total}`);
}

console.log('\n=== 3. ドラフト解決テスト ===');
// ステータスカード即時反映、最高額落札、手札上限破棄
{
  const p1 = createInitialPlayerState('p1', 'P1', false);
  p1.g = 20;
  const p2 = createInitialPlayerState('p2', 'P2', false);
  p2.g = 20;

  const draftPool = [
    { instanceId: 'c1', cardId: 'stat_small_atk' }, // ATK+2
    { instanceId: 'c2', cardId: 'heavy_blade' },
  ];

  const bids = {
    p1: { playerId: 'p1', bids: { c1: 5, c2: 3 } },
    p2: { playerId: 'p2', bids: { c1: 2, c2: 8 } },
  };

  const initAtk = p1.atk;
  const res = resolveDraftBids(draftPool, bids, { p1, p2 }, 1);
  const updatedP1 = res.updatedPlayers['p1'];
  const updatedP2 = res.updatedPlayers['p2'];

  assert(updatedP1.atk === initAtk + 2, 'P1がATK【小】を落札してATKが+2即時反映された');
  assert(updatedP1.g === 15, `P1のGが5消費されて15 (c2は落札失敗で返却)、実際: ${updatedP1.g}`);
  assert(updatedP2.g === 12, `P2のGが8消費されて12、実際: ${updatedP2.g}`);
  assert(updatedP2.hand.some(c => c.cardId === 'heavy_blade'), 'P2の手札にヘビーブレードが追加された');
}

// テスト3-2: ユニークカード購入（A: 18G, B: 25G）、手札追加、G消費、およびログ非公開の検証
{
  const p1 = createInitialPlayerState('p1', 'P1', false);
  applyRoleToPlayer(p1, 'juggernaut'); // uniqueCardAId: unique_juggernaut_a, uniqueCardBId: unique_juggernaut_b
  p1.g = 50;
  const initialHandCount = p1.hand.length;

  const bids = {
    p1: {
      playerId: 'p1',
      bids: {},
      uniquePurchases: ['unique_juggernaut_a', 'unique_juggernaut_b'],
    },
  };

  const res = resolveDraftBids([], bids, { p1 }, 1);
  const updatedP1 = res.updatedPlayers['p1'];

  // G消費: 50 - 18 - 25 = 7
  assert(updatedP1.g === 7, `P1のGがユニークA(18G)とB(25G)購入で43G消費され7Gになる、実際: ${updatedP1.g}`);
  assert(updatedP1.hand.length === initialHandCount + 2, `手札が2枚増加する、実際: ${updatedP1.hand.length}`);
  assert(
    updatedP1.hand.filter(c => c.cardId === 'unique_juggernaut_a').length === 2,
    '手札に初期所持分と合わせてユニークAが2枚存在する'
  );
  assert(
    updatedP1.hand.filter(c => c.cardId === 'unique_juggernaut_b').length === 2,
    '手札に初期所持分と合わせてユニークBが2枚存在する'
  );

  // ログ非公開の検証
  const hasShopLog = res.logs.some(l => l.text.includes('リジューブ・パワー') || l.text.includes('ヘビースタンプ') || l.text.includes('購入'));
  assert(!hasShopLog, 'ユニークカード購入履歴が全体ログに出力されていない（非公開要件を満たす）');
}

// テスト3-3: 確定ボタンを押していない選択状態（isConfirmed: false）でも、時間切れ時のドラフト解決で入札が正しく反映されることの検証
{
  const p1 = createInitialPlayerState('p1', 'P1', false);
  p1.g = 20;
  const draftPool = [
    { instanceId: 'c_test_1', cardId: 'stat_small_atk' },
  ];

  // p1は選択中（isConfirmed: false）のまま確定していない
  const bids = {
    p1: {
      playerId: 'p1',
      bids: { c_test_1: 7 },
      isConfirmed: false,
    },
  };

  const res = resolveDraftBids(draftPool, bids, { p1 }, 1);
  const updatedP1 = res.updatedPlayers['p1'];

  assert(updatedP1.g === 13, `未確定の選択中入札7Gが反映され、残額が13Gになる、実際: ${updatedP1.g}`);
  assert(updatedP1.atk === p1.atk + 2, '未確定の入札で落札したステータスカードのATKボーナスが反映される');
}

// テスト3-4: GameEngineでの未確定入札の保持と確定フローの検証
{
  const engine = new GameEngine('room1', 'host1', 'Host', () => {});
  engine.addPlayer('client1', 'Client');
  engine.startRoleSelect();
  engine.selectRole('host1', 'berserker');
  engine.selectRole('client1', 'mage');

  assert(engine.state.phase === 'DRAFT', 'ドラフトフェーズに移行');
  assert(engine.state.players['host1'].g === 10, `第1ターン開始時はG獲得を行わず初期Gのまま、実際: ${engine.state.players['host1'].g}`);
  assert(engine.state.players['client1'].g === 10, `第1ターン開始時はG獲得を行わず初期Gのまま、実際: ${engine.state.players['client1'].g}`);

  // client1が入札金額を選択中（isConfirmed: false）
  engine.submitDraftBid({
    playerId: 'client1',
    bids: { [engine.state.draftPool[0]?.instanceId || 'x']: 3 },
    isConfirmed: false,
  });

  // まだ確定していないのでドラフトフェーズは終了しない
  assert(engine.state.phase === 'DRAFT', '未確定の入札ではフェーズは終了しない');
  assert(engine.state.draftBids['client1']?.bids[engine.state.draftPool[0]?.instanceId || 'x'] === 3, 'ホスト側に未確定入札が保持されている');

  // host1とclient1が確定
  engine.submitDraftBid({
    playerId: 'host1',
    bids: {},
    isConfirmed: true,
  });
  assert(engine.state.phase === 'DRAFT', 'client1が未確定のためまだドラフトフェーズ');

  engine.submitDraftBid({
    playerId: 'client1',
    bids: { [engine.state.draftPool[0]?.instanceId || 'x']: 3 },
    isConfirmed: true,
  });
  assert(engine.state.phase === 'ACTION', '全員が確定したため即座にACTIONフェーズへ移行');
  engine.destroy();
}

console.log('\n=== 4. ターン解決・毒・サドンデステスト ===');
// 毒ダメージ6でHPが0になったら死亡
{
  const p1 = createInitialPlayerState('p1', 'P1', false);
  applyRoleToPlayer(p1, 'berserker');
  p1.hp = 5;
  p1.statuses.push({ type: 'poison', remainingTurns: 3 });

  const p2 = createInitialPlayerState('p2', 'P2', false);
  applyRoleToPlayer(p2, 'sentinel');
  p2.hp = 50;

  const res = resolveTurn({ p1, p2 }, {}, 1);
  assert(!res.updatedPlayers['p1'].isAlive, 'P1は毒で倒れた');
  assert(res.winnerId === 'p2', 'P2が勝利');
}

// 最後の2人が同時に倒れた場合は引き分け (DRAW)
{
  const p1 = createInitialPlayerState('p1', 'P1', false);
  p1.hp = 5;
  p1.statuses.push({ type: 'poison', remainingTurns: 3 });

  const p2 = createInitialPlayerState('p2', 'P2', false);
  p2.hp = 5;
  p2.statuses.push({ type: 'poison', remainingTurns: 3 });

  const res = resolveTurn({ p1, p2 }, {}, 1);
  assert(!res.updatedPlayers['p1'].isAlive && !res.updatedPlayers['p2'].isAlive, '両者死亡');
  assert(res.winnerId === 'DRAW', '引き分け判定が正常に動作');
}

console.log('\n=== 5. 試合強制終了テスト ===');
{
  const engine = new GameEngine('room1', 'host1', 'Host', () => {});
  engine.addPlayer('client1', 'Client1');
  engine.startRoleSelect();
  assert(engine.state.phase === 'ROLE_SELECT', 'ロール選択フェーズ');
  engine.forceEndGame();
  assert(engine.state.phase === 'GAME_OVER', '強制終了後にGAME_OVERフェーズへ移行');
  assert(engine.state.winnerId === 'FORCE_QUIT', 'winnerIdがFORCE_QUITに設定される');
  assert(engine.state.phaseDeadline === null, 'phaseDeadlineがnullにリセットされる');
  engine.destroy();
}

console.log('\n=== 6. 公開ステータス増減ログテスト ===');
// ドラフト時のステータスカード落札ログテスト
{
  const p1 = createInitialPlayerState('p1', 'P1', false);
  p1.atk = 10;
  p1.g = 20;

  const draftPool = [{ instanceId: 'c1', cardId: 'stat_small_atk' }];
  const bids = { p1: { playerId: 'p1', bids: { c1: 5 } } };

  const res = resolveDraftBids(draftPool, bids, { p1 }, 1);
  const log = res.logs.find(l => l.text.includes('【ステータス反映】'));
  assert(!!log, 'ステータス反映ログが存在する');
  assert(log!.text.includes('(10 → 12)'), `ATK変動前後の数値(10 → 12)が含まれている、実際: ${log!.text}`);
}

// ターン解決時のステータス増減ログテスト (鋼のビルドアップ、バフ、回復、バフ解除)
{
  const sentinel = createInitialPlayerState('p1', 'Sentinel', false);
  applyRoleToPlayer(sentinel, 'sentinel'); // def: 10
  sentinel.hp = 80; // 回復テスト用
  sentinel.maxHp = 100;
  sentinel.sld = 0;

  const attacker = createInitialPlayerState('p2', 'Attacker', false);
  attacker.atk = 15;
  attacker.hand = [{ instanceId: 'a1', cardId: 'normal_attack' }]; // 物理攻撃

  // 1ターン目: 攻撃を受けて鋼のビルドアップ発動 (DEF 10 → 12)
  const res = resolveTurn(
    { p1: sentinel, p2: attacker },
    { p2: { playerId: 'p2', cardInstanceId: 'a1', targetPlayerId: 'p1' } },
    1
  );

  const buildupLog = res.logs.find(l => l.text.includes('【鋼のビルドアップ】'));
  assert(!!buildupLog, '鋼のビルドアップログが存在する');
  assert(buildupLog!.text.includes('(14 → 16)'), `DEF変動前後の数値(14 → 16)が含まれている、実際: ${buildupLog!.text}`);
}

// バフ付与とバフ解除のログテスト
{
  const p1 = createInitialPlayerState('p1', 'P1', false);
  p1.mdf = 5;
  p1.hand = [{ instanceId: 'c1', cardId: 'unique_mage_a' }]; // MDF+10 (このターン中)

  const res = resolveTurn(
    { p1 },
    { p1: { playerId: 'p1', cardInstanceId: 'c1', targetPlayerId: 'p1' } },
    1
  );

  const buffLog = res.logs.find(l => l.text.includes('MDF が 10 増加した'));
  assert(!!buffLog, 'MDFバフ付与ログが存在する');
  assert(buffLog!.text.includes('(5 → 15)'), `MDF増加変動前後の数値(5 → 15)が含まれている、実際: ${buffLog!.text}`);

  const expireLog = res.logs.find(l => l.text.includes('MDF 強化が終了した'));
  assert(!!expireLog, 'MDFバフ終了ログが存在する');
  assert(expireLog!.text.includes('(15 → 5)'), `MDF減少変動前後の数値(15 → 5)が含まれている、実際: ${expireLog!.text}`);
}

// 回復時のログテスト
{
  const p1 = createInitialPlayerState('p1', 'P1', false);
  p1.hp = 50;
  p1.maxHp = 100;
  p1.hand = [{ instanceId: 'h1', cardId: 'heal_powder' }]; // HP15回復

  const res = resolveTurn(
    { p1 },
    { p1: { playerId: 'p1', cardInstanceId: 'h1', targetPlayerId: 'p1' } },
    1
  );

  const healLog = res.logs.find(l => l.type === 'heal' && l.text.includes('回復した'));
  assert(!!healLog, '回復ログが存在する');
  assert(healLog!.text.includes('(HP: 50 → 65/100)'), `回復時のHP変動前後の数値(HP: 50 → 65/100)が含まれている、実際: ${healLog!.text}`);
}

console.log('\n=== 7. ステップバイステップ演出イベント生成テスト ===');
{
  const p1 = createInitialPlayerState('p1', 'P1', false);
  const p2 = createInitialPlayerState('p2', 'P2', false);
  p1.atk = 20;
  p1.spd = 20;
  p2.def = 5;
  p2.spd = 5;
  p2.hp = 20;
  p1.hand = [{ instanceId: 'atk1', cardId: 'normal_attack' }]; // 物理攻撃 0.5倍 (20 * 0.5 - 5 = 5)

  const steps = buildTurnResolutionSteps(
    { p1, p2 },
    { p1: { playerId: 'p1', cardInstanceId: 'atk1', targetPlayerId: 'p2' } },
    1
  );

  assert(steps.length >= 2, `ステップが複数（行動開始と命中）に分割されている: ${steps.length} steps`);
  
  // 第1ステップ: ACTION_START (カード使用)
  assert(steps[0].event.type === 'ACTION_START', `第1ステップはACTION_START, 実際: ${steps[0].event.type}`);
  assert(steps[0].event.actorId === 'p1', '行動者はp1');
  assert(steps[0].event.cardId === 'normal_attack', '使用カードはnormal_attack');
  assert(steps[0].log.text.includes('使用した'), 'ログに「使用した」が含まれる');

  // 第2ステップ: ATTACK_HIT (命中・ダメージ)
  const hitStep = steps.find(s => s.event.type === 'ATTACK_HIT');
  assert(!!hitStep, 'ATTACK_HITステップが存在する');
  assert(hitStep!.event.damage === 5, `ダメージは5、実際: ${hitStep!.event.damage}`);
  assert(hitStep!.updatedPlayers.p2.hp === 15, `ダメージ後のp2 HPは15、実際: ${hitStep!.updatedPlayers.p2.hp}`);

  // 全ステップのログが順次記録されている
  const allLogs = steps.map(s => s.log);
  assert(allLogs.length === steps.length, '各ステップに対応するログが存在する');
}

console.log('\n=== 8. カードテキスト能力値実数値表示テスト ===');
{
  // テスト1: ユーザー要望の例（ATK20の人が「ATKの80%の物理攻撃」を入手する時「ATKの80%(=16)の物理攻撃」）
  const desc1 = formatCardDescription('ATKの80%の物理攻撃', { atk: 20 });
  assert(desc1 === 'ATKの80%(=16)の物理攻撃', `期待値「ATKの80%(=16)の物理攻撃」、実際: ${desc1}`);

  // テスト2: 全角％表記（通常攻撃: ATKの50％を攻撃値とした物理攻撃を行う。使用後は消費される。）
  const desc2 = formatCardDescription(CARD_DEFINITIONS.normal_attack.description, { atk: 20 });
  assert(desc2.includes('ATKの50％(=10)'), `全角％の置換期待値「ATKの50％(=10)」、実際: ${desc2}`);

  // テスト3: DEF参照（リベンジ: DEFの120％を攻撃値とした物理攻撃を行う。）
  const desc3 = formatCardDescription(CARD_DEFINITIONS.unique_sentinel_b.description, { def: 16 });
  assert(desc3.includes('DEFの120％(=19.2)'), `DEF参照の置換期待値「DEFの120％(=19.2)」、実際: ${desc3}`);

  // テスト4: 最大HP参照（ヘビースタンプ: 自身の最大HPの20％の物理攻撃を行う）
  const desc4 = formatCardDescription(CARD_DEFINITIONS.unique_juggernaut_b.description, { maxHp: 120, hp: 120 });
  assert(desc4.includes('最大HPの20％(=24)'), `最大HP参照の置換期待値「最大HPの20％(=24)」、実際: ${desc4}`);

  // テスト5: 減少HP参照（リジューブ・パワー: 自身の減少HPの30％を即座に回復する。）
  const desc5 = formatCardDescription(CARD_DEFINITIONS.unique_juggernaut_a.description, { maxHp: 100, hp: 70 });
  assert(desc5.includes('減少HPの30％(=9)'), `減少HP参照の置換期待値「減少HPの30％(=9)」、実際: ${desc5}`);

  // テスト6: MAT/MDF参照
  const desc6 = formatCardDescription('MATの100％を攻撃値とした魔法攻撃を行う。', { mat: 15 });
  assert(desc6.includes('MATの100％(=15)'), `MAT参照の置換期待値「MATの100％(=15)」、実際: ${desc6}`);

  // テスト7: 能力値以外の％表記（ダメージ軽減やCLT増加、状態異常など）は誤置換されないこと
  const desc7 = formatCardDescription('受けるダメージを50％軽減し、軽減したダメージを反射する。CLTを10％増加させる。', { atk: 20, def: 20 });
  assert(desc7 === '受けるダメージを50％軽減し、軽減したダメージを反射する。CLTを10％増加させる。', `非能力値％が保持されること、実際: ${desc7}`);

  // テスト8: statsが未指定の場合は変更されないこと
  const desc8 = formatCardDescription('ATKの80%の物理攻撃', null);
  assert(desc8 === 'ATKの80%の物理攻撃', `statsなし時は変更なし、実際: ${desc8}`);

  // テスト9: 既に(=16)が付与されたテキストに新しいステータス(ATK 25)を渡した際に正しく(=20)に再計算されること
  const desc9 = formatCardDescription('ATKの80%(=16)の物理攻撃', { atk: 25 });
  assert(desc9 === 'ATKの80%(=20)の物理攻撃', `再計算期待値「ATKの80%(=20)の物理攻撃」、実際: ${desc9}`);

  // テスト10: getCardDescriptionヘルパーの動作確認
  const desc10 = getCardDescription(CARD_DEFINITIONS.heavy_blade, { atk: 20 });
  assert(desc10.includes('ATKの120％(=24)'), `getCardDescriptionの期待値「ATKの120％(=24)」、実際: ${desc10}`);
}

console.log('\n全テストが正常に通過しました！');
