// app/admin/payroll/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type EmployeeRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  salary: number | null;
};

export default function AdminPayrollPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<string | null>(null);
  const [salaryInput, setSalaryInput] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusReason, setBonusReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [payrolls, setPayrolls] = useState<any[]>([]); // display payroll table rows

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const { data: emps, error: empErr } = await supabase.from('employees').select('*').order('created_at', { ascending: false }).limit(500);
      if (empErr) throw empErr;
      setEmployees((emps as EmployeeRow[]) ?? []);

      // fetch recent payroll rows (from your payroll table)
      const { data: pr, error: prErr } = await supabase.from('payroll').select('*').order('created_at', { ascending: false }).limit(200);
      if (prErr) throw prErr;
      setPayrolls((pr as any[]) ?? []);
    } catch (err: any) {
      console.error('loadAll error', err);
      setError(err?.message ?? String(err));
      setEmployees([]);
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  }

  async function saveSalary(empId: string) {
    const val = Number(salaryInput);
    if (isNaN(val) || val < 0) {
      alert('Enter a valid salary value');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from('employees').update({ salary: val }).eq('id', empId);
      if (error) throw error;
      setSalaryInput('');
      setSelectedEmp(null);
      await loadAll();
      alert('Salary updated');
    } catch (err: any) {
      console.error('saveSalary error', err);
      alert('Failed to update salary: ' + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  }

  async function addBonus(empId: string) {
    const amount = Number(bonusAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Enter a valid bonus amount');
      return;
    }
    try {
      // record admin id if available
      const userRes = await supabase.auth.getUser();
      const adminId = (userRes as any)?.data?.user?.id ?? (userRes as any)?.user?.id ?? null;

      setLoading(true);
      const { error } = await supabase.from('bonuses').insert([
        {
          employee_id: empId,
          amount,
          reason: bonusReason || 'Bonus',
          assigned_by: adminId,
        },
      ]);
      if (error) throw error;
      setBonusAmount('');
      setBonusReason('');
      setSelectedEmp(null);
      await loadAll();
      alert('Bonus added');
    } catch (err: any) {
      console.error('addBonus error', err);
      alert('Failed to add bonus: ' + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-semibold">Admin — Payroll</h2>

      {error && <div className="text-red-600">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
          <CardDescription>Set salary & assign bonuses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {employees.map((e) => (
              <div key={e.id} className="flex items-center justify-between border p-3 rounded">
                <div>
                  <div className="font-medium">{e.first_name} {e.last_name}</div>
                  <div className="text-xs text-slate-500">{e.email}</div>
                  <div className="text-sm">Salary (yearly): ₹ {Number(e.salary ?? 0).toFixed(2)}</div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={selectedEmp === e.id ? salaryInput : ''}
                    onChange={(ev) => {
                      setSelectedEmp(e.id);
                      setSalaryInput(ev.target.value);
                    }}
                    placeholder="Yearly salary"
                    className="border px-2 py-1 rounded w-36"
                  />
                  <Button onClick={() => saveSalary(e.id)} disabled={loading}>
                    Save
                  </Button>

                  <input
                    type="number"
                    value={selectedEmp === e.id ? bonusAmount : ''}
                    onChange={(ev) => {
                      setSelectedEmp(e.id);
                      setBonusAmount(ev.target.value);
                    }}
                    placeholder="Bonus amount"
                    className="border px-2 py-1 rounded w-28"
                  />
                  <input
                    type="text"
                    value={selectedEmp === e.id ? bonusReason : ''}
                    onChange={(ev) => {
                      setSelectedEmp(e.id);
                      setBonusReason(ev.target.value);
                    }}
                    placeholder="Reason"
                    className="border px-2 py-1 rounded w-36"
                  />
                  <Button onClick={() => addBonus(e.id)} disabled={loading}>
                    Add Bonus
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payroll Records</CardTitle>
          <CardDescription>Rows from your `payroll` table</CardDescription>
        </CardHeader>
        <CardContent>
          {payrolls.length === 0 ? (
            <div>No payroll rows yet.</div>
          ) : (
            <div className="space-y-2">
              {payrolls.map((p) => (
                <div key={p.id} className="flex justify-between items-center border p-2 rounded">
                  <div>
                    <div className="text-sm">Employee: {p.employee_id}</div>
                    <div className="text-xs text-slate-500">Month: {p.month ? new Date(p.month).toLocaleString() : ''}</div>
                  </div>
                  <div className="text-right">
                    <div>Gross: ₹ {Number(p.gross_salary ?? p.base_salary ?? 0).toFixed(2)}</div>
                    <div>Net: ₹ {Number(p.net_salary ?? 0).toFixed(2)}</div>
                    <div className="text-xs">{p.payment_status}</div>
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
