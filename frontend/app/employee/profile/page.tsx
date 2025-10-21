'use client';

import { useEffect, useState } from 'react';
import { User, Mail, Phone, Calendar, Edit, Save, X, Info } from 'lucide-react';
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

  // new optional fields
  age?: number | null;
  gender?: string | null;
  marital_status?: string | null;
  distance_km?: number | null;
  previous_companies_count?: number | null;
};

export default function ProfilePage() {
  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<EmployeeRow>>({});
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [extraData, setExtraData] = useState<Partial<EmployeeRow>>({});
  const { toast } = useToast();

  useEffect(() => {
    void loadEmployeeProfile();
  }, []);

  async function loadEmployeeProfile() {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session?.user?.email) return;

      const { data: emp, error } = await supabase
        .from('employees')
        .select(
          `id, first_name, last_name, email, phone, department_id, company_id, role, date_of_joining,
           salary, employment_status, created_at,
           age, gender, marital_status, distance_km, previous_companies_count`
        )
        .eq('email', session.user.email)
        .maybeSingle();

      if (error) throw error;
      if (!emp) return;

      setEmployee(emp as EmployeeRow);
      setEditData(emp as Partial<EmployeeRow>);
      setExtraData(emp as Partial<EmployeeRow>);

      if (emp.department_id) {
        const { data: dept } = await supabase
          .from('departments')
          .select('name')
          .eq('id', emp.department_id)
          .maybeSingle();
        setDepartmentName(dept?.name ?? null);
      }

      if (emp.company_id) {
        const { data: comp } = await supabase
          .from('companies')
          .select('name')
          .eq('id', emp.company_id)
          .maybeSingle();
        setCompanyName(comp?.name ?? null);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      toast({ title: 'Failed to load profile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveChanges() {
    if (!employee) return;
    try {
      const updates = {
        first_name: editData.first_name,
        last_name: editData.last_name,
        phone: editData.phone,
        role: editData.role,
        date_of_joining: editData.date_of_joining,
      };

      const { error } = await supabase.from('employees').update(updates).eq('id', employee.id);
      if (error) throw error;

      toast({ title: 'Profile updated successfully 🎉' });
      setEditMode(false);
      await loadEmployeeProfile();
    } catch (err) {
      console.error('Error updating profile:', err);
      toast({ title: 'Failed to update profile', variant: 'destructive' });
    }
  }

  async function handleSaveExtraDetails() {
    if (!employee) return;
    try {
      const updates = {
        age: extraData.age ? Number(extraData.age) : null,
        gender: extraData.gender ?? null,
        marital_status: extraData.marital_status ?? null,
        distance_km: extraData.distance_km ? Number(extraData.distance_km) : null,
        previous_companies_count: extraData.previous_companies_count
          ? Number(extraData.previous_companies_count)
          : null,
      };

      const { error } = await supabase.from('employees').update(updates).eq('id', employee.id);
      if (error) throw error;

      toast({ title: 'Extra details saved successfully 🎉' });
      setShowExtraForm(false);
      await loadEmployeeProfile();
    } catch (err) {
      console.error('Error saving extra details:', err);
      toast({ title: 'Failed to save details', variant: 'destructive' });
    }
  }

  const formatCurrency = (value: number | string | null | undefined) => {
    if (value == null) return '—';
    const num = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(num)) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleChange = (field: keyof EmployeeRow, value: any) => {
    if (showExtraForm) setExtraData((p) => ({ ...p, [field]: value }));
    else setEditData((p) => ({ ...p, [field]: value }));
  };

  const hasExtraDetails =
    employee?.age ||
    employee?.gender ||
    employee?.marital_status ||
    employee?.distance_km ||
    employee?.previous_companies_count;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
          <p className="text-slate-600 mt-1">Your personal and job details</p>
        </div>

        <div className="flex gap-2">
          {!loading && (
            <>
              <Button onClick={() => setEditMode((p) => !p)} variant="default">
                {editMode ? (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </>
                )}
              </Button>
              {!hasExtraDetails && !showExtraForm && (
                <Button
                  onClick={() => setShowExtraForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Info className="w-4 h-4 mr-2" /> Fill Extra Details
                </Button>
              )}
            </>
          )}
        </div>
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
            <p className="text-sm text-slate-500 text-center py-8">
              No employee details found for your account.
            </p>
          ) : (
            <>
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                <div>
                  <label className="font-medium">First Name</label>
                  {editMode ? (
                    <Input
                      value={String(editData.first_name ?? '')}
                      onChange={(e) => handleChange('first_name', e.target.value)}
                    />
                  ) : (
                    <p>{employee.first_name}</p>
                  )}
                </div>
                <div>
                  <label className="font-medium">Last Name</label>
                  {editMode ? (
                    <Input
                      value={String(editData.last_name ?? '')}
                      onChange={(e) => handleChange('last_name', e.target.value)}
                    />
                  ) : (
                    <p>{employee.last_name}</p>
                  )}
                </div>
                <div>
                  <label className="font-medium">Email</label>
                  <p>{employee.email}</p>
                </div>
                <div>
                  <label className="font-medium">Phone</label>
                  {editMode ? (
                    <Input
                      value={String(editData.phone ?? '')}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                  ) : (
                    <p>{employee.phone || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="font-medium">Role</label>
                  {editMode ? (
                    <Input
                      value={String(editData.role ?? '')}
                      onChange={(e) => handleChange('role', e.target.value)}
                    />
                  ) : (
                    <p>{employee.role || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="font-medium">Date of Joining</label>
                  {editMode ? (
                    <Input
                      type="date"
                      value={String(editData.date_of_joining ?? '')}
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
                <div>
                  <strong>Department:</strong> {departmentName || '—'}
                </div>
                <div>
                  <strong>Company:</strong> {companyName || '—'}
                </div>
                <div>
                  <strong>Salary:</strong> {formatCurrency(employee.salary)}
                </div>
                <div>
                  <strong>Status:</strong>{' '}
                  <Badge variant="outline" className="capitalize">
                    {employee.employment_status || 'active'}
                  </Badge>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Extra Info Section */}
              {showExtraForm ? (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Add Extra Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Age</label>
                      <Input
                        type="number"
                        min={0}
                        value={String(extraData.age ?? '')}
                        onChange={(e) =>
                          handleChange('age', e.target.value ? Number(e.target.value) : null)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Gender</label>
                      <select
                        value={String(extraData.gender ?? '')}
                        onChange={(e) => handleChange('gender', e.target.value || null)}
                        className="w-full border rounded px-2 py-1"
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Marital Status</label>
                      <select
                        value={String(extraData.marital_status ?? '')}
                        onChange={(e) => handleChange('marital_status', e.target.value || null)}
                        className="w-full border rounded px-2 py-1"
                      >
                        <option value="">Select</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">
                        Distance from Home to Office (km)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        value={String(extraData.distance_km ?? '')}
                        onChange={(e) =>
                          handleChange(
                            'distance_km',
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">
                        Number of Previous Companies
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={String(extraData.previous_companies_count ?? '')}
                        onChange={(e) =>
                          handleChange(
                            'previous_companies_count',
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={handleSaveExtraDetails}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" /> Save Details
                    </Button>
                    <Button variant="ghost" onClick={() => setShowExtraForm(false)}>
                      <X className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Extra Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <p>
                      <strong>Age:</strong> {employee.age ?? '—'}
                    </p>
                    <p>
                      <strong>Gender:</strong> {employee.gender ?? '—'}
                    </p>
                    <p>
                      <strong>Marital Status:</strong> {employee.marital_status ?? '—'}
                    </p>
                    <p>
                      <strong>Distance (km):</strong>{' '}
                      {employee.distance_km != null ? `${employee.distance_km} km` : '—'}
                    </p>
                    <p>
                      <strong>Companies Worked:</strong>{' '}
                      {employee.previous_companies_count ?? '—'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
