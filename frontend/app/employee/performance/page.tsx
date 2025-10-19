"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/simple-progress";
import { useToast } from "@/hooks/use-toast";
// removed local api usage for compute; we'll call backend directly with token
// import { api } from "../../../lib/api";

type EmployeeRow = { id: string; first_name: string; last_name: string; email?: string | null };

type Perf = {
  id: string;
  employee_id: string;
  reviewer_id: string;
  review_period: string;
  quality_score: number;
  productivity_score: number;
  teamwork_score: number;
  communication_score: number;
  overall_score?: number;
  overall_rating?: number; // in case your DB uses rating instead of score
  comments?: string | null;
  created_at?: string;
};

export default function EmployeePerformancePage() {
  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [records, setRecords] = useState<Perf[]>([]);
  const [avgOverall, setAvgOverall] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // compute UI state
  const [start, setStart] = useState<string>("2025-01-01");
  const [end, setEnd] = useState<string>("2025-10-01");
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      // Prefer getUser() for current user
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        toast({ title: "Not signed in", variant: "destructive" });
        setEmployee(null);
        setRecords([]);
        setAvgOverall(0);
        setLoading(false);
        return;
      }

      const email = user.email ?? null;
      if (!email) {
        toast({ title: "No email on user", variant: "destructive" });
        setEmployee(null);
        setRecords([]);
        setAvgOverall(0);
        setLoading(false);
        return;
      }

      // Fetch employee row
      const { data: empRow, error: empErr } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email")
        .eq("email", email)
        .maybeSingle();

      if (empErr) {
        console.error("Employee lookup error:", empErr);
        toast({ title: "Failed to load profile", variant: "destructive" });
        setEmployee(null);
        setRecords([]);
        setAvgOverall(0);
        setLoading(false);
        return;
      }
      if (!empRow) {
        setEmployee(null);
        setRecords([]);
        setAvgOverall(0);
        setLoading(false);
        return;
      }

      setEmployee(empRow as EmployeeRow);

      // Fetch performance records from supabase (canonical store)
      const { data: recsRaw, error: recErr } = await supabase
        .from("performance_scores")
        .select("*")
        .eq("employee_id", (empRow as EmployeeRow).id)
        .order("created_at", { ascending: false });

      if (recErr) {
        console.error("Error loading performance records:", recErr);
        toast({ title: "Failed to load performance", variant: "destructive" });
        setRecords([]);
        setAvgOverall(0);
        setLoading(false);
        return;
      }

      const recs = (recsRaw ?? []) as Perf[];
      setRecords(recs);

      const avg =
        recs.length > 0
          ? recs.reduce((acc: number, r: any) => acc + (Number(r.overall_score ?? r.overall_rating ?? 0) || 0), 0) / recs.length
          : 0;
      setAvgOverall(avg);
    } catch (err) {
      console.error("Unexpected error loading performance:", err);
      toast({ title: "Unexpected error", variant: "destructive" });
      setRecords([]);
      setAvgOverall(0);
    } finally {
      setLoading(false);
    }
  }

  // Updated: recompute metrics via backend model (calls your FastAPI compute endpoint)
  async function handleComputeMetrics(startDate: string, endDate: string) {
    if (!employee) {
      toast({ title: "No employee linked", variant: "destructive" });
      return;
    }

    try {
      setComputing(true);
      toast({ title: "Computing metrics..." });

      // get access token from supabase session
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast({ title: "No active session", variant: "destructive" });
        setComputing(false);
        return;
      }

      // Call your FastAPI backend endpoint directly (include bearer token)
      const resp = await fetch("http://localhost:8000/api/performance/compute-metrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employee_id: employee.id,
          start: startDate,
          end: endDate,
          review_period: endDate,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error("Compute metrics failed:", resp.status, text);
        toast({ title: "Compute failed", description: text, variant: "destructive" });
        setComputing(false);
        return;
      }

      const json = await resp.json();
      toast({ title: "Metrics computed", description: "Results available in your history" });

      // reload records to reflect newly inserted score
      await load();

      // optionally return the inserted result
      return json;
    } catch (err: any) {
      console.error("computeMetrics error:", err);
      toast({ title: "Compute failed", variant: "destructive" });
      throw err;
    } finally {
      setComputing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Performance</h1>
        <p className="text-slate-600 mt-1">Your evaluations and history</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <TrendingUp className="text-purple-600" /> Overview
          </CardTitle>
          <CardDescription>Your average and recent records</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : !employee ? (
            <p className="text-sm text-slate-500">No linked employee profile found for this account.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Employee</p>
                  <p className="text-lg font-semibold">
                    {employee.first_name} {employee.last_name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Average Overall</p>
                  <p className="text-2xl font-semibold">{avgOverall.toFixed(1)}</p>
                </div>
              </div>

              {/* Compute controls */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Start</label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="border rounded px-2 py-1"
                />
                <label className="text-sm text-slate-600">End</label>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="border rounded px-2 py-1"
                />
                <button
                  onClick={() => handleComputeMetrics(start, end)}
                  disabled={computing}
                  className="ml-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {computing ? "Computing..." : "Compute Metrics"}
                </button>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-2">Recent Evaluations</p>
                {records.length === 0 ? (
                  <p className="text-sm text-slate-500">No performance records yet.</p>
                ) : (
                  <div className="space-y-3">
                    {records.map((r) => {
                      const overall = Number(r.overall_score ?? r.overall_rating ?? 0);
                      // If your overall_score is already 0-100, mapping to pct should consider that.
                      // The original code used (overall / 5) * 100 — keep that if your scale is 0-5.
                      // Here we assume overall is 0-100 and map to 0-100 pct directly.
                      const pct = Math.max(0, Math.min(100, overall));
                      return (
                        <div key={r.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold">Period: {r.review_period}</div>
                            <div className="text-sm text-slate-500">
                              {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                            </div>
                          </div>

                          <div className="mt-2 text-sm text-slate-700">
                            <div>
                              Overall: <strong>{overall}</strong>
                            </div>
                            <div>
                              Quality: {r.quality_score} • Productivity: {r.productivity_score}
                            </div>
                            <div>
                              Teamwork: {r.teamwork_score} • Communication: {r.communication_score}
                            </div>
                            <div className="mt-2">{r.comments || "—"}</div>
                            <div className="mt-2">
                              <Progress value={pct} className="h-2" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
