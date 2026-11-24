/**
 * Robust API Client for CloudPulse Dashboard.
 * Includes timeout, error normalization, and request cancellation.
 */

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!res.ok) {
      let errBody: any = null;
      try {
        errBody = await res.json();
      } catch {
        errBody = await res.text();
      }
      const message =
        errBody?.error || errBody?.detail || `HTTP ${res.status}: ${res.statusText}`;
      throw new ApiError(message, res.status, errBody);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === "AbortError") {
      throw new ApiError("Request timed out after 10 seconds", 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || "Network connection failure", 0);
  }
}

export const API = {
  get: <T = any>(url: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> => {
    let finalUrl = url;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          searchParams.append(k, String(v));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        finalUrl += (url.includes("?") ? "&" : "?") + qs;
      }
    }
    return request<T>(finalUrl, { method: "GET" });
  },

  post: <T = any>(url: string, data?: any): Promise<T> => {
    return request<T>(url, {
      method: "POST",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  },

  patch: <T = any>(url: string, data?: any): Promise<T> => {
    return request<T>(url, {
      method: "PATCH",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  },

  put: <T = any>(url: string, data?: any): Promise<T> => {
    return request<T>(url, {
      method: "PUT",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  },

  delete: <T = any>(url: string): Promise<T> => {
    return request<T>(url, { method: "DELETE" });
  },
};
