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

// Defaults mirror the CLI's config.py so a fresh install talks to the same sheet.
export const DEFAULT_CONFIG: AppConfig = {
  spreadsheetId: "",
  gamesGid: 0,
  playersGid: 604449976,
  workerBaseUrl: "",
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

/** True once the minimum needed to reach data (Worker + spreadsheet) is set. */
export function isConfigured(config: AppConfig): boolean {
  return Boolean(config.spreadsheetId && config.workerBaseUrl);
}
