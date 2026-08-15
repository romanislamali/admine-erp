import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export interface User {
  id: string;
  name: string;
  username: string;
  phone?: string;
  email?: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fired by the fetch interceptor below (which runs outside React) so AuthProvider can
// react to an invalidated session the same way everywhere: clear state, and let the
// existing <Navigate> in ProtectedLayout send the user to /login on next render.
const SESSION_INVALID_EVENT = 'admine:session-invalid';

// Reads a JWT's `exp` claim (seconds since epoch) without verifying the signature —
// only used client-side to schedule a proactive logout; the server still enforces it.
function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

// Global fetch interceptor to automatically hook credentials to every outgoing api lookup.
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  let url = '';
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.href;
  } else if (input && typeof input === 'object' && 'url' in input) {
    url = (input as Request).url;
  }

  // Append token to internal api calls
  if (url.startsWith('/api/') || url.includes('/api/')) {
    const token = localStorage.getItem('admine_token');
    if (token) {
      init = init || {};
      const headers = new Headers(init.headers || {});
      headers.set('Authorization', `Bearer ${token}`);
      init.headers = headers;
    }
  }

  const response = await originalFetch(input, init);

  // Session is no longer valid (expired, tampered, or revoked) — notify AuthProvider.
  if (response.status === 401 && !url.includes('/api/users/login')) {
    window.dispatchEvent(new Event(SESSION_INVALID_EVENT));
  }

  return response;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSession = () => {
    if (expiryTimer.current) {
      clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
    }
    localStorage.removeItem('admine_token');
    localStorage.removeItem('admine_user');
    setUser(null);
  };

  // Proactively end the session the moment the token's own exp claim elapses, even if
  // the tab is left idle and never fires another API call to discover it reactively.
  const armExpiryTimer = (token: string) => {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    const expiresAt = getTokenExpiryMs(token);
    if (expiresAt === null) return;
    const delay = expiresAt - Date.now();
    if (delay <= 0) {
      clearSession();
      return;
    }
    expiryTimer.current = setTimeout(clearSession, delay);
  };

  useEffect(() => {
    window.addEventListener(SESSION_INVALID_EVENT, clearSession);
    return () => window.removeEventListener(SESSION_INVALID_EVENT, clearSession);
  }, []);

  useEffect(() => {
    // Check if user is stored in local storage
    const storedUser = localStorage.getItem('admine_user');
    const token = localStorage.getItem('admine_token');

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
        armExpiryTimer(token);
      } catch (err) {
        localStorage.removeItem('admine_user');
        localStorage.removeItem('admine_token');
      }
    } else {
      // Clear if one is mismatching
      localStorage.removeItem('admine_user');
      localStorage.removeItem('admine_token');
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await originalFetch('/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const { user: userData, token } = await res.json();
    localStorage.setItem('admine_token', token);
    localStorage.setItem('admine_user', JSON.stringify(userData));
    setUser(userData);
    armExpiryTimer(token);
  };

  const logout = async () => {
    const token = localStorage.getItem('admine_token');
    if (token) {
      try {
        await originalFetch('/api/users/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Backend unreachable — still proceed to clear the local session.
      }
    }
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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

