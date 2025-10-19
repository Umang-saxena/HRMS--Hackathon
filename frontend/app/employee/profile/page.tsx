'use client';

import { useEffect, useState } from 'react';

import { User, Mail, Phone, Building2, Calendar, DollarSign, CheckCircle } from 'lucide-react';

import { User, Mail, Phone, Building2, Calendar, DollarSign, CheckCircle, Edit, Save, X } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';


import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';


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

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<EmployeeRow>>({});
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      await loadEmployeeProfile();
    })();

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

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;


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


        .maybeSingle();

      if (empErr) throw empErr;

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

      setEditData(emp);

      // Fetch department & company names (if exist)
      const extras: Promise<void>[] = [];

      if (emp.department_id) {
        extras.push(
          (async () => {
            const res = await supabase.from('departments').select('name').eq('id', emp.department_id).maybeSingle();
            if (!res.error && res.data) setDepartmentName((res.data as any).name);
          })()

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

        extras.push(
          (async () => {
            const res = await supabase.from('companies').select('name').eq('id', emp.company_id).maybeSingle();
            if (!res.error && res.data) setCompanyName((res.data as any).name);
          })()
        );
      }

      await Promise.all(extras);
    } catch (err) {
      console.error('Error fetching employee profile:', err);
      toast({ title: 'Error loading profile', variant: 'destructive' });

      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }


  async function handleSaveChanges() {
    if (!employee) return;
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          first_name: editData.first_name,
          last_name: editData.last_name,
          phone: editData.phone,
          role: editData.role,
          date_of_joining: editData.date_of_joining,
        })
        .eq('id', employee.id);

      if (error) throw error;

      toast({ title: 'Profile updated successfully 🎉' });
      setEditMode(false);
      await loadEmployeeProfile();
    } catch (err) {
      console.error('Error updating profile:', err);
      toast({ title: 'Failed to update profile', variant: 'destructive' });
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

  const handleChange = (field: keyof EmployeeRow, value: any) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
          <p className="text-slate-600 mt-1">Your personal and job details</p>
        </div>
        {!loading && employee && (
          <Button
            onClick={() => (editMode ? handleSaveChanges() : setEditMode(true))}
            className={editMode ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {editMode ? (
              <>
                <Save className="w-4 h-4 mr-2" /> Save
              </>
            ) : (
              <>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </>
            )}
          </Button>
        )}

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

                {/* First Name */}
                <div>
                  <label className="font-medium">First Name</label>
                  {editMode ? (
                    <Input
                      value={editData.first_name || ''}
                      onChange={(e) => handleChange('first_name', e.target.value)}
                    />
                  ) : (
                    <p>{employee.first_name}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="font-medium">Last Name</label>
                  {editMode ? (
                    <Input
                      value={editData.last_name || ''}
                      onChange={(e) => handleChange('last_name', e.target.value)}
                    />
                  ) : (
                    <p>{employee.last_name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="font-medium">Email</label>
                  <p>{employee.email}</p>
                </div>

                {/* Phone */}
                <div>
                  <label className="font-medium">Phone</label>
                  {editMode ? (
                    <Input
                      value={editData.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                  ) : (
                    <p>{employee.phone || '—'}</p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="font-medium">Role</label>
                  {editMode ? (
                    <Input
                      value={editData.role || ''}
                      onChange={(e) => handleChange('role', e.target.value)}
                    />
                  ) : (
                    <p>{employee.role || '—'}</p>
                  )}
                </div>

                {/* Date of Joining */}
                <div>
                  <label className="font-medium">Date of Joining</label>
                  {editMode ? (
                    <Input
                      type="date"
                      value={editData.date_of_joining || ''}
                      onChange={(e) => handleChange('date_of_joining', e.target.value)}
                    />
                  ) : (
                    <p>
                      {employee.date_of_joining
                        ? new Date(employee.date_of_joining).toLocaleDateString()
                        : '—'}
                    </p>
                  )}
                </div>

                {/* Department / Company */}
                <p>
                  <strong>Department:</strong> {departmentName || '—'}
                </p>
                <p>
                  <strong>Company:</strong> {companyName || '—'}
                </p>

                <p>
                  <strong>Salary:</strong> {formatCurrency(employee.salary)}
                </p>

                <p>
                  <strong>Status:</strong>{' '}
                  <Badge variant="outline" className="capitalize">
                    {employee.employment_status || 'active'}
                  </Badge>
                </p>

              </div>

              <Separator />


              {/* Optional: small meta box */}
              <div className="text-sm text-slate-700">
                <div><strong>Employee ID:</strong> {employee.id}</div>

              <div className="text-sm text-slate-700">
                <p>
                  <strong>Employee ID:</strong> {employee.id}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  If any detail is incorrect, contact HR to update your record.
                </p>

              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
