"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as store from "@/lib/auth-store";
import type { AuthUser } from "@/lib/auth-store";
import { isPublicPath } from "@/lib/public-paths";

interface AuthContextValue {
  status: store.AuthStatus;
  user: AuthUser | null;
  setSessionUser: (user: AuthUser) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    store.refreshSession();
  }, []);

  // The proxy only checks that a session cookie is present, not that it's
  // still valid server-side (e.g. after the local database is reset). If the
  // real check here comes back unauthenticated on a protected page, there's
  // nothing else that would ever move the user off it — send them to sign in
  // instead of leaving the page stuck showing its loading state forever.
  useEffect(() => {
    if (state.status === "unauthenticated" && !isPublicPath(pathname)) {
      router.replace("/signin");
    }
  }, [state.status, pathname, router]);

  const value: AuthContextValue = {
    status: state.status,
    user: state.user,
    setSessionUser: store.setSessionUser,
    signOut: store.signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
