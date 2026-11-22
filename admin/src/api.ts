export type AdminRole = "admin" | "art_editor" | "content_editor";
export interface AdminSession {
  user: { id: number; email: string; display_name: string };
  role: AdminRole;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/admin${path}`, {
    credentials: "same-origin",
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, (body as { error?: string }).error ?? "Error");
  return body as T;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
