# M4: Live Table Server + Friend Invites

> **Milestone gate:** M3 is complete (personality layer). Per CLAUDE.md workflow: "do not start coding a milestone without the user's approval of its plan."

## What M4 delivers

A multiplayer Spades table where real players join via invite links. The server runs the **same engine** that powers solo play — the engine API is the client/server contract. Players see the same table, hear the same banter, and play by the same rules whether solo or multiplayer.

### Key outcomes

1. **WebSocket server** — authoritative engine running on the server
2. **Room system** — invite links, player join/leave, seat assignment
3. **Real-time sync** — server → client event broadcast, client → server action submission
4. **Client multiplayer mode** — `useGameState` switches from local engine to WebSocket client
5. **Lobby screen** — create/join rooms, see player list, wait for start
6. **Same personality layer** — banter runs on server or is synced to clients

## 1. Architecture decisions

### Server architecture

```
apps/server/
  ├── src/
  │   ├── index.ts           # Server entry (Express + ws)
  │   ├── room.ts            # Room state machine
  │   ├── engine-host.ts     # Runs engine inside room
  │   ├── player.ts          # Player connection tracking
  │   ├── invite.ts          # Invite code generation/validation
  │   └── types.ts           # Server-specific types
  └── package.json
```

**Key principle:** The server runs `packages/engine` directly — same code, same tests, same deterministic behavior. The client never adjudicates legality; it sends actions and receives events.

### Client-server protocol (WebSocket)

```
Client → Server:
  { type: 'JoinRoom', roomId: string }
  { type: 'LeaveRoom' }
  { type: 'Action', action: Action }       // bid, play, exchange, nextHand
  { type: 'Ping' }

Server → Client:
  { type: 'RoomState', state: GameState }   // full state on join/after action
  { type: 'Events', events: EngineEvent[] }  // events since last state
  { type: 'PlayerJoined', seat: Seat, name: string }
  { type: 'PlayerLeft', seat: Seat }
  { type: 'Error', message: string }
  { type: 'Pong' }
```

### Room state machine

```
lobby (0-3 players connected, no game started)
  ↓ (host starts game)
bidding (engine phase: bidding)
  ↓
exchanging (blind nil exchange, if any)
  ↓
playing (engine phase: playing)
  ↓
scoring (engine phase: handOver → scoreboard)
  ↓
lobby (next hand, or game over)
```

### Banter on the server

Two options:
1. **Server generates banter** — server runs banter selector, sends banter lines to clients as events
2. **Client generates banter** — server sends GameState to clients, clients run banter locally

**Decision: Client generates banter.** The server sends GameState + EngineEvents; each client runs its own banter selector locally. This keeps the server thin (rules only) and ensures banter is identical across all clients. The server doesn't need to know about characters or phrases.

### Client switching: local ↔ multiplayer

The `useGameState` hook already wraps `GameSession`. M4 adds a `WebSocketSession` class that implements the same interface:

```typescript
interface SessionInterface {
  readonly state: GameState;
  readonly events: readonly EngineEvent[];
  apply(action: Action): EngineEvent[];
  clearEvents(): void;
  startNextHand(): EngineEvent[];
}
```

- `GameSession` — local engine (M2/M3)
- `WebSocketSession` — remote engine via WS (M4)

The UI components don't care which one is used.

## 2. Per-phase deliverables

### M4.1: Server skeleton + room management

**Deliverables:**
- `apps/server/` — Express + WebSocket server
- Room CRUD: create, join, leave, full
- Seat assignment: first come, first served (seat 0 = host, then 1, 2, 3)
- Invite codes: 6-character alphanumeric codes
- `GET /api/room/:code` — REST endpoint for room status (no game logic)

**Verification:** Create a room → get invite code → join with code → 2-4 players in room → room shows full state.

### M4.2: Engine host + action validation

**Deliverables:**
- `EngineHost` class wrapping `packages/engine`
- Action submission: client sends `Action` → server validates via engine → applies → broadcasts state + events
- Rejection: illegal action → `Error` event sent back
- State sync: full `GameState` snapshot sent on join and after every action
- Event dedup: clients receive only new events since last snapshot

**Verification:** Two clients connect → host starts game → both see same state → actions from either client are applied and synced to both.

### M4.3: Lobby screen + room UI

**Deliverables:**
- `apps/game/app/(lobby)/` — expo-router routes for lobby
  - `index.tsx` — main lobby screen (create room, join room)
  - `room/` — room view (player list, seat assignment, start button)
- `WebSocketSession` class in `packages/app-core/src/`
- Room status display: player count, host indicator, room settings
- Start game button (host only)
- Leave room button

**Verification:** Open app → create room → share code → second device joins → see 2 players → host starts → game begins on both.

### M4.4: Multiplayer table + sync

**Deliverables:**
- `useGameState` extended with WebSocket mode
- Table renders multiplayer state: player names, turn indicators, connection status
- Action queuing: handle network latency (show "waiting for other player" states)
- Disconnection handling: player leaves mid-hand → room returns to lobby
- Reconnection: reconnect → get full state snapshot

**Verification:** Full multiplayer hand: 2 real players vs 2 AI → bid → play → score → next hand. Disconnect mid-hand, reconnect, resume.

## 3. Key components

### `WebSocketSession` (app-core)

```typescript
export class WebSocketSession implements SessionInterface {
  private ws: WebSocket;
  private state: GameState;
  private events: EngineEvent[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(roomCode: string) {
    this.ws = new WebSocket(`wss://.../room/${roomCode}`);
    this.ws.onmessage = (msg) => this.handleMessage(JSON.parse(msg.data));
  }

  private handleMessage(data: ServerMessage) {
    switch (data.type) {
      case 'RoomState':
        this.state = data.state;
        this.events = data.events ?? [];
        break;
      case 'Events':
        this.events.push(...data.events);
        break;
      case 'Error':
        console.error('Server error:', data.message);
        break;
    }
  }

  apply(action: Action): EngineEvent[] {
    this.ws.send(JSON.stringify({ type: 'Action', action }));
    // Events arrive via WebSocket, not return value
    return [];
  }

  get state(): GameState { return this.state; }
  get events(): readonly EngineEvent[] { return [...this.events]; }
  clearEvents(): void { this.events = []; }
  startNextHand(): EngineEvent[] {
    this.ws.send(JSON.stringify({ type: 'Action', action: { type: 'NextHand' } }));
    return [];
  }
}
```

### `Room` (server)

```typescript
class Room {
  code: string;
  players: Map<Seat, Player> = new Map();
  host: Seat = 0;
  engineHost: EngineHost;
  phase: 'lobby' | 'playing' | 'scored';

  constructor(config: GameConfig, seed: string) {
    this.engineHost = new EngineHost(config, seed);
  }

  join(player: Player): Seat | null {
    // Find first empty seat
    for (const seat of [0, 1, 2, 3]) {
      if (!this.players.has(seat)) {
        this.players.set(seat, player);
        this.broadcast({ type: 'PlayerJoined', seat, name: player.name });
        return seat;
      }
    }
    return null; // room full
  }

  applyAction(seat: Seat, action: Action): void {
    const result = this.engineHost.apply(action, seat);
    this.broadcast({ type: 'RoomState', state: result.state, events: result.events });
  }

  broadcast(message: ServerMessage): void {
    for (const [, player] of this.players) {
      player.ws.send(JSON.stringify(message));
    }
  }
}
```

### Lobby screens

```
apps/game/app/
  (lobby)/
    index.tsx          # Create/Join room
    room/
      index.tsx        # Room view (player list, settings)
```

**Lobby index:**
- "Create Room" button → generates code → navigates to room screen
- "Join Room" input → takes code → navigates to room screen
- Shows recent rooms or quick-join options

**Room screen:**
- Room code (large, copyable)
- Player slots (4 slots, labeled with names or "Empty")
- Room settings (read-only, inherited from host's game config)
- "Start Game" button (host only, enabled when ≥2 players)
- "Leave Room" button

## 4. Testing strategy

### Server tests
- Room lifecycle: create → join → full → start → player leave
- Action validation: legal actions succeed, illegal actions rejected
- State sync: two clients see identical state after action
- Disconnection: player disconnects mid-hand, state preserved
- Reconnection: reconnecting client gets full state snapshot

### Integration tests
- End-to-end multiplayer hand: 2 clients, real engine, full hand
- Multi-client banter: each client generates identical banter from same events

### Coverage goals
- 80%+ on server room logic
- All action types tested through WebSocket
- Error handling tested (illegal action, wrong phase, wrong actor)

## 5. Risk areas and mitigations

### Risk: WebSocket reliability on mobile
**Mitigation:** Auto-reconnect with exponential backoff. On reconnect, request full state snapshot. Show "reconnecting" overlay. Mid-hand disconnect returns to lobby.

### Risk: Network latency affecting gameplay
**Mitigation:** Client-side prediction for visual smoothness. Server is source of truth. Show "waiting..." state during action processing. 200ms latency tolerance built in.

### Risk: Same engine on server has different RNG
**Mitigation:** Engine is deterministic — same config + seed = same deal. Server creates game, seed is shared. No randomness on server beyond seeded RNG.

### Risk: expo-router + WebSocket compatibility
**Mitigation:** Use native `WebSocket` API (built into React Native). For web, use standard `new WebSocket()`. No extra dependencies needed.

## 6. Definition of done

M4 is complete when ALL of the following are true:

1. **Server runs** — `pnpm --filter server start` launches a working WebSocket server
2. **Room system works** — create room, get invite code, join room, ≥2 players visible
3. **Multiplayer gameplay** — 2+ real players can play a full hand together
4. **State sync** — all connected clients see identical GameState after every action
5. **Action validation** — illegal actions rejected, wrong-actor actions rejected
6. **Banter synced** — all clients show same banter (generated locally from synced events)
7. **Disconnection handled** — player can disconnect, reconnect, or leave without crashes
8. **Lobby UI** — create/join rooms, player list, start game button
9. **Engine unchanged** — no modifications to `packages/engine` (server runs same package)
10. **Tests** — server tests for room lifecycle, action validation, state sync

## 7. Milestone sequence

```
M1 ✓ (done)  Rules engine — 142 tests, zero deps
M2 ✓ (done)  Playable table — AI, pass-and-play, scoreboard
M3 ✓ (done)  Personality layer — banter, cast, relationships

M4.1  Server skeleton + rooms           (~2 days)
M4.2  Engine host + action validation   (~2 days)
M4.3  Lobby screen + WebSocketSession   (~2 days)
M4.4  Multiplayer table + sync          (~2 days)

M5     Voice (TTS/STT)
```

## 8. Immediate next steps after approval

1. Scaffold `apps/server/` with Express + ws
2. Create `EngineHost` wrapping `packages/engine`
3. Build room management (create, join, leave, broadcast)
4. Create `WebSocketSession` in `app-core`
5. Build lobby UI screens
6. Wire multiplayer mode into `useGameState`
7. Commit after each verified phase
8. Test with 2+ real players before claiming done
