"use client";

import { Suspense, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, Loader2, Mail } from "lucide-react";

import { sanitizeRedirectPath } from "@/lib/auth/session";
import { useAuth } from "@/components/auth/auth-provider";
import { DciLogo } from "@/components/brand/dci-logo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, user, loading } = useAuth();
  const { showToast } = useToast();
  const passwordHelpId = useId();
  const emailHelpId = useId();
  const errorRef = useRef<HTMLDivElement | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const redirectTo = sanitizeRedirectPath(searchParams.get("redirectTo"));
  const reason = searchParams.get("reason");

  useEffect(() => {
    if (user) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router, user]);

  useEffect(() => {
    if (reason !== "session_expired") return;

    showToast({
      tone: "warning",
      title: "Session expired",
      description: "Please sign in again to continue.",
    });

    const nextUrl =
      redirectTo && redirectTo !== "/"
        ? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
        : "/login";
    router.replace(nextUrl);
  }, [reason, redirectTo, router, showToast]);

  useEffect(() => {
    if (!error) return;
    errorRef.current?.focus();
  }, [error]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await signIn(email, password, rememberMe);

    if (result) {
      setError(result);
      setSubmitting(false);
    } else {
      router.replace(redirectTo);
    }
  }

  function handleForgotPassword() {
    showToast({
      tone: "warning",
      title: "Contact an admin",
      description: "Password reset is still managed manually. Please contact your DCI admin.",
    });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      {/* Ambient gradient */}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(90%_70%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_12%,transparent),transparent_72%)]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex justify-center">
          <DciLogo />
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to access the DCI Trading Journal securely
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              {error ? (
                <motion.div
                  ref={errorRef}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  role="alert"
                  tabIndex={-1}
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </motion.div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    inputMode="email"
                    className="pl-9"
                    aria-describedby={emailHelpId}
                    aria-invalid={Boolean(error)}
                    disabled={submitting}
                  />
                </div>
                <p id={emailHelpId} className="text-xs text-muted-foreground">
                  Use the provisioned account email shared by your DCI administrator.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pl-9"
                    aria-describedby={passwordHelpId}
                    aria-invalid={Boolean(error)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="size-4 rounded border border-border bg-background"
                    disabled={submitting || loading}
                  />
                  Remember Me
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <p id={passwordHelpId} className="text-xs text-muted-foreground">
                Password resets are handled manually by a DCI administrator.
              </p>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={submitting || loading}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-small text-muted-foreground">
          Internal access only. Accounts are provisioned by an admin.
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginPageContent />
    </Suspense>
  );
}
