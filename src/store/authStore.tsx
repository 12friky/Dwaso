import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { User } from '../services/api';
import { saveRefreshToken, deleteRefreshToken } from '../services/tokenManager';

interface AuthState {
  user:        User | null;
  accessToken: string | null;
}

const initialState: AuthState = { user: null, accessToken: null };

type Action =
  | { type: 'SET_USER';      payload: { user: User; accessToken: string } }
  | { type: 'UPDATE_USER';   payload: { user: User } }
  | { type: 'UPDATE_TOKEN';  payload: { accessToken: string } }
  | { type: 'CLEAR_USER' };

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { user: action.payload.user, accessToken: action.payload.accessToken };
    case 'UPDATE_USER':
      return { ...state, user: action.payload.user };
    case 'UPDATE_TOKEN':
      return { ...state, accessToken: action.payload.accessToken };
    case 'CLEAR_USER':
      return initialState;
    default:
      return state;
  }
}

const AuthContext = createContext<{
  state:       AuthState;
  setUser:     (user: User, accessToken: string, refreshToken: string) => void;
  updateUser:  (user: User)         => void;
  updateToken: (accessToken: string) => void;
  clearUser:   ()                   => void;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Save refresh token to SecureStore, access token stays in memory only
  const setUser = (user: User, accessToken: string, refreshToken: string) => {
    saveRefreshToken(refreshToken).catch(() => {});
    dispatch({ type: 'SET_USER', payload: { user, accessToken } });
  };

  const updateUser  = (user: User)          => dispatch({ type: 'UPDATE_USER',  payload: { user } });
  const updateToken = (accessToken: string) => dispatch({ type: 'UPDATE_TOKEN', payload: { accessToken } });

  const clearUser = () => {
    deleteRefreshToken().catch(() => {});
    dispatch({ type: 'CLEAR_USER' });
  };

  return (
    <AuthContext.Provider value={{ state, setUser, updateUser, updateToken, clearUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default { AuthProvider, useAuth };
