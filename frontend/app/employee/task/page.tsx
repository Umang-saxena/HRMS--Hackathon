"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ClipboardCheck, Send } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type TaskRow = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  assigned_to?: string | null;
  assigned_at?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  priority?: string | null;
  updated_at?: string | null;
  due_date?: string | null;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [updateTexts, setUpdateTexts] = useState<Record<string, string>>({});
  const [updateProgress, setUpdateProgress] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { toast } = useToast();

  function setTaskLoading(id: string, v: boolean) {
    setActionLoading((s) => ({ ...s, [id]: v }));
  }

  const resolveEmployeeId = useCallback(async (): Promise<string | null> => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Supabase session error:", sessionError);
        return null;
      }
      const session = (sessionData as any)?.session;
      if (!session) return null;
      const userEmail = session.user?.email;
      if (!userEmail) return null;

      const { data: emp, error: empErr } = await supabase
        .from("employees")
        .select("id")
        .eq("email", userEmail)
        .maybeSingle();

      if (empErr) {
        console.error("Employee lookup error:", empErr);
        return null;
      }
      return (emp as any)?.id ?? null;
    } catch (err) {
      console.error("resolveEmployeeId error:", err);
      return null;
    }
  }, []);

  const loadTasks = useCallback(
    async (overrideEmpId?: string | null) => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const empId = overrideEmpId ?? (await resolveEmployeeId());
        if (!empId) {
          setErrorMsg("Could not resolve employee for the current user.");
          setTasks([]);
          setEmployeeId(null);
          return;
        }

        setEmployeeId(empId);
        // Try backend API first
        try {
          const apiTasks = await api.listTasksForEmployee(String(empId));
          if (Array.isArray(apiTasks)) {
            setTasks(apiTasks as TaskRow[]);
            return;
          } else if (apiTasks?.tasks && Array.isArray(apiTasks.tasks)) {
            setTasks(apiTasks.tasks as TaskRow[]);
            return;
          }
        } catch (apiErr) {
          // fallback to Supabase below
          console.warn("Performance API tasks fetch failed:", apiErr);
        }

        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("assigned_to", empId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Supabase tasks fetch error:", error);
          setErrorMsg("Failed to fetch tasks.");
          setTasks([]);
          return;
        }

        setTasks((data ?? []) as TaskRow[]);
      } catch (err) {
        console.error("Unexpected loadTasks error:", err);
        setTasks([]);
        setErrorMsg("Unexpected error while loading tasks.");
      } finally {
        setLoading(false);
      }
    },
    [resolveEmployeeId]
  );

  useEffect(() => {
    // initial load
    void loadTasks();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!employeeId) return;

    const channel = supabase
      .channel(`public:tasks_emp_${employeeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `assigned_to=eq.${employeeId}` },
        (payload: any) => {
          try {
            const rec = payload.record ?? payload.new;
            if (!rec) return;

            const eventType = payload.eventType ?? payload.event;
            if (eventType === "INSERT") {
              setTasks((t) => [rec as TaskRow, ...t]);
              toast({ title: "New task assigned", description: rec.title ?? "A new task was assigned" });
            } else if (eventType === "UPDATE") {
              setTasks((t) => t.map((x) => (x.id === rec.id ? (rec as TaskRow) : x)));
            } else if (eventType === "DELETE") {
              setTasks((t) => t.filter((x) => x.id !== rec.id));
            }
          } catch (err) {
            console.error("Realtime payload handling error:", err, payload);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel).catch((err) => {
        console.error("Failed to remove Supabase channel:", err);
      });
    };
  }, [employeeId, toast]);

  async function handleAddUpdate(taskId: string) {
    const text = (updateTexts[taskId] || "").trim();
    const progress = updateProgress[taskId] ?? 0;
    if (!text && !progress) {
      toast({ title: "Please provide update text or progress.", variant: "destructive" });
      return;
    }

    setTaskLoading(taskId, true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) console.error("Failed to get supabase user:", userErr);
      const userId = user?.id ?? null;

      const payload: any = {
        updated_by: userId, // must be a string UUID
        update_text: text || null,
        progress_percent: progress || null,
        attached_url: null,
      };

      // try backend API first
      try {
        await api.updateTask(taskId, payload);
        toast({ title: "Update sent to admin" });
        setUpdateTexts((p) => ({ ...p, [taskId]: "" }));
        setUpdateProgress((p) => ({ ...p, [taskId]: 0 }));
        await loadTasks();
        return;
      } catch (apiErr) {
        console.warn("api.updateTask failed; falling back to Supabase insert:", apiErr);
      }

      // fallback: insert into Supabase directly
      const { error: insertErr } = await supabase.from("task_updates").insert([
        {
          task_id: taskId,
          updated_by: userId,
          update_text: text || null,
          progress_percent: progress || null,
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertErr) {
        console.error("Error inserting task update:", insertErr);
        toast({ title: "Error saving update", variant: "destructive" });
      } else {
        toast({ title: "Progress updated (offline fallback)" });
        setUpdateTexts((p) => ({ ...p, [taskId]: "" }));
        setUpdateProgress((p) => ({ ...p, [taskId]: 0 }));
        await loadTasks();
      }
    } catch (err) {
      console.error("handleAddUpdate unexpected error:", err);
      toast({ title: "Unexpected error", variant: "destructive" });
    } finally {
      setTaskLoading(taskId, false);
    }
  }

  async function handleMarkComplete(task: TaskRow) {
    if (!task?.id) return;
    setTaskLoading(task.id, true);

    try {
      // Preferred: notify backend API
      try {
        await api.updateTask(task.id, { status: "completed" });
        // try to confirm via API if available
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const userId = user?.id ?? null;
        try {
          await api.confirmTask(task.id, { confirmer_id: userId, note: `Completed by employee` });
        } catch (apiConfErr) {
          // fallback confirm to Supabase below
          console.warn("api.confirmTask failed:", apiConfErr);
        }

        toast({ title: "Task marked complete", description: "Admin notified" });
        await loadTasks();
        return;
      } catch (apiErr) {
        console.warn("api.updateTask failed; falling back to Supabase update:", apiErr);
      }

      // Fallback: update task row in Supabase
      const { error: upErr } = await supabase
        .from("tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      if (upErr) {
        console.error("Supabase tasks update error:", upErr);
        throw upErr;
      }

      // Insert into task_confirmations
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id ?? null;

      const { error: confErr } = await supabase.from("task_confirmations").insert([
        {
          task_id: task.id,
          confirmed_by: userId,
          confirmed: true,
          comment: `Task "${task.title}" completed by employee.`,
          created_at: new Date().toISOString(),
        },
      ]);

      if (confErr) {
        console.error("Error inserting confirmation:", confErr);
        toast({ title: "Failed to notify admin", variant: "destructive" });
      } else {
        toast({ title: "Task marked complete", description: "Admin has been notified." });
      }

      await loadTasks();
    } catch (err) {
      console.error("handleMarkComplete error (detailed):", err);
      toast({ title: "Failed to complete task", variant: "destructive", description: "See console for details" });
    } finally {
      if (task?.id) setTaskLoading(task.id, false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Tasks</h1>
        <p className="text-slate-600 mt-1">Your assigned tasks and progress updates</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ClipboardCheck className="text-orange-600" /> Assigned Tasks
          </CardTitle>
          <CardDescription>Manage and update your tasks</CardDescription>
        </CardHeader>

        <CardContent>
          {errorMsg ? (
            <p className="text-sm text-red-600 text-center py-6">{errorMsg}</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No tasks assigned.</p>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const isLoading = !!actionLoading[task.id];
                return (
                  <div
                    key={task.id}
                    className="border rounded-lg p-4 shadow-sm bg-white hover:bg-slate-50 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-slate-900">{task.title}</h4>
                        {task.description && <p className="text-xs text-slate-600">{task.description}</p>}
                        <Badge
                          variant={task.status === "completed" ? "secondary" : "outline"}
                          className="mt-2 capitalize"
                        >
                          {task.status || "pending"}
                        </Badge>
                      </div>

                      {task.status !== "completed" && (
                        <Button
                          onClick={() => handleMarkComplete(task)}
                          size="sm"
                          className="flex items-center gap-1"
                          disabled={isLoading}
                        >
                          <ClipboardCheck className="w-4 h-4" /> Complete
                        </Button>
                      )}
                    </div>

                    {/* Progress Update Section */}
                    {task.status !== "completed" && (
                      <div className="mt-4 space-y-2">
                        <Input
                          placeholder="Add a progress update..."
                          value={updateTexts[task.id] || ""}
                          onChange={(e) => setUpdateTexts((prev) => ({ ...prev, [task.id]: e.target.value }))}
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="Progress %"
                            value={String(updateProgress[task.id] ?? "")}
                            onChange={(e) =>
                              setUpdateProgress((prev) => ({ ...prev, [task.id]: Number(e.target.value || 0) }))
                            }
                          />
                          <Button size="sm" onClick={() => handleAddUpdate(task.id)} className="flex items-center gap-1">
                            <Send className="w-4 h-4" /> Update
                          </Button>
                        </div>
                      </div>
                    )}

                    {task.status === "completed" && task.completed_at && (
                      <div className="mt-2 text-xs text-slate-500">
                        Completed at: {new Date(task.completed_at).toLocaleString()}
                      </div>
                    )}

                    <div className="mt-3">
                      <Link href={`/employee/task/${task.id}`} className="text-xs underline text-slate-600">
                        Open task
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
