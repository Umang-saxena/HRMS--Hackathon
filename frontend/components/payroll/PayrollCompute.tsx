// components/payroll/PayrollCompute.tsx
"use client";
import React, { useState } from "react";
import { api } from "@/lib/api";
import type { Payslip, Attendance } from "@/types/payroll";
import { PersistButton } from "./PersistButton";

export default function PayrollCompute({
  employeeId,
  payrollPeriodId,
  token
}: {
  employeeId: string;
  payrollPeriodId: number;
  token?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function compute(attendance: Attendance = { working_days: 22, present_days: 22 }) {
    setLoading(true);
    setError(null);
    setPayslip(null);
    try {
      const payload = {
        employee_id: employeeId,
        payroll_period_id: payrollPeriodId,
        attendance,
        regime: "new",
      };
      const res = await api.computePayroll(payload);
      // backend returns { success: true, payslip: {...} }
      const ps: Payslip = res?.payslip ?? res;
      setPayslip(ps);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 8 }}>
        <button onClick={() => compute()} disabled={loading} style={{ marginRight: 8 }}>
          {loading ? "Computing…" : "Compute preview"}
        </button>

        <button
          onClick={() => compute({ working_days: 30, present_days: 28 })}
          disabled={loading}
        >
          Compute (custom attendance)
        </button>
      </div>

      {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}

      {payslip ? (
        <div style={{ marginTop: 12 }}>
          <h3 style={{ marginBottom: 6 }}>Preview</h3>
          <div>Gross: ₹{payslip.gross_salary.toFixed(2)}</div>
          <div>Deductions: ₹{payslip.total_deductions.toFixed(2)}</div>
          <div style={{ fontWeight: "bold", marginBottom: 8 }}>
            Net: ₹{payslip.net_salary.toFixed(2)}
          </div>

          <div style={{ maxHeight: 300, overflow: "auto", border: "1px solid #eee", padding: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Component</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "center" }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(payslip.breakdown || {}).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: "6px 8px" }}>{k}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>
                      {(v as any).amount?.toFixed?.(2) ?? Number((v as any).amount).toFixed(2)}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>{(v as any).type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12 }}>
            <PersistButton payslip={payslip} token={token} onSaved={(saved) => {
              // optionally refresh UI or notify parent
              console.log("Payslip persisted:", saved);
            }} />
          </div>
        </div>
      ) : (
        !loading && <div style={{ color: "#666" }}>No preview yet — click "Compute preview".</div>
      )}
    </div>
  );
}
