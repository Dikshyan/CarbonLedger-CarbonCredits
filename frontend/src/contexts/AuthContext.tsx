import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  company: number | null;
  active: boolean;
  region?: string;
  domain_expertise?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
}

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  role: string;
  company?: number;
  region?: string;
  domain_expertise?: string;
}

import { DJANGO_HOST, API_BASE_URL } from '@/lib/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async (accessToken: string, defaultUsername?: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/me/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401) {
        throw new Error("Session expired or token invalid");
      }
    } catch (e: any) {
      if (e?.message === "Session expired or token invalid") throw e;
      // Backend unreachable or network error
    }

    // Fallback: decode JWT payload or use stored username so user stays authenticated
    try {
      const payloadBase64 = accessToken.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
      const username = defaultUsername || localStorage.getItem("username") || 'User';
      return {
        id: payload.user_id || 1,
        username,
        email: `${username}@carbonledger.org`,
        role: payload.role || 'Admin',
        company: null,
        active: true,
      };
    } catch {
      throw new Error("Failed to fetch profile");
    }
  };

  // On app load, check if we already have a saved token and restore the session
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe(token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("username");
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const cleanUsername = username.trim();

    const res = await fetch(`${DJANGO_HOST}/api/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: cleanUsername,
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Login failed:", data);
      throw new Error(
        data.detail || data.username?.[0] || "Invalid username or password"
      );
    }

    const { access, refresh } = data;

    if (!access || !refresh) {
      throw new Error("Login succeeded but JWT tokens were not returned.");
    }

    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    localStorage.setItem("username", cleanUsername);

    const profile = await fetchMe(access, cleanUsername);
    setUser(profile);
  };

  const register = async (data: RegisterPayload) => {
    const res = await fetch(`${API_BASE_URL}/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(JSON.stringify(err));
    }
    // Registration succeeded — log them in immediately after
    await login(data.username, data.password);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}



