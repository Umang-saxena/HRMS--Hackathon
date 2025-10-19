'use client';

import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function PayrollPage() {
  const [payroll, setPayroll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayroll();
  }, []);

  async function loadPayroll() {
    setLoading(true);
    try {
      // 1) Get the logged-in session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const session = sessionData?.session;
      if (!session) {
        console.warn('No active session - user not logged in');
        setPayroll([]);
        return;
      }

      const userEmail = session.user?.email;
      if (!userEmail) {
        console.warn('Session has no email - cannot find employee');
        setPayroll([]);
        return;
      }

      // 2) Resolve employee record by email (use maybeSingle to avoid throwing if 0 rows)
      const { data: employeeRecord, error: empErr } = await supabase
        .from('employees')
        .select('id, email')
        .eq('email', userEmail)
        .maybeSingle();

      if (empErr) {
        console.error('Employee lookup error:', JSON.stringify(empErr, null, 2));
        setPayroll([]);
        return;
      }

      if (!employeeRecord?.id) {
        console.warn('No employee record found for:', userEmail);
        setPayroll([]);
        return;
      }

      const employeeId = employeeRecord.id;
      console.log('Resolved employeeId for payroll:', employeeId);

      // 3) Fetch payroll records for this employee
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .eq('employee_id', employeeId)
        .order('paid_on', { ascending: false }); // adjust column name if different

      if (error) {
        console.error('Payroll query error:', JSON.stringify(error, null, 2));
        setPayroll([]);
        return;
      }

      setPayroll(data || []);
    } catch (err: any) {
      console.error('Error fetching payroll:', JSON.stringify(err, null, 2));
      setPayroll([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Payroll</h1>
        <p className="text-slate-600 mt-1">Your salary payments and slips</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Wallet className="text-green-600" /> Salary Details
          </CardTitle>
          <CardDescription>Monthly payroll transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8">Loading payroll records...</p>
          ) : payroll.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No payroll records yet.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {payroll.map((p, i) => {
                const paidOn = p.paid_on || p.date || p.created_at;
                const monthLabel = p.month || (paidOn ? new Date(paidOn).toLocaleString('default', { month: 'long', year: 'numeric' }) : '');
                return (
                  <div key={i} className="flex justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">
                        {paidOn ? new Date(paidOn).toLocaleDateString() : 'Unknown date'} {monthLabel ? `(${monthLabel})` : ''}
                      </p>
                      {p.notes && <p className="text-xs text-slate-600">{p.notes}</p>}
                    </div>
                    <p className="font-semibold text-green-700">₹{p.salary}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
