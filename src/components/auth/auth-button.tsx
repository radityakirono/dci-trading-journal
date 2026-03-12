"use client";

import { useRouter } from "next/navigation";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

export function AuthButton() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
    );
  }

  if (!user) {
    return (
      <Button
        variant="outline"
        size="default"
        onClick={() => router.push("/login")}
      >
        <LogIn data-icon="inline-start" className="size-4" />
        Sign In
      </Button>
    );
  }

  const displayName =
    user.email?.split("@")[0] ?? "User";

  return (
    <div className="flex items-center gap-2">
      <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
        <UserIcon className="size-3.5" />
        <span className="max-w-[120px] truncate">{displayName}</span>
      </span>
      <Button
        variant="ghost"
        size="default"
        onClick={() => void signOut()}
      >
        <LogOut data-icon="inline-start" className="size-4" />
        <span className="hidden sm:inline">Sign Out</span>
      </Button>
    </div>
  );
}

