"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/simple-progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, Send, ClipboardCheck } from "lucide-react";

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

type TaskUpdateRow = {
  id: string;
  task_id: string;
  updated_by?: string | null;
  update_text?: string | null;
  progress_percent?: number | null;
  attached_url?: string | null;
  created_at?: string | null;
};

type TaskConfirmationRow = {
  id: string;
  task_id: string;
  confirmed_by?: string | null;
  confirmed?: boolean | null;
  comment?: string | null;
  created_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
};

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params?.id ? String(params.id) : "";
  const router = useRouter();
  const { toast } = useToast();

  const [task, setTask] = useState<TaskRow | null>(null);
  const [updates, setUpdates] = useState<TaskUpdateRow[]>([]);
  const [confirmations, setConfirmations] = useState<TaskConfirmationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [progressPercent, setProgressPercent] = useState<number | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_TASK_BUCKET || "task-attachments";

  useEffect(() => {
    if (!taskId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`public:task_detail_${taskId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_updates", filter: `task_id=eq.${taskId}` },
        (payload: any) => {
          const rec = payload.record ?? payload.new;
          if (!rec) return;
          setUpdates((u) => [rec as TaskUpdateRow, ...u]);
          if (rec.update_text) toast({ title: "New update from admin", description: rec.update_text.slice(0, 120) });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_confirmations", filter: `task_id=eq.${taskId}` },
        (payload: any) => {
          const rec = payload.record ?? payload.new;
          if (!rec) return;
          setConfirmations((c) => [rec as TaskConfirmationRow, ...c]);
          toast({ title: "Task confirmation updated", description: rec.comment ?? "A confirmation was recorded" });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel).catch((err) => console.error("Failed to remove Supabase channel:", err));
    };
  }, [taskId, toast]);

  async function loadAll() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      try {
        const apiTasks = await api.listTasksForEmployee(String(user?.id ?? ""));
        if (Array.isArray(apiTasks)) {
          const found = (apiTasks as TaskRow[]).find((t) => t.id === taskId);
          setTask(found ?? null);
        } else {
          const { data } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
          setTask((data ?? null) as TaskRow | null);
        }
      } catch (apiErr) {
        console.warn("API fetch failed, falling back to Supabase:", apiErr);
        const { data } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
        setTask((data ?? null) as TaskRow | null);
      }

      const { data: updRaw } = await supabase
        .from("task_updates")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      const { data: confRaw } = await supabase
        .from("task_confirmations")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      setUpdates((updRaw ?? []) as TaskUpdateRow[]);
      setConfirmations((confRaw ?? []) as TaskConfirmationRow[]);
    } catch (err) {
      console.error("loadAll error:", err);
      toast({ title: "Failed to load task details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function uploadFileIfNeeded(fileToUpload: File | null): Promise<string | null> {
    if (!fileToUpload) return null;
    try {
      const filePath = `${taskId}/${Date.now()}-${fileToUpload.name}`;
      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, fileToUpload, { cacheControl: "3600", upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: signedData, error: signedErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, 60 * 60);

      if (signedErr) {
        const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
        return urlData?.publicUrl ?? null;
      }
      return signedData?.signedUrl ?? null;
    } catch (err) {
      console.error("Upload failed:", err);
      toast({ title: "File upload failed — continuing without file", variant: "destructive" });
      return null;
    }
  }

  async function handleAddUpdate() {
    if (!task) return;
    if (!updateText && (progressPercent === "" || progressPercent === 0)) {
      toast({ title: "Add text or progress", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      const attachedUrl = await uploadFileIfNeeded(file);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userIdLocal = user?.id ?? null;

      try {
        await api.updateTask(task.id, {
          updated_by: userIdLocal,
          update_text: updateText || null,
          progress_percent: progressPercent === "" ? null : Number(progressPercent),
          attached_url: attachedUrl ?? null,
        });
        toast({ title: "Update sent to admin" });
      } catch (apiErr) {
        console.warn("api.updateTask failed; falling back to Supabase insert", apiErr);
        const { error } = await supabase.from("task_updates").insert([
          {
            task_id: task.id,
            updated_by: userIdLocal,
            update_text: updateText || null,
            progress_percent: progressPercent === "" ? null : Number(progressPercent),
            attached_url: attachedUrl ?? null,
            created_at: new Date().toISOString(),
          },
        ]);
        if (error) throw error;
        toast({ title: "Update saved (offline fallback)" });
      }

      setUpdateText("");
      setProgressPercent("");
      setFile(null);
      await loadAll();
    } catch (err) {
      console.error("handleAddUpdate error:", err);
      toast({ title: "Failed to submit update", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!task) return;
    setSubmitting(true);
    try {
      setTask((t) => (t ? { ...t, status: t.status === "done" ? "confirmed" : t.status } : t));

      try {
        await api.confirmTask(task.id, { confirmed_by: userId, confirmed: true, comment: "Confirmed via task page" });
      } catch (apiErr) {
        console.warn("api.confirmTask failed; falling back to Supabase insert", apiErr);
        const { error } = await supabase.from("task_confirmations").insert([
          { task_id: task.id, confirmed_by: userId, confirmed: true, comment: "Confirmed via task page", created_at: new Date().toISOString() },
        ]);
        if (error) throw error;
      }
      toast({ title: "Task confirmed, admin notified" });
      await loadAll();
    } catch (err) {
      console.error("handleConfirm error:", err);
      toast({ title: "Failed to confirm", variant: "destructive" });
      await loadAll();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-6">Loading task...</div>;
  if (!task) return <div className="p-6">Task not found.</div>;

  const pct = updates.length > 0 ? Math.max(...updates.map((u) => Number(u.progress_percent ?? 0))) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{task.title}</h1>
        <div className="text-sm text-slate-600">
          Status: <Badge className="ml-2 capitalize">{task.status ?? "open"}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
          <CardDescription>{task.description ?? "No description"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-sm">
            <div>Priority: {task.priority ?? "—"}</div>
            <div>Assigned at: {task.assigned_at ? new Date(task.assigned_at).toLocaleString() : "—"}</div>
            <div>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}</div>
          </div>

          <div className="mb-3">
            <div className="text-xs text-slate-600 mb-1">Overall progress</div>
            <Progress value={Math.max(0, Math.min(100, pct))} className="h-3" />
          </div>

          <div className="space-y-3">
            <Textarea
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              placeholder="Write an update for the admin..."
            />

            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                value={String(progressPercent ?? "")}
                onChange={(e) => setProgressPercent(e.target.value ? Number(e.target.value) : "")}
                placeholder="Progress %"
              />
              <label className="inline-flex items-center gap-2 px-3 py-1 border rounded cursor-pointer">
                <Upload className="w-4 h-4" />
                <span className="text-sm">Attach</span>
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <Button onClick={handleAddUpdate} disabled={submitting} className="flex items-center gap-2">
                <Send className="w-4 h-4" /> {submitting ? "Sending..." : "Send Update"}
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                Back
              </Button>
            </div>

            {task.status === "done" && (
              <div className="mt-3">
                <Button onClick={handleConfirm} disabled={submitting} className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" /> {submitting ? "Confirming..." : "Confirm Task"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Update History</CardTitle>
          <CardDescription>All updates shared with admin</CardDescription>
        </CardHeader>
        <CardContent>
          {updates.length === 0 ? (
            <p className="text-sm text-slate-500">No updates yet.</p>
          ) : (
            <div className="space-y-3">
              {updates.map((u) => (
                <div key={u.id} className="p-3 border rounded">
                  <div className="flex justify-between items-start">
                    <div className="text-sm">{u.update_text ?? "—"}</div>
                    <div className="text-xs text-slate-500">{u.created_at ? new Date(u.created_at).toLocaleString() : ""}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Progress: {u.progress_percent ?? "—"}%</div>
                  {u.attached_url && (
                    <div className="mt-2">
                      <a href={u.attached_url} target="_blank" rel="noreferrer" className="text-sm underline">
                        Open attachment
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confirmations</CardTitle>
          <CardDescription>Who confirmed and admin reviews</CardDescription>
        </CardHeader>
        <CardContent>
          {confirmations.length === 0 ? (
            <p className="text-sm text-slate-500">No confirmations yet.</p>
          ) : (
            <div className="space-y-3">
              {confirmations.map((c) => (
                <div key={c.id} className="p-3 border rounded">
                  <div className="flex justify-between">
                    <div className="text-sm">{c.comment ?? "—"}</div>
                    <div className="text-xs text-slate-500">{c.created_at ? new Date(c.created_at).toLocaleString() : ""}</div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Confirmed: {c.confirmed ? "Yes" : "No"}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
