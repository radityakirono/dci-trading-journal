import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig, hasSupabaseConfig } from "@/lib/supabase/config";

let browserClient: SupabaseClient | null = null;

export const supabase: SupabaseClient | null = hasSupabaseConfig()
  ? (browserClient ??=
      createBrowserClient(
        getSupabaseConfig().url,
        getSupabaseConfig().publishableKey
      ))
  : null;
