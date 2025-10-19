'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/simple-progress';
import { useToast } from '@/hooks/use-toast';

type EmployeeRow = { id: string; first_name: string; last_name: string; email?: string | null };

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
};

export default function EmployeePerformancePage() {
  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [records, setRecords] = useState<Perf[]>([]);
  const [avgOverall, setAvgOverall] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const email = (sessionData as any)?.session?.user?.email ?? null;
      if (!email) {
        setEmployee(null);
        setRecords([]);
        setAvgOverall(0);
        setLoading(false);
        return;
      }

      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('email', email)
        .maybeSingle();

      if (empErr) {
        console.error('Employee lookup error:', JSON.stringify(empErr, null, 2));
        toast({ title: 'Failed to load profile', variant: 'destructive' });
        setEmployee(null);
        setRecords([]);
        setAvgOverall(0);
        setLoading(false);
        return;
      }
      if (!emp) {
        setEmployee(null);
        setRecords([]);
        setAvgOverall(0);
        setLoading(false);
        return;
      }

      setEmployee(emp);

      const { data: recs, error: recErr } = await supabase
        .from('performance_scores')
        .select('*')
        .eq('employee_id', (emp as EmployeeRow).id)
        .order('review_period', { ascending: false });

      if (recErr) {
        console.error('Error loading performance records:', JSON.stringify(recErr, null, 2));
        toast({ title: 'Failed to load performance', variant: 'destructive' });
        setRecords([]);
        setAvgOverall(0);
        setLoading(false);
        return;
      }

      const arr = recs || [];
      setRecords(arr as Perf[]);
      const avg =
        arr.length > 0 ? arr.reduce((acc: number, r: any) => acc + (Number(r.overall_score) || 0), 0) / arr.length : 0;
      setAvgOverall(avg);
    } catch (err) {
      console.error('Unexpected error loading performance:', err);
      toast({ title: 'Unexpected error', variant: 'destructive' });
      setRecords([]);
      setAvgOverall(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Performance</h1>
        <p className="text-slate-600 mt-1">Your evaluations and history</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <TrendingUp className="text-purple-600" /> Overview
          </CardTitle>
          <CardDescription>Your average and recent records</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : !employee ? (
            <p className="text-sm text-slate-500">No linked employee profile found for this account.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Employee</p>
                  <p className="text-lg font-semibold">{employee.first_name} {employee.last_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Average Overall</p>
                  <p className="text-2xl font-semibold">{avgOverall.toFixed(1)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-2">Recent Evaluations</p>
                {records.length === 0 ? (
                  <p className="text-sm text-slate-500">No performance records yet.</p>
                ) : (
                  <div className="space-y-3">
                    {records.map((r) => (
                      <div key={r.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">Period: {r.review_period}</div>
                          <div className="text-sm text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</div>
                        </div>

                        <div className="mt-2 text-sm text-slate-700">
                          <div>Overall: <strong>{r.overall_score}</strong></div>
                          <div>Quality: {r.quality_score} • Productivity: {r.productivity_score}</div>
                          <div>Teamwork: {r.teamwork_score} • Communication: {r.communication_score}</div>
                          <div className="mt-2">{r.comments || '—'}</div>
                          <div className="mt-2"><Progress value={Math.max(0, Math.min(100, Number(r.overall_score)))} className="h-2" /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
