import { APP_CONFIG } from "@/config/constants";

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

async function handleResponseError(res: Response, operation: string) {
  let errorDetail = `${operation} Failed (HTTP ${res.status})`;
  let errorData = null;

  try {
    errorData = await res.json();
    if (errorData?.detail) {
      errorDetail = errorData.detail;
    } else if (errorData?.message) {
      errorDetail = errorData.message;
    }
  } catch {
    // Ignore JSON parse error, stick to status text or default
    const text = await res.text().catch(() => "");
    if (text) errorDetail = `${operation} Failed: ${text}`;
  }

  // Centralized Status Code Handling
  switch (res.status) {
    case 401:
    case 403:
      throw new ApiError("API Key无效或已过期，请检查您的API配置", res.status, errorData);
    case 429:
      throw new ApiError("请求太频繁，请稍后再试", res.status, errorData);
    case 500:
      throw new ApiError("服务器内部错误，请稍后再试或检查日志", res.status, errorData);
    default:
      throw new ApiError(errorDetail, res.status, errorData);
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${APP_CONFIG.API_BASE}${path}`;
  
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
    cache: options.cache || "no-store",
  };

  try {
    const res = await fetch(url, config);

    if (!res.ok) {
      await handleResponseError(res, `Request to ${path}`);
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  } catch (error) {
    // If it's already an ApiError, rethrow it
    if (error instanceof ApiError) {
      throw error;
    }
    // Network errors or other issues
    throw new Error(`Network or Unknown Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
