'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { Gift, Wallet, ClipboardCheck, Bell } from "lucide-react";
import StatsCard from "@/components/hr/StatsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { Employee as EmployeeBase } from "@/lib/supabase";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type Employee = EmployeeBase & { role?: string | null }; // <-- extended locally

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

type NotificationRow = {
  id: string;
  title?: string | null;
  message?: string | null;
  level?: "info" | "warning" | "urgent" | string | null;
  target?: string | null; // 'all' | 'employees' | 'hr' | 'admin' | 'employee'
  employee_id?: string | null;
  created_at?: string | null;
};

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // new: 'employee' | 'hr' | 'admin'
  const [stats, setStats] = useState({
    totalBonuses: 0,
    monthlySalary: 0,
    performance: 0,
    tasksAssigned: 0,
  });
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // initial load
  useEffect(() => {
    void (async () => {
      await loadEmployeeData();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // realtime: tasks + notifications (subscribe to notifications table and filter client-side)
  useEffect(() => {
    if (!employee?.id) return;
    const empId = employee.id;
    const role = (employee.role ?? "employee").toLowerCase();

    const taskChannel = supabase
      .channel(`public:tasks_preview_${empId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `assigned_to=eq.${empId}` },
        (payload: any) => {
          try {
            const eventType = payload?.event ?? payload?.eventType;
            const recNew = payload?.new ?? payload?.record;
            const recOld = payload?.old ?? null;
            if (!recNew && !recOld) return;

            setTasks((prev) => {
              let newList = [...prev];
              if (eventType === "INSERT") {
                newList = [recNew as TaskRow, ...newList];
                toast({ title: "New task assigned", description: recNew.title ?? "A new task was assigned" });
              } else if (eventType === "UPDATE") {
                newList = newList.map((t) => (t.id === recNew.id ? (recNew as TaskRow) : t));
              } else if (eventType === "DELETE") {
                newList = newList.filter((t) => t.id !== recOld.id);
              }
              newList.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
              return newList.slice(0, 6);
            });
          } catch (err) {
            console.warn("Realtime tasks handler error, reloading tasks", err);
            void loadTasksPreview(empId).catch(() => {});
          }
        }
      )
      .subscribe();

    // Subscribe to notifications table (no server-side filter so we can handle 'all' and employee-specific)
    const notifChannel = supabase
      .channel(`public:notifications_${empId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload: any) => {
          try {
            const ev = (payload as any).event ?? payload?.eventType;
            const newRow = (payload as any).new ?? payload?.record;
            const oldRow = (payload as any).old ?? null;
            if (!newRow && !oldRow) return;

            // role-aware filter: check employee_id OR targets intended for this role
            const isForMe = (r: any) => {
              if (!r) return false;
              const t = String((r.target ?? "")).toLowerCase();
              if (String(r.employee_id ?? "") === empId) return true;
              if (t === "all") return true;
              if (t === "employees" && role === "employee") return true;
              if (t === "hr" && role === "hr") return true;
              if (t === "admin" && role === "admin") return true;
              return false;
            };

            setNotifications((prev) => {
              let cur = [...prev];
              if (ev === "INSERT") {
                if (isForMe(newRow)) cur = [newRow as NotificationRow, ...cur];
              } else if (ev === "UPDATE") {
                if (isForMe(newRow)) {
                  cur = cur.map((n) => (n.id === newRow.id ? (newRow as NotificationRow) : n));
                } else {
                  // if update changed target away from this employee, remove it
                  cur = cur.filter((n) => n.id !== newRow.id);
                }
              } else if (ev === "DELETE") {
                if (isForMe(oldRow)) cur = cur.filter((n) => n.id !== oldRow.id);
              }
              // keep recent first, limit to 20
              cur.sort((a, b) => (new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()));
              return cur.slice(0, 20);
            });
          } catch (err) {
            console.warn("Realtime notifications handler error — reloading", err);
            void loadNotifications(empId).catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      try {
        void supabase.removeChannel(taskChannel);
      } catch (err) {
        console.warn("removeChannel taskChannel failed:", err);
      }
      try {
        void supabase.removeChannel(notifChannel);
      } catch (err) {
        console.warn("removeChannel notifChannel failed:", err);
      }
    };
  }, [employee?.id, toast]);

  // load tasks preview
  async function loadTasksPreview(empId: string) {
    try {
      const { data: sbTasks, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", empId)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) {
        console.warn("tasks fetch failed:", error);
        setTasks([]);
        return;
      }
      setTasks((sbTasks ?? []) as TaskRow[]);
    } catch (err) {
      console.error("loadTasksPreview unexpected error", err);
      setTasks([]);
    }
  }

  // load notifications targeted to this employee or to 'all' (role-aware)
  async function loadNotifications(empId: string) {
    try {
      // Build OR filter including personal and role-based targets
      const role = (employee?.role ?? "employee").toLowerCase();
      const conditions: string[] = [];
      // personal
      conditions.push(`employee_id.eq.${empId}`);
      // company-wide and employees
      conditions.push(`target.eq.all`);
      conditions.push(`target.eq.employees`);
      // role-specific
      if (role === "hr") conditions.push(`target.eq.hr`);
      if (role === "admin") conditions.push(`target.eq.admin`);

      const orFilter = conditions.join(',');
      // query using .or
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(orFilter)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.warn("loadNotifications failed:", error);
        setNotifications([]);
        return;
      }
      setNotifications((data ?? []) as NotificationRow[]);
    } catch (err) {
      console.error("loadNotifications error", err);
      setNotifications([]);
    }
  }

  // performance: compute average from performance_scores (keeps previous logic)
  async function fetchPerformanceAverage(empId: string) {
    try {
      const { data: perfRows, error } = await supabase
        .from("performance_scores")
        .select("*")
        .eq("employee_id", empId)
        .order("updated_at", { ascending: false })
        .limit(500);

      if (error) {
        console.warn("performance_scores fetch failed:", error);
        return 0;
      }
      const rows = (perfRows ?? []) as any[];
      if (!rows.length) return 0;
      const overallVals = rows.map((r) => {
        const v = r.overall_score ?? r.overall ?? r.score ?? r.overall_rating ?? r.rating ?? 0;
        const n = Number(v);
        return isNaN(n) ? 0 : n;
      });
      const sum = overallVals.reduce((s, v) => s + v, 0);
      return overallVals.length ? sum / overallVals.length : 0;
    } catch (err) {
      console.error("fetchPerformanceAverage error", err);
      return 0;
    }
  }

  // helper: count tasks
  async function countAllTasksForEmployee(empId: string) {
    try {
      const { data } = await supabase.from("tasks").select("id").eq("assigned_to", empId);
      return (data ?? []).length;
    } catch (err) {
      console.warn("countAllTasksForEmployee fallback error", err);
      return 0;
    }
  }

  // main loader
  async function loadEmployeeData() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = (userData as any)?.user ?? (userData as any)?.user ?? null;

      if (!user) {
        setEmployee(null);
        setTasks([]);
        setNotifications([]);
        setStats({
          totalBonuses: 0,
          monthlySalary: 0,
          performance: 0,
          tasksAssigned: 0,
        });
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // find employee by email
      const { data: employeeData, error: empErr } = await supabase
        .from("employees")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();

      if (empErr) {
        console.error("Failed to load employee record", empErr);
        setEmployee(null);
        setLoading(false);
        return;
      }
      if (!employeeData) {
        console.warn("No employee record matched the authenticated user email:", user.email);
        setEmployee(null);
        setLoading(false);
        return;
      }

      // cast to our local extended type
      const emp = employeeData as Employee;
      setEmployee(emp);
      setUserRole((emp.role ?? "employee").toLowerCase());

      // fetch bonuses and payroll rows (we will derive monthly salary from employee.salary per your setup)
      const [bonusesRes] = await Promise.all([supabase.from("bonuses").select("*").eq("employee_id", employeeData.id)]);

      const bonuses = (bonusesRes?.data ?? []) as any[];

      // performance average
      const perfAvg = await fetchPerformanceAverage(employeeData.id);

      // tasks preview
      await loadTasksPreview(employeeData.id);

      // notifications (role-aware)
      await loadNotifications(employeeData.id);

      // totals and monthly salary (derived from employees.salary)
      const totalBonus = bonuses.reduce((acc: number, b: any) => acc + Number(b?.amount ?? 0), 0);
      const employeeYearly = Number((employeeData as any).salary ?? 0);
      const monthlySalary = employeeYearly ? Number(employeeYearly) / 12 : 0;

      const tasksCount = (await countAllTasksForEmployee(employeeData.id)) ?? 0;

      setStats({
        totalBonuses: totalBonus,
        monthlySalary,
        performance: Number((perfAvg ?? 0).toFixed(2)),
        tasksAssigned: tasksCount,
      });
    } catch (err) {
      console.error("loadEmployeeData error:", err);
      setEmployee(null);
      setTasks([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading employee dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Employee Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome back, {employee?.first_name || "Employee"} 👋</p>
      </div>

      {/* Stats Overview — removed Leaves */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Bonuses Earned" value={`₹${stats.totalBonuses}`} icon={Gift} iconColor="text-yellow-600" />
        <StatsCard title="Monthly Salary" value={`₹${Number(stats.monthlySalary ?? 0).toFixed(2)}`} icon={Wallet} iconColor="text-green-600" />
        <StatsCard title="Performance (avg)" value={stats.performance ? String(stats.performance.toFixed ? stats.performance.toFixed(1) : stats.performance) : "0.0"} icon={ClipboardCheck} iconColor="text-purple-600" />
        <StatsCard title="Tasks Assigned" value={stats.tasksAssigned} icon={ClipboardCheck} iconColor="text-orange-600" />
      </div>

      {/* Notifications card (replaces large performance card / recent leaves) */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Bell className="text-blue-600" /> Notifications
          </CardTitle>
          <CardDescription>Important messages from HR / Admin — recent first</CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500">No notifications right now.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => {
                const level = (n.level ?? "info").toLowerCase();
                const levelClass =
                  level === "urgent" ? "bg-red-50 text-red-700 border-red-200" : level === "warning" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-blue-50 text-blue-700 border-blue-200";
                return (
                  <div key={n.id} className="flex items-start justify-between border rounded p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 text-xs font-medium rounded ${levelClass}`}>{level}</div>
                        <div className="font-medium truncate">{n.title ?? "Notification"}</div>
                      </div>
                      {n.message && <div className="text-sm text-slate-600 mt-1 line-clamp-3">{n.message}</div>}
                      <div className="text-xs text-slate-400 mt-2">{n.created_at ? format(new Date(n.created_at), "dd MMM yyyy, HH:mm") : ""}</div>
                    </div>

                    <div className="ml-4 flex flex-col items-end">
                      {/* optional: show target label */}
                      <div className="text-xs text-slate-400">{n.target === "all" ? "Company" : "Private"}</div>
                      <Link href={`/employee/notifications/${n.id}`} className="text-sm underline mt-2">Open</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks preview (card grid) */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ClipboardCheck className="text-orange-600" /> Tasks (Quick view)
          </CardTitle>
          <CardDescription>Latest assigned tasks — click a card to open full task details</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500">No recent tasks assigned.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task) => {
                const due = task.due_date ? format(new Date(task.due_date), "dd MMM yyyy") : "—";
                return (
                  <Link
                    key={task.id}
                    href={`/employee/task/${task.id}`}
                    className="block border rounded-lg p-4 hover:shadow-lg transition-shadow duration-150 bg-white"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">{task.title}</h4>
                        {task.description && <p className="text-sm text-slate-600 mt-1 line-clamp-3">{task.description}</p>}
                        <div className="text-xs text-slate-500 mt-2">Due: {due}</div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className="capitalize">{task.status ?? "open"}</Badge>
                        <div className="text-xs text-slate-400">{task.priority ? `Priority: ${task.priority}` : null}</div>
                        <div className="text-xs text-slate-400 mt-1">Assigned: {task.assigned_at ? format(new Date(task.assigned_at), "dd MMM") : (task.created_at ? format(new Date(task.created_at), "dd MMM") : "—")}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-4">
            <Link href="/employee/task" className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-sm">View all tasks</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
