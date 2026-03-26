"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";

import type { UserRole } from "@/lib/auth/session";

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
    rememberMe: boolean
  ) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  loading: true,
  signIn: async () => "AuthProvider not mounted.",
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser: User | null;
  initialRole: UserRole | null;
}

export function AuthProvider({
  children,
  initialUser,
  initialRole,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [role, setRole] = useState<UserRole | null>(initialRole);
  const [loading, setLoading] = useState(false);

  const signIn = useCallback(
    async (
      email: string,
      password: string,
      rememberMe: boolean
    ): Promise<string | null> => {
      setLoading(true);

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password, rememberMe }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          return payload?.error ?? "Unable to sign in.";
        }

        const payload = (await response.json()) as {
          user: User;
          role: UserRole;
        };
        setUser(payload.user);
        setRole(payload.role);
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : "Unable to sign in.";
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      setUser(null);
      setRole(null);
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({ user, role, loading, signIn, signOut }),
    [user, role, loading, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
