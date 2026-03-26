import { NextResponse, type NextRequest } from "next/server";

import {
  requireAuthenticatedClient,
  requireWritableRole,
} from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ signalId: string }> }
) {
  const auth = await requireAuthenticatedClient(request);
  if ("error" in auth) return auth.error;
  const readOnlyResponse = requireWritableRole(auth.role);
  if (readOnlyResponse) return readOnlyResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload.", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  const { signalId } = await params;
  const status =
    typeof (body as { status?: unknown }).status === "string"
      ? (body as { status: string }).status
      : null;

  if (!signalId || !status || !["DISMISSED", "EXECUTED"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid signal action payload.", code: "INVALID_PAYLOAD" },
      { status: 400 }
    );
  }

  const { error } = await auth.client.from("signal_actions").upsert(
    {
      user_id: auth.user.id,
      signal_id: signalId,
      status,
      action_date: new Date().toISOString(),
    },
    {
      onConflict: "user_id,signal_id",
    }
  );

  if (error) {
    return NextResponse.json(
      { error: error.message, code: "SIGNAL_ACTION_UPSERT_FAILED" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
