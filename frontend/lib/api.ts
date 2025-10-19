// app/lib/api.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function request(path: string, opts: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(opts.headers || {});
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && opts.body) headers.set("Content-Type", "application/json");

  try {
    // debug: remove in production if noisy
    // console.log("[api.request]", { url, opts: { ...opts, headers: Object.fromEntries(headers.entries()) } });

    const res = await fetch(url, {
      ...opts,
      headers,
      credentials: "include",
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const err = new Error(data?.detail || data?.message || res.statusText);
      (err as any).status = res.status;
      (err as any).payload = data;
      throw err;
    }
    return data;
  } catch (err: any) {
    console.error("[api.request] network error for", url, err);
    const e = new Error(err?.message ?? "Network error: failed to fetch API");
    (e as any).original = err;
    throw e;
  }
}

export const api = {
  /* PERFORMANCE / TASKS */
  createTask: (payload: any) =>
    request(`/api/performance/task`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listTasksForEmployee: (employeeId: string) =>
    request(`/api/performance/task/${employeeId}`, { method: "GET" }),

  updateTask: (taskId: string, payload: any) =>
    request(`/api/performance/task/${taskId}/update`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  confirmTask: (taskId: string, payload: any) =>
    request(`/api/performance/task/${taskId}/confirm`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  computeMetrics: (payload: { start: string; end: string }) =>
    request(`/api/performance/compute-metrics`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  predictRisk: (payload: { employee_id: string; start: string; end: string }) =>
    request(`/api/performance/predict`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
