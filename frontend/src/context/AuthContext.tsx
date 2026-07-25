import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: number;
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
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Globals fetch interceptor to automatically hook credentials to every outgoing api lookup.
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

  // Auto clean stale session on 401 Authorization failure
  if (response.status === 401 && !url.includes('/api/users/login')) {
    localStorage.removeItem('admine_token');
    localStorage.removeItem('admine_user');
    // Use timeout to prevent rendering cycle issues in React router
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  }

  return response;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in local storage
    const storedUser = localStorage.getItem('admine_user');
    const token = localStorage.getItem('admine_token');
    
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
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
  };

  const logout = () => {
    localStorage.removeItem('admine_token');
    localStorage.removeItem('admine_user');
    setUser(null);
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

