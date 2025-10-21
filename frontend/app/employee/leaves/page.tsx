'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type LeaveRow = {
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

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(false);

  // form state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [leaveType, setLeaveType] = useState<'Casual' | 'Sick'>('Casual');
  const [reason, setReason] = useState<string>('');

  // current user id (employee_id)
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  // monthly limits
  const CASUAL_LIMIT = 3;
  const SICK_LIMIT = 2;

  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      setEmployeeId(uid);
      await loadLeaves(uid);

      // subscribe to leaves changes for this user
      if (uid) {
        const channel = supabase
          .channel(`public:leaves:employee=${uid}`)
          .on(
            'postgres_changes',
            {
              event: '*', // listen to INSERT, UPDATE, DELETE
              schema: 'public',
              table: 'leaves',
              // filter by employee_id so we only get events for this user
              filter: `employee_id=eq.${uid}`,
            },
            (payload) => {
              // payload.record is the new row for INSERT/UPDATE; old for DELETE may be in old_record
              const record = (payload as any).record ?? (payload as any).new ?? (payload as any).new_record;
              // just reload (cheap) to ensure client state consistent
              loadLeaves(uid).catch((err) => console.error('reload leaves after event failed', err));
            }
          )
          .subscribe();

        return () => {
          try {
            channel.unsubscribe();
          } catch {
            try {
              // v2 fallback
              // @ts-ignore
              supabase.removeChannel?.(channel);
            } catch {
              // ignore
            }
          }
        };
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function getCurrentUserId() {
    try {
      // Supabase JS v2: getUser or getSession both work; getUser returns { data: { user } }
      const resp = await supabase.auth.getUser();
      const user = (resp as any)?.data?.user ?? null;
      return user?.id ?? null;
    } catch (err) {
      console.warn('Could not get supabase user automatically. Make sure to set employee id manually.', err);
      return null;
    }
  }

  async function loadLeaves(uid?: string | null) {
    setLoading(true);
    try {
      const id = uid ?? employeeId;
      if (!id) {
        setLeaves([]);
        return;
      }

      const { data, error } = await supabase
      .from('leaves')
      .select('*')
      .eq('employee_id', id)
      .order('created_at', { ascending: false });


      if (error) {
        console.error('Supabase fetch leaves error', error);
        setLeaves([]);
      } else {
        setLeaves((data as LeaveRow[]) || []);
      }
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase?.() ?? '';
    switch (s) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // returns how many approved leaves of the given type are in the current month
  function approvedCountThisMonth(type: 'Casual' | 'Sick') {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return leaves.filter((l) => {
      try {
        const s = new Date(l.start_date);
        // only count Approved
        return (
          (l.status ?? '').toLowerCase() === 'approved' &&
          s.getMonth() === month &&
          s.getFullYear() === year &&
          (l.leave_type ?? '').toLowerCase() === type.toLowerCase()
        );
      } catch {
        return false;
      }
    }).length;
  }

  function remainingLeaves(type: 'Casual' | 'Sick') {
    const used = approvedCountThisMonth(type);
    const limit = type === 'Casual' ? CASUAL_LIMIT : SICK_LIMIT;
    return Math.max(0, limit - used);
  }

  // client-side basic validation before sending to supabase
  function validateApply() {
    if (!employeeId) {
      alert('No user session found. Please log in.');
      return false;
    }
    if (!startDate || !endDate) {
      alert('Please select start and end dates.');
      return false;
    }
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (e < s) {
      alert('End date must be after start date.');
      return false;
    }
    if (!reason || reason.trim().length < 3) {
      alert('Please provide a reason (at least 3 characters).');
      return false;
    }
    return true;
  }

  async function applyLeave() {
    if (!validateApply()) return;

    // optional client-side pre-check
    const rem = remainingLeaves(leaveType);
    if (rem <= 0) {
      const ok = confirm(
        `You have no remaining ${leaveType} leaves for this month. If admin approves, you may receive a warning. Continue?`
      );
      if (!ok) return;
    }

    try {
      setLoading(true);

      // generate client-side UUID so we always provide id
      const id = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random()}`;

      const payload = {
        id,
        employee_id: employeeId!,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason,
        status: 'Pending', // initial status
        approved_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('leaves').insert([payload]).select();

      if (error) {
        console.error('Supabase insert leave error', error);
        alert(error.message ?? 'Failed to apply for leave');
        return;
      }

      // Successfully inserted — reload the list
      await loadLeaves(employeeId);
      // reset form
      setStartDate('');
      setEndDate('');
      setReason('');
      setLeaveType('Casual');

      alert('Leave applied successfully — waiting for admin approval.');
    } catch (err) {
      console.error('applyLeave error', err);
      alert('Failed to apply for leave. See console for details.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Leaves</h1>
        <p className="text-slate-600 mt-1">Track your leave history and status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CalendarCheck className="text-blue-600" /> Apply for Leave
            </CardTitle>
            <CardDescription>Select type, dates and reason</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="w-24 text-sm text-slate-700">Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as 'Casual' | 'Sick')}
                  className="border px-2 py-1 rounded"
                >
                  <option value="Casual">Casual</option>
                  <option value="Sick">Sick</option>
                </select>
                <div className="ml-auto text-sm">
                  <span className="font-medium">Remaining:</span>{' '}
                  <span className="ml-1">{remainingLeaves(leaveType)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-slate-600">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border px-2 py-1 rounded mt-1"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-600">End date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border px-2 py-1 rounded mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border px-2 py-1 rounded mt-1"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <button onClick={applyLeave} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
                  {loading ? 'Applying...' : 'Apply'}
                </button>
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setReason('');
                    setLeaveType('Casual');
                  }}
                  className="px-3 py-2 border rounded"
                >
                  Reset
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CalendarCheck className="text-blue-600" /> Leave History
            </CardTitle>
            <CardDescription>History of applied leaves</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && leaves.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Loading...</p>
            ) : leaves.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No leave data available.</p>
            ) : (
              <div className="divide-y divide-slate-200">
                {leaves.map((l) => (
                  <div key={l.id} className="flex justify-between py-3 text-sm items-center">
                    <div>
                      <p className="font-medium text-slate-900">
                        {new Date(l.start_date).toLocaleDateString()} → {new Date(l.end_date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-600">
                        {l.leave_type} • {l.reason}
                      </p>
                      <p className="text-xs text-slate-400">Applied: {new Date(l.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className={getStatusColor(l.status)}>
                      {l.status ?? ''}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
