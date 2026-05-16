import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, Student } from '@/types';
import api from '@/lib/api';

interface AuthContextType {
  user: User | Student | null;
  isAuthenticated: boolean;
  /** False until the first run has finished reading token/session and optional restore fetch */
  initialSessionResolved: boolean;
  /** Reload user from `/api/users/:id` (includes Student.currentStatus / sitPhase after uploads). */
  refreshSessionUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'sit_portal_session';
const TOKEN_KEY = 'sit_portal_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | Student | null>(null);
  const [initialSessionResolved, setInitialSessionResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const session = localStorage.getItem(SESSION_KEY);
        if (!token || !session) {
          if (!token) {
            localStorage.removeItem(SESSION_KEY);
          }
          return;
        }

        const sessionData = JSON.parse(session) as { userId?: string };
        if (!sessionData?.userId) {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(TOKEN_KEY);
          return;
        }

        const fetchedUser = await api.getUserById(sessionData.userId);
        if (!cancelled) setUser(fetchedUser);
      } catch (error) {
        console.warn('Could not restore session from API', error);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        if (!cancelled) setInitialSessionResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, email: user.email }));
      } catch (error) {
        console.error('Error saving session:', error);
      }
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.login(email, password);
      if (res && res.token && res.user) {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: res.user.id }));
        setUser(res.user);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  const refreshSessionUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const sessionRaw = localStorage.getItem(SESSION_KEY);
      if (!sessionRaw) return;
      const parsed = JSON.parse(sessionRaw) as { userId?: string };
      if (!parsed?.userId) return;
      const fetched = await api.getUserById(parsed.userId);
      setUser(fetched);
    } catch {
      console.warn('Could not refresh session user');
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        initialSessionResolved,
        refreshSessionUser,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
