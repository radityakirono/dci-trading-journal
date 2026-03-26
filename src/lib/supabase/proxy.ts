import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  APP_SESSION_DEADLINE_COOKIE,
  APP_SESSION_REMEMBER_COOKIE,
  isSessionExpired,
  sanitizeRedirectPath,
} from "@/lib/auth/session";
import { getSupabaseConfig, hasSupabaseConfig } from "@/lib/supabase/config";

type CookieMutation = {
  name: string;
  value: string;
  options: CookieOptions;
};

const PUBLIC_PATHS = ["/login"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

function buildLoginRedirect(request: NextRequest, reason?: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set(
    "redirectTo",
    sanitizeRedirectPath(`${request.nextUrl.pathname}${request.nextUrl.search}`)
  );
  if (reason) {
    url.searchParams.set("reason", reason);
  }
  return url;
}

export async function updateSession(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return NextResponse.next({ request });
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseConfig();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieMutation[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const deadlineValue = request.cookies.get(APP_SESSION_DEADLINE_COOKIE)?.value;
  const sessionExpired = isSessionExpired(deadlineValue);

  if (sessionExpired) {
    await supabase.auth.signOut();
    response.cookies.delete(APP_SESSION_DEADLINE_COOKIE);
    response.cookies.delete(APP_SESSION_REMEMBER_COOKIE);

    if (!isPublicPath(request.nextUrl.pathname)) {
      return NextResponse.redirect(buildLoginRedirect(request, "session_expired"));
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.redirect(buildLoginRedirect(request));
  }

  if (user && isPublicPath(request.nextUrl.pathname)) {
    const redirectTo = sanitizeRedirectPath(
      request.nextUrl.searchParams.get("redirectTo")
    );
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return response;
}
