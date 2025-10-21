'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Download, RefreshCcw, CheckSquare, MinusSquare } from 'lucide-react';

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
};

type AttendanceRow = {
  id: string;
  employee_id?: string | null;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
  total_hours?: number | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export default function AdminAttendancePage() {
  const { toast } = useToast();

  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [search, setSearch] = useState('');

  // pagination
  const [page, setPage] = useState(1);
  const perPage = 20;

  // editing row
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editCheckIn, setEditCheckIn] = useState<string>('');
  const [editCheckOut, setEditCheckOut] = useState<string>('');

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [{ data: attData, error: attErr }, { data: empData, error: empErr }] = await Promise.all([
        supabase.from('attendance').select('*').order('date', { ascending: false }).limit(1000),
        supabase.from('employees').select('id, first_name, last_name').order('first_name', { ascending: true }),
      ]);

      if (attErr) {
        console.error('Error loading attendance:', attErr);
        toast({ title: 'Failed to load attendance', variant: 'destructive' });
      }
      if (empErr) {
        console.error('Error loading employees:', empErr);
        toast({ title: 'Failed to load employees', variant: 'destructive' });
      }

      setAttendance((attData ?? []) as AttendanceRow[]);
      setEmployees((empData ?? []) as Employee[]);
    } catch (err) {
      console.error('Unexpected error loading attendance page:', err);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
      setAttendance([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }

  // Derived filtered & paginated lists
  const filtered = useMemo(() => {
    let arr = attendance || [];

    if (filterEmployee !== 'all') {
      arr = arr.filter((r) => (r.employee_id || '') === filterEmployee);
    }

    if (filterStatus !== 'all') {
      arr = arr.filter((r) => (r.status || '').toLowerCase() === filterStatus.toLowerCase());
    }

    if (fromDate) arr = arr.filter((r) => r.date >= fromDate);
    if (toDate) arr = arr.filter((r) => r.date <= toDate);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((r) => {
        const emp = employees.find((e) => e.id === r.employee_id);
        const name = emp ? `${emp.first_name} ${emp.last_name}`.toLowerCase() : '';
        return (r.status || '').toLowerCase().includes(q) || name.includes(q) || r.date.includes(q);
      });
    }

    return arr;
  }, [attendance, employees, filterEmployee, filterStatus, fromDate, toDate, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page]);

  // helper: get employee name
  const empName = (id?: string | null) => {
    if (!id) return '—';
    const e = employees.find((x) => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : 'Unknown';
  };

  // mark present/absent for a given employee and date (upsert)
  async function markStatus(empId: string, date: string, status: string) {
    try {
      const nowIso = new Date().toISOString();
      const payload = {
        employee_id: empId,
        date,
        status,
        check_in: status === 'Present' ? nowIso : null,
        check_out: null,
        created_at: nowIso,
        updated_at: nowIso,
      };

      const { error } = await supabase.from('attendance').upsert([payload], { onConflict: 'employee_id,date' });
      if (error) throw error;

      toast({ title: `Marked ${empName(empId)} ${status} on ${date}` });
      await loadData();
    } catch (err) {
      console.error('Error marking status:', err);
      toast({ title: 'Failed to update attendance', variant: 'destructive' });
    }
  }

  // begin editing a row
  function beginEdit(row: AttendanceRow) {
    setEditingRowId(row.id);
    setEditCheckIn(row.check_in ? row.check_in.substring(0, 19) : '');
    setEditCheckOut(row.check_out ? row.check_out.substring(0, 19) : '');
  }

  // save edited check-in/out (expects values suitable for new Date(...))
  async function saveEdit(rowId: string) {
    try {
      const payload: Partial<AttendanceRow> = {};
      payload.check_in = editCheckIn ? new Date(editCheckIn).toISOString() : null;
      payload.check_out = editCheckOut ? new Date(editCheckOut).toISOString() : null;

      if (payload.check_in && payload.check_out) {
        const inTs = new Date(payload.check_in).getTime();
        const outTs = new Date(payload.check_out).getTime();
        const hours = Math.max(0, (outTs - inTs) / (1000 * 60 * 60));
        payload.total_hours = Math.round(hours * 100) / 100;
        payload.status = payload.total_hours > 0 ? 'Present' : 'Absent';
      } else if (payload.check_in && !payload.check_out) {
        payload.status = 'Present';
      } else {
        payload.status = 'Absent';
      }

      payload.updated_at = new Date().toISOString();

      const { error } = await supabase.from('attendance').update(payload).eq('id', rowId);
      if (error) throw error;

      toast({ title: 'Attendance updated' });
      setEditingRowId(null);
      await loadData();
    } catch (err) {
      console.error('Save edit error:', err);
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  }

  // delete attendance row
  async function deleteRow(rowId: string) {
    if (!confirm('Delete this attendance entry?')) return;
    try {
      const { error } = await supabase.from('attendance').delete().eq('id', rowId);
      if (error) throw error;
      toast({ title: 'Deleted' });
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  }

  // export visible rows to CSV
  function exportCSV() {
    const rows = filtered.map((r) => ({
      id: r.id,
      employee: empName(r.employee_id),
      date: r.date,
      check_in: r.check_in ?? '',
      check_out: r.check_out ?? '',
      total_hours: r.total_hours ?? '',
      status: r.status ?? '',
    }));

    if (!rows.length) {
      toast({ title: 'No rows to export', variant: 'destructive' });
      return;
    }

    const header = Object.keys(rows[0]).join(',');
    const lines = rows.map((row) => Object.values(row).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV exported' });
  }

  // quick create attendance for today for selected employee (present/absent)
  async function quickCreateForToday(empId: string, status: string) {
    const today = new Date().toISOString().slice(0, 10);
    await markStatus(empId, today, status);
  }

  // monthly summary (per-employee)
  const [monthlySummary, setMonthlySummary] = useState<
    { id: string; name: string; presentDays: number; totalDays: number; percent: number }[]
  >([]);

  async function loadMonthlySummary() {
    try {
      const monthStart = new Date();
      monthStart.setDate(1);
      const startIso = monthStart.toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);

      const [{ data: empRows }, { data: attRows }] = await Promise.all([
        supabase.from('employees').select('id,first_name,last_name'),
        supabase.from('attendance').select('employee_id,status,date').gte('date', startIso).lte('date', today),
      ]);

      const empArr = (empRows ?? []) as Employee[];
      const attArr = (attRows ?? []) as Array<{ employee_id: string; status?: string; date: string }>;

      const map = new Map<string, { presentDays: number; totalDays: number }>();
      for (const e of empArr) map.set(e.id, { presentDays: 0, totalDays: 0 });

      for (const a of attArr) {
        const cur = map.get(a.employee_id) ?? { presentDays: 0, totalDays: 0 };
        cur.totalDays += 1;
        if ((a.status ?? '').toLowerCase() === 'present' || (a as any).check_in != null) cur.presentDays += 1;
        map.set(a.employee_id, cur);
      }

      const summary = empArr.map((e) => {
        const s = map.get(e.id) ?? { presentDays: 0, totalDays: 0 };
        const percent = s.totalDays > 0 ? Math.round((s.presentDays / s.totalDays) * 100) : 0;
        return {
          id: e.id,
          name: `${e.first_name} ${e.last_name}`,
          presentDays: s.presentDays,
          totalDays: s.totalDays,
          percent,
        };
      });

      setMonthlySummary(summary.sort((a, b) => b.percent - a.percent));
    } catch (err) {
      console.error('loadMonthlySummary error', err);
      setMonthlySummary([]);
    }
  }

  useEffect(() => {
    void loadMonthlySummary();
  }, []);

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-slate-600 mt-1">Organization attendance records</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => { void loadData(); void loadMonthlySummary(); }}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button onClick={exportCSV}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter by employee, date range or status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <Select value={filterEmployee} onValueChange={(v) => { setFilterEmployee(v); setPage(1); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="All employees" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="Absent">Absent</SelectItem>
              </SelectContent>
            </Select>

            <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
            <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
            <Input placeholder="Search name or status..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />

            <div className="flex gap-2">
              <Button onClick={() => { setFromDate(''); setToDate(''); setFilterEmployee('all'); setFilterStatus('all'); setSearch(''); }}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Mark attendance for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select
              value={filterEmployee === 'all' ? '__none' : filterEmployee}
              onValueChange={(v) => setFilterEmployee(v === '__none' ? 'all' : v)}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Select employee..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Choose employee</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => filterEmployee !== 'all' && quickCreateForToday(filterEmployee, 'Present')}>
              <CheckSquare className="w-4 h-4 mr-2" /> Mark Present (today)
            </Button>
            <Button variant="outline" onClick={() => filterEmployee !== 'all' && quickCreateForToday(filterEmployee, 'Absent')}>
              <MinusSquare className="w-4 h-4 mr-2" /> Mark Absent (today)
            </Button>

            <div className="text-sm text-slate-600 self-center">
              Tip: select an employee then mark present/absent.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Records</CardTitle>
          <CardDescription>View and edit attendance entries</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading attendance...</p>
          ) : paginated.length === 0 ? (
            <p className="text-sm text-slate-500">No records found.</p>
          ) : (
            <div className="space-y-3">
              {paginated.map((r) => (
                <div key={r.id} className="p-3 border rounded flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-slate-900 truncate">{empName(r.employee_id)}</div>
                      <div className="text-xs text-slate-500">• {r.date}</div>
                      <div className={`ml-2 text-xs px-2 py-0.5 rounded ${r.status === 'Present' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                        {r.status || '—'}
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 mt-1">
                      Check In: {r.check_in ? new Date(r.check_in).toLocaleString() : '—'} • Check Out: {r.check_out ? new Date(r.check_out).toLocaleString() : '—'} • Hours: {r.total_hours ?? '—'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingRowId === r.id ? (
                      <>
                        <Input type="datetime-local" value={editCheckIn} onChange={(e) => setEditCheckIn(e.target.value)} />
                        <Input type="datetime-local" value={editCheckOut} onChange={(e) => setEditCheckOut(e.target.value)} />
                        <Button onClick={() => saveEdit(r.id)}>Save</Button>
                        <Button variant="ghost" onClick={() => setEditingRowId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={() => beginEdit(r)}>Edit</Button>
                        <Button variant="outline" onClick={() => markStatus(r.employee_id || '', r.date, r.status === 'Present' ? 'Absent' : 'Present')}>
                          Toggle
                        </Button>
                        <Button variant="ghost" onClick={() => deleteRow(r.id)}>Delete</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
            <div className="px-3 py-1 border rounded">{page}</div>
            <Button variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
          </div>
        </CardContent>
      </Card>

      {/* Monthly summary (detailed table) */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Monthly Summary (all employees)</CardTitle>
          <CardDescription>Presence % and days present this month</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlySummary.length === 0 ? (
            <p className="text-sm text-slate-500">No summary available.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto">
              <div className="grid grid-cols-12 gap-2 px-2 py-1 font-semibold text-xs">
                <div className="col-span-6">Employee</div>
                <div className="col-span-2 text-right">Present</div>
                <div className="col-span-2 text-right">Recorded</div>
                <div className="col-span-2 text-right">%</div>
              </div>

              {monthlySummary.map((row) => (
                <div key={row.id} className="grid grid-cols-12 gap-2 px-2 py-2 items-center border-b">
                  <div className="col-span-6">{row.name}</div>
                  <div className="col-span-2 text-right">{row.presentDays}</div>
                  <div className="col-span-2 text-right">{row.totalDays}</div>
                  <div className="col-span-2 text-right">{row.percent}%</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
