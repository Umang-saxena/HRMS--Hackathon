"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Gift, CalendarCheck, Wallet, TrendingUp, ClipboardCheck } from "lucide-react";
import StatsCard from "@/components/hr/StatsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/simple-progress";
import { supabase } from "@/lib/supabase";
import type { Employee } from "@/lib/supabase";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type TaskRow = {
  id: string;
  employee_id?: string | null;
  assigned_by?: string | null;
  title: string;
  description?: string | null;
  priority?: string | null;
  status?: string;
  due_date?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  assigned_to?: string | null;
  assigned_at?: string | null;
};

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalBonuses: 0,
    leavesTaken: 0,
    payroll: 0,
    performance: 0,
    tasksAssigned: 0,
  });
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [latestPerf, setLatestPerf] = useState<{ overall_score: number; review_date?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadEmployeeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
  if (!employee?.id) return;

  const empId = employee.id;
  const channel = supabase
    .channel(`public:tasks_preview_${empId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks", filter: `assigned_to=eq.${empId}` },
      (payload: any) => {
        const rec = payload.record ?? payload.new;
        if (!rec) return;
        const eventType = payload.eventType ?? payload.event;
        setTasks((prev) => {
          let newList = [...prev];
          if (eventType === "INSERT") {
            newList = [rec as TaskRow, ...newList];
            toast({ title: "New task assigned", description: rec.title ?? "A new task was assigned" });
          } else if (eventType === "UPDATE") {
            newList = newList.map((t) => (t.id === rec.id ? (rec as TaskRow) : t));
          } else if (eventType === "DELETE") {
            newList = newList.filter((t) => t.id !== rec.id);
          }
          newList.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
          return newList.slice(0, 3);
        });
      }
    )
    .subscribe();

  // synchronous cleanup — fire-and-forget removal, do not return an async function
  return () => {
    void supabase.removeChannel(channel).catch((err) => {
      console.error("Failed to remove Supabase channel:", err);
    });
  };
}, [employee?.id, toast]);


  function setTaskLoading(taskId: string, v: boolean) {
    setActionLoading((s) => ({ ...s, [taskId]: v }));
  }

  async function loadEmployeeData() {
  setLoading(true);
  try {
    // get current user from supabase
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEmployee(null);
      setTasks([]);
      setStats({
        totalBonuses: 0,
        leavesTaken: 0,
        payroll: 0,
        performance: 0,
        tasksAssigned: 0,
      });
      setLatestPerf(null);
      setLoading(false);
      return;
    }
    setUserId(user.id);

    // find the employee linked to this auth user (by email OR by user_id if you have that)
    const { data: employeeData, error: empErr } = await supabase
      .from("employees")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    if (empErr || !employeeData) {
      console.error("Failed to load employee record", empErr);
      setEmployee(null);
      setLoading(false);
      return;
    }
    setEmployee(employeeData);

    // Fetch aggregates
    const [bonusesRes, leavesRes, payrollRes, perfRes] = await Promise.all([
      supabase.from("bonuses").select("*").eq("employee_id", employeeData.id),
      supabase.from("leaves").select("*").eq("employee_id", employeeData.id),
      supabase.from("payroll").select("*").eq("employee_id", employeeData.id),
      supabase.from("performance_reviews").select("*").eq("employee_id", employeeData.id).order("created_at", { ascending: false }),
    ]);

    const bonuses = (bonusesRes?.data ?? []) as any[];
    const leaves = (leavesRes?.data ?? []) as any[];
    const payroll = (payrollRes?.data ?? []) as any[];
    const perf = (perfRes?.data ?? []) as any[];

    const latest = perf && perf.length > 0 ? perf[0] : null;
    setLatestPerf(latest ? { overall_score: Number(latest.overall_rating ?? latest.overall_score ?? 0), review_date: latest.review_date ?? latest.created_at ?? null } : null);

    // tasks: prefer calling performance API (if configured), else fallback
    let assignedTasks: TaskRow[] = [];
    try {
      const apiTasks = await api.listTasksForEmployee(String(employeeData.id));
      if (Array.isArray(apiTasks)) assignedTasks = apiTasks as TaskRow[];
      else if (apiTasks?.tasks && Array.isArray(apiTasks.tasks)) assignedTasks = apiTasks.tasks as TaskRow[];
      else assignedTasks = [];
    } catch (apiErr) {
      console.warn("Performance API tasks fetch failed; falling back to Supabase tasks:", apiErr);
      const { data: sbTasks } = await supabase.from("tasks").select("*").eq("assigned_to", employeeData.id).order("created_at", { ascending: false });
      assignedTasks = (sbTasks ?? []) as TaskRow[];
    }

    assignedTasks.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
    const previewTasks = assignedTasks.slice(0, 3);

    const totalBonus = bonuses.reduce((acc: number, b: any) => acc + (b?.amount || 0), 0);
    const totalPayroll = payroll.reduce((acc: number, p: any) => acc + (p?.salary || 0), 0);
    const avgPerf =
      perf.length > 0 ? perf.reduce((acc: number, r: any) => acc + (Number(r.overall_rating ?? r.overall_score ?? 0) || 0), 0) / perf.length : 0;

    setStats({
      totalBonuses: totalBonus,
      leavesTaken: leaves.length,
      payroll: totalPayroll,
      performance: avgPerf,
      tasksAssigned: assignedTasks.length,
    });

    setTasks(previewTasks);
  } catch (err) {
    console.error("loadEmployeeData error:", err);
  } finally {
    setLoading(false);
  }
}


  async function handleUpdateStatus(taskId: string, newStatus: string) {
    setTaskLoading(taskId, true);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, completed_at: newStatus === "done" || newStatus === "completed" ? new Date().toISOString() : t.completed_at } : t)));
    try {
      await api.updateTask(taskId, { status: newStatus });
    } catch (apiErr) {
      console.warn("api.updateTask failed; trying Supabase update", apiErr);
      const updates: Partial<TaskRow> = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === "done" || newStatus === "completed") updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
      if (error) {
        console.error("Supabase task update failed:", error);
        await loadEmployeeData();
      }
    } finally {
      setTaskLoading(taskId, false);
    }
  }

  async function handleConfirmTask(taskId: string) {
    setTaskLoading(taskId, true);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: t.status === "done" ? "confirmed" : t.status } : t)));
    try {
      await api.confirmTask(taskId, { confirmer_id: userId, note: "Confirmed from dashboard" });
      await supabase.from("task_confirmations").insert([{ task_id: taskId, confirmed_by: userId, confirmed: true, comment: "Confirmed from dashboard", created_at: new Date().toISOString() }]);
    } catch (err) {
      console.warn("confirm failed, falling back to Supabase insert", err);
      const { error } = await supabase.from("task_confirmations").insert([{ task_id: taskId, confirmed_by: userId, confirmed: true, comment: "Confirmed from dashboard", created_at: new Date().toISOString() }]);
      if (error) {
        console.error("Supabase confirmation insert failed:", error);
        await loadEmployeeData();
      }
    } finally {
      setTaskLoading(taskId, false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading employee dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Employee Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome back, {employee?.first_name || "Employee"} 👋</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard title="Bonuses Earned" value={`₹${stats.totalBonuses}`} icon={Gift} iconColor="text-yellow-600" />
        <StatsCard title="Leaves Taken" value={stats.leavesTaken} icon={CalendarCheck} iconColor="text-blue-600" />
        <StatsCard title="Total Payroll" value={`₹${stats.payroll}`} icon={Wallet} iconColor="text-green-600" />
        <StatsCard title="Performance" value={stats.performance.toFixed(1)} icon={TrendingUp} iconColor="text-purple-600" />
        <StatsCard title="Tasks Assigned" value={stats.tasksAssigned} icon={ClipboardCheck} iconColor="text-orange-600" />
      </div>

      {/* Compact Performance Widget */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <TrendingUp className="text-purple-600" /> Performance Summary
          </CardTitle>
          <CardDescription>Quick view — tap to see full report</CardDescription>
        </CardHeader>
        <CardContent>
          {!latestPerf ? (
            <p className="text-sm text-slate-500">No recent performance reviews.</p>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Latest Score</p>
                <p className="text-2xl font-semibold">{Number(latestPerf.overall_score).toFixed(1)}</p>
                <p className="text-xs text-slate-500 mt-1">Reviewed: {latestPerf.review_date ? format(new Date(latestPerf.review_date), "dd MMM yyyy") : "—"}</p>
              </div>

              <div className="w-1/3">
                <Progress value={Math.max(0, Math.min(100, (Number(latestPerf.overall_score) / 5) * 100))} className="h-3" />
                <div className="text-xs text-slate-500 mt-2">Overall trend · <Link href="/employee/performance" className="underline">View performance</Link></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks preview (top 3) */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ClipboardCheck className="text-orange-600" /> Tasks (Quick view)
          </CardTitle>
          <CardDescription>Latest assigned tasks — go to Tasks page for full details</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500">No recent tasks assigned.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const isLoading = !!actionLoading[task.id];
                const due = task.due_date ? format(new Date(task.due_date), "dd MMM yyyy") : "—";
                return (
                  <div key={task.id} className="flex justify-between p-3 border rounded-lg hover:bg-blue-50 transition-all duration-200 items-center">
                    <div className="max-w-[65%]">
                      <h4 className="font-medium text-slate-900">{task.title}</h4>
                      {task.description && <p className="text-xs text-slate-600">{task.description}</p>}
                      <div className="text-xs text-slate-500 mt-1">Due: {due} · Priority: {task.priority}</div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className="capitalize">{task.status ?? "open"}</Badge>

                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateStatus(task.id, "in_progress")} disabled={isLoading || task.status === "in_progress" || task.status === "done"} className="px-3 py-1 border rounded text-sm">Start</button>
                        <button onClick={() => handleUpdateStatus(task.id, "done")} disabled={isLoading || task.status === "done"} className="px-3 py-1 border rounded text-sm">Done</button>
                        <button onClick={() => handleConfirmTask(task.id)} disabled={isLoading || task.status !== "done"} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Confirm</button>
                      </div>

                      <Link href={`/employee/task/${task.id}`} className="text-xs text-slate-500 underline mt-1">Open task</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Link to full tasks page */}
          <div className="mt-4">
            <Link href="/employee/task" className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-sm">View all tasks</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
