"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogIn, LogOut, Shield, User as UserIcon } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AuthButton() {
  const router = useRouter();
  const { user, role, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />;
  }

  if (!user) {
    return (
      <Button variant="outline" size="default" onClick={() => router.push("/login")}>
        <LogIn data-icon="inline-start" className="size-4" />
        Sign In
      </Button>
    );
  }

  const displayName = user.email?.split("@")[0] ?? "User";

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        size="default"
        onClick={() => setOpen((current) => !current)}
      >
        <UserIcon data-icon="inline-start" className="size-4" />
        <span className="max-w-[120px] truncate">{displayName}</span>
        <ChevronDown className="size-4" />
      </Button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-border/70 bg-card p-3 shadow-2xl">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{displayName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="size-3.5" />
              Role
            </span>
            <Badge variant={role === "viewer" ? "secondary" : "default"}>
              {role ?? "admin"}
            </Badge>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full justify-start"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.replace("/login");
            }}
          >
            <LogOut data-icon="inline-start" className="size-4" />
            Sign Out
          </Button>
        </div>
      ) : null}
    </div>
  );
}
