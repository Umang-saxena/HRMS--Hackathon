// app/employee/[id]/payroll/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

type BreakdownRow = { amount: number; type?: string; is_taxable?: boolean };

export default function PayrollPage() {
  const params = useParams();
  const employeeId = params.id as string;
  const [periods, setPeriods] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number | "">("");
  const [preview, setPreview] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    loadPeriods();
    loadPayslips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  async function loadPeriods() {
    try {
      const res = await api.listPayrollPeriods();
      const p = res?.periods ?? res ?? [];
      setPeriods(p);
      // choose latest period by default if available
      if (p && p.length > 0) {
        setSelectedPeriod((prev) => (prev === "" ? p[0].id : prev));
      }
    } catch (e: any) {
      console.error("Failed to load payroll periods", e);
      setErr(e?.message ?? String(e));
    }
  }

  async function loadPayslips() {
    try {
      const res = await api.listPayslipsForEmployee(employeeId);
      const list = res?.payslips ?? res ?? [];
      setPayslips(list);
    } catch (e: any) {
      console.error("Failed to load payslips", e);
      setErr(e?.message ?? String(e));
    }
  }

  async function fetchPayslipOrPreview(periodId: number) {
    setErr(null);
    setPreview(null);
    setLoading(true);
    try {
      const res = await api.getPayslip(employeeId, periodId);
      const ps = res?.payslip ?? res;
      setPreview(ps);
    } catch (e: any) {
      console.error("Failed to get payslip/preview", e);
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  function renderBreakdownTable(breakdown: Record<string, BreakdownRow>) {
    const keys = Object.keys(breakdown || {});
    if (keys.length === 0) return <div style={{ color: "#666" }}>No breakdown available</div>;
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 6 }}>Component</th>
            <th style={{ textAlign: "right", padding: 6 }}>Amount</th>
            <th style={{ textAlign: "center", padding: 6 }}>Type</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => {
            const r = breakdown[k] as BreakdownRow;
            return (
              <tr key={k} style={{ borderTop: "1px solid #f2f2f2" }}>
                <td style={{ padding: 6 }}>{k}</td>
                <td style={{ padding: 6, textAlign: "right" }}>{Number(r.amount).toFixed(2)}</td>
                <td style={{ padding: 6, textAlign: "center" }}>{r.type ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Payroll</h1>
      <p style={{ color: "#666" }}>Employee: <code>{employeeId}</code></p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <label>
          Payroll period:
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value === "" ? "" : Number(e.target.value))}
            style={{ marginLeft: 8, padding: "6px 8px" }}
          >
            <option value="">— select period —</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.month}/{p.year} ({p.period_start})
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={() => {
            if (!selectedPeriod) {
              setErr("Select a payroll period first.");
              return;
            }
            fetchPayslipOrPreview(Number(selectedPeriod));
          }}
        >
          {loading ? "Loading…" : "Get Payslip / Preview"}
        </button>

        <button onClick={async () => { await loadPayslips(); }}>
          Refresh persisted payslips
        </button>
      </div>

      {err && <div style={{ color: "red", marginBottom: 12 }}>{err}</div>}

      {preview ? (
        <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 6, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Payslip Preview / Details</h3>
          <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
            <div>Gross: <strong>₹{Number(preview.gross_salary).toFixed(2)}</strong></div>
            <div>Deductions: <strong>₹{Number(preview.total_deductions).toFixed(2)}</strong></div>
            <div>Net: <strong>₹{Number(preview.net_salary).toFixed(2)}</strong></div>
            <div>Total employer cost: <strong>₹{Number(preview.total_employer_cost).toFixed(2)}</strong></div>
          </div>

          <div>
            <h4>Component breakdown</h4>
            {renderBreakdownTable(preview.breakdown || {})}
          </div>

          <div style={{ marginTop: 8, color: "#666" }}>
            Computed at: {preview.computed_at ?? preview.created_at ?? "-"}
          </div>
        </div>
      ) : (
        <div style={{ color: "#666", marginBottom: 12 }}>No preview loaded yet.</div>
      )}

      <section style={{ marginTop: 18 }}>
        <h3>Persisted Payslips</h3>
        {payslips.length === 0 ? (
          <div style={{ color: "#666" }}>No persisted payslips for this employee.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 6 }}>Period</th>
                <th style={{ textAlign: "right", padding: 6 }}>Gross</th>
                <th style={{ textAlign: "right", padding: 6 }}>Deductions</th>
                <th style={{ textAlign: "right", padding: 6 }}>Net</th>
                <th style={{ padding: 6 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((p: any) => (
                <tr key={p.id} style={{ borderTop: "1px solid #f2f2f2" }}>
                  <td style={{ padding: 6 }}>{p.payroll_period_id ?? p.month ?? "-"}</td>
                  <td style={{ padding: 6, textAlign: "right" }}>{Number(p.gross_salary ?? 0).toFixed(2)}</td>
                  <td style={{ padding: 6, textAlign: "right" }}>{Number(p.total_deductions ?? 0).toFixed(2)}</td>
                  <td style={{ padding: 6, textAlign: "right" }}>{Number(p.net_salary ?? 0).toFixed(2)}</td>
                  <td style={{ padding: 6 }}>
                    <button onClick={() => setPreview(p)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
