'use client';

import { useEffect, useState } from 'react';
import { Check, X, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

type Leave = {
  id: string;
  employee_id: string;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason: string;
  status: string;
};

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState<Record<string, 'approve' | 'reject' | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);

  useEffect(() => {
    void loadPending();

    // setup realtime subscription
    const channel = supabase
      .channel('public:leaves_admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaves' },
        (payload) => {
          try {
            const ev = (payload as any).event;
            const newRow = (payload as any).new ?? null;
            const oldRow = (payload as any).old ?? null;

            if (ev === 'INSERT' && newRow) {
              setLeaves((prev) => (prev.find((p) => p.id === newRow.id) ? prev : [newRow as Leave, ...prev]));
            } else if (ev === 'UPDATE' && newRow) {
              setLeaves((prev) => prev.map((p) => (p.id === newRow.id ? (newRow as Leave) : p)));
            } else if (ev === 'DELETE' && oldRow) {
              setLeaves((prev) => prev.filter((p) => p.id !== oldRow.id));
            }
          } catch (e) {
            // fallback: reload all pending items if realtime payload handling fails
            // eslint-disable-next-line no-console
            console.warn('Realtime payload error, reloading', e);
            void loadPending();
          }
        }
      )
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch {
        try {
          // older supabase clients
          // @ts-ignore
          supabase.removeChannel?.(channel);
        } catch {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Defensive get current admin id
  async function getAdminId(): Promise<string> {
    try {
      const res = await supabase.auth.getUser();
      // supabase-js v2 shape: { data: { user }, error }
      const user = (res as any)?.data?.user ?? (res as any)?.user ?? null;
      if (!user?.id) {
        console.warn('No authenticated user found — returning placeholder id');
        return '00000000-0000-0000-0000-000000000000';
      }
      return user.id as string;
    } catch (err) {
      console.error('getAdminId unexpected error', err);
      return '00000000-0000-0000-0000-000000000000';
    }
  }

  // Load pending leaves robustly — explicit awaits everywhere to avoid builder vs promise issues
  async function loadPending() {
    setLoading(true);
    setError(null);
    setDiagnostic(null);

    try {
      // 1) exact match 'pending'
      try {
        const { data, error } = await supabase
          .from('leaves')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setDiagnostic('Tried eq("status","pending")');
        setLeaves(data ?? []);
        if (data && data.length > 0) return;
      } catch (e1: any) {
        console.warn('eq("pending") failed:', e1);
        setDiagnostic((d) => (d ? d + ' | eq() failed' : 'eq() failed'));
      }

      // 2) case-insensitive search using ilike (some rows might be 'Pending' etc.)
      try {
        // @ts-ignore ilike typing sometimes complains; runtime works on Postgres
        const { data, error } = await supabase
          .from('leaves')
          .select('*')
          .ilike('status', '%pending%')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setDiagnostic((d) => (d ? d + ' | tried ilike' : 'Tried ilike("%pending%")'));
        setLeaves(data ?? []);
        if (data && data.length > 0) return;
      } catch (e2: any) {
        console.warn('ilike pending failed:', e2);
        setDiagnostic((d) => (d ? d + ' | ilike failed' : 'ilike failed'));
      }

      // 3) fallback: fetch all leaves (to detect RLS / permission problems)
      try {
        const { data, error } = await supabase
          .from('leaves')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        if (error) throw error;
        setDiagnostic((d) => (d ? d + ' | fallback fetch all' : 'Fetched all leaves (no filter)'));
        setLeaves(data ?? []);
        if (!data || data.length === 0) {
          setError('Query succeeded but returned no rows — check your leaves table & RLS policies.');
        }
        return;
      } catch (e3: any) {
        console.warn('fallback fetch failed:', e3);
        setDiagnostic((d) => (d ? d + ' | fallback failed' : 'fallback failed'));
        throw e3;
      }
    } catch (err: any) {
      console.error('loadPending final error:', err);
      setError(err?.message ?? String(err));
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }

  function statusClass(status: string) {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  // Approve / Reject action with optimistic UI and canonical server update
  async function handleAction(leaveId: string, action: 'approve' | 'reject') {
    setActioning((prev) => ({ ...prev, [leaveId]: action }));

    // save previous leaves to rollback in case of error
    const prev = [...leaves];

    try {
      const admin_id = await getAdminId();
      const newStatus = action === 'approve' ? 'approved' : 'rejected';

      // optimistic UI
      setLeaves((prevLs) => prevLs.map((l) => (l.id === leaveId ? { ...l, status: newStatus, approved_by: admin_id } : l)));

      // server update and request back the updated row (canonical)
      const { data, error } = await supabase
        .from('leaves')
        .update({ status: newStatus, approved_by: admin_id, updated_at: new Date().toISOString() })
        .eq('id', leaveId)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLeaves((prevLs) => prevLs.map((l) => (l.id === leaveId ? data : l)));
      }
    } catch (err: any) {
      console.error('handleAction error', err);
      alert(`Failed to ${action} leave: ${err?.message ?? String(err)}`);
      // rollback
      setLeaves(prev);
    } finally {
      setActioning((prevAct) => ({ ...prevAct, [leaveId]: null }));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin — Leave Requests</h1>
        <p className="text-slate-600 mt-1">Approve or reject pending leave requests.</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-blue-600">Leave Approvals</CardTitle>
          <CardDescription>Pending requests from employees</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-600">{loading ? 'Loading pending leaves...' : `${leaves.length} pending`}</div>
            <div className="flex items-center gap-2">
              <Button onClick={() => void loadPending()} variant="outline" className="flex items-center gap-2" disabled={loading}>
                <RefreshCw className={loading ? 'animate-spin' : ''} size={16} /> Refresh
              </Button>
              <div className="text-xs text-slate-400 italic">{diagnostic}</div>
            </div>
          </div>

          {error && <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}

          {leaves.length === 0 && !loading ? (
            <p className="text-sm text-slate-500 text-center py-8">{error ? 'No data' : 'No pending leave requests.'}</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {leaves.map((l) => (
                <div key={l.id} className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {new Date(l.start_date).toLocaleDateString()} → {new Date(l.end_date).toLocaleDateString()} · {l.leave_type}
                    </p>
                    <p className="text-xs text-slate-600 truncate">Employee: {l.employee_id}</p>
                    <p className="text-sm text-slate-700 mt-1">{l.reason}</p>
                    <p className="text-xs text-slate-500 mt-1">Applied: {new Date(l.created_at).toLocaleString()}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`${statusClass(l.status)} px-3 py-1 capitalize`}>
                      {l.status}
                    </Badge>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (!confirm('Approve this leave?')) return;
                          void handleAction(l.id, 'approve');
                        }}
                        disabled={l.status.toLowerCase() !== 'pending' || actioning[l.id] != null}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <Check size={14} /> Approve
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => {
                          if (!confirm('Reject this leave?')) return;
                          void handleAction(l.id, 'reject');
                        }}
                        disabled={l.status.toLowerCase() !== 'pending' || actioning[l.id] != null}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <X size={14} /> Reject
                      </Button>
                    </div>
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
