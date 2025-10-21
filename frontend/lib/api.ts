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
      const err = new Error((data && (data.detail || data.message)) || res.statusText);
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

  /* PAYROLL */

  /**
   * Compute preview (read-only). Body: { employee_id, payroll_period_id, attendance?, regime? }
   */
  computePayroll: (payload: {
    employee_id: string;
    payroll_period_id: number;
    attendance?: Record<string, number>;
    regime?: string;
  }) =>
    request(`/api/payroll/compute`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /**
   * Persist (insert/upsert) a payslip. If payslip object is provided it will be inserted,
   * otherwise the backend will compute then persist. Admin-protected endpoint by default.
   */
  persistPayslip: (payload: {
    employee_id?: string;
    payroll_period_id?: number;
    attendance?: Record<string, number>;
    regime?: string;
    payslip?: any;
  }) =>
    request(`/api/payroll/persist`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /**
   * Run payroll for whole period (admin). Body: { payroll_period_id, run_by? }
   */
  runPayroll: (payload: { payroll_period_id: number; run_by?: string }) =>
    request(`/api/payroll/run`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /**
   * Fetch a payroll run by id
   */
  getPayrollRun: (runId: number) =>
    request(`/api/payroll/runs/${runId}`, { method: "GET" }),

  /**
   * Get persisted payslip for an employee & payroll_period.
   * Backend returns persisted payslip if present otherwise a computed preview.
   */
  getPayslip: (employeeId: string, payrollPeriodId: number) =>
    request(`/api/payroll/payslip/${employeeId}/${payrollPeriodId}`, { method: "GET" }),

  /**
   * List persisted payslips for a given employee.
   * GET /api/payroll/payslips/{employee_id}
   */
  listPayslipsForEmployee: (employeeId: string, limit: number = 50) =>
    request(`/api/payroll/payslips/${employeeId}?limit=${limit}`, { method: "GET" }),

  /**
   * List payroll periods (ordered by period_start desc)
   * GET /api/payroll/periods
   */
  listPayrollPeriods: () => request(`/api/payroll/periods`, { method: "GET" }),

  /* BONUSES */

  createBonus: (payload: {
    employee_id: string;
    code?: string;
    amount: number;
    is_percentage?: boolean;
    percent_of_component?: string | null;
    bonus_type?: string;
    effective_from?: string | null;
    effective_to?: string | null;
    notes?: string | null;
  }) =>
    request(`/api/payroll/bonuses`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listBonuses: (employeeId: string, includePaid: boolean = false) =>
    request(
      `/api/payroll/bonuses/${employeeId}?include_paid=${includePaid ? "true" : "false"}`,
      {
        method: "GET",
      }
    ),

  /**
   * Finalize a persisted payslip (admin). Body: { finalized_by? }
   */
  finalizePayslip: (payslipId: string, payload: { finalized_by?: string | null } = {}) =>
    request(`/api/payroll/payslip/${payslipId}/finalize`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
