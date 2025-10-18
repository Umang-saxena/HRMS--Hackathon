'use client';

import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function BonusesPage() {
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBonuses();
  }, []);

 async function loadBonuses() {
  setLoading(true);
  try {
    // 1️⃣ Get logged-in user
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const session = sessionData?.session;
    if (!session) {
      console.warn('No active session - user not logged in');
      setBonuses([]);
      return;
    }

    const userEmail = session.user?.email;
    if (!userEmail) {
      console.warn('Session has no email');
      setBonuses([]);
      return;
    }

    console.log('🔍 Looking up employee for email:', userEmail);

    // 2️⃣ Fetch employee by email (since user_id column doesn't exist)
    const { data: employeeRecord, error: empErr } = await supabase
      .from('employees')
      .select('id, email')
      .eq('email', userEmail)
      .maybeSingle(); // returns null instead of throwing when 0 rows

    if (empErr) {
      console.error('Employee lookup error:', JSON.stringify(empErr, null, 2));
      setBonuses([]);
      return;
    }

    if (!employeeRecord) {
      console.warn('No employee record found for user email:', userEmail);
      setBonuses([]);
      return;
    }

    const employeeId = employeeRecord.id;
    console.log('✅ Employee found. ID:', employeeId);

    // 3️⃣ Fetch bonuses for that employee
    const { data, error } = await supabase
      .from('bonuses')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date_awarded', { ascending: false });

    if (error) {
      console.error('Bonuses query error:', JSON.stringify(error, null, 2));
      setBonuses([]);
      return;
    }

    setBonuses(data || []);
  } catch (err: any) {
    console.error('Error fetching bonuses:', JSON.stringify(err, null, 2));
    setBonuses([]);
  } finally {
    setLoading(false);
  }
}



  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Bonuses</h1>
        <p className="text-slate-600 mt-1">All bonuses and rewards you’ve received</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Gift className="text-yellow-600" /> Bonus History
          </CardTitle>
          <CardDescription>Your latest bonus transactions</CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8">Loading...</p>
          ) : bonuses.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No bonuses recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {bonuses.map((bonus, index) => (
                <div key={index} className="flex justify-between items-center py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{bonus.reason || bonus.title || 'Bonus'}</p>
                    <p className="text-xs text-slate-600">
                      {new Date(bonus.date || bonus.date_awarded || bonus.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    ₹{bonus.amount}
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
