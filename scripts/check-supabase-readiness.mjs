import { createAdminClient } from "./_supabase.mjs";

async function inspectTable(client, table, options = {}) {
  const { orderBy, select = "id", limit = 1 } = options;

  let query = client.from(table).select(select).limit(limit);
  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
  }

  const { data, error } = await query;

  if (error) {
    return {
      ok: false,
      reason: error.message,
    };
  }

  return {
    ok: true,
    rows: Array.isArray(data) ? data.length : 0,
    sample: Array.isArray(data) && data.length > 0 ? data[0] : null,
  };
}

async function main() {
  const { client } = createAdminClient();

  const { data: usersPage, error: userError } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (userError) {
    throw new Error(`Failed to list auth users: ${userError.message}`);
  }

  const users = usersPage.users;
  const roleCounts = users.reduce(
    (accumulator, user) => {
      const role =
        typeof user.app_metadata?.role === "string" ? user.app_metadata.role : "admin";
      accumulator[role] = (accumulator[role] ?? 0) + 1;
      return accumulator;
    },
    {}
  );

  const checks = {
    authUsers: {
      ok: true,
      count: users.length,
      roles: roleCounts,
    },
    transactions: await inspectTable(client, "transactions"),
    cashJournal: await inspectTable(client, "cash_journal"),
    signalActions: await inspectTable(client, "signal_actions"),
    notifications: await inspectTable(client, "notifications"),
    equitySnapshots: await inspectTable(client, "equity_snapshots", {
      select: "date, total_equity, created_at",
      orderBy: { column: "date", ascending: false },
    }),
    quantSignals: await inspectTable(client, "quant_signals", {
      select: "id, signal_ts, ticker_short, signal_type",
      orderBy: { column: "signal_ts", ascending: false },
    }),
    signalRuns: await inspectTable(client, "signal_runs", {
      select: "run_id, status, started_at",
      orderBy: { column: "started_at", ascending: false },
    }),
    signalDeliveryLog: await inspectTable(client, "signal_delivery_log", {
      select: "id, quant_signal_id, status, created_at",
      orderBy: { column: "created_at", ascending: false },
    }),
    marketDataCache: await inspectTable(client, "market_data_cache", {
      select: "ticker, price, updated_at",
      orderBy: { column: "updated_at", ascending: false },
    }),
  };

  console.log(JSON.stringify(checks, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
