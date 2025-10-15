'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Building2, Calendar, DollarSign, User, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import type { Employee } from '@/lib/supabase';

export default function EmployeeProfilePage() {
  const params = useParams();
  const employeeId = params.id as string;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEmployeeProfile();
  }, [employeeId]);

  async function loadEmployeeProfile() {
    try {
      setLoading(true);
      setError(null);

      // Fetch employee profile using the new API endpoint
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;

      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/hr/employees/${employeeId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const employeeData = await response.json();
      setEmployee(employeeData);
    } catch (err) {
      console.error('Error loading employee profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load employee profile');
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'on_leave':
        return 'bg-yellow-100 text-yellow-800';
      case 'terminated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading employee profile...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Employee not found'}</p>
          <Button
            onClick={() => window.location.href = '/hr/employees'}
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Employees
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/hr/employees'}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Employees
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employee Profile</h1>
          <p className="text-slate-600 mt-1">Detailed information about {employee.first_name} {employee.last_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <Avatar className="h-24 w-24 mx-auto mb-4">
              <AvatarImage src={employee.profile_image_url || ''} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-2xl">
                {employee.first_name[0]}{employee.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-xl">
              {employee.first_name} {employee.last_name}
            </CardTitle>
            <p className="text-slate-600">{employee.position}</p>
            <Badge className={getStatusColor(employee.status)}>
              {employee.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-sm">{employee.email}</span>
            </div>
            {employee.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-sm">{employee.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm">Joined {new Date(employee.hire_date).toLocaleDateString()}</span>
            </div>
            {employee.salary && (
              <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-slate-400" />
                <span className="text-sm">${employee.salary.toLocaleString()}/year</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Employee ID</label>
                <p className="text-sm text-slate-900">{employee.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Position</label>
                <p className="text-sm text-slate-900">{employee.position}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Department</label>
                <p className="text-sm text-slate-900">
                  {(employee as any).departments?.name || 'Not assigned'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Status</label>
                <Badge className={getStatusColor(employee.status)}>
                  {employee.status}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Hire Date</label>
                <p className="text-sm text-slate-900">
                  {new Date(employee.hire_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Salary</label>
                <p className="text-sm text-slate-900">
                  {employee.salary ? `$${employee.salary.toLocaleString()}` : 'Not specified'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Email</label>
                <p className="text-sm text-slate-900">{employee.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Phone</label>
                <p className="text-sm text-slate-900">{employee.phone || 'Not provided'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Created At</label>
                  <p className="text-sm text-slate-900">
                    {new Date(employee.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Last Updated</label>
                  <p className="text-sm text-slate-900">
                    {new Date(employee.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
