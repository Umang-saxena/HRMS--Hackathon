'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Filter, Mail, Phone, Building2, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import type { Employee, Department } from '@/lib/supabase';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    department_id: '',
    salary: '',
    hire_date: new Date().toISOString().split('T')[0],
    status: 'active',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: employeesData } = await supabase
      .from('employees')
      .select('*, departments(name)')
      .order('created_at', { ascending: false });

    const { data: deptData } = await supabase
      .from('departments')
      .select('*')
      .order('name');

    setEmployees(employeesData || []);
    setDepartments(deptData || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.from('employees').insert([
      {
        ...formData,
        salary: formData.salary ? parseFloat(formData.salary) : null,
      },
    ]);

    if (!error) {
      setIsDialogOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        position: '',
        department_id: '',
        salary: '',
        hire_date: new Date().toISOString().split('T')[0],
        status: 'active',
      });
      loadData();
    }
  }

  const filteredEmployees = employees.filter((emp) =>
    `${emp.first_name} ${emp.last_name} ${emp.email} ${emp.position}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-600 mt-1">Manage your team members</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>Enter employee details to add them to your organization.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">Salary</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hire_date">Hire Date</Label>
                  <Input
                    id="hire_date"
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-blue-600 to-cyan-600">
                  Add Employee
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No employees found. Add your first employee to get started.</p>
              </div>
            ) : (
              filteredEmployees.map((employee: any) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={employee.profile_image_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                        {employee.first_name[0]}
                        {employee.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">
                          {employee.first_name} {employee.last_name}
                        </h3>
                        <Badge className={getStatusColor(employee.status)}>
                          {employee.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{employee.position}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        {employee.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {employee.email}
                          </div>
                        )}
                        {employee.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {employee.phone}
                          </div>
                        )}
                        {employee.departments && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {employee.departments.name}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Joined {new Date(employee.hire_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
