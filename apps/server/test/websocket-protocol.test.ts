/**
 * WebSocket client protocol tests.
 *
 * Tests the client-server message protocol using actual WebSocket connections.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import type { ServerMessage } from '../src/room';
import type { RoomPlayer } from '../src/room';
import { Room } from '../src/room';
import { DEFAULT_CONFIG } from 'engine';

const PORT = 3102;

interface TestServer {
  server: http.Server;
  wss: WebSocketServer;
}

let testServer: TestServer | null = null;

function createTestServer(): TestServer {
  const srv = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const wsServer = new WebSocketServer({ server: srv, path: '/ws' });

  wsServer.on('connection', (ws) => {
    const playerId = `test-${Math.random().toString(36).slice(2, 8)}`;

    ws.on('message', (data) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        ws.send(JSON.stringify({ type: 'Error', message: 'Invalid JSON' }));
        return;
      }

      const msg = parsed as Record<string, unknown>;

      if (msg.type === 'CreateRoom') {
        const config = (msg.config as Record<string, unknown>) || DEFAULT_CONFIG;
        const seed = `test-seed-${playerId}`;
        const room = new Room(config as any, seed);

        ws.send(JSON.stringify({
          type: 'RoomState',
          state: room.engineHostState,
          events: room.engineHostState.events,
          code: room.code,
        }));

        const player: RoomPlayer = {
          id: playerId,
          ws,
          name: (msg.name as string) || 'Host',
          seat: 0,
          isHuman: true,
          disconnected: false,
        };
        room.join(player);
        room.hostId = 0;
      } else if (msg.type === 'JoinRoom') {
        const code = (msg.code as string)?.toUpperCase();
        if (!code) {
          ws.send(JSON.stringify({ type: 'Error', message: 'Room code required' }));
          return;
        }
        // For test simplicity: create a room on join if code is known
        ws.send(JSON.stringify({ type: 'Error', message: 'Not implemented in test server' }));
      } else if (msg.type === 'Ping') {
        ws.send(JSON.stringify({ type: 'Pong' }));
      }
    });

    ws.on('close', () => {});
  });

  return { server: srv, wss: wsServer };
}

async function connectClient(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function waitForMessage(ws: WebSocket, timeout = 2000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for message')), timeout);
    ws.once('message', (data) => {
      clearTimeout(timer);
      resolve(data.toString());
    });
  });
}

async function closeServer(server: TestServer): Promise<void> {
  return new Promise((resolve) => {
    // Close all WebSocket connections first
    server.wss.clients.forEach((client) => {
      client.close();
    });
    server.wss.close(() => {
      server.server.close(() => resolve());
    });
    // Force close after 1s timeout
    setTimeout(() => resolve(), 500);
  });
}

describe('WebSocket protocol', () => {
  beforeEach(async () => {
    testServer = createTestServer();
    await new Promise<void>((resolve) => {
      testServer!.server.listen(PORT, () => resolve());
    });
  });

  afterEach(async () => {
    if (testServer) {
      await closeServer(testServer);
      testServer = null;
    }
  });

  it('responds to ping/pong', async () => {
    const ws = await connectClient(PORT);
    ws.send(JSON.stringify({ type: 'Ping' }));
    const raw = await waitForMessage(ws);
    const msg = JSON.parse(raw) as ServerMessage;
    expect(msg.type).toBe('Pong');
    ws.close();
  });

  it('creates a room and returns invite code', async () => {
    const ws = await connectClient(PORT);
    ws.send(JSON.stringify({ type: 'CreateRoom' }));
    const raw = await waitForMessage(ws);
    const msg = JSON.parse(raw) as ServerMessage & { code: string };

    expect(msg.type).toBe('RoomState');
    expect(msg.code).toBeDefined();
    expect(msg.code).toHaveLength(6);
    expect(msg.state).toBeDefined();
    expect(msg.events).toBeDefined();
    ws.close();
  });

  it('returns error for invalid JSON', async () => {
    const ws = await connectClient(PORT);
    ws.send(Buffer.from('not json{{{'));
    const raw = await waitForMessage(ws);
    const msg = JSON.parse(raw) as ServerMessage;
    expect(msg.type).toBe('Error');
    expect(msg.message).toContain('Invalid JSON');
    ws.close();
  });
});
