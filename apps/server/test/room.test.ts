/**
 * Room lifecycle tests.
 *
 * Tests room creation, joining, seating, and empty-room cleanup.
 */

import { describe, expect, it } from 'vitest';
import { Room } from '../src/room';
import type { RoomPlayer } from '../src/room';
import { DEFAULT_CONFIG } from 'engine';

function mockPlayer(id: string, name: string): RoomPlayer {
  const ws = { send: (_msg: string) => {}, readyState: 1 };
  return { id, ws, name, seat: null, isHuman: true, disconnected: false };
}

describe('Room creation', () => {
  it('generates a unique 6-char invite code', () => {
    const room = new Room(DEFAULT_CONFIG, 'seed1');
    expect(room.code).toHaveLength(6);
    expect(room.code).toMatch(/^[A-Z2-9]+$/);
  });

  it('produces unique codes for different rooms', () => {
    const r1 = new Room(DEFAULT_CONFIG, 'seed1');
    const r2 = new Room(DEFAULT_CONFIG, 'seed2');
    expect(r1.code).not.toBe(r2.code);
  });

  it('starts in lobby phase', () => {
    const room = new Room(DEFAULT_CONFIG, 'seed1');
    expect(room.gamePhase).toBe('lobby');
  });

  it('preserves config and seed', () => {
    const config = { ...DEFAULT_CONFIG, targetScore: 100 };
    const room = new Room(config, 'my-seed');
    expect(room.config.targetScore).toBe(100);
    expect(room.seed).toBe('my-seed');
  });
});

describe('Room joining', () => {
  it('assigns seat 0 to first player', () => {
    const room = new Room(DEFAULT_CONFIG, 'seed1');
    const p = mockPlayer('p1', 'Alice');
    const seat = room.join(p);
    expect(seat).toBe(0);
    expect(p.seat).toBe(0);
  });

  it('assignes sequential seats', () => {
    const room = new Room(DEFAULT_CONFIG, 'seed1');
    const p1 = mockPlayer('p1', 'Alice');
    const p2 = mockPlayer('p2', 'Bob');
    const p3 = mockPlayer('p3', 'Carol');

    expect(room.join(p1)).toBe(0);
    expect(room.join(p2)).toBe(1);
    expect(room.join(p3)).toBe(2);
  });

  it('returns null when room is full (4 players)', () => {
    const room = new Room(DEFAULT_CONFIG, 'seed1');
    const p1 = mockPlayer('p1', 'Alice');
    const p2 = mockPlayer('p2', 'Bob');
    const p3 = mockPlayer('p3', 'Carol');
    const p4 = mockPlayer('p4', 'Dave');

    expect(room.join(p1)).toBe(0);
    expect(room.join(p2)).toBe(1);
    expect(room.join(p3)).toBe(2);
    expect(room.join(p4)).toBe(3);
    expect(room.join(mockPlayer('p5', 'Eve'))).toBeNull();
  });

  it('tracks connected and total player counts', () => {
    const room = new Room(DEFAULT_CONFIG, 'seed1');
    const p1 = mockPlayer('p1', 'Alice');
    const p2 = mockPlayer('p2', 'Bob');
    room.join(p1);
    expect(room.connectedCount).toBe(1);
    room.join(p2);
    expect(room.connectedCount).toBe(2);
    expect(room.playerCount).toBe(2);
  });

  it('can start with 2+ players', () => {
    const room = new Room(DEFAULT_CONFIG, 'seed1');
    room.join(mockPlayer('p1', 'Alice'));
    expect(room.canStart()).toBe(false);
    room.join(mockPlayer('p2', 'Bob'));
    expect(room.canStart()).toBe(true);
  });
});

describe('Room leaving', () => {
  it('removes player from room', () => {
    const room = new Room(DEFAULT_CONFIG, 'seed1');
    const p1 = mockPlayer('p1', 'Alice');
    const p2 = mockPlayer('p2', 'Bob');
    room.join(p1);
    room.join(p2);

    const left = room.leave('p1');
    expect(left).toEqual({ seat: 0, name: 'Alice' });
    expect(room.connectedCount).toBe(1);
  });

  it('reassigns host when host leaves', () => {
    const room = new Room(DEFAULT_CONFIG, 'seed1');
    const host = mockPlayer('host', 'Alice');
    const other = mockPlayer('other', 'Bob');
    room.join(host);
    room.join(other);

    expect(room.hostId).toBe(0);
    room.leave('host');
    expect(room.hostId).toBe(1); // Bob takes over
  });

  it('returns null for unknown player', () => {
    const room = new Room(DEFAULT_CONFIG, 'seed1');
    expect(room.leave('unknown')).toBeNull();
  });

  it('room is empty after all players leave', () => {
    const room = new Room(DEFAULT_CONFIG, 'seed1');
    room.join(mockPlayer('p1', 'Alice'));
    room.join(mockPlayer('p2', 'Bob'));
    expect(room.isEmpty()).toBe(false);
    room.leave('p1');
    room.leave('p2');
    expect(room.isEmpty()).toBe(true);
  });
});

describe('Player list', () => {
  it('returns empty list when no players', () => {
    const room = new Room(DEFAULT_CONFIG, 'seed1');
    expect(room.getPlayerList()).toEqual([]);
  });

  it('returns seated players in order', () => {
    const room = new Room(DEFAULT_CONFIG, 'seed1');
    const p2 = mockPlayer('p2', 'Bob');
    const p1 = mockPlayer('p1', 'Alice');
    room.join(p1);
    room.join(p2);

    const list = room.getPlayerList();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('Alice');
    expect(list[0].seat).toBe(0);
    expect(list[1].name).toBe('Bob');
    expect(list[1].seat).toBe(1);
  });
});
