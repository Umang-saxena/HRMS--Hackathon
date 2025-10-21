'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash, Plus } from 'lucide-react';
import { Progress } from '@/components/ui/simple-progress';

type Employee = { id: string; first_name: string; last_name: string; email?: string | null };

type Perf = {
  id: string;
  employee_id: string;
  reviewer_id: string;
  review_period: string;
  quality_score: number;
  productivity_score: number;
  teamwork_score: number;
  communication_score: number;
  overall_score: number;
  comments?: string | null;
  created_at?: string;
  updated_at?: string;
};

export default function AdminPerformancePage() {
  const [performances, setPerformances] = useState<Perf[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    employeeId: '',
    reviewerId: '', // resolved from session
    review_period: '',
    quality: 0,
    productivity: 0,
    teamwork: 0,
    communication: 0,
    // overall will be computed automatically
    comments: '',
  });

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [{ data: perfData, error: perfErr }, { data: empData, error: empErr }] =
        await Promise.all([
          supabase.from('performance_scores').select('*').order('review_period', { ascending: false }),
          supabase.from('employees').select('id, first_name, last_name, email').order('first_name'),
        ]);

      if (perfErr) {
        console.error('Error loading performances:', JSON.stringify(perfErr, null, 2));
        toast({ title: 'Failed to load performances', variant: 'destructive' });
      }
      if (empErr) {
        console.error('Error loading employees:', JSON.stringify(empErr, null, 2));
        toast({ title: 'Failed to load employees', variant: 'destructive' });
      }

      setPerformances(perfData || []);
      setEmployees(empData || []);

      // resolve reviewer from session -> employees row (so reviewer is fixed)
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const email = (sessionData as any)?.session?.user?.email ?? null;
        if (email) {
          const { data: myEmp, error: myEmpErr } = await supabase
            .from('employees')
            .select('id, first_name, last_name, email')
            .eq('email', email)
            .maybeSingle();

          if (myEmpErr) {
            console.error('Error resolving current user employee row:', JSON.stringify(myEmpErr, null, 2));
          } else if (myEmp) {
            setForm((s) => ({ ...s, reviewerId: (myEmp as any).id }));
          } else {
            setForm((s) => ({ ...s, reviewerId: '' }));
          }
        }
      } catch (e) {
        console.error('Error resolving reviewer from session:', e);
      }
    } catch (err: any) {
      console.error('Unexpected load error:', JSON.stringify(err, null, 2));
      toast({ title: 'Failed to load data', variant: 'destructive' });
      setPerformances([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }

  function formatName(empId?: string | null) {
    if (!empId) return '—';
    const e = employees.find((x) => x.id === empId);
    return e ? `${e.first_name} ${e.last_name}` : 'Unknown';
  }

  // helper: compute overall as sum of subscores
  function computeOverall() {
    const sum =
      Number(form.quality || 0) +
      Number(form.productivity || 0) +
      Number(form.teamwork || 0) +
      Number(form.communication || 0);
    return sum;
  }

  // local validation
  function validateFormLocally() {
    if (!form.employeeId || !form.review_period) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return false;
    }

    if (!form.reviewerId) {
      toast({ title: 'Reviewer not resolved from session', variant: 'destructive' });
      return false;
    }

    // ensure employee exists locally
    if (!employees.some((e) => e.id === form.employeeId)) {
      toast({ title: 'Selected employee not found', variant: 'destructive' });
      return false;
    }

    // per-subscore range 0..25
    const subs = [
      { name: 'quality', v: Number(form.quality) },
      { name: 'productivity', v: Number(form.productivity) },
      { name: 'teamwork', v: Number(form.teamwork) },
      { name: 'communication', v: Number(form.communication) },
    ];

    for (const s of subs) {
      if (!Number.isFinite(s.v) || s.v < 0 || s.v > 25) {
        toast({ title: `Subscore ${s.name} must be between 0 and 25`, variant: 'destructive' });
        return false;
      }
    }

    // overall must equal sum
    const overall = computeOverall();
    if (overall < 0 || overall > 100) {
      toast({ title: 'Overall (sum) must be between 0 and 100', variant: 'destructive' });
      return false;
    }

    return true;
  }

  // Create or update (with optimistic update and better UI feedback)
  async function handleCreateOrUpdate() {
    if (!validateFormLocally()) return;

    const rounded = {
      quality_score: Math.round(Number(form.quality || 0)),
      productivity_score: Math.round(Number(form.productivity || 0)),
      teamwork_score: Math.round(Number(form.teamwork || 0)),
      communication_score: Math.round(Number(form.communication || 0)),
    };
    const overall = rounded.quality_score + rounded.productivity_score + rounded.teamwork_score + rounded.communication_score;

    const payload = {
      employee_id: form.employeeId,
      reviewer_id: form.reviewerId,
      review_period: form.review_period,
      quality_score: rounded.quality_score,
      productivity_score: rounded.productivity_score,
      teamwork_score: rounded.teamwork_score,
      communication_score: rounded.communication_score,
      overall_score: overall,
      comments: form.comments || null,
    };

    try {
      setSaving(true);

      if (editingId) {
        const { error } = await supabase
          .from('performance_scores')
          .update({
            quality_score: payload.quality_score,
            productivity_score: payload.productivity_score,
            teamwork_score: payload.teamwork_score,
            communication_score: payload.communication_score,
            overall_score: payload.overall_score,
            review_period: payload.review_period,
            comments: payload.comments,
          })
          .eq('id', editingId);

        if (error) throw error;

        // Optimistically update local state so UI reflects change immediately
        setPerformances((prev) =>
          prev.map((p) =>
            p.id === editingId
              ? {
                  ...p,
                  quality_score: payload.quality_score,
                  productivity_score: payload.productivity_score,
                  teamwork_score: payload.teamwork_score,
                  communication_score: payload.communication_score,
                  overall_score: payload.overall_score,
                  review_period: payload.review_period,
                  comments: payload.comments,
                  updated_at: new Date().toISOString(),
                }
              : p
          )
        );

        toast({ title: 'Updated' });
      } else {
        // Create via your server API (keeps your existing server-side validation/authorisation)
        const resp = await fetch('/api/admin/create-performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        console.log('create-performance resp.status', resp.status);
        console.log('create-performance resp.headers', Array.from(resp.headers.entries()));

        const text = await resp.text();
        console.log('create-performance raw text (first 2000 chars):', text?.slice?.(0, 2000));

        let body: any = {};
        try {
          body = text ? JSON.parse(text) : {};
        } catch (parseErr) {
          console.error('create-performance returned non-JSON:', text);
          throw new Error('Server returned unexpected response (non-JSON). Check server logs.');
        }

        if (!resp.ok) {
          console.error('create-performance API error body:', body);
          // show server error message if present
          throw new Error(body?.error || `HTTP ${resp.status}`);
        }

        // If the server returned the created row, push it into local state
        if (Array.isArray(body.results) && body.results[0]) {
          setPerformances((prev) => [body.results[0], ...prev]);
        } else if (body.id) {
          setPerformances((prev) => [{ ...(body as any) } as Perf, ...prev]);
        } else {
          // fallback: reload
          await loadData();
        }

        toast({ title: 'Created' });
      }

      // reset and clear editing state
      setForm((s) => ({ employeeId: '', reviewerId: s.reviewerId, review_period: '', quality: 0, productivity: 0, teamwork: 0, communication: 0, comments: '' }));
      setEditingId(null);
    } catch (err: any) {
      console.error('Create/Update error (client):', err);
      toast({ title: 'Failed', description: err?.message || String(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this record?')) return;
    try {
      const { error } = await supabase.from('performance_scores').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Deleted' });
      // optimistic local removal
      setPerformances((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      console.error('Delete error:', JSON.stringify(err, null, 2));
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  }

  function startEdit(p: Perf) {
    setEditingId(p.id);
    setForm({
      employeeId: p.employee_id,
      reviewerId: p.reviewer_id,
      review_period: p.review_period || '',
      quality: Number(p.quality_score ?? 0),
      productivity: Number(p.productivity_score ?? 0),
      teamwork: Number(p.teamwork_score ?? 0),
      communication: Number(p.communication_score ?? 0),
      comments: p.comments || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const reviewerName = form.reviewerId ? formatName(form.reviewerId) : 'Not resolved';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Performance Scores</h1>
        <p className="text-slate-600 mt-1">Manage performance evaluations (Reviewer is the logged-in admin)</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus /> New / Edit</CardTitle>
          <CardDescription>Create or update evaluation rows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Employee</label>
              <Select value={form.employeeId || '__none'} onValueChange={(v) => setForm((s) => ({ ...s, employeeId: v === '__none' ? '' : v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Choose employee</SelectItem>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1">Reviewer (you)</label>
              <div className="border rounded-lg px-3 py-2 text-sm bg-slate-50">{reviewerName}</div>
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1">Review Period</label>
              <Input type="date" value={form.review_period} onChange={(e) => setForm((s) => ({ ...s, review_period: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1">Overall (sum of subscores)</label>
              <div className="border rounded-lg px-3 py-2 text-sm bg-slate-50">{computeOverall()}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Quality (0 - 25)</label>
              <Input
                type="number"
                min={0}
                max={25}
                value={form.quality}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(25, Number(e.target.value || 0)));
                  setForm((s) => ({ ...s, quality: v }));
                }}
                placeholder="Quality (max 25)"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1">Productivity (0 - 25)</label>
              <Input
                type="number"
                min={0}
                max={25}
                value={form.productivity}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(25, Number(e.target.value || 0)));
                  setForm((s) => ({ ...s, productivity: v }));
                }}
                placeholder="Productivity (max 25)"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1">Teamwork (0 - 25)</label>
              <Input
                type="number"
                min={0}
                max={25}
                value={form.teamwork}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(25, Number(e.target.value || 0)));
                  setForm((s) => ({ ...s, teamwork: v }));
                }}
                placeholder="Teamwork (max 25)"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1">Communication (0 - 25)</label>
              <Input
                type="number"
                min={0}
                max={25}
                value={form.communication}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(25, Number(e.target.value || 0)));
                  setForm((s) => ({ ...s, communication: v }));
                }}
                placeholder="Communication (max 25)"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs text-slate-600 mb-1">Comments (optional)</label>
            <Input value={form.comments} onChange={(e) => setForm((s) => ({ ...s, comments: e.target.value }))} placeholder="Add notes or feedback (optional)" />
          </div>

          <div className="flex gap-2 mt-3">
            {editingId ? (
              <>
                <Button onClick={handleCreateOrUpdate} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="ghost" onClick={() => { setEditingId(null); setForm((s) => ({ employeeId: '', reviewerId: s.reviewerId, review_period: '', quality: 0, productivity: 0, teamwork: 0, communication: 0, comments: '' })); }}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={handleCreateOrUpdate} disabled={saving}>
                <Plus className="w-4 h-4 mr-2" /> {saving ? 'Creating...' : 'Create'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>All evaluations</CardTitle>
          <CardDescription>Most recent first</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : performances.length === 0 ? (
            <p className="text-sm text-slate-500">No records yet.</p>
          ) : (
            <div className="space-y-3">
              {performances.map((p) => (
                <div key={p.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{formatName(p.employee_id)}</p>
                      <p className="text-xs text-slate-500">Period: {p.review_period}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{p.overall_score}</div>
                      <Button variant="ghost" onClick={() => startEdit(p)} title="Edit"><Pencil /></Button>
                      <Button variant="ghost" onClick={() => handleDelete(p.id)} title="Delete"><Trash /></Button>
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-slate-700">
                    <div>Quality: {p.quality_score} • Productivity: {p.productivity_score}</div>
                    <div>Teamwork: {p.teamwork_score} • Communication: {p.communication_score}</div>
                    <div className="mt-2">{p.comments || '—'}</div>
                    <div className="mt-2 w-full"><Progress value={Math.max(0, Math.min(100, Number(p.overall_score)))} className="h-2" /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
