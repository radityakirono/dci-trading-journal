import { createAdminClient } from "./_supabase.mjs";

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function summarizeUser(user) {
  return {
    email: user.email ?? "(no email)",
    role:
      typeof user.app_metadata?.role === "string"
        ? user.app_metadata.role
        : "admin",
    created: Boolean(user.created_at),
  };
}

async function main() {
  const { client, env } = createAdminClient();
  const profiles = [
    {
      key: "admin",
      role: "admin",
      email: normalizeEmail(env.DCI_ADMIN_EMAIL),
      password: env.DCI_ADMIN_PASSWORD?.trim() ?? "",
    },
    {
      key: "viewer",
      role: "viewer",
      email: normalizeEmail(env.DCI_VIEWER_EMAIL),
      password: env.DCI_VIEWER_PASSWORD?.trim() ?? "",
    },
  ].filter((profile) => profile.email);

  if (profiles.length === 0) {
    console.log(
      "No auth seed profiles found. Set DCI_ADMIN_EMAIL/DCI_ADMIN_PASSWORD and optionally DCI_VIEWER_EMAIL/DCI_VIEWER_PASSWORD."
    );
    process.exit(1);
  }

  const { data: usersPage, error: listError } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Failed to list auth users: ${listError.message}`);
  }

  const existingUsers = usersPage.users;
  const existingByEmail = new Map(
    existingUsers
      .filter((user) => user.email)
      .map((user) => [normalizeEmail(user.email), user])
  );

  const results = [];

  for (const profile of profiles) {
    const existing = existingByEmail.get(profile.email);

    if (existing) {
      const { data, error } = await client.auth.admin.updateUserById(existing.id, {
        password: profile.password || undefined,
        app_metadata: {
          ...(existing.app_metadata ?? {}),
          role: profile.role,
        },
        user_metadata: {
          ...(existing.user_metadata ?? {}),
          role: profile.role,
        },
        email_confirm: true,
      });

      if (error) {
        throw new Error(`Failed to update ${profile.key} user ${profile.email}: ${error.message}`);
      }

      results.push({ action: "updated", ...summarizeUser(data.user) });
      continue;
    }

    if (!profile.password) {
      throw new Error(
        `Missing password for ${profile.key} user ${profile.email}. Provide DCI_${profile.key.toUpperCase()}_PASSWORD.`
      );
    }

    const { data, error } = await client.auth.admin.createUser({
      email: profile.email,
      password: profile.password,
      email_confirm: true,
      app_metadata: { role: profile.role },
      user_metadata: { role: profile.role },
    });

    if (error) {
      throw new Error(`Failed to create ${profile.key} user ${profile.email}: ${error.message}`);
    }

    results.push({ action: "created", ...summarizeUser(data.user) });
  }

  console.table(results);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
