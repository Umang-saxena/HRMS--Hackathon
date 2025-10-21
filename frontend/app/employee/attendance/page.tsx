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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const todayStr = () => new Date().toISOString().slice(0, 10);

  async function resolveEmployeeId() {
    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData?.session?.user?.email;
    if (!email) return null;
    const { data: emp } = await supabase.from('employees').select('id').eq('email', email).maybeSingle();
    return emp?.id ?? null;
  }

  async function loadAttendance() {
    setLoading(true);
    try {
      const empId = await resolveEmployeeId();
      if (!empId) {
        setErrorMsg('Employee not found.');
        return;
      }
      setEmployeeId(empId);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', empId)
        .order('date', { ascending: false })
        .limit(30);
      if (error) throw error;
      setAttendance(data ?? []);
      setTodayRecord((data ?? []).find(r => r.date === todayStr()) ?? null);
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadAttendance(); }, []);

  function calcHours(checkIn?: string | null, checkOut?: string | null) {
    if (!checkIn || !checkOut) return null;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.round((diff / 36e5) * 100) / 100;
  }

  async function handleCheckIn() {
    if (!employeeId) return;
    setActionInProgress(true);
    try {
      const payload = {
        employee_id: employeeId,
        date: todayStr(),
        check_in: new Date().toISOString(),
        status: 'Present',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('attendance')
        .upsert([payload], { onConflict: 'employee_id,date' })
        .select()
        .single();
      if (error) throw error;
      setTodayRecord(data);
      await loadAttendance();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to check in.');
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleCheckOut() {
    if (!employeeId || !todayRecord?.id) return;
    setActionInProgress(true);
    try {
      const nowIso = new Date().toISOString();
      const total = calcHours(todayRecord.check_in, nowIso);
      const { data, error } = await supabase
        .from('attendance')
        .update({ check_out: nowIso, total_hours: total, updated_at: nowIso })
        .eq('id', todayRecord.id)
        .select()
        .single();
      if (error) throw error;
      setTodayRecord(data);
      await loadAttendance();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to check out.');
    } finally {
      setActionInProgress(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Attendance</h1>
        <p className="text-slate-600 mt-1">Check-in / Check-out and view records</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock /> Today</CardTitle>
          <CardDescription>Quick actions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <p>Date: <b>{todayStr()}</b></p>
              <p>Check-in: {todayRecord?.check_in ? new Date(todayRecord.check_in).toLocaleTimeString() : '—'}</p>
              <p>Check-out: {todayRecord?.check_out ? new Date(todayRecord.check_out).toLocaleTimeString() : '—'}</p>
              <div className="mt-3 flex gap-2">
                {!todayRecord?.check_in && (
                  <Button onClick={handleCheckIn} disabled={actionInProgress}><LogIn /> Check In</Button>
                )}
                {todayRecord?.check_in && !todayRecord?.check_out && (
                  <Button onClick={handleCheckOut} disabled={actionInProgress} className="bg-orange-600 hover:bg-orange-700"><LogOut /> Check Out</Button>
                )}
                {todayRecord?.check_out && <Badge variant="outline">Done for today</Badge>}
              </div>
              {errorMsg && <p className="text-red-600 text-sm mt-2">{errorMsg}</p>}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><CalendarCheck /> Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <p>No records.</p>
          ) : (
            <div className="space-y-2">
              {attendance.map(r => (
                <div key={r.id} className="p-2 border rounded flex justify-between">
                  <span>{r.date}</span>
                  <span>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
