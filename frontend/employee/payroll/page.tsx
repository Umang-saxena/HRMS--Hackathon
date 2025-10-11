"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// CORRECTED INTERFACE
interface Payroll {
  id: string;
  month: string;
  base_salary: number;
  allowances: number | null; // <-- Changed to allow null
  deductions: number | null; // <-- Changed to allow null
  net_salary: number;
  payment_status: string;
  paid_on: string | null;
}

export default function EmployeePayrollPage() {
  const { user } = useAuth();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPayrolls();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPayrolls = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .eq('employee_id', user.id)
        .order('month', { ascending: false });

      if (error) throw error;
      setPayrolls(data || []);
    } catch (error) {
      console.error('Error fetching payroll:', error);
      toast.error('Failed to load payroll information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      processed: 'outline',
      paid: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Payroll Information</h1>
          <p className="text-muted-foreground">View your salary details and payment history</p>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Loading payroll records...</CardContent></Card>
          ) : payrolls.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No payroll records have been generated yet.</CardContent></Card>
          ) : (
            payrolls.map((payroll) => (
              <Card key={payroll.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        {new Date(payroll.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                      </CardTitle>
                      <CardDescription>Payment Details</CardDescription>
                    </div>
                    {getStatusBadge(payroll.payment_status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Salary:</span>
                      <span className="font-medium">${payroll.base_salary.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allowances:</span>
                      {/* CORRECTED JSX to handle null */}
                      <span className="font-medium text-green-600">+${(payroll.allowances ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deductions:</span>
                      {/* CORRECTED JSX to handle null */}
                      <span className="font-medium text-red-600">-${(payroll.deductions ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2 flex justify-between">
                      <span className="font-semibold">Net Salary:</span>
                      <span className="font-bold text-lg">${payroll.net_salary.toFixed(2)}</span>
                    </div>
                    {payroll.paid_on && (
                      <p className="text-xs text-muted-foreground pt-2">
                        Paid on: {new Date(payroll.paid_on).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}