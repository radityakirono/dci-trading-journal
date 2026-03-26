"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "warning" | "info";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastRecord = ToastInput & {
  id: string;
  tone: ToastTone;
};

interface ToastContextValue {
  showToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => "",
  dismissToast: () => {},
});

const toneStyles: Record<
  ToastTone,
  {
    icon: typeof CheckCircle2;
    card: string;
    iconTone: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    card: "border-emerald-500/30 bg-emerald-500/10 text-emerald-50",
    iconTone: "text-emerald-300",
  },
  error: {
    icon: AlertTriangle,
    card: "border-destructive/40 bg-destructive/10 text-foreground",
    iconTone: "text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    card: "border-amber-500/30 bg-amber-500/10 text-amber-50",
    iconTone: "text-amber-300",
  },
  info: {
    icon: Info,
    card: "border-border/70 bg-card/95 text-foreground",
    iconTone: "text-primary",
  },
};

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ tone = "info", durationMs = 4200, ...toast }: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nextToast: ToastRecord = { id, tone, durationMs, ...toast };

      setToasts((current) => [...current.slice(-2), nextToast]);

      const timeoutId = window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
      timeoutsRef.current.set(id, timeoutId);

      return id;
    },
    [dismissToast]
  );

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      for (const timeoutId of timeouts.values()) {
        window.clearTimeout(timeoutId);
      }
      timeouts.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4 sm:bottom-6 sm:justify-end">
        <div className="flex w-full max-w-sm flex-col gap-3">
          <AnimatePresence initial={false}>
            {toasts.map((toast) => {
              const style = toneStyles[toast.tone];
              const Icon = style.icon;

              return (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={cn(
                    "pointer-events-auto rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur",
                    style.card
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn("mt-0.5 size-4 shrink-0", style.iconTone)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{toast.title}</p>
                      {toast.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {toast.description}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={() => dismissToast(toast.id)}
                      aria-label="Dismiss notification"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
}
