"use client";

import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BonusesPage() {
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadBonuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBonuses() {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1️⃣ Get logged-in user session
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const session = sessionData?.session;
      if (!session) {
        console.warn("No active session - user not logged in");
        setBonuses([]);
        return;
      }

      const userEmail = session.user?.email;
      if (!userEmail) {
        console.warn("Session has no email");
        setBonuses([]);
        return;
      }

      console.log("🔍 Looking up employee for email:", userEmail);

      // 2️⃣ Fetch employee by email
      const { data: employeeRecord, error: empErr } = await supabase
        .from("employees")
        .select("id, email")
        .eq("email", userEmail)
        .maybeSingle();

      if (empErr) {
        console.error("Employee lookup error:", JSON.stringify(empErr, null, 2));
        setBonuses([]);
        setErrorMsg("Failed to look up employee record.");
        return;
      }

      if (!employeeRecord) {
        console.warn("No employee record found for user email:", userEmail);
        setBonuses([]);
        setErrorMsg("No employee record found for current user.");
        return;
      }

      const employeeId = employeeRecord.id;
      console.log("✅ Employee found. ID:", employeeId);

      // 3️⃣ Fetch bonuses via backend proxy (safer) — backend orders by effective_from
      try {
        const res = await api.listBonuses(employeeId);
        const items = res?.bonuses ?? res ?? [];
        setBonuses(items || []);
      } catch (apiErr: any) {
        console.error("Backend bonuses fetch error:", apiErr);
        setBonuses([]);
        setErrorMsg(
          apiErr?.message ?? "Failed to fetch bonuses from backend API."
        );
      }
    } catch (err: any) {
      console.error("Error fetching bonuses:", JSON.stringify(err, null, 2));
      setBonuses([]);
      setErrorMsg(err?.message ?? "Unexpected error while loading bonuses.");
    } finally {
      setLoading(false);
    }
  }

  function renderDate(bonus: any) {
    // prefer backend 'effective_from' (we used that to order on backend); fallbacks:
    const d =
      bonus.effective_from ||
      bonus.effectiveFrom ||
      bonus.created_at ||
      bonus.createdAt ||
      bonus.date_awarded ||
      bonus.date ||
      null;
    try {
      return d ? new Date(d).toLocaleDateString() : "-";
    } catch {
      return "-";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Bonuses</h1>
        <p className="text-slate-600 mt-1">
          All bonuses and rewards you’ve received
        </p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Gift className="text-yellow-600" /> Bonus History
          </CardTitle>
          <CardDescription>Your latest bonus transactions</CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8">Loading...</p>
          ) : errorMsg ? (
            <p className="text-sm text-red-600 text-center py-8">
              {errorMsg}
            </p>
          ) : bonuses.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No bonuses recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-200">
              {bonuses.map((bonus, index) => (
                <div
                  key={bonus.id ?? index}
                  className="flex justify-between items-center py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {bonus.reason || bonus.title || "Bonus"}
                    </p>
                    <p className="text-xs text-slate-600">
                      {renderDate(bonus)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    ₹{Number(bonus.amount ?? 0).toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
