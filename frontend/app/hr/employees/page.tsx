'use client';

import { useEffect, useState, useMemo } from 'react';
import { Edit, Trash, Search, User, Mail, Building2, UploadCloud, DownloadCloud, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type Employee = {
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

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Employee | null>(null);
  const [editData, setEditData] = useState<Partial<Employee>>({});
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createData, setCreateData] = useState<Partial<Employee>>({});
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page]);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    applyFilter();
    setPage(1);
  }, [employees, search]);

  async function loadEmployees() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setEmployees(data || []);
      setFiltered(data || []);
    } catch (err: any) {
      console.error('Error loading employees:', err);
      toast({ title: 'Failed to load employees', variant: 'destructive' });
      setEmployees([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  }

  function applyFilter() {
    if (!search) {
      setFiltered(employees);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      employees.filter(
        (e) =>
          `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
          (e.email || '').toLowerCase().includes(q) ||
          (e.role || '').toLowerCase().includes(q)
      )
    );
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setEditData({
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      phone: emp.phone ?? '',
      role: emp.role ?? '',
      date_of_joining: emp.date_of_joining ?? '',
      salary: emp.salary ?? '',
      employment_status: emp.employment_status ?? '',
    });
  }

  function closeEdit() {
    setEditing(null);
    setEditData({});
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const updates: Partial<Employee> = {
        first_name: editData.first_name,
        last_name: editData.last_name,
        phone: editData.phone,
        role: editData.role,
        date_of_joining: editData.date_of_joining,
        salary: editData.salary,
        employment_status: editData.employment_status,
      };

      const { error } = await supabase.from('employees').update(updates).eq('id', editing.id);
      if (error) throw error;

      toast({ title: 'Employee updated' });
      closeEdit();
      await loadEmployees();
    } catch (err) {
      console.error('Update error:', err);
      toast({ title: 'Failed to update employee', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(emp: Employee) {
    const confirmDel = window.confirm(`Delete employee "${emp.first_name} ${emp.last_name}"? This cannot be undone.`);
    if (!confirmDel) return;

    try {
      const { error } = await supabase.from('employees').delete().eq('id', emp.id);
      if (error) throw error;
      toast({ title: 'Employee deleted' });
      await loadEmployees();
    } catch (err) {
      console.error('Delete error:', err);
      toast({ title: 'Failed to delete employee', variant: 'destructive' });
    }
  }

  // Create new employee
  async function handleCreate() {
    // basic validation
    if (!createData.first_name || !createData.last_name || !createData.email) {
      toast({ title: 'Required fields missing', description: 'First name, last name and email are required', variant: 'destructive' });
      return;
    }
    try {
      const insertRow = {
        first_name: createData.first_name,
        last_name: createData.last_name,
        email: createData.email,
        phone: createData.phone || null,
        role: createData.role || null,
        date_of_joining: createData.date_of_joining || null,
        salary: createData.salary || null,
        employment_status: createData.employment_status || 'active',
      };
      const { error } = await supabase.from('employees').insert([insertRow]);
      if (error) throw error;
      toast({ title: 'Employee created' });
      setCreateData({});
      setShowCreate(false);
      await loadEmployees();
    } catch (err) {
      console.error('Create error:', err);
      toast({ title: 'Failed to create employee', variant: 'destructive' });
    }
  }

  // CSV parsing (very simple parser; assumes header row and comma-separated)
  function parseCSV(text: string) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 1) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      // split - naive, does not support quoted commas
      const values = line.split(',').map((v) => v.trim());
      const obj: any = {};
      headers.forEach((h, i) => {
        obj[h] = values[i] ?? '';
      });
      return obj;
    });
    return { headers, rows };
  }

  // Bulk import CSV: expects columns matching the employees table (first_name,last_name,email,phone,role,date_of_joining,salary,employment_status)
  async function handleCSVFile(file: File | null) {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      if (rows.length === 0) {
        toast({ title: 'CSV empty', variant: 'destructive' });
        setImporting(false);
        return;
      }

      // Map CSV rows to DB columns - best-effort mapping
      const mapped = rows.map((r) => ({
        first_name: r['first_name'] || r['firstname'] || r['FirstName'] || '',
        last_name: r['last_name'] || r['lastname'] || r['LastName'] || '',
        email: r['email'] || r['Email'] || '',
        phone: r['phone'] || r['Phone'] || null,
        role: r['role'] || r['Role'] || null,
        date_of_joining: r['date_of_joining'] || r['dateOfJoining'] || null,
        salary: r['salary'] ? Number(r['salary']) : null,
        employment_status: r['employment_status'] || r['status'] || 'active',
      }));

      // optionally validate rows
      const invalid = mapped.filter((m) => !m.email || !m.first_name || !m.last_name);
      if (invalid.length) {
        toast({ title: 'Some rows missing required fields', description: `${invalid.length} rows skipped`, variant: 'destructive' });
      }

      const toInsert = mapped.filter((m) => m.email && m.first_name && m.last_name);

      if (toInsert.length === 0) {
        toast({ title: 'No valid rows to import', variant: 'destructive' });
        setImporting(false);
        return;
      }

      // Insert in batches (supabase has limits; do 100 at a time)
      const batchSize = 100;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        const { error } = await supabase.from('employees').insert(batch);
        if (error) {
          console.error('Bulk insert error for batch', i / batchSize, error);
          toast({ title: 'Import failed', description: error.message, variant: 'destructive' });
          setImporting(false);
          return;
        }
      }

      toast({ title: `Imported ${toInsert.length} employees` });
      await loadEmployees();
    } catch (err) {
      console.error('CSV import error:', err);
      toast({ title: 'Failed to import CSV', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  }

  // Export visible employees to CSV (filtered)
  function exportToCSV(rows: Employee[]) {
    if (!rows.length) {
      toast({ title: 'No rows to export', variant: 'destructive' });
      return;
    }
    const headers = ['id', 'first_name', 'last_name', 'email', 'phone', 'role', 'date_of_joining', 'salary', 'employment_status', 'created_at'];
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const val = (r as any)[h];
            if (val == null) return '';
            // escape quotes
            const s = String(val).replace(/"/g, '""');
            // if contains comma or newline, wrap in quotes
            return s.includes(',') || s.includes('\n') ? `"${s}"` : s;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-600 mt-1">View, create, import, edit or remove employee records</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <UploadCloud className="w-5 h-5 text-slate-600" />
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleCSVFile(e.target.files?.[0] ?? null)}
            />
            <span className="text-sm text-slate-700">Import CSV</span>
          </label>

          <Button variant="ghost" onClick={() => exportToCSV(filtered)}>
            <DownloadCloud className="w-4 h-4 mr-2" /> Export CSV
          </Button>

          <Button onClick={() => setShowCreate((s) => !s)}>
            <Plus className="w-4 h-4 mr-2" /> New Employee
          </Button>
        </div>
      </div>

      {/* Create Panel */}
      {showCreate && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Create Employee</CardTitle>
            <CardDescription>Fill required fields and click Create</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input placeholder="First name" value={createData.first_name || ''} onChange={(e) => setCreateData((p) => ({ ...p, first_name: e.target.value }))} />
              <Input placeholder="Last name" value={createData.last_name || ''} onChange={(e) => setCreateData((p) => ({ ...p, last_name: e.target.value }))} />
              <Input placeholder="Email" value={createData.email || ''} onChange={(e) => setCreateData((p) => ({ ...p, email: e.target.value }))} />
              <Input placeholder="Phone" value={createData.phone || ''} onChange={(e) => setCreateData((p) => ({ ...p, phone: e.target.value }))} />
              <Input placeholder="Role" value={createData.role || ''} onChange={(e) => setCreateData((p) => ({ ...p, role: e.target.value }))} />
              <Input type="date" placeholder="Date of joining" value={createData.date_of_joining || ''} onChange={(e) => setCreateData((p) => ({ ...p, date_of_joining: e.target.value }))} />
              <Input placeholder="Salary" value={String(createData.salary ?? '')} onChange={(e) => setCreateData((p) => ({ ...p, salary: e.target.value }))} />
              <Input placeholder="Employment status" value={createData.employment_status || ''} onChange={(e) => setCreateData((p) => ({ ...p, employment_status: e.target.value }))} />
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleCreate} disabled={importing}>Create</Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input placeholder="Search by name, email, role..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        </div>

        <div className="text-sm text-slate-600">
          Showing {filtered.length} results • Page {page}/{totalPages}
        </div>
      </div>

      {/* Employees list */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardDescription>Manage records</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading employees...</p>
          ) : paginated.length === 0 ? (
            <p className="text-sm text-slate-500">No employees found.</p>
          ) : (
            <div className="space-y-2">
              {paginated.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-slate-100 w-10 h-10 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{e.first_name} {e.last_name}</div>
                      <div className="text-xs text-slate-600 flex items-center gap-3">
                        <Mail className="w-3 h-3" /> {e.email}
                        <Building2 className="w-3 h-3 ml-2" /> <span className="capitalize">{e.role || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{e.employment_status || 'active'}</Badge>
                    <Button variant="ghost" onClick={() => openEdit(e)} title="Edit"><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" onClick={() => handleDelete(e)} title="Delete" className="text-red-600"><Trash className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination controls */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
            <div className="px-3 py-1 border rounded">{page}</div>
            <Button variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit panel */}
      {editing && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Edit Employee</CardTitle>
            <CardDescription>Make changes and Save</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600">First name</label>
                <Input value={editData.first_name || ''} onChange={(e) => setEditData((p) => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Last name</label>
                <Input value={editData.last_name || ''} onChange={(e) => setEditData((p) => ({ ...p, last_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Phone</label>
                <Input value={editData.phone || ''} onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Role</label>
                <Input value={editData.role || ''} onChange={(e) => setEditData((p) => ({ ...p, role: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Date of Joining</label>
                <Input type="date" value={editData.date_of_joining || ''} onChange={(e) => setEditData((p) => ({ ...p, date_of_joining: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Employment Status</label>
                <Input value={editData.employment_status || ''} onChange={(e) => setEditData((p) => ({ ...p, employment_status: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Salary</label>
                <Input value={String(editData.salary || '')} onChange={(e) => setEditData((p) => ({ ...p, salary: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
              <Button variant="ghost" onClick={closeEdit}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
