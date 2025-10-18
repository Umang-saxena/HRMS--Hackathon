'use client';

import { useEffect, useState } from 'react';
import { User, Mail, Phone, Building2, Calendar, DollarSign, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type EmployeeRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  department_id?: string | null;
  company_id?: string | null;
  role?: string | null;
  date_of_joining?: string | null;
  salary?: number | string | null;
  employment_status?: string | null;
  created_at?: string | null;
};

export default function ProfilePage() {
  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployeeProfile();
  }, []);

  async function loadEmployeeProfile() {
    setLoading(true);
    try {
      // 1) Get Supabase session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }

      const session = sessionData?.session;
      if (!session) {
        console.warn('No active session - user not logged in');
        setEmployee(null);
        return;
      }

      const userEmail = session.user?.email;
      if (!userEmail) {
        console.warn('Session missing email');
        setEmployee(null);
        return;
      }

      // 2) Fetch employee row by email
      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select(
          'id, first_name, last_name, email, phone, department_id, company_id, role, date_of_joining, salary, employment_status, created_at'
        )
        .eq('email', userEmail)
        .maybeSingle(); // safe when 0 rows

      if (empErr) {
        console.error('Employee lookup error:', JSON.stringify(empErr, null, 2));
        setEmployee(null);
        return;
      }

      if (!emp) {
        console.warn('No employee record found for:', userEmail);
        setEmployee(null);
        return;
      }

      setEmployee(emp);

      // 3) If department_id / company_id present, fetch names (non-blocking)
      const fetchExtras: Promise<any>[] = [];

      if (emp.department_id) {
        fetchExtras.push(
          supabase
            .from('departments')
            .select('name')
            .eq('id', emp.department_id)
            .maybeSingle()
            .then((res) => {
              if (!res.error && res.data) setDepartmentName((res.data as any).name || null);
            })
            .catch(() => {})
        );
      }

      if (emp.company_id) {
        fetchExtras.push(
          supabase
            .from('companies')
            .select('name')
            .eq('id', emp.company_id)
            .maybeSingle()
            .then((res) => {
              if (!res.error && res.data) setCompanyName((res.data as any).name || null);
            })
            .catch(() => {})
        );
      }

      await Promise.all(fetchExtras);
    } catch (err: any) {
      console.error('Error fetching employee profile:', JSON.stringify(err, null, 2));
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: number | string | null | undefined) => {
    if (value == null) return '—';
    const num = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(num)) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
        <p className="text-slate-600 mt-1">Your personal and job details</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <User className="text-blue-600" /> Employee Information
          </CardTitle>
          <CardDescription>Your registered details</CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8">Loading profile...</p>
          ) : !employee ? (
            <p className="text-sm text-slate-500 text-center py-8">No employee details found for your account.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                {/* Name */}
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="font-medium">{employee.first_name} {employee.last_name}</span>
                </div>

                {/* Email */}
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span>{employee.email}</span>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span>{employee.phone || '—'}</span>
                </div>

                {/* Company */}
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span>{companyName || '—'}</span>
                </div>

                {/* Joining date */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>{employee.date_of_joining ? new Date(employee.date_of_joining).toLocaleDateString() : '—'}</span>
                </div>

                {/* Salary */}
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-500" />
                  <span>{formatCurrency(employee.salary)}</span>
                </div>

                {/* Employment status — use div, not p, since Badge may render a block */}
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-slate-500" />
                  <div>
                    <div className="text-sm"><strong>Status:</strong></div>
                    <div className="mt-1">
                      <Badge variant="outline" className="capitalize">{employee.employment_status || 'active'}</Badge>
                    </div>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-center gap-2">
                  <strong>Role:</strong>
                  <span className="capitalize">{employee.role || '—'}</span>
                </div>

                {/* Department */}
                <div className="flex items-center gap-2">
                  <strong>Department:</strong>
                  <span>{departmentName || '—'}</span>
                </div>

                {/* Created / Joined */}
                <div className="flex items-center gap-2">
                  <strong>Joined:</strong>
                  <span>{employee.created_at ? new Date(employee.created_at).toLocaleDateString() : '—'}</span>
                </div>
              </div>

              <Separator />

              {/* Optional: small meta box */}
              <div className="text-sm text-slate-700">
                <div><strong>Employee ID:</strong> {employee.id}</div>
                <div className="mt-1 text-xs text-slate-500">If any detail is incorrect, contact HR to update your record.</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
