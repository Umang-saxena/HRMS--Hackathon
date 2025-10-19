"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/simple-progress";

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
  const { toast } = useToast();

  useEffect(() => {
    loadTasks();
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

  // synchronous cleanup — do not return an async function
  return () => {
    void supabase.removeChannel(channel).catch((err) => {
      console.error("Failed to remove Supabase channel:", err);
    });
  };
}, [employeeId, toast]);

  function setTaskLoading(id: string, v: boolean) {
    setActionLoading((s) => ({ ...s, [id]: v }));
  }

  async function loadTasks() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({ title: "Not signed in", variant: "destructive" });
        setTasks([]);
        setLoading(false);
        return;
      }

      const email = user.email ?? null;
      let empId: string | null = null;
      if (email) {
        const { data: emp } = await supabase.from("employees").select("id").eq("email", email).maybeSingle();
        if (emp) empId = (emp as any).id;
      }
      setEmployeeId(empId ?? null);

      if (!empId) {
        toast({ title: "No employee record found", variant: "destructive" });
        setTasks([]);
        setLoading(false);
        return;
      }

      // try performance api first
      try {
        const apiTasks = await api.listTasksForEmployee(String(empId));
        if (Array.isArray(apiTasks)) setTasks(apiTasks as TaskRow[]);
        else if (apiTasks?.tasks && Array.isArray(apiTasks.tasks)) setTasks(apiTasks.tasks as TaskRow[]);
        else {
          const { data, error } = await supabase.from("tasks").select("*").eq("assigned_to", empId).order("created_at", { ascending: false });
          if (error) console.error("Supabase tasks fetch error:", error);
          setTasks((data ?? []) as TaskRow[]);
        }
      } catch (apiErr) {
        console.warn("Performance API tasks fetch failed:", apiErr);
        const { data, error } = await supabase.from("tasks").select("*").eq("assigned_to", empId).order("created_at", { ascending: false });
        if (error) console.error("Supabase tasks fetch error:", error);
        setTasks((data ?? []) as TaskRow[]);
      }
    } catch (err) {
      console.error("Unexpected loadTasks error:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUpdate(taskId: string) {
  const text = (updateTexts[taskId] || "").trim();
  const progress = updateProgress[taskId] ?? 0;
  if (!text && !progress) {
    toast({ title: "Please provide update text or progress.", variant: "destructive" });
    return;
  }

  setTaskLoading(taskId, true);
  try {
    // get current user id from supabase
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr) {
      console.error("Failed to get supabase user:", userErr);
    }
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
    // 1) Try updating status via your backend API
    try {
      const apiResp = await api.updateTask(task.id, { status: "completed" });
      // optionally: console.log("api.updateTask response:", apiResp);
    } catch (apiErr) {
      // Log structured info about API error
      console.error("api.updateTask threw:", apiErr);
      // Try to extract extra fields commonly added by our request helper
      try {
        console.error("apiErr.message:", (apiErr as any).message);
        console.error("apiErr.status:", (apiErr as any).status);
        console.error("apiErr.payload:", (apiErr as any).payload ?? JSON.stringify((apiErr as any).payload));
      } catch (inner) {
        console.error("error inspecting apiErr:", inner);
      }

      // Fallback: update in Supabase directly
      const { error: upErr } = await supabase
        .from("tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      if (upErr) {
        // include both errors in thrown object so outer catch can log everything
        throw { type: "supabase_update_failed", supabaseError: upErr, apiError: apiErr };
      }
    }

    // 2) Notify / confirm via API (preferred) then fallback to Supabase insert
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id ?? null;

      // try API confirm
      try {
        await api.confirmTask(task.id, { confirmer_id: userId, note: `Completed by employee` });
      } catch (apiConfErr) {
        console.warn("api.confirmTask failed, falling back to supabase insert:", apiConfErr);
        const { error: confErr } = await supabase.from("task_confirmations").insert([
          {
            task_id: task.id,
            confirmed_by: userId,
            confirmed: true,
            comment: `Completed by employee`,
            created_at: new Date().toISOString(),
          },
        ]);
        if (confErr) throw { type: "supabase_confirm_failed", supabaseError: confErr, apiConfirmError: apiConfErr };
      }
    } catch (notifyErr) {
      // bubble up
      throw notifyErr;
    }

    // success path
    toast({ title: "Task marked complete", description: "Admin notified" });
    await loadTasks();
  } catch (err) {
    // Better structured logging so you can debug from console
    try {
      // If it's an object with properties, show them
      console.error("handleMarkComplete error (detailed):");
      // show own properties
      console.error(
        Object.getOwnPropertyNames(err).reduce((acc: any, k: string) => {
          acc[k] = (err as any)[k];
          return acc;
        }, {})
      );
      // fallback stringify (handles circular by catching)
      try {
        console.error("stringified error:", JSON.stringify(err));
      } catch (stringErr) {
        console.error("Could not JSON.stringify(err):", stringErr);
      }
    } catch (logErr) {
      console.error("Error while logging error:", logErr, "original:", err);
    }

    // user-friendly toast
    toast({ title: "Failed to complete task", variant: "destructive", description: "See console for details" });
  } finally {
    setTaskLoading(task.id, false);
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
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No tasks assigned.</p>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const isLoading = !!actionLoading[task.id];
                return (
                  <div key={task.id} className="border rounded-lg p-4 shadow-sm bg-white hover:bg-slate-50 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-slate-900">{task.title}</h4>
                        <p className="text-xs text-slate-600">{task.description}</p>
                        <Badge variant={task.status === "completed" ? "secondary" : "outline"} className="mt-2 capitalize">
                          {task.status || "pending"}
                        </Badge>
                      </div>

                      {task.status !== "completed" && (
                        <Button onClick={() => handleMarkComplete(task)} size="sm" className="flex items-center gap-1">
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
                            onChange={(e) => setUpdateProgress((prev) => ({ ...prev, [task.id]: Number(e.target.value || 0) }))}
                          />
                          <Button size="sm" onClick={() => handleAddUpdate(task.id)} className="flex items-center gap-1">
                            <Send className="w-4 h-4" /> Update
                          </Button>
                        </div>
                      </div>
                    )}

                    {task.status === "completed" && task.completed_at && (
                      <div className="mt-2 text-xs text-slate-500">Completed at: {new Date(task.completed_at).toLocaleString()}</div>
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
