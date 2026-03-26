import { NextResponse } from "next/server";

type ApiErrorInit = {
  error: string;
  code: string;
  status: number;
  headers?: HeadersInit;
};

export function apiError({ error, code, status, headers }: ApiErrorInit) {
  return NextResponse.json(
    { error, code },
    {
      status,
      headers,
    }
  );
}

