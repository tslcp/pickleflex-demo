export interface AuthUser {
  id: string;
  name: string;
  email: string;
  skillLevel: number;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

const SERVER_STATE: AuthState = { status: "loading", user: null };

let state: AuthState = SERVER_STATE;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): AuthState {
  return state;
}

export function getServerSnapshot(): AuthState {
  return SERVER_STATE;
}

/** Non-reactive read for modules outside React (e.g. the tournament store). */
export function getCurrentUser(): AuthUser | null {
  return state.user;
}

export async function refreshSession() {
  try {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const user = (await res.json()) as AuthUser;
      state = { status: "authenticated", user };
    } else {
      state = { status: "unauthenticated", user: null };
    }
  } catch {
    state = { status: "unauthenticated", user: null };
  }
  emit();
}

export function setSessionUser(user: AuthUser) {
  state = { status: "authenticated", user };
  emit();
}

export async function signOut() {
  await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
  state = { status: "unauthenticated", user: null };
  emit();
}
