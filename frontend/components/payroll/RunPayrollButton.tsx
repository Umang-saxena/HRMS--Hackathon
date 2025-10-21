// components/payroll/RunPayrollButton.tsx
"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";

interface RunPayrollButtonProps {
  payrollPeriodId: number;
  token?: string | null;
}

export default function RunPayrollButton({ payrollPeriodId, token }: RunPayrollButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    if (!payrollPeriodId) {
      setError("Please provide a valid payroll period ID before running payroll.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // ✅ Uses the helper from lib/api.ts
      const res = await api.runPayroll({
        payroll_period_id: payrollPeriodId,
      });

      // Handle both { success: true, result: {...} } or direct {...}
      const output = res?.result ?? res;
      setResult(output);
    } catch (e: any) {
      console.error("Error running payroll:", e);
      setError(e?.message ?? "Failed to run payroll. Check the backend logs.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={handleRun}
        disabled={loading}
        style={{
          backgroundColor: "#0070f3",
          color: "white",
          padding: "8px 14px",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        {loading ? "Running Payroll…" : "Run Payroll for Period"}
      </button>

      {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 12, padding: 10, border: "1px solid #ddd", borderRadius: "6px" }}>
          <h4 style={{ marginBottom: 6 }}>Payroll Run Summary</h4>
          <div>Total Employees: {result.total ?? "—"}</div>
          <div>✅ Succeeded: {result.succeeded ?? 0}</div>
          <div>❌ Failed: {result.failed ?? 0}</div>

          {result.errors && result.errors.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary>Show Errors ({result.errors.length})</summary>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem", marginTop: 4 }}>
                {JSON.stringify(result.errors, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
