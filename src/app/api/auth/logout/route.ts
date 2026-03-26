import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  APP_SESSION_DEADLINE_COOKIE,
  APP_SESSION_REMEMBER_COOKIE,
} from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // Continue clearing local app cookies even when Supabase is unreachable.
  }

  const cookieStore = await cookies();
  cookieStore.delete(APP_SESSION_DEADLINE_COOKIE);
  cookieStore.delete(APP_SESSION_REMEMBER_COOKIE);

  return NextResponse.json({ ok: true });
}
