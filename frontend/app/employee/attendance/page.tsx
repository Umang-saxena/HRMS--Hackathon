'use client';

import { useEffect, useState } from 'react';
import { Clock, CalendarCheck, LogOut, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type AttendanceRow = {
  id: string;
  employee_id?: string | null;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
  total_hours?: number | null;
  status?: string | null;
  created_at?: string | null;
};

export default function AttendancePage() {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAttendance();
  }, []);

  // Helper: returns today's date string in YYYY-MM-DD (server date alignment)
  const getTodayDateStr = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  async function resolveEmployeeId(): Promise<string | null> {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const session = (sessionData as any)?.session;
      if (!session) return null;
      const userEmail = session.user?.email;
      if (!userEmail) return null;

      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select('id')
        .eq('email', userEmail)
        .maybeSingle();

      if (empErr) {
        console.error('Employee lookup error:', JSON.stringify(empErr, null, 2));
        return null;
      }
      return emp?.id ?? null;
    } catch (err) {
      console.error('resolveEmployeeId error:', err);
      return null;
    }
  }

  async function loadAttendance() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const empId = await resolveEmployeeId();
      if (!empId) {
        setErrorMsg('Could not resolve employee for current user.');
        setAttendance([]);
        setTodayRecord(null);
        setEmployeeId(null);
        return;
      }

      setEmployeeId(empId);

      // Fetch recent attendance records for this employee (last 30 days)
      const todayStr = getTodayDateStr();
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', empId)
        .order('date', { ascending: false })
        .limit(60);

      if (error) {
        console.error('Attendance fetch error:', JSON.stringify(error, null, 2));
        setErrorMsg('Failed to load attendance.');
        setAttendance([]);
        setTodayRecord(null);
        return;
      }

      const rows: AttendanceRow[] = (data || []) as AttendanceRow[];
      setAttendance(rows);

      // Find today's record (date column equals YYYY-MM-DD)
      const todayRec = rows.find((r) => {
        // r.date may be stored as 'YYYY-MM-DD' or ISO; compare only date part
        return (r.date || '').toString().startsWith(todayStr);
      }) || null;

      setTodayRecord(todayRec);
    } catch (err) {
      console.error('loadAttendance error:', err);
      setErrorMsg('Unexpected error loading attendance.');
      setAttendance([]);
      setTodayRecord(null);
    } finally {
      setLoading(false);
    }
  }

  // Calculate total hours difference between check_in and check_out in hours (decimal)
  const calcHours = (checkIn?: string | null, checkOut?: string | null) => {
    if (!checkIn || !checkOut) return null;
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return null;
    const msDiff = outDate.getTime() - inDate.getTime();
    const hours = msDiff / (1000 * 60 * 60);
    return Math.round(hours * 100) / 100; // round to 2 decimals
  };

  async function handleCheckIn() {
    if (!employeeId) {
      setErrorMsg('Employee not resolved. Please login again.');
      return;
    }
    setActionInProgress(true);
    setErrorMsg(null);

    try {
      const today = getTodayDateStr();
      // Prevent duplicate check-ins: ensure no existing record for today with check_in
      const { data: existing } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .maybeSingle();

      if (existing && existing.check_in) {
        setErrorMsg('You have already checked in today.');
        setActionInProgress(false);
        return;
      }

      // insert new record if none exists, otherwise update check_in
      if (!existing) {
        const nowIso = new Date().toISOString();
        const { data: inserted, error: insErr } = await supabase
          .from('attendance')
          .insert([
            {
              employee_id: employeeId,
              date: today,
              check_in: nowIso,
              status: 'Present',
            },
          ])
          .select()
          .single();

        if (insErr) throw insErr;
        setTodayRecord(inserted as AttendanceRow);
      } else {
        // update existing row's check_in
        const nowIso = new Date().toISOString();
        const { data: updated, error: upErr } = await supabase
          .from('attendance')
          .update({ check_in: nowIso, status: 'Present' })
          .eq('id', existing.id)
          .select()
          .single();

        if (upErr) throw upErr;
        setTodayRecord(updated as AttendanceRow);
      }

      // refresh list
      await loadAttendance();
    } catch (err: any) {
      console.error('Check-in error:', JSON.stringify(err, null, 2));
      setErrorMsg('Failed to check in. Try again.');
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleCheckOut() {
    if (!employeeId) {
      setErrorMsg('Employee not resolved. Please login again.');
      return;
    }
    setActionInProgress(true);
    setErrorMsg(null);

    try {
      const today = getTodayDateStr();

      // find today's record
      const { data: rec } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .maybeSingle();

      if (!rec || !rec.id) {
        setErrorMsg('No check-in found for today. Please check in first.');
        setActionInProgress(false);
        return;
      }

      if (rec.check_out) {
        setErrorMsg('You have already checked out today.');
        setActionInProgress(false);
        return;
      }

      const nowIso = new Date().toISOString();
      const totalHours = calcHours(rec.check_in, nowIso);

      const { data: updated, error: upErr } = await supabase
        .from('attendance')
        .update({
          check_out: nowIso,
          total_hours: totalHours,
        })
        .eq('id', rec.id)
        .select()
        .single();

      if (upErr) throw upErr;

      setTodayRecord(updated as AttendanceRow);

      // refresh list
      await loadAttendance();
    } catch (err: any) {
      console.error('Check-out error:', JSON.stringify(err, null, 2));
      setErrorMsg('Failed to check out. Try again.');
    } finally {
      setActionInProgress(false);
    }
  }

  const hasCheckedIn = !!todayRecord?.check_in;
  const hasCheckedOut = !!todayRecord?.check_out;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Attendance</h1>
        <p className="text-slate-600 mt-1">Check-in / Check-out and view your recent attendance</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="text-blue-600" /> Today
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">Quick actions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading attendance...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <p className="text-sm text-slate-600">Date</p>
                <p className="font-medium">{getTodayDateStr()}</p>
              </div>

              <div>
                <p className="text-sm text-slate-600">Check-in</p>
                <p className="font-medium">{todayRecord?.check_in ? new Date(todayRecord.check_in).toLocaleTimeString() : '—'}</p>
              </div>

              <div>
                <p className="text-sm text-slate-600">Check-out</p>
                <p className="font-medium">{todayRecord?.check_out ? new Date(todayRecord.check_out).toLocaleTimeString() : '—'}</p>
              </div>

              <div>
                <p className="text-sm text-slate-600">Total Hours</p>
                <p className="font-medium">{todayRecord?.total_hours ?? (hasCheckedIn && !hasCheckedOut ? 'In progress' : '—')}</p>
              </div>

              <div className="md:col-span-3 flex gap-3 mt-2">
                {!hasCheckedIn ? (
                  <Button onClick={handleCheckIn} disabled={actionInProgress} className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" /> Check In
                  </Button>
                ) : !hasCheckedOut ? (
                  <Button onClick={handleCheckOut} disabled={actionInProgress} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700">
                    <LogOut className="w-4 h-4" /> Check Out
                  </Button>
                ) : (
                  <Badge variant="outline">Done for today</Badge>
                )}
              </div>

              {errorMsg && (
                <div className="md:col-span-3 text-sm text-red-600">
                  {errorMsg}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent attendance list */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <CalendarCheck className="text-green-600" /> Recent Attendance
          </CardTitle>
          <CardDescription>Last records (most recent first)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : attendance.length === 0 ? (
            <p className="text-sm text-slate-500">No attendance records found.</p>
          ) : (
            <div className="space-y-2">
              {attendance.map((r) => (
                <div key={r.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50">
                  <div>
                    <div className="text-sm font-semibold">{r.date}</div>
                    <div className="text-xs text-slate-600">
                      {r.check_in ? `In: ${new Date(r.check_in).toLocaleTimeString()} ` : ''}
                      {r.check_out ? `• Out: ${new Date(r.check_out).toLocaleTimeString()}` : ''}
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="text-right">{r.total_hours ? `${r.total_hours} hrs` : r.status || '—'}</div>
                    <div className="text-xs text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</div>
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
