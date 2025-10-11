"use client"; // Marks this as a Client Component

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Bonus {
  id: string;
  bonus_type: string;
  amount: number;
  reason: string | null;
  awarded_date: string;
  status: string;
}

export default function EmployeeBonusesPage() {
  const { user } = useAuth();
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBonuses();
    } else {
      setLoading(false); // Stop loading if there's no user
    }
  }, [user]);

  const fetchBonuses = async () => {
    try {
      if (!user) return; // Guard clause
      const { data, error } = await supabase
        .from('bonuses')
        .select('*')
        .eq('employee_id', user.id)
        .order('awarded_date', { ascending: false });

      if (error) throw error;
      setBonuses(data || []);
    } catch (error) {
      console.error('Error fetching bonuses:', error);
      toast.error('Failed to load bonus information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      paid: 'default', // You might want a different color, e.g., 'outline' with a success color
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const totalBonuses = bonuses
    .filter(b => b.status === 'paid' || b.status === 'approved') // Consider including 'approved' bonuses as well
    .reduce((sum, b) => sum + Number(b.amount), 0);

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Bonus Information</h1>
          <p className="text-muted-foreground">View your earned bonuses and rewards</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Total Bonuses Earned</CardTitle>
            <CardDescription>Total of all approved and paid bonuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalBonuses.toFixed(2)}</div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {loading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Loading bonuses...</CardContent></Card>
          ) : bonuses.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">You have not received any bonuses yet.</CardContent></Card>
          ) : (
            bonuses.map((bonus) => (
              <Card key={bonus.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        {bonus.bonus_type}
                      </CardTitle>
                      <CardDescription>
                        Awarded on: {new Date(bonus.awarded_date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(bonus.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="text-2xl font-bold text-green-600">${Number(bonus.amount).toFixed(2)}</span>
                    </div>
                    {bonus.reason && (
                      <p className="text-sm text-muted-foreground mt-2 border-l-2 pl-2">
                         {bonus.reason}
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