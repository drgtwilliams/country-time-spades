/**
 * Country Time Spades — WebSocket Server
 *
 * Express HTTP server + WebSocket connections for multiplayer Spades.
 * Runs the `engine` package authoritatively. Handles room management,
 * player connections, action submission, and state broadcasting.
 *
 * Usage:
 *   pnpm --filter server dev     # watch mode (localhost:3001)
 *   pnpm --filter server start    # production mode
 */

import express from 'express';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { Room, type ServerMessage } from './room';
import type { GameConfig, Action as EngineAction } from 'engine';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// In-memory room registry: code → Room
const rooms: Map<string, Room> = new Map();

// Clean up empty rooms periodically
setInterval(() => {
  for (const [code, room] of rooms) {
    if (room.isEmpty()) {
      rooms.delete(code);
    }
  }
}, 60_000); // every minute

/* ------------------------------------------------------------------ */
/*  Express HTTP server                                                */
/* ------------------------------------------------------------------ */

const app = express();
app.use(express.json());

/** GET /health — simple health check. */
app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

/** GET /api/room/:code — room status (no game logic). */
app.get('/api/room/:code', (req: express.Request, res: express.Response) => {
  const code = req.params.code?.toUpperCase();
  if (!code) {
    res.status(400).json({ error: 'Room code required' });
    return;
  }
  const room = rooms.get(code);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json({
    code: room.code,
    players: room.getPlayerList(),
    playerCount: room.connectedCount,
    gamePhase: room.gamePhase,
    canStart: room.canStart(),
  });
});

/* ------------------------------------------------------------------ */
/*  WebSocket server                                                   */
/* ------------------------------------------------------------------ */

const wss = new WebSocketServer({ noServer: true });

/** Handle a client WebSocket connection. */
wss.on('connection', (ws: WebSocket) => {
  const playerId = generateSessionId();
  let currentRoom: Room | null = null;
  let playerName = `Player ${playerId.slice(0, 4)}`;

  /** Send a message to this client. */
  const send = (msg: ServerMessage) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  ws.on('message', (data) => {
    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(data.toString()) as ClientMessage;
    } catch {
      send({ type: 'Error', message: 'Invalid JSON' });
      return;
    }

    switch (parsed.type) {
      case 'CreateRoom':
        handleCreateRoom(ws, parsed, send);
        break;
      case 'JoinRoom':
        handleJoinRoom(ws, parsed, send);
        break;
      case 'LeaveRoom':
        if (currentRoom) {
          currentRoom.leave(playerId);
          send({ type: 'RoomClosed' });
          currentRoom = null;
        }
        break;
      case 'Action':
        if (!currentRoom) {
          send({ type: 'Error', message: 'Not in a room' });
          return;
        }
        try {
          currentRoom.applyAction(playerId, parsed.action);
          // Already broadcast by room.applyAction
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          send({ type: 'Error', message: `Action rejected: ${message}` });
        }
        break;
      case 'StartGame':
        if (!currentRoom) {
          send({ type: 'Error', message: 'Not in a room' });
          return;
        }
        if (!currentRoom.canStart()) {
          send({ type: 'Error', message: 'Cannot start: need ≥2 players' });
          return;
        }
        currentRoom.startGame();
        break;
      case 'SetPlayerName':
        if (parsed.name) {
          playerName = parsed.name.slice(0, 20);
        }
        break;
      case 'Ping':
        send({ type: 'Pong' });
        break;
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      currentRoom.leave(playerId);
      currentRoom = null;
    }
  });

  ws.on('error', () => {
    if (currentRoom) {
      currentRoom.leave(playerId);
      currentRoom = null;
    }
  });
});

/**
 * Handle the upgrade request for WebSocket connections.
 */
const httpServer = http.createServer(app);

httpServer.on('upgrade', (request: http.IncomingMessage, socket: import('net').Socket, head: Buffer) => {
  const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      wss.emit('connection', ws, request);
    });
  }
});

/* ------------------------------------------------------------------ */
/*  Message handlers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Handle room creation.
 * Picks up config from the client message (host's game settings).
 */
function handleCreateRoom(
  ws: WebSocket,
  parsed: CreateRoomMessage,
  send: (msg: ServerMessage) => void,
): void {
  const config: GameConfig = parsed.config || {
    deckMode: 'jokers',
    promotedDeuces: [],
    allowNil: true,
    allowBlindNil: true,
    nilBonus: 100,
    nilPenalty: 100,
    blindNilBonus: 200,
    blindNilPenalty: 200,
    bagPenaltyEnabled: true,
    bagThreshold: 10,
    bagPenalty: 100,
    setPenalty: 'zero',
    rene: 'prevent',
    renePenalty: 'loseHand',
    targetScore: 500,
  };
  const seed = generateSeed();
  const room = new Room(config, seed);

  rooms.set(room.code, room);

  send({
    type: 'RoomState',
    state: room.engineHostState,
    code: room.code,
  });

  // Auto-join the creator
  room.join({
    id: generateSessionId(),
    ws,
    name: parsed.name || 'Host',
    seat: 0,
    isHuman: parsed.isHuman ?? true,
    disconnected: false,
  });
  room.hostId = 0;
}

/**
 * Handle room join via invite code.
 */
function handleJoinRoom(
  ws: WebSocket,
  parsed: JoinRoomMessage,
  send: (msg: ServerMessage) => void,
): void {
  const room = rooms.get(parsed.code.toUpperCase());
  if (!room) {
    send({ type: 'Error', message: 'Room not found' });
    return;
  }

  room.join({
    id: generateSessionId(),
    ws,
    name: parsed.name || 'Player',
    seat: null,
    isHuman: parsed.isHuman ?? true,
    disconnected: false,
  });

  send({
    type: 'RoomState',
    state: room.engineHostState,
    code: room.code,
  });
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Client → Server messages. */
type ClientMessage = CreateRoomMessage | JoinRoomMessage | LeaveRoomMessage
  | ActionMessage | StartGameMessage | SetPlayerNameMessage | PingMessage;

interface CreateRoomMessage {
  type: 'CreateRoom';
  config?: GameConfig;
  name?: string;
  isHuman?: boolean;
}

interface JoinRoomMessage {
  type: 'JoinRoom';
  code: string;
  name?: string;
  isHuman?: boolean;
}

interface LeaveRoomMessage {
  type: 'LeaveRoom';
}

interface ActionMessage {
  type: 'Action';
  action: EngineAction;
}

interface StartGameMessage {
  type: 'StartGame';
}

interface SetPlayerNameMessage {
  type: 'SetPlayerName';
  name: string;
}

interface PingMessage {
  type: 'Ping';
}

/* ------------------------------------------------------------------ */
/*  Start server                                                       */
/* ------------------------------------------------------------------ */

httpServer.listen(PORT, () => {
  console.log(`Country Time Spades server listening on port ${PORT}`);
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateSessionId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function generateSeed(): string {
  // Use a timestamp + random string as the game seed
  return `s4-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
