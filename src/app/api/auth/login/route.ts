import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  APP_SESSION_DEADLINE_COOKIE,
  APP_SESSION_REMEMBER_COOKIE,
  getSessionDeadlineValue,
  getSessionDurationSeconds,
  getUserRole,
} from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload.", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid login payload.",
        code: "INVALID_PAYLOAD",
      },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        {
          error: "Invalid credentials. Please check your email and password.",
          code: "INVALID_CREDENTIALS",
        },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    const maxAge = getSessionDurationSeconds(parsed.data.rememberMe);
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    };

    cookieStore.set(
      APP_SESSION_DEADLINE_COOKIE,
      getSessionDeadlineValue(parsed.data.rememberMe),
      cookieOptions
    );
    cookieStore.set(
      APP_SESSION_REMEMBER_COOKIE,
      parsed.data.rememberMe ? "1" : "0",
      cookieOptions
    );

    return NextResponse.json({
      user: data.user,
      role: getUserRole(data.user),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Supabase environment variables are not configured.";

    return NextResponse.json(
      { error: message, code: "AUTH_CONFIG_ERROR" },
      { status: 500 }
    );
  }
}
