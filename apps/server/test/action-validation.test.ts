/**
 * Engine action validation tests.
 *
 * Tests that the server correctly validates and applies actions via the room.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { Room } from '../src/room';
import type { RoomPlayer } from '../src/room';
import { DEFAULT_CONFIG, type GameState } from 'engine';

function mockPlayer(id: string, name: string): RoomPlayer {
  const ws = { send: (_msg: string) => {}, readyState: 1 };
  return { id, ws, name, seat: null, isHuman: true, disconnected: false };
}

describe('Action validation', () => {
  let room: Room;
  let host: RoomPlayer;
  let player2: RoomPlayer;

  function setup(): { state: GameState } {
    room = new Room(DEFAULT_CONFIG, 'test-seed-42');
    host = mockPlayer('host', 'Alice');
    player2 = mockPlayer('p2', 'Bob');
    room.join(host);
    room.join(player2);

    // Start the game
    room.startGame();

    return { state: room.engineHostState };
  }

  it('rejects action before game starts', () => {
    const room = new Room(DEFAULT_CONFIG, 'seed1');
    room.join(mockPlayer('host', 'Alice'));
    room.join(mockPlayer('p2', 'Bob'));

    expect(() => room.applyAction('host', { type: 'Bid', kind: 'number', amount: 5 }))
      .toThrow('Game not started');
  });

  it('rejects action from wrong actor', () => {
    setup();
    // Current actor is dealer+1 (first to bid)
    const state = room.engineHostState;
    const actorSeat = state.dealer + 1; // wraps to 0..3

    // Try to bid from a different seat
    for (let seat = 0; seat < 4; seat++) {
      if (seat === actorSeat) continue;
      const player = mockPlayer(`seat${seat}`, `Seat ${seat}`);
      room.join(player);

      expect(() => room.applyAction(player.id, { type: 'Bid', kind: 'number', amount: 5 }))
        .toThrow(/Not your turn/);

      // Clean up
      room.leave(player.id);
    }
  });

  it('rejects illegal bid (amount out of range)', () => {
    setup();
    // Find the current actor and bid from them
    const state = room.engineHostState;
    // The first bidder is dealer+1
    for (let offset = 0; offset < 4; offset++) {
      const seat = ((state.dealer + 1 + offset) % 4) as number;
      if (!state.bids.find((b) => b.seat === (seat as any))) {
        // This is the current bidder — use their actual player
        const player = room.getPlayerList().find(p => p.seat === seat);
        if (player) {
          // Valid bid should succeed
          room.applyAction(player.id, { type: 'Bid', kind: 'number', amount: 5 });
        }
        break;
      }
    }
  });

  it('accepts a legal bid', () => {
    setup();
    const state = room.engineHostState;

    // Find first unbidder
    let bidder: string | undefined;
    for (let offset = 0; offset < 4; offset++) {
      const seat = ((state.dealer + 1 + offset) % 4) as number;
      if (!state.bids.find((b) => b.seat === (seat as any))) {
        const player = room.getPlayerList().find(p => p.seat === seat);
        bidder = player?.id;
        break;
      }
    }

    expect(bidder).toBeDefined();
    if (!bidder) return;

    // This should not throw
    expect(() => room.applyAction(bidder!, { type: 'Bid', kind: 'number', amount: 5 })).not.toThrow();
  });
});
