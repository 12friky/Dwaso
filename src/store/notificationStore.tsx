/**
 * notificationStore.tsx
 * Manages in-app notifications fetched from the backend.
 * Listens to socket `new_notification` events for real-time updates.
 */

import React, {
  createContext, useContext, useReducer, useCallback, useRef, ReactNode,
} from 'react';
import {
  AppNotification,
  getNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  clearAllNotificationsApi,
} from '../services/api';

// ─── State ────────────────────────────────────────────────────────────────────
interface NotifState {
  notifications: AppNotification[];
  unreadCount:   number;
  loading:       boolean;
}
const initial: NotifState = { notifications: [], unreadCount: 0, loading: false };

// ─── Actions ──────────────────────────────────────────────────────────────────
type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ALL';     payload: { notifications: AppNotification[]; unreadCount: number } }
  | { type: 'PREPEND';     payload: AppNotification }
  | { type: 'MARK_READ';   payload: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'CLEAR' };

function reducer(state: NotifState, action: Action): NotifState {
  switch (action.type) {
    case 'SET_LOADING':  return { ...state, loading: action.payload };
    case 'SET_ALL':      return { ...state, ...action.payload };
    case 'PREPEND': {
      const already = state.notifications.some((n) => n._id === action.payload._id);
      if (already) return state;
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount:   state.unreadCount + 1,
      };
    }
    case 'MARK_READ': {
      const updated = state.notifications.map((n) =>
        n._id === action.payload ? { ...n, read: true } : n
      );
      const unread = updated.filter((n) => !n.read).length;
      return { ...state, notifications: updated, unreadCount: unread };
    }
    case 'MARK_ALL_READ': {
      const updated = state.notifications.map((n) => ({ ...n, read: true }));
      return { ...state, notifications: updated, unreadCount: 0 };
    }
    case 'CLEAR': return { ...state, notifications: [], unreadCount: 0 };
    default:       return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface NotifContextType {
  state:          NotifState;
  loadNotifications: (token: string) => Promise<void>;
  prependNotif:   (notif: AppNotification) => void;
  markRead:       (id: string, token: string) => Promise<void>;
  markAllRead:    (token: string) => Promise<void>;
  clearAll:       (token: string) => Promise<void>;
  reset:          () => void;
}
const NotifContext = createContext<NotifContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const requestIdRef = useRef(0);

  const loadNotifications = useCallback(async (token: string) => {
    const requestId = ++requestIdRef.current;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await getNotificationsApi(token);
      if (requestId === requestIdRef.current) {
        dispatch({ type: 'SET_ALL', payload: res.data });
      }
    } catch { /* non-fatal */ }
    finally {
      if (requestId === requestIdRef.current) {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  }, []);

  const prependNotif = useCallback((notif: AppNotification) => {
    dispatch({ type: 'PREPEND', payload: notif });
  }, []);

  const markRead = useCallback(async (id: string, token: string) => {
    dispatch({ type: 'MARK_READ', payload: id });
    try { await markNotificationReadApi(id, token); } catch { /* rollback not critical */ }
  }, []);

  const markAllRead = useCallback(async (token: string) => {
    dispatch({ type: 'MARK_ALL_READ' });
    try { await markAllNotificationsReadApi(token); } catch {}
  }, []);

  const clearAll = useCallback(async (token: string) => {
    dispatch({ type: 'CLEAR' });
    try { await clearAllNotificationsApi(token); } catch {}
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    dispatch({ type: 'CLEAR' });
  }, []);

  return (
    <NotifContext.Provider value={{ state, loadNotifications, prependNotif, markRead, markAllRead, clearAll, reset }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
}
