import { useState, useCallback } from "react";
import { loadConfig, patchConfig } from "@/data/config";

/** Selected rating-model key, remembered in localStorage across sessions. */
export function useModelKey(): [string, (key: string) => void] {
  const [key, setKey] = useState<string>(() => loadConfig().modelKey);
  const update = useCallback((next: string) => {
    setKey(next);
    patchConfig("modelKey", next);
  }, []);
  return [key, update];
}
