/**
 * services/socket.ts
 * Singleton Socket.IO client for the Dwaso app.
 *
 * Rules:
 *  - Only ONE socket instance ever exists (module-level variable).
 *  - Connection is created on demand via connect() — never on import.
 *  - Call connect(token) after the user logs in.
 *  - Call disconnect() when the user logs out.
 *
 * Usage:
 *   import SocketService from '@/services/socket';
 *   SocketService.connect(accessToken);
 *   SocketService.on('notification', handler);
 *   SocketService.emit('join_room', { room: 'sellers' });
 *   SocketService.disconnect();
 */

import { io, Socket } from 'socket.io-client';
import { BASE_URL }   from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

type EventHandler = (...args: any[]) => void;

// ── Singleton ─────────────────────────────────────────────────────────────────

let socket: Socket | null = null;

// ── Internal helpers ──────────────────────────────────────────────────────────

const attachCoreListeners = () => {
  if (!socket) return;

  socket.on('connect', () => {
    console.log('[Socket] ✅ connected — id:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] disconnected — reason:', reason);
    // Socket.IO will auto-reconnect unless reason is 'io server disconnect'
    // (which means the server kicked us out intentionally — e.g. token revoked)
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] connection error:', err.message);
    // If the server rejected the token, stop trying to reconnect
    if (err.message.includes('Authentication error')) {
      socket?.disconnect();
    }
  });

  socket.io.on('reconnect', (attempt) => {
    console.log(`[Socket] reconnected after ${attempt} attempt(s)`);
  });

  socket.io.on('reconnect_attempt', (attempt) => {
    console.log(`[Socket] reconnect attempt #${attempt}…`);
  });

  socket.io.on('reconnect_error', (err) => {
    console.warn('[Socket] reconnect error:', err.message);
  });

  socket.io.on('reconnect_failed', () => {
    console.error('[Socket] reconnect failed — giving up');
  });
};

// ── Public API ────────────────────────────────────────────────────────────────

const SocketService = {
  /**
   * Create (or reuse) the socket and connect using the user's JWT.
   * Safe to call multiple times — will reuse the existing connection if
   * it is already connected.
   */
  connect(token: string): Socket {
    if (socket?.connected) return socket;

    // If a stale disconnected instance exists, clean it up first
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }

    socket = io(BASE_URL, {
      // Send JWT in the handshake so the server can verify it immediately
      auth: { token },

      // Prefer WebSocket; fall back to long-polling if needed
      transports: ['websocket', 'polling'],

      // Auto-reconnect with exponential back-off
      reconnection:        true,
      reconnectionAttempts: 10,
      reconnectionDelay:   1000,     // start at 1 s
      reconnectionDelayMax: 10000,   // cap at 10 s
      randomizationFactor: 0.5,

      // How long to wait before considering the connection failed
      timeout: 10000,

      // Do not auto-connect — we call socket.connect() manually below
      autoConnect: false,
    });

    attachCoreListeners();

    // Now actually open the connection
    socket.connect();

    return socket;
  },

  /**
   * Cleanly disconnect and destroy the socket instance.
   * Call on logout so the server also cleans up the session.
   */
  disconnect() {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
      console.log('[Socket] disconnected and cleaned up');
    }
  },

  /**
   * Emit an event to the server.
   * No-op if not connected.
   */
  emit(event: string, data?: any) {
    if (!socket?.connected) {
      console.warn(`[Socket] emit "${event}" skipped — not connected`);
      return;
    }
    socket.emit(event, data);
  },

  /**
   * Listen to an event from the server.
   * Returns an unsubscribe function for easy cleanup in useEffect.
   */
  on(event: string, handler: EventHandler): () => void {
    socket?.on(event, handler);
    return () => socket?.off(event, handler);
  },

  /**
   * Remove a specific listener.
   */
  off(event: string, handler?: EventHandler) {
    socket?.off(event, handler);
  },

  /**
   * Check if currently connected.
   */
  isConnected(): boolean {
    return socket?.connected ?? false;
  },

  /**
   * Expose the raw socket if advanced usage is needed.
   */
  getSocket(): Socket | null {
    return socket;
  },
};

export default SocketService;
