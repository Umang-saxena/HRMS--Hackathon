// components/payroll/PersistButton.tsx
"use client";
import React, { useState } from "react";
import { api } from "@/lib/api";
import type { Payslip } from "@/types/payroll";

export function PersistButton({
  payslip,
  token,
  onSaved
}: {
  payslip: Payslip;
  token?: string | null;
  onSaved?: (saved: any) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function persist() {
    setLoading(true);
    setErr(null);

    try {
      // api.persistPayslip expects either employee_id + payroll_period_id or full payslip
      const payload = { payslip };
      const res = await api.persistPayslip(payload);
      // backend returns { success: true, payslip: <row/object> }
      const persisted = res?.payslip ?? res;
      // try to find id in returned object
      const id = persisted?.id ?? persisted?.payload?.id ?? null;
      setSavedId(id);
      onSaved?.(persisted);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={persist} disabled={loading} style={{ padding: "6px 10px" }}>
        {loading ? "Saving…" : "Persist Payslip"}
      </button>
      {err && <div style={{ color: "red", marginTop: 8 }}>{err}</div>}
      {savedId && <div style={{ color: "green", marginTop: 8 }}>Saved (id: {savedId})</div>}
    </div>
  );
}
