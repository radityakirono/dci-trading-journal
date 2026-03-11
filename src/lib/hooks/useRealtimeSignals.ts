'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

interface QuantSignal {
  id: string;
  external_signal_key: string;
  run_id: string | null;
  created_at: string;
  signal_ts: string;
  ticker: string;
  ticker_short: string;
  signal_type: 'BUY' | 'SELL' | 'HOLD' | 'ALERT';
  raw_action: string;
  model_name: string;
  message: string;
  source: string;
  regime: string | null;
  conviction: number | null;
  supporting_metrics: Record<string, unknown>;
  trade_ticket: Record<string, unknown>;
  delivery_status: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
  read_at: string | null;
}

/**
 * Hook that subscribes to real-time INSERT events on quant_signals.
 * Returns newly inserted signals as they arrive.
 *
 * Usage:
 *   const { newSignals, isConnected } = useRealtimeSignals();
 */
export function useRealtimeSignals() {
  const [newSignals, setNewSignals] = useState<QuantSignal[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const clearSignals = useCallback(() => setNewSignals([]), []);

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client not available for realtime');
      return;
    }

    const channel = supabase
      .channel('quant-signals-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quant_signals',
        },
        (payload) => {
          const newSignal = payload.new as QuantSignal;
          setNewSignals((prev) => [newSignal, ...prev]);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { newSignals, isConnected, clearSignals };
}
