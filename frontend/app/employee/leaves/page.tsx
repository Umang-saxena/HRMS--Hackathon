'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<any[]>([]);

  useEffect(() => {
    loadLeaves();
  }, []);

  async function loadLeaves() {
    const { data } = await supabase
      .from('leaves')
      .select('*')
      .eq('employee_id', 'EMP001'); // Replace with session user ID
    setLeaves(data || []);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Leaves</h1>
        <p className="text-slate-600 mt-1">Track your leave history and status</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <CalendarCheck className="text-blue-600" /> Leave Requests
          </CardTitle>
          <CardDescription>History of applied leaves</CardDescription>
        </CardHeader>
        <CardContent>
          {leaves.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No leave data available.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {leaves.map((l, i) => (
                <div key={i} className="flex justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">
                      {new Date(l.start_date).toLocaleDateString()} → {new Date(l.end_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-600">{l.reason}</p>
                  </div>
                  <Badge variant="outline" className={getStatusColor(l.status)}>
                    {l.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
