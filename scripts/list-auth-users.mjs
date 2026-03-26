import { createAdminClient } from "./_supabase.mjs";

function summarizeUser(user) {
  return {
    id: user.id,
    email: user.email ?? "(no email)",
    role:
      typeof user.app_metadata?.role === "string"
        ? user.app_metadata.role
        : "admin",
    emailConfirmed: Boolean(user.email_confirmed_at),
    createdAt: user.created_at ?? null,
  };
}

async function main() {
  const { client } = createAdminClient();
  const { data, error } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw new Error(`Failed to list auth users: ${error.message}`);
  }

  const rows = data.users.map(summarizeUser);
  if (rows.length === 0) {
    console.log("No auth users found.");
    return;
  }

  console.table(rows);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
