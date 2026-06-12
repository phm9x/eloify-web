import { useCallback, useEffect, useState } from "react";
import { loadConfig, isConfigured, type AppConfig } from "@/data/config";
import { getSnapshot, invalidateSnapshot, type Snapshot } from "@/data/snapshot";
import { SheetsError } from "@/data/sheets";

export interface SnapshotState {
  config: AppConfig;
  data: Snapshot | null;
  loading: boolean;
  error: string | null;
  configured: boolean;
  /** Force a fresh read (invalidates the cache first). */
  refresh: () => void;
}

/**
 * Load the games+players snapshot for the current config. Returns loading /
 * error / not-configured states so screens can render the right placeholder.
 */
export function useSnapshot(): SnapshotState {
  const [config] = useState<AppConfig>(loadConfig);
  const configured = isConfigured(config);
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(configured);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSnapshot(config, { force: nonce > 0 })
      .then((snap) => {
        if (!cancelled) setData(snap);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof SheetsError ? e.message : String(e));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [config, configured, nonce]);

  const refresh = useCallback(() => {
    invalidateSnapshot();
    setNonce((n) => n + 1);
  }, []);

  return { config, data, loading, error, configured, refresh };
}
