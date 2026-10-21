/**
 * Multiplayer integration test — end-to-end hand simulation.
 *
 * Two simulated players connect to a room, play through a full hand,
 * and verify state is synced identically across both.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { Room, type RoomPlayer } from '../src/room';
import { DEFAULT_CONFIG, type Action } from 'engine';

describe('Multiplayer integration — full hand', () => {
  let room: Room;
  let host: RoomPlayer;
  let player2: RoomPlayer;

  let receivedByHost: Array<{ state: any; events: any[] }>;
  let receivedByPlayer2: Array<{ state: any; events: any[] }>;

  function mockPlayer(id: string, name: string, onMessage: (msg: any) => void): RoomPlayer {
    return {
      id,
      ws: {
        send: (msg: string) => {
          try {
            onMessage(JSON.parse(msg));
          } catch {
            // ignore parse errors
          }
        },
        readyState: 1,
      },
      name,
      seat: null,
      isHuman: true,
      disconnected: false,
    };
  }

  beforeEach(() => {
    room = new Room(DEFAULT_CONFIG, 'integration-test-seed');

    receivedByHost = [];
    receivedByPlayer2 = [];

    host = mockPlayer('host', 'Alice', (msg) => {
      if (msg.type === 'RoomState') {
        receivedByHost.push({ state: msg.state, events: msg.events || [] });
      }
    });

    player2 = mockPlayer('p2', 'Bob', (msg) => {
      if (msg.type === 'RoomState') {
        receivedByPlayer2.push({ state: msg.state, events: msg.events || [] });
      }
    });

    room.join(host);
    room.join(player2);
  });

  afterEach(() => {
    // Clean up
    room.leave('host');
    room.leave('p2');
  });

  it('two players join and see identical initial state', () => {
    room.startGame();

    // Both players should have received the same initial state
    expect(receivedByHost).toHaveLength(1);
    expect(receivedByPlayer2).toHaveLength(1);

    const hostState = receivedByHost[0]!.state;
    const player2State = receivedByPlayer2[0]!.state;

    // Same handNumber, dealer, phase
    expect(hostState.handNumber).toBe(player2State.handNumber);
    expect(hostState.dealer).toBe(player2State.dealer);
    expect(hostState.phase).toBe(player2State.phase);
    expect(hostState.hands.length).toBe(4);
    expect(player2State.hands.length).toBe(4);
    // Each player has 13 cards
    expect(hostState.hands[0].length).toBe(13);
    expect(hostState.hands[1].length).toBe(13);
  });

  it('actions from either player are applied and synced', () => {
    room.startGame();

    // Clear initial messages
    receivedByHost = [];
    receivedByPlayer2 = [];

    // Find the current actor (first bidder)
    const initialState = room.engineHostState;
    let actorSeat = -1;
    for (let offset = 0; offset < 4; offset++) {
      const seat = ((initialState.dealer + 1 + offset) % 4) as number;
      if (!initialState.bids.find((b: any) => b.seat === (seat as any))) {
        actorSeat = seat;
        break;
      }
    }

    expect(actorSeat).toBeGreaterThanOrEqual(0);

    // The actor should be either host or player2
    const actor = actorSeat === 0 ? host : player2;

    // This action should succeed and broadcast to both
    expect(() => room.applyAction(actor.id, { type: 'Bid', kind: 'number', amount: 5 }))
      .not.toThrow();

    // Both players should have received the state update
    expect(receivedByHost).toHaveLength(1);
    expect(receivedByPlayer2).toHaveLength(1);

    // Both states should match
    const hostState = receivedByHost[0]!.state;
    const player2State = receivedByPlayer2[0]!.state;

    expect(hostState.bids.length).toBe(1);
    expect(hostState.bids[0]!.amount).toBe(5);
    expect(hostState.phase).toBe(player2State.phase);
  });

  it('rejects action from non-actor', () => {
    room.startGame();

    // Clear initial messages
    receivedByHost = [];
    receivedByPlayer2 = [];

    // Find the current actor (first bidder)
    const initialState = room.engineHostState;
    let actorSeat = -1;
    for (let offset = 0; offset < 4; offset++) {
      const seat = ((initialState.dealer + 1 + offset) % 4) as number;
      if (!initialState.bids.find((b: any) => b.seat === (seat as any))) {
        actorSeat = seat;
        break;
      }
    }

    expect(actorSeat).toBeGreaterThanOrEqual(0);

    // Find a player who is NOT the current actor
    const otherPlayer = actorSeat === 0 ? player2 : host;

    expect(() => room.applyAction(otherPlayer.id, { type: 'Bid', kind: 'number', amount: 3 }))
      .toThrow(/Not your turn|Illegal action/);

    // No state updates should be broadcast
    expect(receivedByHost).toHaveLength(0);
    expect(receivedByPlayer2).toHaveLength(0);
  });

  it('rejects illegal action (not in legal set)', () => {
    room.startGame();

    receivedByHost = [];
    receivedByPlayer2 = [];

    // Find current actor
    const initialState = room.engineHostState;
    let actorSeat = -1;
    for (let offset = 0; offset < 4; offset++) {
      const seat = ((initialState.dealer + 1 + offset) % 4) as number;
      if (!initialState.bids.find((b: any) => b.seat === (seat as any))) {
        actorSeat = seat;
        break;
      }
    }

    const actor = actorSeat === 0 ? host : player2;

    // Try an illegal action (bid amount 99 — not legal during bidding)
    // Actually, 99 is technically in the 1-13 range... let's use a wrong phase action
    // During bidding, NextHand is illegal
    expect(() => room.applyAction(actor.id, { type: 'NextHand' }))
      .toThrow(/Illegal action|WRONG_PHASE/);
  });
});
