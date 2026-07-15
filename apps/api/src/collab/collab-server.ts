import { WebSocketServer, type WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { Server as HttpServer } from 'node:http';
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import {
  writeSyncStep1,
  readSyncStep1,
  writeUpdate,
} from 'y-protocols/sync.js';
import {
  encodeAwarenessUpdate,
  applyAwarenessUpdate,
  removeAwarenessStates,
  Awareness,
} from 'y-protocols/awareness.js';
import { logger } from '../lib/logger.js';

const messageSync = 0;
const messageAwareness = 1;

const PERSISTENCE_DIR = './data/ydocs';
const docs = new Map<string, { doc: Y.Doc; awareness: Awareness; connections: Set<WebSocket> }>();

async function loadDocFromDisk(docName: string): Promise<Uint8Array | null> {
  const fs = await import('node:fs/promises');
  try {
    const data = await fs.readFile(`${PERSISTENCE_DIR}/${docName}.yjs`);
    return new Uint8Array(JSON.parse(data.toString('utf-8')));
  } catch {
    return null;
  }
}

async function saveDocUpdateToDisk(docName: string, update: Uint8Array) {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  await fs.mkdir(PERSISTENCE_DIR, { recursive: true }).catch(() => {});
  const filePath = path.join(PERSISTENCE_DIR, `${docName}.yjs`);

  try {
    const existing = await fs.readFile(filePath).then((d) => JSON.parse(d.toString('utf-8')));
    await fs.writeFile(
      filePath,
      JSON.stringify([...existing, ...Array.from(update)]),
    );
  } catch {
    await fs.writeFile(
      filePath,
      JSON.stringify(Array.from(update)),
    );
  }
}

function getOrCreateDoc(docName: string) {
  const existing = docs.get(docName);
  if (existing) return existing;

  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  const entry = { doc, awareness, connections: new Set<WebSocket>() };

  awareness.on('update', (
    { added, removed, updated }: { added: number[]; removed: number[]; updated: number[] },
    conn: unknown,
  ) => {
    const changedClients = added.concat(removed, updated);
    const awarenessUpdate = encodeAwarenessUpdate(awareness, changedClients);
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, messageAwareness);
    const message = encoding.toUint8Array(awarenessEncoder);
    const combined = new Uint8Array(message.length + awarenessUpdate.length);
    combined.set(message, 0);
    combined.set(awarenessUpdate, message.length);

    entry.connections.forEach((c) => {
      if (c !== conn && c.readyState === 1) {
        c.send(combined);
      }
    });
  });

  doc.on('update', (update: Uint8Array, origin: unknown) => {
    saveDocUpdateToDisk(docName, update);

    if (origin === Y) return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);

    entry.connections.forEach((c) => {
      if (c !== origin && c.readyState === 1) {
        c.send(message);
      }
    });
  });

  loadDocFromDisk(docName).then((data) => {
    if (data && data.length > 0) {
      Y.applyUpdate(doc, data);
    }
  }).catch(() => {});

  docs.set(docName, entry);
  return entry;
}

function handleMessage(ws: WebSocket, data: ArrayBuffer | Buffer, entry: { doc: Y.Doc; awareness: Awareness; connections: Set<WebSocket> }) {
  const buffer = Buffer.isBuffer(data) ? new Uint8Array(data) : new Uint8Array(data);
  const decoder = decoding.createDecoder(buffer);
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case messageSync: {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      readSyncStep1(decoder, encoder, entry.doc);
      ws.send(encoding.toUint8Array(encoder));
      break;
    }
    case messageAwareness: {
      const remaining = buffer.slice(decoder.pos);
      applyAwarenessUpdate(entry.awareness, remaining, ws);
      break;
    }
  }
}

function sendInitialSync(ws: WebSocket, entry: { doc: Y.Doc; awareness: Awareness; connections: Set<WebSocket> }) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  writeSyncStep1(encoder, entry.doc);
  ws.send(encoding.toUint8Array(encoder));

  const awarenessHeader = new Uint8Array(1);
  awarenessHeader[0] = messageAwareness;
  const awarenessData = encodeAwarenessUpdate(entry.awareness, Array.from(entry.awareness.getStates().keys()));
  const awarenessMessage = new Uint8Array(awarenessHeader.length + awarenessData.length);
  awarenessMessage.set(awarenessHeader, 0);
  awarenessMessage.set(awarenessData, awarenessHeader.length);
  ws.send(awarenessMessage);
}

function handleConnection(ws: WebSocket, docName: string) {
  const entry = getOrCreateDoc(docName);
  entry.connections.add(ws);

  ws.on('message', (data: ArrayBuffer | Buffer) => {
    handleMessage(ws, data, entry);
  });

  ws.on('close', () => {
    entry.connections.delete(ws);
    entry.awareness.states.forEach((_state, clientId) => {
      removeAwarenessStates(entry.awareness, [clientId], null);
    });
    if (entry.connections.size === 0) {
      setTimeout(() => {
        if (entry.connections.size === 0) {
          docs.delete(docName);
          entry.doc.destroy();
        }
      }, 60000);
    }
  });

  ws.on('error', () => {});

  sendInitialSync(ws, entry);
  logger.info({ docName }, 'Collab client connected');
}

export function createCollabServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    if (url.pathname.startsWith('/collab')) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    if (!req.url) {
      ws.close(4001, 'Missing room code');
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const roomCode = pathParts[pathParts.length - 1] || url.searchParams.get('room');

    if (!roomCode) {
      ws.close(4001, 'Missing room parameter');
      return;
    }

    handleConnection(ws, roomCode);
  });

  wss.on('error', (error: Error) => {
    logger.error(error, 'Collab WebSocket server error');
  });

  logger.info('Collab WebSocket server initialized');
  return wss;
}
