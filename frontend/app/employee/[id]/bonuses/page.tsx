// app/employee/[id]/bonuses/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function BonusesPage({ params }: { params: { id: string } }) {
  const employeeId = params.id;
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // create form state
  const [amount, setAmount] = useState<number>(0);
  const [code, setCode] = useState<string>("SPOT");
  const [isPercentage, setIsPercentage] = useState<boolean>(false);
  const [percentOfComponent, setPercentOfComponent] = useState<string | null>(null);
  const [bonusType, setBonusType] = useState<string>("ONE_TIME");
  const [effectiveFrom, setEffectiveFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  // inside app/employee/[id]/bonuses/page.tsx
async function fetchBonuses() {
  setLoading(true);
  setErr(null);
  try {
    // use your backend proxy (safer)
    const res = await api.listBonuses(employeeId);
    // api.listBonuses may return { success: true, bonuses: [...] } or just the array
    const items = res?.bonuses ?? res ?? [];
    setBonuses(items);
  } catch (e: any) {
    console.error("Bonuses query error:", e);
    setErr(e?.message ?? String(e));
  } finally {
    setLoading(false);
  }
}


  useEffect(() => {
    if (!employeeId) return;
    fetchBonuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  async function handleCreate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setCreating(true);
    setErr(null);
    try {
      const payload: any = {
        employee_id: employeeId,
        code,
        amount,
        is_percentage: isPercentage,
        percent_of_component: percentOfComponent,
        bonus_type: bonusType,
        effective_from: effectiveFrom || null,
        effective_to: effectiveTo || null,
        notes: null,
      };
      const res = await api.createBonus(payload);
      // Successful create will likely return { success: true, bonus: {...} }
      alert("Bonus created: " + (res?.bonus?.id ?? "ok"));
      // refresh list
      fetchBonuses();
      // reset amount
      setAmount(0);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Bonuses</h1>
      <p style={{ color: "#666" }}>Employee ID: <code>{employeeId}</code></p>

      <section style={{ marginTop: 12, border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <h3>Create Bonus</h3>
        <form onSubmit={handleCreate} style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
          <label style={{ display: "flex", flexDirection: "column" }}>
            Code
            <input value={code} onChange={(e) => setCode(e.target.value)} />
          </label>

          <label style={{ display: "flex", flexDirection: "column" }}>
            Amount
            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </label>

          <label style={{ display: "flex", flexDirection: "column" }}>
            Is percentage?
            <select value={isPercentage ? "yes" : "no"} onChange={(e) => setIsPercentage(e.target.value === "yes")}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column" }}>
            Percent of component (if percentage, e.g. BASIC)
            <input value={percentOfComponent ?? ""} onChange={(e) => setPercentOfComponent(e.target.value || null)} />
          </label>

          <label style={{ display: "flex", flexDirection: "column" }}>
            Bonus type
            <select value={bonusType} onChange={(e) => setBonusType(e.target.value)}>
              <option value="ONE_TIME">ONE_TIME</option>
              <option value="RECURRING_MONTHLY">RECURRING_MONTHLY</option>
              <option value="RECURRING_YEARLY">RECURRING_YEARLY</option>
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column" }}>
            Effective from
            <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </label>

          <label style={{ display: "flex", flexDirection: "column" }}>
            Effective to
            <input type="date" value={effectiveTo ?? ""} onChange={(e) => setEffectiveTo(e.target.value || null)} />
          </label>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center" }}>
            <button type="submit" disabled={creating}>{creating ? "Creating…" : "Create Bonus"}</button>
            <button type="button" onClick={() => { setCode("SPOT"); setAmount(0); setIsPercentage(false); setPercentOfComponent(null); setBonusType("ONE_TIME"); }}>
              Reset
            </button>
            {err && <div style={{ color: "red" }}>{err}</div>}
          </div>
        </form>
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>Existing Bonuses</h3>
        {loading ? (
          <div>Loading…</div>
        ) : (
          <>
            {bonuses.length === 0 ? (
              <div style={{ color: "#666" }}>No bonuses found.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Code</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Effective From</th>
                    <th>Effective To</th>
                    <th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {bonuses.map((b) => (
                    <tr key={b.id ?? b.code} style={{ borderTop: "1px solid #f2f2f2" }}>
                      <td style={{ padding: "6px 8px" }}>{b.code}</td>
                      <td style={{ textAlign: "right" }}>{b.amount}</td>
                      <td style={{ textAlign: "center" }}>{b.bonus_type}</td>
                      <td style={{ textAlign: "center" }}>{b.effective_from ?? "-"}</td>
                      <td style={{ textAlign: "center" }}>{b.effective_to ?? "-"}</td>
                      <td style={{ textAlign: "center" }}>{String(Boolean(b.is_paid))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>
    </div>
  );
}
