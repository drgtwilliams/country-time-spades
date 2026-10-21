/**
 * Table — the main game table that assembles all components.
 *
 * Layout:
 *   Top:    Seat 2 (opposite) + their hand (face-down)
 *   Left:   Seat 3 (left) + hand
 *   Right:  Seat 1 (right) + hand
 *   Bottom: Seat 0 (you) + hand (face-up)
 *   Center: Trick center
 *
 * Phase-aware: shows bid pad during bidding, card selection during play.
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import type { GameState, Seat, BidRecord } from 'engine';

import { Hand } from './Hand';
import { BidPad } from './BidPad';
import { TrickCenter } from './TrickCenter';
import { SeatIndicator } from './SeatIndicator';
import { SpeechBubble } from './SpeechBubble';

export interface TableProps {
  /** Current game state. */
  gameState: GameState;
  /** Seat index of the human player (0-3, or -1 for AI-only). */
  humanSeat: Seat | -1;
  /** Whether it's the human's turn. */
  isHumanTurn: boolean;
  /** Legal card IDs the human can play. */
  legalCards: string[];
  /** Handle card selection during trick play. */
  onPlayCard?: (cardId: string) => void;
  /** Handle bid confirmation. */
  onBid?: (amount: number) => void;
  /** Handle nil bid confirmation. */
  onNilBid?: () => void;
  /** Handle blind nil bid confirmation. */
  onBlindNilBid?: () => void;
  /** Current bid pad state. */
  bidPadActive: boolean;
  /** Current bid pad value. */
  bidPadValue: number;
}

/** Default AI player names for M2. */
const AI_NAMES: Record<number, string> = {
  0: 'Player',
  1: 'Miss Dee',
  2: 'Big Earl',
  3: 'Auntie May',
};

export function Table({
  gameState,
  humanSeat,
  isHumanTurn,
  legalCards,
  onPlayCard,
  onBid,
  onNilBid,
  onBlindNilBid,
  bidPadActive,
  bidPadValue,
}: TableProps) {
  const { phase, dealer, bids, hands, currentTrick, spadesBroken, handNumber } = gameState;

  // Determine who is bidding right now
  const biddingSeat = getBiddingSeat(gameState);
  const isBiddingHuman = biddingSeat === humanSeat && !bidPadActive === false;

  // Current trick plays
  const trickPlays = currentTrick
    ? currentTrick.plays.map((p) => ({
        seat: p.seat,
        cardId: p.cardId,
        isWinner: false,
      }))
    : [];

  // Current actor (for highlighting)
  const currentActor = getCurrentActorSeat(gameState);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>Hand {handNumber + 1}</Text>
        <Text style={styles.topBarText}>
          Dealer: {AI_NAMES[dealer]}
        </Text>
        {spadesBroken && (
          <Text style={styles.spadeBreakText}>♠ Broken</Text>
        )}
      </View>

      {/* Main table area */}
      <View style={styles.tableArea}>
        {/* Top: Seat 2 (opposite) */}
        <View style={styles.seatRow}>
          <SeatIndicator
            seat={2}
            name={AI_NAMES[2]}
            bid={getBid(2)}
            isActive={currentActor === 2}
            isDealer={dealer === 2}
            style={styles.seatTop}
          />
          <View style={styles.handRowTop}>
            <Hand
              cards={hands[2]}
              seat={2}
              selectable={false}
              label={`${AI_NAMES[2]} (face down)`}
            />
          </View>
        </View>

        {/* Middle row: Seat 3 (left) | Trick center | Seat 1 (right) */}
        <View style={styles.middleRow}>
          <View style={styles.seatColumnLeft}>
            <SeatIndicator
              seat={3}
              name={AI_NAMES[3]}
              bid={getBid(3)}
              isActive={currentActor === 3}
              isDealer={dealer === 3}
              style={styles.seatSide}
            />
            <View style={styles.handColumn}>
              <Hand
                cards={hands[3]}
                seat={3}
                selectable={false}
                label={`${AI_NAMES[3]} (face down)`}
              />
            </View>
          </View>

          {/* Trick center */}
          <View style={styles.trickArea}>
            <TrickCenter plays={trickPlays} />
            {/* Phase indicator */}
            <Text style={styles.phaseText}>{getPhaseLabel(phase)}</Text>
          </View>

          <View style={styles.seatColumnRight}>
            <SeatIndicator
              seat={1}
              name={AI_NAMES[1]}
              bid={getBid(1)}
              isActive={currentActor === 1}
              isDealer={dealer === 1}
              style={styles.seatSide}
            />
            <View style={styles.handColumn}>
              <Hand
                cards={hands[1]}
                seat={1}
                selectable={false}
                label={`${AI_NAMES[1]} (face down)`}
              />
            </View>
          </View>
        </View>

        {/* Bottom: Seat 0 (player) */}
        <View style={styles.bottomRow}>
          <SeatIndicator
            seat={0}
            name={AI_NAMES[0]}
            bid={getBid(0)}
            isActive={currentActor === 0}
            isDealer={dealer === 0}
            isSelf={humanSeat === 0}
            style={styles.seatBottom}
          />

          {/* Bid pad during bidding */}
          {phase === 'bidding' && biddingSeat === humanSeat && (
            <BidPad
              currentBid={bidPadValue}
              active={isBiddingHuman}
              onConfirm={onBid ?? (() => {})}
              onCancel={() => {}}
              style={styles.bidPad}
            />
          )}

          {/* Player's hand */}
          <View style={styles.handRowBottom}>
            <Hand
              cards={hands[0]}
              seat={0}
              selectable={phase === 'playing' && isHumanTurn && humanSeat >= 0}
              dimmed={phase === 'playing' ? legalCards.filter((c) => !legalCards.includes(c)) : []}
              onSelectCard={(cardId) => onPlayCard?.(cardId)}
              isCurrentTurn={isHumanTurn && phase === 'playing'}
              label={isHumanTurn ? 'Your turn!' : `Hand ${handNumber + 1}`}
            />
          </View>
        </View>
      </View>

      {/* Speech bubble zone */}
      <View style={styles.bubbleZone} />
    </SafeAreaView>
  );

  function getBid(seat: Seat): BidRecord | undefined {
    return bids.find((b) => b.seat === seat);
  }
}

function getBiddingSeat(state: GameState): Seat | null {
  if (state.phase !== 'bidding') return null;
  // Find first seat without a bid, starting after dealer
  const seats: Seat[] = [0, 1, 2, 3];
  for (let i = state.dealer + 1; i < state.dealer + 5; i++) {
    const seat = (i % 4) as Seat;
    if (!state.bids.find((b) => b.seat === seat)) {
      return seat;
    }
  }
  return null;
}

function getCurrentActorSeat(state: GameState): Seat | null {
  if (state.phase === 'bidding') {
    return getBiddingSeat(state);
  }
  if (state.phase === 'playing' && state.currentTrick) {
    // Next player is the one after the last play
    const lastPlay = state.currentTrick.plays[state.currentTrick.plays.length - 1];
    if (!lastPlay) return ((state.dealer + 1) % 4) as Seat;
    return ((lastPlay.seat + 1) % 4) as Seat;
  }
  return null;
}

function getPhaseLabel(phase: string): string {
  switch (phase) {
    case 'bidding':
      return 'Bidding';
    case 'exchanging':
      return 'Exchange';
    case 'playing':
      return 'Playing';
    case 'handOver':
      return 'Hand Over';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a5c2a',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  topBarText: {
    color: '#ddd',
    fontSize: 12,
  },
  spadeBreakText: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tableArea: {
    flex: 1,
    padding: 8,
  },
  seatRow: {
    alignItems: 'center',
    minHeight: 100,
  },
  seatTop: {
    marginBottom: 4,
  },
  handRowTop: {
    alignItems: 'center',
  },
  middleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  seatColumnLeft: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatColumnRight: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatSide: {
    marginBottom: 8,
  },
  handColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  trickArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  bottomRow: {
    alignItems: 'center',
    minHeight: 120,
  },
  seatBottom: {
    marginBottom: 4,
  },
  bidPad: {
    marginBottom: 8,
    maxWidth: 220,
  },
  handRowBottom: {
    alignItems: 'center',
  },
  bubbleZone: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: 80,
    pointerEvents: 'box-none',
  },
});
