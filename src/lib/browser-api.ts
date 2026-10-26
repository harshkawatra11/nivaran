export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = (response.headers.get("content-type") ?? "").includes(
    "application/json",
  )
    ? await response.json()
    : null;
  if (!response.ok)
    throw new Error(
      body?.error ??
        "The service could not complete this request. Please try again.",
    );
  if (body === null)
    throw new Error(
      "The service returned an unexpected response. Please try again.",
    );
  return body as T;
}
export function post<T>(url: string, body: unknown) {
  return api<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
