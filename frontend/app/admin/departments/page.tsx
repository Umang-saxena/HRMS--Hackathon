'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type Department = { id: string; name: string };
type Employee = { id: string; department_id?: string | null };

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [{ data: deptData, error: deptErr }, { data: empData, error: empErr }] = await Promise.all([
        supabase.from('departments').select('*').order('name', { ascending: true }),
        supabase.from('employees').select('id, department_id'),
      ]);

      if (deptErr) throw deptErr;
      if (empErr) throw empErr;

      setDepartments(deptData || []);
      setEmployees(empData || []);
    } catch (err: any) {
      console.error('Error loading departments page:', err);
      toast({ title: 'Failed to load', variant: 'destructive' });
      setDepartments([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }

  function countForDept(deptId: string) {
    return employees.filter((e) => e.department_id === deptId).length;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Departments</h1>
        <p className="text-slate-600 mt-1">View departments and employee counts</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Department Overview</CardTitle>
          <CardDescription>Number of employees in each department</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : departments.length === 0 ? (
            <p className="text-sm text-slate-500">No departments found.</p>
          ) : (
            <div className="space-y-3">
              {departments.map((d) => (
                <div
                  key={d.id}
                  className="flex justify-between items-center border rounded-lg p-4 hover:bg-slate-50 transition"
                >
                  <div className="font-medium text-slate-800">{d.name}</div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{countForDept(d.id)}</div>
                    <div className="text-xs text-slate-500">Employees</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => void load()}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
