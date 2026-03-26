import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import {
  APP_SESSION_DEADLINE_COOKIE,
  getUserRole,
  isSessionExpired,
  type UserRole,
} from "@/lib/auth/session";
import { getSupabaseConfig } from "@/lib/supabase/config";

type AuthSuccess = {
  client: SupabaseClient;
  user: User;
  role: UserRole;
};

type AuthResult = AuthSuccess | { error: NextResponse };

function readBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function buildUnauthorizedResponse(message: string, code = "UNAUTHORIZED", status = 401) {
  return NextResponse.json({ error: message, code }, { status });
}

function createRouteHandlerSupabaseClient(request: NextRequest) {
  const { url, publishableKey } = getSupabaseConfig();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Session refresh is handled centrally in proxy.ts.
      },
    },
  });
}

export async function requireAuthenticatedClient(
  request: NextRequest
): Promise<AuthResult> {
  try {
    const deadlineValue = request.cookies.get(APP_SESSION_DEADLINE_COOKIE)?.value;
    if (isSessionExpired(deadlineValue)) {
      return {
        error: buildUnauthorizedResponse(
          "Session expired. Please sign in again.",
          "SESSION_EXPIRED"
        ),
      };
    }

    const token = readBearerToken(request);

    if (token) {
      const { url, publishableKey } = getSupabaseConfig();
      const client = createClient(url, publishableKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });

      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) {
        return {
          error: buildUnauthorizedResponse(
            "Unauthorized. Invalid or expired session.",
            "INVALID_SESSION"
          ),
        };
      }

      return { client, user: data.user, role: getUserRole(data.user) };
    }

    const client = createRouteHandlerSupabaseClient(request);
    const { data, error } = await client.auth.getUser();

    if (error || !data.user) {
      return {
        error: buildUnauthorizedResponse(
          "Unauthorized. Please sign in first.",
          "UNAUTHORIZED"
        ),
      };
    }

    return { client, user: data.user, role: getUserRole(data.user) };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Supabase environment variables are not configured.";
    return {
      error: NextResponse.json(
        { error: message, code: "AUTH_CONFIG_ERROR" },
        { status: 500 }
      ),
    };
  }
}

export function requireWritableRole(role: UserRole) {
  if (role === "viewer") {
    return NextResponse.json(
      {
        error: "Read-only access. This action is only available to admin users.",
        code: "READ_ONLY",
      },
      { status: 403 }
    );
  }

  return null;
}
