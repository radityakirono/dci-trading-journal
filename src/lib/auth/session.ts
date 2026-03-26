import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "viewer";

export const APP_SESSION_DEADLINE_COOKIE = "dci-session-deadline";
export const APP_SESSION_REMEMBER_COOKIE = "dci-remember-me";
export const ONE_DAY_IN_SECONDS = 60 * 60 * 24;
export const SEVEN_DAYS_IN_SECONDS = ONE_DAY_IN_SECONDS * 7;

export function getSessionDurationSeconds(rememberMe: boolean) {
  return rememberMe ? SEVEN_DAYS_IN_SECONDS : ONE_DAY_IN_SECONDS;
}

export function getSessionDeadlineValue(rememberMe: boolean, now = Date.now()) {
  return String(now + getSessionDurationSeconds(rememberMe) * 1000);
}

export function isSessionExpired(deadlineValue?: string | null, now = Date.now()) {
  if (!deadlineValue) return false;
  const deadline = Number(deadlineValue);
  if (!Number.isFinite(deadline)) return false;
  return now >= deadline;
}

export function sanitizeRedirectPath(candidate?: string | null) {
  if (!candidate) return "/";
  if (!candidate.startsWith("/")) return "/";
  if (candidate.startsWith("//")) return "/";
  return candidate;
}

export function getUserRole(user?: User | null): UserRole {
  const claimedRole =
    typeof user?.app_metadata?.role === "string"
      ? user.app_metadata.role
      : typeof user?.user_metadata?.role === "string"
        ? user.user_metadata.role
        : null;

  return claimedRole === "viewer" ? "viewer" : "admin";
}
