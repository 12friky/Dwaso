/**
 * Lightweight global auth store using React context + useReducer.
 * No external dependency needed.
 */
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { User } from '../services/api';

// ─── State ────────────────────────────────────────────────────────────────────
interface AuthState {
  user: User | null;
  accessToken: string | null;
}

const initialState: AuthState = { user: null, accessToken: null };

// ─── Actions ──────────────────────────────────────────────────────────────────
type Action =
  | { type: 'SET_USER';    payload: { user: User; accessToken: string } }
  | { type: 'UPDATE_USER'; payload: { user: User } }
  | { type: 'CLEAR_USER' };

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { user: action.payload.user, accessToken: action.payload.accessToken };
    case 'UPDATE_USER':
      // Merge — keeps the existing token, only refreshes the user object
      return { ...state, user: action.payload.user };
    case 'CLEAR_USER':
      return initialState;
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<{
  state: AuthState;
  setUser:    (user: User, accessToken: string) => void;
  updateUser: (user: User) => void;
  clearUser:  () => void;
} | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setUser    = (user: User, accessToken: string) =>
    dispatch({ type: 'SET_USER', payload: { user, accessToken } });

  const updateUser = (user: User) =>
    dispatch({ type: 'UPDATE_USER', payload: { user } });

  const clearUser  = () => dispatch({ type: 'CLEAR_USER' });

  return (
    <AuthContext.Provider value={{ state, setUser, updateUser, clearUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// Compatibility default export for any module import shape.
export default { AuthProvider, useAuth };
