// App configuration, persisted to localStorage (no values baked into the build).
//
// Spreadsheet ID + gids and the Worker endpoint live here so the same static
// build can point at any sheet/Worker. The Settings screen reads and writes this.

const STORAGE_KEY = "eloify.config.v1";

export interface AppConfig {
  /** Google Spreadsheet ID (from the sheet URL). */
  spreadsheetId: string;
  /** Worksheet gids (Path B Worker resolves ranges from these). */
  gamesGid: number;
  playersGid: number;
  /** Base URL of the Cloudflare Worker proxy (Path B), e.g. https://eloify.<sub>.workers.dev */
  workerBaseUrl: string;
  /** Optional shared token gating the Worker; sent as a bearer header when set. */
  sharedToken: string;
  /** Rating model key (see core/elo). Remembered across sessions. */
  modelKey: string;
}

// Defaults so a fresh install (incl. the home-screen PWA, which has its own
// storage) connects automatically with no Settings step. Neither value is a
// secret — the Worker URL is a public endpoint and the spreadsheet id is an
// identifier; both are already visible in the app's network requests. The real
// secret (the service-account key) lives only in the Worker. Both stay
// overridable in Settings.
export const DEFAULT_CONFIG: AppConfig = {
  spreadsheetId: "1pEy27j85mX0HunfIDY9U_18XEXf6Xn6FE08cgMV28b4",
  gamesGid: 0,
  playersGid: 207566793,
  workerBaseUrl: "https://eloify.eloifyapp.workers.dev",
  sharedToken: "",
  modelKey: "provisional",
};

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: AppConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** Persist a single field without disturbing the rest of the config. */
export function patchConfig<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
  saveConfig({ ...loadConfig(), [key]: value });
}

/** True once the minimum needed to reach data (Worker + spreadsheet) is set. */
export function isConfigured(config: AppConfig): boolean {
  return Boolean(config.spreadsheetId && config.workerBaseUrl);
}
