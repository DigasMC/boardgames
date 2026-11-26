export type TablistApiError = {
  error: string;
  code?: string;
  status: number;
};

export class TablistClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string
  ) {}

  private authHeader(): string {
    return `Bearer ${this.token}`;
  }

  async request<T>(
    method: string,
    path: string,
    options?: {
      query?: Record<string, string | number | undefined | null>;
      body?: unknown;
    }
  ): Promise<T> {
    const url = new URL(path, this.baseUrl.replace(/\/$/, "") + "/");
    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value === undefined || value === null || value === "") continue;
        url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: this.authHeader(),
        Accept: "application/json",
        ...(options?.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const text = await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { error: text };
      }
    }

    if (!res.ok) {
      const errObj = (json ?? {}) as { error?: string; code?: string };
      const err = new Error(errObj.error || `HTTP ${res.status}`) as Error &
        TablistApiError;
      err.status = res.status;
      err.code = errObj.code;
      err.error = errObj.error || `HTTP ${res.status}`;
      throw err;
    }

    return json as T;
  }
}

export function createTablistClientFromEnv(): TablistClient {
  const base =
    process.env.TABLIST_API_BASE?.trim() ||
    process.env.TABLIST_APP_ORIGIN?.trim() ||
    "https://tablist.app";
  const token =
    process.env.TABLIST_API_TOKEN?.trim() ||
    process.env.TABLIST_ACCESS_TOKEN?.trim() ||
    "";

  if (!token) {
    throw new Error(
      "Set TABLIST_API_TOKEN (preferred PAT) or TABLIST_ACCESS_TOKEN (dev JWT) in the MCP env"
    );
  }

  return new TablistClient(base, token);
}
