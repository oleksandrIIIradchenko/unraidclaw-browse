import { request as httpsRequest, Agent as HttpsAgent } from "node:https";
import { request as httpRequest } from "node:http";
import type { ApiResponse } from "@unraidclaw/shared";

export class UnraidApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: string
  ) {
    super(message);
    this.name = "UnraidApiError";
  }
}

export interface ClientConfig {
  serverUrl: string;
  apiKey: string;
  tlsSkipVerify?: boolean;
}

export class UnraidClient {
  private configResolver: () => ClientConfig;
  private insecureAgent: HttpsAgent | null = null;

  constructor(configResolver: () => ClientConfig) {
    this.configResolver = configResolver;
  }

  private getConfig() {
    const cfg = this.configResolver();
    if (!cfg.serverUrl) {
      throw new UnraidApiError("UnraidClaw serverUrl not configured", 0, "CONFIG_ERROR");
    }
    if (cfg.tlsSkipVerify && cfg.serverUrl.startsWith("https") && !this.insecureAgent) {
      this.insecureAgent = new HttpsAgent({ rejectUnauthorized: false });
    }
    return {
      baseUrl: cfg.serverUrl.replace(/\/+$/, ""),
      apiKey: cfg.apiKey || "",
      isHttps: cfg.serverUrl.startsWith("https"),
    };
  }

  async get<T>(path: string, query?: Record<string, string>): Promise<T> {
    const { baseUrl } = this.getConfig();
    let url = `${baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams(query);
      url += `?${params.toString()}`;
    }
    return this.doRequest<T>("GET", url);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const { baseUrl } = this.getConfig();
    return this.doRequest<T>("POST", `${baseUrl}${path}`, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const { baseUrl } = this.getConfig();
    return this.doRequest<T>("PATCH", `${baseUrl}${path}`, body);
  }

  async delete<T>(path: string): Promise<T> {
    const { baseUrl } = this.getConfig();
    return this.doRequest<T>("DELETE", `${baseUrl}${path}`);
  }

  private doRequest<T>(method: string, url: string, body?: unknown): Promise<T> {
    const { apiKey, isHttps } = this.getConfig();
    const parsed = new URL(url);
    const payload = body !== undefined ? JSON.stringify(body) : undefined;

    const headers: Record<string, string> = {
      "x-api-key": apiKey,
    };
    if (payload) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload).toString();
    }

    const requestFn = isHttps ? httpsRequest : httpRequest;

    return new Promise<T>((resolve, reject) => {
      const req = requestFn(
        {
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: parsed.pathname + parsed.search,
          method,
          headers,
          ...(this.insecureAgent ? { agent: this.insecureAgent } : {}),
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            const text = Buffer.concat(chunks).toString();
            let json: ApiResponse<T>;
            try {
              json = JSON.parse(text);
            } catch {
              reject(new UnraidApiError(`Invalid JSON response: ${text.slice(0, 200)}`, res.statusCode ?? 0, "PARSE_ERROR"));
              return;
            }
            if (!json.ok) {
              reject(new UnraidApiError(json.error.message, res.statusCode ?? 0, json.error.code));
              return;
            }
            resolve(json.data);
          });
        }
      );

      req.on("error", (err) => {
        reject(new UnraidApiError(
          `Connection failed: ${err.message}`,
          0,
          "CONNECTION_ERROR"
        ));
      });

      if (payload) req.write(payload);
      req.end();
    });
  }
}
