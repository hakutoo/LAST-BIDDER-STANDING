import type { CardDefinition } from '../types/cards';
import type { GameLogEntry, PlayerAction, PlayerState, BattleEvent } from '../types/game';
import { CARD_DEFINITIONS } from '../data/cards';
import { calculateDamage } from './damage';
import { GAME_CONFIG } from '../data/constants';

export interface TurnResolveResult {
  updatedPlayers: { [id: string]: PlayerState };
  logs: GameLogEntry[];
  winnerId: string | null | 'DRAW';
}

export interface TurnResolutionStep {
  event: BattleEvent;
  log: GameLogEntry;
  updatedPlayers: { [id: string]: PlayerState };
  winnerId: string | null | 'DRAW';
}

interface ActionQueueItem {
  playerId: string;
  cardDef: CardDefinition | null; // null は「何もしない」
  cardInstanceId: string | null;
  targetPlayerId: string | null;
  priority: 'HIGH' | 'NORMAL';
  effectiveSpd: number;
  randomTieBreaker: number;
  isSpeedstarSecond?: boolean; // スピードスターの2回目発動
}

function pushStep(
  steps: TurnResolutionStep[],
  players: { [id: string]: PlayerState },
  log: GameLogEntry,
  event: BattleEvent,
  checkWinner: boolean = false
) {
  let winnerId: string | null | 'DRAW' = null;
  if (checkWinner) {
    const alivePlayers = Object.values(players).filter(p => p.isAlive);
    if (alivePlayers.length === 0) {
      winnerId = 'DRAW';
    } else if (alivePlayers.length === 1 && Object.keys(players).length > 1) {
      winnerId = alivePlayers[0].id;
    }
  }

  steps.push({
    event,
    log,
    updatedPlayers: JSON.parse(JSON.stringify(players)),
    winnerId,
  });
}

export function buildTurnResolutionSteps(
  players: { [id: string]: PlayerState },
  actions: { [playerId: string]: PlayerAction },
  turn: number
): TurnResolutionStep[] {
  const updatedPlayers: { [id: string]: PlayerState } = JSON.parse(JSON.stringify(players));
  const steps: TurnResolutionStep[] = [];

  // 各プレイヤーのこのターンの与ダメージ記録をリセット
  for (const p of Object.values(updatedPlayers)) {
    p.lastDamageDealt = 0;
  }

  // 1. 各プレイヤーのアクションからキューを作成
  const queue: ActionQueueItem[] = [];

  for (const playerId of Object.keys(updatedPlayers)) {
    const player = updatedPlayers[playerId];
    if (!player.isAlive) continue;

    const action = actions[playerId];
    let cardDef: CardDefinition | null = null;
    let cardInstanceId: string | null = null;

    if (action && action.cardInstanceId) {
      const handIndex = player.hand.findIndex(c => c.instanceId === action.cardInstanceId);
      if (handIndex !== -1) {
        cardInstanceId = action.cardInstanceId;
        cardDef = CARD_DEFINITIONS[player.hand[handIndex].cardId] || null;
      }
    }

    const priority = cardDef?.priority || 'NORMAL';
    const effectiveSpd = player.spd;
    const randomTieBreaker = Math.random();

    queue.push({
      playerId,
      cardDef,
      cardInstanceId,
      targetPlayerId: action?.targetPlayerId || null,
      priority,
      effectiveSpd,
      randomTieBreaker,
    });

    // スピードスター「刹那の二連」: 優先度高のカードを使用した場合、2回発動
    if (player.roleId === 'speedstar' && cardDef && priority === 'HIGH') {
      queue.push({
        playerId,
        cardDef,
        cardInstanceId,
        targetPlayerId: action?.targetPlayerId || null,
        priority,
        effectiveSpd,
        randomTieBreaker: randomTieBreaker + 0.0001, // 1回目の直後に連続発動
        isSpeedstarSecond: true,
      });
    }
  }

  // 行動順ソート:
  // 1. 優先度 HIGH が先
  // 2. SPD の降順
  // 3. SPD同値は randomTieBreaker
  queue.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority === 'HIGH' ? -1 : 1;
    }
    if (a.effectiveSpd !== b.effectiveSpd) {
      return b.effectiveSpd - a.effectiveSpd;
    }
    return a.randomTieBreaker - b.randomTieBreaker;
  });

  // 2. 行動キューを順番に実行
  for (const item of queue) {
    const actor = updatedPlayers[item.playerId];
    if (!actor || !actor.isAlive) {
      // 既に行動前に死亡しているプレイヤーは行動しない
      continue;
    }

    if (!item.cardDef) {
      // 何もしない または 手札0スキップ
      const logText = `${actor.name} は何もしなかった。`;
      pushStep(
        steps,
        updatedPlayers,
        {
          id: `turn_log_${Math.random()}`,
          turn,
          text: logText,
          type: 'info',
        },
        {
          id: `event_${Math.random()}`,
          type: 'ACTION_WAIT',
          actorId: actor.id,
          actorName: actor.name,
          title: '何もしない',
          description: logText,
        }
      );
      continue;
    }

    const cardDef = item.cardDef;

    // 手札から消費 (スピードスターの2回目はカード自体はすでに消費済みなので手札消費しない)
    if (!item.isSpeedstarSecond && item.cardInstanceId) {
      const idx = actor.hand.findIndex(c => c.instanceId === item.cardInstanceId);
      if (idx !== -1) {
        actor.hand.splice(idx, 1);
      }
      actor.lastUsedCardId = cardDef.id;
    }

    // ターゲットの検証
    let target: PlayerState | null = null;
    if (cardDef.targetType === 'SELF') {
      target = actor;
    } else if (cardDef.targetType === 'SINGLE_ENEMY') {
      if (item.targetPlayerId && updatedPlayers[item.targetPlayerId]) {
        target = updatedPlayers[item.targetPlayerId];
      }
    }

    const actionTitle = item.isSpeedstarSecond ? '刹那の二連' : 'カード使用';
    const actionDesc = item.isSpeedstarSecond
      ? `【刹那の二連】${actor.name} の「${cardDef.name}」が連続発動！`
      : `${actor.name} は「${cardDef.name}」を使用した！`;

    pushStep(
      steps,
      updatedPlayers,
      {
        id: `turn_log_${Math.random()}`,
        turn,
        text: actionDesc,
        type: 'info',
      },
      {
        id: `event_${Math.random()}`,
        type: 'ACTION_START',
        actorId: actor.id,
        actorName: actor.name,
        targetId: target?.id,
        targetName: target?.name,
        cardId: cardDef.id,
        cardName: cardDef.name,
        title: actionTitle,
        description: actionDesc,
      }
    );

    // ターゲットが既に死亡している場合、カードは不発
    if (cardDef.targetType === 'SINGLE_ENEMY' && (!target || !target.isAlive)) {
      const failText = `対象はすでに倒れていたため、「${cardDef.name}」は不発となった。`;
      pushStep(
        steps,
        updatedPlayers,
        {
          id: `turn_log_${Math.random()}`,
          turn,
          text: failText,
          type: 'info',
        },
        {
          id: `event_${Math.random()}`,
          type: 'ACTION_WAIT',
          actorId: actor.id,
          actorName: actor.name,
          cardId: cardDef.id,
          cardName: cardDef.name,
          title: '不発',
          description: failText,
        }
      );
      continue;
    }

    // カード効果の処理
    let selfDamage = 0;

    for (const effect of cardDef.effects) {
      if (effect.type === 'PHYSICAL_ATTACK' || effect.type === 'MAGIC_ATTACK') {
        if (!target) continue;

        const isPhysical = effect.type === 'PHYSICAL_ATTACK';
        const hits = isPhysical ? (effect.hits || 1) : 1;

        for (let h = 0; h < hits; h++) {
          if (!target.isAlive || !actor.isAlive) break;

          let consumeSldValue = 0;
          if (effect.type === 'PHYSICAL_ATTACK' && effect.consumeSldRate) {
            consumeSldValue = actor.sld;
            actor.sld = 0; // シールドクラッシュでSLD全消費
          }

          // リベンジの場合、ATKではなくDEFの120%
          let overrideMultiplier = effect.multiplier;
          let baseStatOverrideAtk: number | undefined = undefined;
          if (cardDef.id === 'unique_sentinel_b') {
            baseStatOverrideAtk = actor.def;
          }

          const dmgRes = calculateDamage({
            attacker: baseStatOverrideAtk !== undefined ? { ...actor, atk: baseStatOverrideAtk } : actor,
            target,
            damageType: isPhysical ? 'PHYSICAL' : 'MAGIC',
            rawMultiplier: overrideMultiplier,
            scaleStatOverride: effect.type === 'MAGIC_ATTACK' ? effect.scaleStat : undefined,
            consumeSld: consumeSldValue,
            tempCltBonus: 0,
            sldBonusMultiplier: effect.type === 'MAGIC_ATTACK' ? effect.sldBonusMultiplier : undefined,
          });

          // メイジのスペルチャージ消費
          if (dmgRes.spellChargeUsed) {
            actor.buffs = actor.buffs.filter(b => b.type !== 'SPELL_CHARGE');
          }

          if (dmgRes.isEvaded) {
            const evMsg = `${target.name} は ${actor.name} の攻撃を回避した！`;
            pushStep(
              steps,
              updatedPlayers,
              {
                id: `turn_log_${Math.random()}`,
                turn,
                text: evMsg,
                type: 'info',
              },
              {
                id: `event_${Math.random()}`,
                type: 'ATTACK_EVADED',
                actorId: actor.id,
                actorName: actor.name,
                targetId: target.id,
                targetName: target.name,
                cardId: cardDef.id,
                cardName: cardDef.name,
                title: '回避！',
                description: evMsg,
              }
            );
            continue;
          }

          if (dmgRes.isParried) {
            const parryMsg = `${target.name} は攻撃を受け流し無効化した！`;
            pushStep(
              steps,
              updatedPlayers,
              {
                id: `turn_log_${Math.random()}`,
                turn,
                text: parryMsg,
                type: 'info',
              },
              {
                id: `event_${Math.random()}`,
                type: 'ATTACK_PARRIED',
                actorId: actor.id,
                actorName: actor.name,
                targetId: target.id,
                targetName: target.name,
                cardId: cardDef.id,
                cardName: cardDef.name,
                title: 'パリィ！',
                description: parryMsg,
              }
            );

            // 反射ダメージがある場合 (アンチ・マギ / パリィ・スタンス)
            if (dmgRes.reflectedDamage > 0) {
              applyDirectDamage(actor, dmgRes.reflectedDamage, steps, updatedPlayers, turn, `${target.name} からの反射`);
            }

            // 反撃がある場合 (パリィダガー / ミラーコート)
            if (dmgRes.counterAttackType && dmgRes.counterMultiplier) {
              const counterDmgRes = calculateDamage({
                attacker: target,
                target: actor,
                damageType: dmgRes.counterAttackType,
                rawMultiplier: dmgRes.counterMultiplier,
              });

              if (!counterDmgRes.isEvaded) {
                target.lastDamageDealt += counterDmgRes.finalDamage;
                actor.hp = Math.max(0, actor.hp - counterDmgRes.hpDamage);
                actor.sld = Math.max(0, actor.sld - counterDmgRes.sldDamage);

                const counterHitMsg = `【カウンター】${target.name} の反撃！ ${actor.name} に ${counterDmgRes.finalDamage} ダメージ (HP: -${counterDmgRes.hpDamage}, SLD: -${counterDmgRes.sldDamage})`;
                pushStep(
                  steps,
                  updatedPlayers,
                  {
                    id: `turn_log_${Math.random()}`,
                    turn,
                    text: counterHitMsg,
                    type: 'damage',
                  },
                  {
                    id: `event_${Math.random()}`,
                    type: 'COUNTER_ATTACK',
                    actorId: target.id,
                    actorName: target.name,
                    targetId: actor.id,
                    targetName: actor.name,
                    damage: counterDmgRes.finalDamage,
                    hpDamage: counterDmgRes.hpDamage,
                    sldDamage: counterDmgRes.sldDamage,
                    isCritical: counterDmgRes.isCritical,
                    title: '反撃！',
                    description: counterHitMsg,
                  }
                );
                checkDeath(actor, steps, updatedPlayers, turn);
              }
            }
            continue;
          }

          // 通常ヒット
          if (dmgRes.reflectedDamage > 0) {
            // パリィ・スタンスの50%反射
            applyDirectDamage(actor, dmgRes.reflectedDamage, steps, updatedPlayers, turn, `${target.name} のパリィ反射`);
          }

          actor.lastDamageDealt += dmgRes.finalDamage;
          target.hp = Math.max(0, target.hp - dmgRes.hpDamage);
          target.sld = Math.max(0, target.sld - dmgRes.sldDamage);

          let hitMsg = `${actor.name} の攻撃！ ${target.name} に ${dmgRes.finalDamage} ダメージ (HP: -${dmgRes.hpDamage}, SLD: -${dmgRes.sldDamage})`;
          if (dmgRes.isCritical) {
            hitMsg = `【痛恨の一撃！】` + hitMsg;
          }

          pushStep(
            steps,
            updatedPlayers,
            {
              id: `turn_log_${Math.random()}`,
              turn,
              text: hitMsg,
              type: 'damage',
            },
            {
              id: `event_${Math.random()}`,
              type: 'ATTACK_HIT',
              actorId: actor.id,
              actorName: actor.name,
              targetId: target.id,
              targetName: target.name,
              cardId: cardDef.id,
              cardName: cardDef.name,
              damage: dmgRes.finalDamage,
              hpDamage: dmgRes.hpDamage,
              sldDamage: dmgRes.sldDamage,
              isCritical: dmgRes.isCritical,
              title: dmgRes.isCritical ? '会心の一撃！' : '命中！',
              description: hitMsg,
            }
          );

          // センチネル パッシブ「鋼のビルドアップ」: 物理攻撃を受けるたびにDEF+2
          if (isPhysical && target.roleId === 'sentinel') {
            const prevDef = target.def;
            target.def += GAME_CONFIG.SENTINEL_DEF_GAIN;
            const passiveMsg = `【鋼のビルドアップ】${target.name} のDEFが 2 上昇した！ (${prevDef} → ${target.def})`;
            pushStep(
              steps,
              updatedPlayers,
              {
                id: `turn_log_${Math.random()}`,
                turn,
                text: passiveMsg,
                type: 'status',
              },
              {
                id: `event_${Math.random()}`,
                type: 'PASSIVE',
                actorId: target.id,
                actorName: target.name,
                title: 'パッシブ発動',
                description: passiveMsg,
              }
            );
          }

          // インクイジター パッシブ「魔力捕食」: 魔法攻撃でダメージを受けた場合、受けたダメージの50％最大HP増加＆回復
          if (dmgRes.inquisitorHealAmount > 0) {
            const prevMaxHp = target.maxHp;
            const prevHp = target.hp;
            target.maxHp += dmgRes.inquisitorHealAmount;
            target.hp = Math.min(target.maxHp, target.hp + dmgRes.inquisitorHealAmount);
            const inqMsg = `【魔力捕食】${target.name} は魔力を吸収し、最大HPとHPが ${dmgRes.inquisitorHealAmount} 増加した！ (最大HP: ${prevMaxHp} → ${target.maxHp}, HP: ${prevHp} → ${target.hp})`;
            pushStep(
              steps,
              updatedPlayers,
              {
                id: `turn_log_${Math.random()}`,
                turn,
                text: inqMsg,
                type: 'heal',
              },
              {
                id: `event_${Math.random()}`,
                type: 'PASSIVE',
                actorId: target.id,
                actorName: target.name,
                healAmount: dmgRes.inquisitorHealAmount,
                title: 'パッシブ発動',
                description: inqMsg,
              }
            );
          }

          // 救命の儀式: 与えた最終ダメージの100%自身回復
          if (effect.type === 'MAGIC_ATTACK' && effect.drainPercent && dmgRes.finalDamage > 0) {
            const drainAmount = Math.floor(dmgRes.finalDamage * (effect.drainPercent / 100));
            applyHeal(actor, drainAmount, steps, updatedPlayers, turn);
          }

          checkDeath(target, steps, updatedPlayers, turn);
        }
      } else if (effect.type === 'HEAL') {
        let healAmount = effect.amount;
        if (effect.isPercentMissingHp) {
          const missing = Math.max(0, actor.maxHp - actor.hp);
          healAmount = Math.floor(missing * (effect.amount / 100));
        }
        applyHeal(actor, healAmount, steps, updatedPlayers, turn);
      } else if (effect.type === 'ADD_MAX_HP') {
        const prevMaxHp = actor.maxHp;
        const prevHp = actor.hp;
        actor.maxHp += effect.amount;
        actor.hp = Math.min(actor.maxHp, actor.hp + effect.amount);
        const maxHpMsg = `${actor.name} の最大HPとHPが ${effect.amount} 増加した！ (最大HP: ${prevMaxHp} → ${actor.maxHp}, HP: ${prevHp} → ${actor.hp})`;
        pushStep(
          steps,
          updatedPlayers,
          {
            id: `turn_log_${Math.random()}`,
            turn,
            text: maxHpMsg,
            type: 'heal',
          },
          {
            id: `event_${Math.random()}`,
            type: 'BUFF',
            actorId: actor.id,
            actorName: actor.name,
            healAmount: effect.amount,
            title: '最大HP増加',
            description: maxHpMsg,
          }
        );

        // ヘビースタンプ: 最大HPの20%を攻撃値として物理攻撃
        if (effect.physicalAttackMaxHpPercent && target && target.id !== actor.id && target.isAlive) {
          const stampAtk = actor.maxHp * effect.physicalAttackMaxHpPercent;
          const dmgRes = calculateDamage({
            attacker: { ...actor, atk: stampAtk },
            target,
            damageType: 'PHYSICAL',
            rawMultiplier: 1.0,
          });

          if (dmgRes.isEvaded) {
            const evMsg = `${target.name} はヘビースタンプを回避した！`;
            pushStep(
              steps,
              updatedPlayers,
              {
                id: `turn_log_${Math.random()}`,
                turn,
                text: evMsg,
                type: 'info',
              },
              {
                id: `event_${Math.random()}`,
                type: 'ATTACK_EVADED',
                actorId: actor.id,
                actorName: actor.name,
                targetId: target.id,
                targetName: target.name,
                cardId: cardDef.id,
                cardName: cardDef.name,
                title: '回避！',
                description: evMsg,
              }
            );
          } else {
            actor.lastDamageDealt += dmgRes.finalDamage;
            target.hp = Math.max(0, target.hp - dmgRes.hpDamage);
            target.sld = Math.max(0, target.sld - dmgRes.sldDamage);
            const stampMsg = `${actor.name} のヘビースタンプ！ ${target.name} に ${dmgRes.finalDamage} ダメージ！`;
            pushStep(
              steps,
              updatedPlayers,
              {
                id: `turn_log_${Math.random()}`,
                turn,
                text: stampMsg,
                type: 'damage',
              },
              {
                id: `event_${Math.random()}`,
                type: 'ATTACK_HIT',
                actorId: actor.id,
                actorName: actor.name,
                targetId: target.id,
                targetName: target.name,
                cardId: cardDef.id,
                cardName: cardDef.name,
                damage: dmgRes.finalDamage,
                hpDamage: dmgRes.hpDamage,
                sldDamage: dmgRes.sldDamage,
                title: 'ヘビースタンプ',
                description: stampMsg,
              }
            );
            checkDeath(target, steps, updatedPlayers, turn);
          }
        }
      } else if (effect.type === 'ADD_SLD') {
        const prevSld = actor.sld;
        const addedSld = Math.min(actor.maxHp - actor.sld, effect.amount);
        actor.sld = Math.min(actor.maxHp, actor.sld + addedSld);
        const sldMsg = `${actor.name} のシールドが ${addedSld} 増加した。(${prevSld} → ${actor.sld})`;
        pushStep(
          steps,
          updatedPlayers,
          {
            id: `turn_log_${Math.random()}`,
            turn,
            text: sldMsg,
            type: 'status',
          },
          {
            id: `event_${Math.random()}`,
            type: 'BUFF',
            actorId: actor.id,
            actorName: actor.name,
            title: 'シールド獲得',
            description: sldMsg,
          }
        );
      } else if (effect.type === 'CLEAR_TARGET_SLD') {
        if (target) {
          const prevSld = target.sld;
          target.sld = 0;
          const clearSldMsg = `【毒蛇の牙】${target.name} のSLDが 0 になった！ (${prevSld} → 0)`;
          pushStep(
            steps,
            updatedPlayers,
            {
              id: `turn_log_${Math.random()}`,
              turn,
              text: clearSldMsg,
              type: 'status',
            },
            {
              id: `event_${Math.random()}`,
              type: 'BUFF',
              actorId: actor.id,
              actorName: actor.name,
              targetId: target.id,
              targetName: target.name,
              title: 'シールド破壊',
              description: clearSldMsg,
            }
          );
        }
      } else if (effect.type === 'STAT_BUFF') {
        if (effect.stat === 'evasion') {
          const prevEvasion = actor.evasion;
          actor.evasion = Math.min(GAME_CONFIG.EVASION_MAX_RATE, actor.evasion + effect.amount);
          actor.buffs.push({
            id: `buff_${Math.random()}`,
            type: 'STAT_BUFF',
            stat: 'evasion' as any,
            amount: effect.amount,
            duration: effect.duration,
          });
          const evBuffMsg = `${actor.name} の 回避率 が ${effect.amount}% 増加した。(${prevEvasion}% → ${actor.evasion}%)`;
          pushStep(
            steps,
            updatedPlayers,
            {
              id: `turn_log_${Math.random()}`,
              turn,
              text: evBuffMsg,
              type: 'status',
            },
            {
              id: `event_${Math.random()}`,
              type: 'BUFF',
              actorId: actor.id,
              actorName: actor.name,
              title: '回避率上昇',
              description: evBuffMsg,
            }
          );
        } else {
          const prop = effect.stat.toLowerCase() as 'atk' | 'def' | 'mat' | 'mdf' | 'spd' | 'clt';
          const prevVal = actor[prop];
          actor.buffs.push({
            id: `buff_${Math.random()}`,
            type: 'STAT_BUFF',
            stat: effect.stat,
            amount: effect.amount,
            duration: effect.duration,
          });
          // 実ステータスに反映
          applyStatBuff(actor, effect.stat, effect.amount);
          const newVal = actor[prop];
          const isClt = effect.stat === 'CLT';
          const statMsg = `${actor.name} の ${effect.stat} が ${effect.amount} 増加した。(${prevVal}${isClt ? '%' : ''} → ${newVal}${isClt ? '%' : ''})`;
          pushStep(
            steps,
            updatedPlayers,
            {
              id: `turn_log_${Math.random()}`,
              turn,
              text: statMsg,
              type: 'status',
            },
            {
              id: `event_${Math.random()}`,
              type: 'BUFF',
              actorId: actor.id,
              actorName: actor.name,
              title: 'ステータス上昇',
              description: statMsg,
            }
          );
        }
      } else if (effect.type === 'STEAL_STAT') {
        if (target && target.isAlive) {
          const prevTargetMdf = target.mdf;
          const prevActorMdf = actor.mdf;
          target.mdf = Math.max(0, target.mdf - effect.amount);
          actor.mdf += effect.amount;
          const stealMsg = `【スペルドレイン】${target.name} のMDFを ${effect.amount} 奪い取った！ (${target.name}: ${prevTargetMdf} → ${target.mdf}, ${actor.name}: ${prevActorMdf} → ${actor.mdf})`;
          pushStep(
            steps,
            updatedPlayers,
            {
              id: `turn_log_${Math.random()}`,
              turn,
              text: stealMsg,
              type: 'status',
            },
            {
              id: `event_${Math.random()}`,
              type: 'BUFF',
              actorId: actor.id,
              actorName: actor.name,
              targetId: target.id,
              targetName: target.name,
              title: 'スペルドレイン',
              description: stealMsg,
            }
          );
        }
      } else if (effect.type === 'APPLY_STATUS') {
        if (target && target.isAlive) {
          applyStatusEffect(target, effect.status, effect.duration, steps, updatedPlayers, turn);
        }
      } else if (effect.type === 'PARRY_AND_REFLECT') {
        // パリィ構えバフの付与
        let parryBuffName = '';
        if (cardDef.id === 'unique_sentinel_a') {
          actor.buffs.push({ id: `buff_${Math.random()}`, type: 'PARRY_STANCE', duration: 0 });
          parryBuffName = 'パリィ・スタンス';
        } else if (cardDef.id === 'unique_inquisitor_b') {
          actor.buffs.push({ id: `buff_${Math.random()}`, type: 'ANTI_MAGI', duration: 0 });
          parryBuffName = 'アンチ・マギ';
        } else if (cardDef.id === 'parry_dagger') {
          actor.buffs.push({ id: `buff_${Math.random()}`, type: 'PARRY_DAGGER', duration: 0 });
          parryBuffName = 'パリィダガー構え';
        } else if (cardDef.id === 'mirror_coat') {
          actor.buffs.push({ id: `buff_${Math.random()}`, type: 'MIRROR_COAT', duration: 0 });
          parryBuffName = 'ミラーコート構え';
        }
        if (parryBuffName) {
          const pMsg = `${actor.name} は【${parryBuffName}】の構えをとった！`;
          pushStep(
            steps,
            updatedPlayers,
            {
              id: `turn_log_${Math.random()}`,
              turn,
              text: pMsg,
              type: 'status',
            },
            {
              id: `event_${Math.random()}`,
              type: 'BUFF',
              actorId: actor.id,
              actorName: actor.name,
              title: '構え完了',
              description: pMsg,
            }
          );
        }
      } else if (effect.type === 'SELF_DAMAGE') {
        selfDamage += effect.amount;
      }
    }

    // メイジのユニークAを使用した場合は次回魔法威力1.75倍バフ付与
    if (cardDef.id === 'unique_mage_a') {
      if (!actor.buffs.some(b => b.type === 'SPELL_CHARGE')) {
        actor.buffs.push({ id: `buff_${Math.random()}`, type: 'SPELL_CHARGE', duration: -1 });
        const chargeMsg = `【スペルチャージ】${actor.name} は魔力をチャージした！(次回魔法攻撃1.75倍)`;
        pushStep(
          steps,
          updatedPlayers,
          {
            id: `turn_log_${Math.random()}`,
            turn,
            text: chargeMsg,
            type: 'status',
          },
          {
            id: `event_${Math.random()}`,
            type: 'BUFF',
            actorId: actor.id,
            actorName: actor.name,
            title: 'スペルチャージ',
            description: chargeMsg,
          }
        );
      }
    }

    // 自傷ダメージの処理（攻撃判定終了後）
    if (selfDamage > 0 && actor.isAlive) {
      applyDirectDamage(actor, selfDamage, steps, updatedPlayers, turn, '自傷ダメージ');
    }
  }

  // 3. ターン終了時処理: 毒ダメージ
  for (const player of Object.values(updatedPlayers)) {
    if (!player.isAlive) continue;
    const poisonStatus = player.statuses.find(s => s.type === 'poison');
    if (poisonStatus) {
      // 毒ダメージ: SLD貫通
      player.hp = Math.max(0, player.hp - GAME_CONFIG.POISON_DAMAGE);
      const poisonMsg = `【毒】${player.name} は毒により ${GAME_CONFIG.POISON_DAMAGE} ダメージを受けた。(残りHP: ${player.hp})`;
      pushStep(
        steps,
        updatedPlayers,
        {
          id: `turn_log_${Math.random()}`,
          turn,
          text: poisonMsg,
          type: 'damage',
        },
        {
          id: `event_${Math.random()}`,
          type: 'POISON_DAMAGE',
          targetId: player.id,
          targetName: player.name,
          damage: GAME_CONFIG.POISON_DAMAGE,
          hpDamage: GAME_CONFIG.POISON_DAMAGE,
          title: '毒ダメージ',
          description: poisonMsg,
        }
      );
      checkDeath(player, steps, updatedPlayers, turn);
    }
  }

  // 4. 26ターン目以降のサドンデス直接10ダメージ
  if (turn >= GAME_CONFIG.SUDDEN_DEATH_START_TURN) {
    const suddenDeathNotice = `【サドンデス】26ターン目以降の審判！ 全員に ${GAME_CONFIG.SUDDEN_DEATH_DAMAGE} の直接ダメージ！`;
    pushStep(
      steps,
      updatedPlayers,
      {
        id: `turn_log_${Math.random()}`,
        turn,
        text: suddenDeathNotice,
        type: 'damage',
      },
      {
        id: `event_${Math.random()}`,
        type: 'SUDDEN_DEATH',
        title: 'サドンデス',
        description: suddenDeathNotice,
      }
    );

    for (const player of Object.values(updatedPlayers)) {
      if (!player.isAlive) continue;
      player.hp = Math.max(0, player.hp - GAME_CONFIG.SUDDEN_DEATH_DAMAGE);
      const sdDmgMsg = `${player.name} はサドンデスにより ${GAME_CONFIG.SUDDEN_DEATH_DAMAGE} ダメージを受けた！(残りHP: ${player.hp})`;
      pushStep(
        steps,
        updatedPlayers,
        {
          id: `turn_log_${Math.random()}`,
          turn,
          text: sdDmgMsg,
          type: 'damage',
        },
        {
          id: `event_${Math.random()}`,
          type: 'SUDDEN_DEATH',
          targetId: player.id,
          targetName: player.name,
          damage: GAME_CONFIG.SUDDEN_DEATH_DAMAGE,
          hpDamage: GAME_CONFIG.SUDDEN_DEATH_DAMAGE,
          title: 'サドンデス被弾',
          description: sdDmgMsg,
        }
      );
      checkDeath(player, steps, updatedPlayers, turn);
    }
  }

  // 5. 状態異常とバフのターン経過処理
  for (const player of Object.values(updatedPlayers)) {
    // 状態異常デクリメント
    for (let i = player.statuses.length - 1; i >= 0; i--) {
      const st = player.statuses[i];
      st.remainingTurns -= 1;
      if (st.remainingTurns <= 0) {
        player.statuses.splice(i, 1);
        const expStatusMsg = `${player.name} の【${st.type === 'poison' ? '毒' : '重傷'}】が解除された。`;
        pushStep(
          steps,
          updatedPlayers,
          {
            id: `turn_log_${Math.random()}`,
            turn,
            text: expStatusMsg,
            type: 'info',
          },
          {
            id: `event_${Math.random()}`,
            type: 'EFFECT_EXPIRED',
            targetId: player.id,
            targetName: player.name,
            title: '状態異常解除',
            description: expStatusMsg,
          }
        );
      }
    }

    // バフ・一時ステータス増減のデクリメント
    for (let i = player.buffs.length - 1; i >= 0; i--) {
      const b = player.buffs[i];
      if (b.duration === -1) continue; // 永続（スペルチャージ等）

      if (b.duration === 0) {
        // 今ターン終了で解除
        if (b.type === 'STAT_BUFF' && b.stat && b.amount) {
          const isEvasion = b.stat === 'evasion';
          const prop = isEvasion ? 'evasion' : (b.stat.toLowerCase() as 'atk' | 'def' | 'mat' | 'mdf' | 'spd' | 'clt');
          const prevVal = (player as any)[prop];
          revertStatBuff(player, b.stat, b.amount);
          const newVal = (player as any)[prop];
          const isPercent = b.stat === 'CLT' || isEvasion;
          const statName = isEvasion ? 'evasion' : b.stat;
          const expBuffMsg = `${player.name} の ${statName} 強化が終了した。(${prevVal}${isPercent ? '%' : ''} → ${newVal}${isPercent ? '%' : ''})`;
          pushStep(
            steps,
            updatedPlayers,
            {
              id: `turn_log_${Math.random()}`,
              turn,
              text: expBuffMsg,
              type: 'status',
            },
            {
              id: `event_${Math.random()}`,
              type: 'EFFECT_EXPIRED',
              targetId: player.id,
              targetName: player.name,
              title: '強化終了',
              description: expBuffMsg,
            }
          );
        }
        player.buffs.splice(i, 1);
      } else {
        b.duration -= 1;
      }
    }
  }

  // 6. 勝敗・引き分け判定
  const alivePlayers = Object.values(updatedPlayers).filter(p => p.isAlive);
  let finalWinnerId: string | null | 'DRAW' = null;

  if (alivePlayers.length === 0) {
    finalWinnerId = 'DRAW';
    const drawMsg = `全員が力尽きたため、引き分けとなりました！`;
    pushStep(
      steps,
      updatedPlayers,
      {
        id: `turn_log_${Math.random()}`,
        turn,
        text: drawMsg,
        type: 'system',
      },
      {
        id: `event_${Math.random()}`,
        type: 'DEATH',
        title: '引き分け',
        description: drawMsg,
      },
      true
    );
  } else if (alivePlayers.length === 1 && Object.keys(updatedPlayers).length > 1) {
    finalWinnerId = alivePlayers[0].id;
    const winMsg = `勝者：${alivePlayers[0].name}！ おめでとうございます！`;
    pushStep(
      steps,
      updatedPlayers,
      {
        id: `turn_log_${Math.random()}`,
        turn,
        text: winMsg,
        type: 'system',
      },
      {
        id: `event_${Math.random()}`,
        type: 'DEATH',
        actorId: alivePlayers[0].id,
        actorName: alivePlayers[0].name,
        title: '勝者決定！',
        description: winMsg,
      },
      true
    );
  }

  // 最後のステップの winnerId を確実に同期
  if (steps.length > 0) {
    steps[steps.length - 1].winnerId = finalWinnerId;
  }

  return steps;
}

export function resolveTurn(
  players: { [id: string]: PlayerState },
  actions: { [playerId: string]: PlayerAction },
  turn: number
): TurnResolveResult {
  const steps = buildTurnResolutionSteps(players, actions, turn);
  if (steps.length === 0) {
    return { updatedPlayers: players, logs: [], winnerId: null };
  }
  const lastStep = steps[steps.length - 1];
  const allLogs = steps.map(s => s.log);

  return {
    updatedPlayers: lastStep.updatedPlayers,
    logs: allLogs,
    winnerId: lastStep.winnerId,
  };
}

// 直接ダメージ（自傷や反射）
function applyDirectDamage(
  player: PlayerState,
  amount: number,
  steps: TurnResolutionStep[],
  players: { [id: string]: PlayerState },
  turn: number,
  reason: string
) {
  let actualHpDmg = amount;
  let actualSldDmg = 0;

  if (player.sld > 0) {
    if (amount <= player.sld) {
      player.sld -= amount;
      actualSldDmg = amount;
      actualHpDmg = 0;
    } else {
      actualSldDmg = player.sld;
      actualHpDmg = amount - player.sld;
      player.sld = 0;
    }
  }

  player.hp = Math.max(0, player.hp - actualHpDmg);
  const logText = `${player.name} は ${reason} により ${amount} ダメージを受けた。(HP: -${actualHpDmg}, SLD: -${actualSldDmg})`;
  pushStep(
    steps,
    players,
    {
      id: `turn_log_${Math.random()}`,
      turn,
      text: logText,
      type: 'damage',
    },
    {
      id: `event_${Math.random()}`,
      type: 'ATTACK_HIT',
      targetId: player.id,
      targetName: player.name,
      damage: amount,
      hpDamage: actualHpDmg,
      sldDamage: actualSldDmg,
      title: reason,
      description: logText,
    }
  );
  checkDeath(player, steps, players, turn);
}

// 回復処理 (重傷・ジャガーノート考慮)
function applyHeal(
  player: PlayerState,
  amount: number,
  steps: TurnResolutionStep[],
  players: { [id: string]: PlayerState },
  turn: number
) {
  let heal = amount;

  // 重傷デバフ: 回復量50%
  const heavyWound = player.statuses.some(s => s.type === 'heavy_wound');
  if (heavyWound) {
    heal = heal * GAME_CONFIG.HEAVY_WOUND_HEAL_RATE;
  }

  // ジャガーノート パッシブ「大富豪の療養」: すべての回復効果を1.2倍
  if (player.roleId === 'juggernaut') {
    heal = heal * GAME_CONFIG.JUGGERNAUT_HEAL_MULTIPLIER;
  }

  const finalHeal = Math.floor(heal);
  const prevHp = player.hp;
  const actualHeal = Math.min(player.maxHp - player.hp, finalHeal);
  player.hp = Math.min(player.maxHp, player.hp + actualHeal);

  const healMsg = `${player.name} は HP を ${actualHeal} 回復した。(HP: ${prevHp} → ${player.hp}/${player.maxHp})`;
  pushStep(
    steps,
    players,
    {
      id: `turn_log_${Math.random()}`,
      turn,
      text: healMsg,
      type: 'heal',
    },
    {
      id: `event_${Math.random()}`,
      type: 'HEAL',
      actorId: player.id,
      actorName: player.name,
      targetId: player.id,
      targetName: player.name,
      healAmount: actualHeal,
      title: 'HP回復',
      description: healMsg,
    }
  );
}

// 状態異常付与 (重複不可、再付与で3ターンリセット)
function applyStatusEffect(
  target: PlayerState,
  statusType: 'poison' | 'heavy_wound',
  duration: number,
  steps: TurnResolutionStep[],
  players: { [id: string]: PlayerState },
  turn: number
) {
  const existing = target.statuses.find(s => s.type === statusType);
  if (existing) {
    existing.remainingTurns = duration;
    const resetMsg = `${target.name} の【${statusType === 'poison' ? '毒' : '重傷'}】の持続ターンが ${duration} ターンにリセットされた。`;
    pushStep(
      steps,
      players,
      {
        id: `turn_log_${Math.random()}`,
        turn,
        text: resetMsg,
        type: 'status',
      },
      {
        id: `event_${Math.random()}`,
        type: 'STATUS_APPLIED',
        targetId: target.id,
        targetName: target.name,
        title: '状態異常延長',
        description: resetMsg,
      }
    );
  } else {
    target.statuses.push({ type: statusType, remainingTurns: duration });
    const applyMsg = `${target.name} に【${statusType === 'poison' ? '毒' : '重傷'}】が付与された！`;
    pushStep(
      steps,
      players,
      {
        id: `turn_log_${Math.random()}`,
        turn,
        text: applyMsg,
        type: 'status',
      },
      {
        id: `event_${Math.random()}`,
        type: 'STATUS_APPLIED',
        targetId: target.id,
        targetName: target.name,
        title: '状態異常付与',
        description: applyMsg,
      }
    );
  }
}

// ステータス増減反映
function applyStatBuff(player: PlayerState, stat: any, amount: number) {
  switch (stat) {
    case 'ATK': player.atk += amount; break;
    case 'DEF': player.def += amount; break;
    case 'MAT': player.mat += amount; break;
    case 'MDF': player.mdf += amount; break;
    case 'SPD': player.spd = Math.max(0, player.spd + amount); break;
    case 'CLT': player.clt = Math.min(GAME_CONFIG.CRITICAL_MAX_RATE, player.clt + amount); break;
  }
}

// ステータス増減解除
function revertStatBuff(player: PlayerState, stat: any, amount: number) {
  switch (stat) {
    case 'ATK': player.atk -= amount; break;
    case 'DEF': player.def -= amount; break;
    case 'MAT': player.mat -= amount; break;
    case 'MDF': player.mdf -= amount; break;
    case 'SPD': player.spd = Math.max(0, player.spd - amount); break;
    case 'CLT': player.clt = Math.max(0, player.clt - amount); break;
    case 'evasion': player.evasion = Math.max(0, player.evasion - amount); break;
  }
}

// 死亡チェック
function checkDeath(
  player: PlayerState,
  steps: TurnResolutionStep[],
  players: { [id: string]: PlayerState },
  turn: number
) {
  if (player.hp <= 0 && player.isAlive) {
    player.isAlive = false;
    const deathMsg = `【戦闘不能】${player.name} は倒れた！`;
    pushStep(
      steps,
      players,
      {
        id: `turn_log_${Math.random()}`,
        turn,
        text: deathMsg,
        type: 'death',
      },
      {
        id: `event_${Math.random()}`,
        type: 'DEATH',
        targetId: player.id,
        targetName: player.name,
        title: '戦闘不能',
        description: deathMsg,
      },
      true
    );
  }
}
