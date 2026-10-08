export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
};

async function request<T>(
  payload: Record<string, unknown>
): Promise<ApiResponse<T>> {
  const response = await fetch("/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let json: ApiResponse<T>;
  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`API returned invalid JSON (${response.status}).`);
  }

  if (!response.ok && !json.success) {
    throw new Error(json.message || `Request failed (${response.status}).`);
  }

  return json;
}

export function health() {
  return request({
    action: "health",
  });
}

export function bootstrap() {
  return request<{
    user: {
      email: string;
      name: string;
      role: string;
      authorized: boolean;
    };
    modules: Record<string, {
      key: string;
      titleKh: string;
      titleEn: string;
      sheet: string;
      fields: Array<Record<string, unknown>>;
    }>;
    capabilities: Record<string, {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    }>;
    refs: Record<string, unknown[]>;
  }>({
    action: "bootstrap",
  });
}

export function listModule(
  module: string,
  filters: Record<string, unknown> = {}
) {
  return request<{
    rows: Record<string, unknown>[];
    page: number;
    pageSize: number;
    hasMore: boolean;
  }>({
    action: "list",
    module,
    filters,
  });
}

export function getRecord(module: string, id: string) {
  return request<Record<string, unknown>>({
    action: "record",
    module,
    id,
  });
}

export function createRecord(
  module: string,
  data: Record<string, unknown>,
  files: unknown[] = []
) {
  return request<{
    id: string;
    record: Record<string, unknown>;
  }>({
    action: "create",
    module,
    data,
    files,
  });
}

export function updateRecord(
  module: string,
  id: string,
  data: Record<string, unknown>
) {
  return request<{
    id: string;
    record: Record<string, unknown>;
  }>({
    action: "update",
    module,
    id,
    data,
  });
}

export function dashboard() {
  return request<Record<string, unknown>>({
    action: "dashboard",
  });
}

export function searchAll(q: string) {
  return request<Array<{
    module: string;
    id: string;
    title: string;
    status: string;
  }>>({
    action: "search",
    q,
  });
}
