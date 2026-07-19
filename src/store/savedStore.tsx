/**
 * savedStore.tsx
 * DB-backed saved posts store.
 *
 * - On login: call loadSaved(accessToken) to hydrate from the server.
 * - savePost / unsavePost call the API then update local state optimistically.
 * - clearSaved calls the API and clears local state.
 * - isSaved is purely local (instant UI feedback).
 */

import React, {
  createContext, useContext, useReducer, ReactNode, useCallback,
} from 'react';
import { Post, getSavedApi, savePostApi, unsavePostApi, clearSavedApi } from '../services/api';

// ─── State ────────────────────────────────────────────────────────────────────
interface SavedState {
  posts: Post[];
  loading: boolean;
}

const initialState: SavedState = { posts: [], loading: false };

// ─── Actions ──────────────────────────────────────────────────────────────────
type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_POSTS';   payload: Post[] }
  | { type: 'ADD_POST';    payload: Post }
  | { type: 'REMOVE_POST'; payload: string }   // post _id
  | { type: 'CLEAR' };

function reducer(state: SavedState, action: Action): SavedState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_POSTS':
      return { ...state, posts: action.payload };
    case 'ADD_POST':
      if (state.posts.some((p) => p._id === action.payload._id)) return state;
      return { ...state, posts: [action.payload, ...state.posts] };
    case 'REMOVE_POST':
      return { ...state, posts: state.posts.filter((p) => p._id !== action.payload) };
    case 'CLEAR':
      return { ...state, posts: [] };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface SavedContextType {
  state:      SavedState;
  loadSaved:  (accessToken: string) => Promise<void>;
  savePost:   (post: Post,   accessToken: string) => Promise<void>;
  unsavePost: (id: string,   accessToken: string) => Promise<void>;
  clearSaved: (accessToken: string) => Promise<void>;
  isSaved:    (id: string) => boolean;
}

const SavedContext = createContext<SavedContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function SavedProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  /** Fetch saved posts from the server — call on login / app mount */
  const loadSaved = useCallback(async (accessToken: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await getSavedApi(accessToken);
      dispatch({ type: 'SET_POSTS', payload: res.data.posts });
    } catch {
      // non-fatal — user just won't see saved posts until retry
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  /** Optimistically add, then persist. Rolls back on failure. */
  const savePost = useCallback(async (post: Post, accessToken: string) => {
    dispatch({ type: 'ADD_POST', payload: post }); // optimistic
    try {
      await savePostApi(post._id, accessToken);
    } catch {
      dispatch({ type: 'REMOVE_POST', payload: post._id }); // rollback
    }
  }, []);

  /** Optimistically remove, then persist. Rolls back on failure. */
  const unsavePost = useCallback(async (id: string, accessToken: string) => {
    const existing = state.posts.find((p) => p._id === id);
    dispatch({ type: 'REMOVE_POST', payload: id }); // optimistic
    try {
      await unsavePostApi(id, accessToken);
    } catch {
      if (existing) dispatch({ type: 'ADD_POST', payload: existing }); // rollback
    }
  }, [state.posts]);

  /** Clear all saved posts both locally and on the server. */
  const clearSaved = useCallback(async (accessToken: string) => {
    dispatch({ type: 'CLEAR' }); // optimistic
    try {
      await clearSavedApi(accessToken);
    } catch {
      // Reload from server to restore correct state
      await loadSaved(accessToken);
    }
  }, [loadSaved]);

  const isSaved = useCallback(
    (id: string) => state.posts.some((p) => p._id === id),
    [state.posts]
  );

  return (
    <SavedContext.Provider value={{ state, loadSaved, savePost, unsavePost, clearSaved, isSaved }}>
      {children}
    </SavedContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSaved() {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used inside <SavedProvider>');
  return ctx;
}
