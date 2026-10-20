/**
 * Hand scoring — pure function of the final state after 13 tricks.
 *
 * Computes per-team deltas, nil results, bag carry, set detection,
 * milestone events, and returns the updated scores/bags/events.
 *
 * Does NOT mutate or advance phase; the caller drives the state machine.
 */

import type { Team, Seat } from './types';
import type { GameConfig } from './config';
import type { EngineEvent } from './events';
import type { BidRecord } from './state';
import { teamOf } from './types';

/** Result of scoring a completed hand. */
export interface HandScore {
  /** Points to add per team: [team0, team1]. */
  readonly deltas: [number, number];
  /** Scores after applying deltas. */
  readonly scoresAfter: [number, number];
  /** Bag carry per team after this hand. */
  readonly bagCarry: [number, number];
  /** Events to emit (in order). */
  readonly events: EngineEvent[];
}

/**
 * Score a completed hand.
 *
 * Reads state whose trickCount is 13. Does NOT mutate the state.
 */
export function scoreHand(state: {
  readonly config: GameConfig;
  readonly bids: readonly BidRecord[];
  readonly trickWins: [number, number, number, number];
  readonly bagCount: [number, number];
  readonly scores: [number, number];
}): HandScore {
  const { config, bids, trickWins, bagCount, scores } = state;
  const deltas: [number, number] = [0, 0];
  const events: EngineEvent[] = [];

  // Nil seats
  const nilSeats = new Set<Seat>();
  for (const bid of bids) {
    if (bid.kind === 'nil' || bid.kind === 'blindNil') {
      nilSeats.add(bid.seat);
    }
  }

  // Per-team processing
  for (let t = 0; t < 2; t++) {
    const team = t as Team;
    const teamPlayers: Seat[] = team === 0 ? [0 as Seat, 2 as Seat] : [1 as Seat, 3 as Seat];

    // Board = sum of non-nil bids
    let board = 0;
    let hasNumberBid = false;
    for (const bid of bids) {
      if (teamOf(bid.seat) !== team) continue;
      if (bid.kind === 'number') {
        board += bid.amount;
        hasNumberBid = true;
      }
    }

    // Nil bonus/penalty per seat
    for (const bid of bids) {
      if (teamOf(bid.seat) !== team) continue;
      if (bid.kind === 'nil') {
        if (trickWins[bid.seat as number] === 0) {
          deltas[team] += config.nilBonus;
          events.push({ type: 'NilMade', seat: bid.seat, blind: false });
        } else {
          deltas[team] -= config.nilPenalty;
          events.push({ type: 'NilCaught', seat: bid.seat, blind: false });
        }
      } else if (bid.kind === 'blindNil') {
        if (trickWins[bid.seat as number] === 0) {
          deltas[team] += config.blindNilBonus;
          events.push({ type: 'NilMade', seat: bid.seat, blind: true });
        } else {
          deltas[team] -= config.blindNilPenalty;
          events.push({ type: 'NilCaught', seat: bid.seat, blind: true });
        }
      }
    }

    // Both nil or no number bid → no contract
    const nonNilCount = teamPlayers.filter((s) => !nilSeats.has(s) && bids.some((b) => b.seat === s && b.kind === 'number')).length;
    if (!hasNumberBid || nonNilCount === 0) {
      // Boston check for this team
      for (const bid of bids) {
        if (teamOf(bid.seat) === team && trickWins[bid.seat as number] === 13) {
          events.push({ type: 'Boston', seat: bid.seat });
        }
      }
      continue;
    }

    // Team tricks (non-nil only)
    let teamTricks = 0;
    for (const seat of teamPlayers) {
      if (!nilSeats.has(seat)) {
        teamTricks += trickWins[seat as number]!;
      }
    }

    // Contract
    if (teamTricks >= board) {
      deltas[team] += 10 * board + (teamTricks - board);
    } else {
      events.push({ type: 'Set', team });
      if (config.setPenalty === 'minusBoard') {
        deltas[team] -= 10 * board;
      }
    }

    // Boston
    for (const bid of bids) {
      if (teamOf(bid.seat) === team && trickWins[bid.seat as number] === 13) {
        events.push({ type: 'Boston', seat: bid.seat });
      }
    }
  }

  // Bag carry
  const bagCarry: [number, number] = [bagCount[0], bagCount[1]];

  // Recompute bags per team for this hand
  for (let t = 0; t < 2; t++) {
    const team = t as Team;
    const teamPlayers: Seat[] = team === 0 ? [0 as Seat, 2 as Seat] : [1 as Seat, 3 as Seat];

    let board = 0;
    let hasNumber = false;
    for (const bid of bids) {
      if (teamOf(bid.seat) !== team) continue;
      if (bid.kind === 'number') { board += bid.amount; hasNumber = true; }
    }

    if (!hasNumber) continue;

    let teamTricks = 0;
    for (const seat of teamPlayers) {
      if (!nilSeats.has(seat)) teamTricks += trickWins[seat as number]!;
    }

    if (teamTricks >= board) {
      const bagsThisHand = teamTricks - board;
      bagCarry[team] += bagsThisHand;

      if (config.bagPenaltyEnabled) {
        while (bagCarry[team] >= config.bagThreshold) {
          bagCarry[team] -= config.bagThreshold;
          deltas[team] -= config.bagPenalty;
          events.push({ type: 'BagThresholdHit', team });
        }
      }
    }
  }

  // Apply scores
  const scoresAfter: [number, number] = [scores[0] + deltas[0], scores[1] + deltas[1]];

  // Score milestones
  for (let t = 0; t < 2; t++) {
    const team = t as Team;
    if (scores[team] >= 0 && scoresAfter[team] < 0) {
      events.push({ type: 'ScoreMilestone', team, milestone: 'inTheHole' });
    } else if (scores[team] < 0 && scoresAfter[team] >= 0) {
      events.push({ type: 'ScoreMilestone', team, milestone: 'outTheHole' });
    }
  }

  return { deltas, scoresAfter, bagCarry, events };
}
