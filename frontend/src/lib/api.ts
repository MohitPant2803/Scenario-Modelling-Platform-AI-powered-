export const API_BASE = "http://localhost:4000";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      ...init
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Cannot reach API at ${API_BASE}. Make sure the backend server is running.`);
    }
    throw error;
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}
