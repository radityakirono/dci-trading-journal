import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, "utf8");
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

export function loadRuntimeEnv(cwd = process.cwd()) {
  const envFiles = [".env.local", ".env"].map((file) => path.join(cwd, file));
  const merged = {};

  for (const file of envFiles) {
    Object.assign(merged, parseEnvFile(file));
  }

  return {
    ...merged,
    ...process.env,
  };
}

export function getSupabaseAdminConfig(cwd = process.cwd()) {
  const env = loadRuntimeEnv(cwd);
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or legacy SUPABASE_URL and SUPABASE_KEY."
    );
  }

  return {
    env,
    url,
    serviceRoleKey,
  };
}

export function createAdminClient(cwd = process.cwd()) {
  const { url, serviceRoleKey, env } = getSupabaseAdminConfig(cwd);

  return {
    env,
    client: createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }),
  };
}
