import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearAuth, getStoredUser, homePathForUser, setAuth } from "../api/client";
import type { User } from "../api/types";

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isBank: boolean;
  isMsme: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => getStoredUser());

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ access_token: string; user: User }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuth(res.access_token, res.user);
    setUser(res.user);
    navigate(homePathForUser(res.user));
  }, [navigate]);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    navigate("/");
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isBank: user?.organization_type === "bank",
      isMsme: user?.organization_type === "msme",
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
