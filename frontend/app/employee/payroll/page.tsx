// app/employee/payroll/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Sparkles, Gift, Calendar, Wallet } from 'lucide-react';
import { format } from 'date-fns';

type EmployeeRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  salary: number | null; // yearly gross (numeric)
  date_of_joining?: string | null;
  role?: string | null;
};

type BonusRow = {
  id: string;
  employee_id: string;
  amount: number;
  reason?: string | null;
  assigned_at?: string | null;
  assigned_by?: string | null;
  received?: boolean | null;
};

/** TAX CONFIG (editable) **/
const TAX_CONFIG = {
  standardDeduction: 75000,
  cessPercent: 4,
  rebateLimit: 25000,
  slabs: [
    { upto: 300000, rate: 0 },
    { upto: 500000, rate: 0.05 },
    { upto: 1000000, rate: 0.2 },
    { upto: Infinity, rate: 0.3 },
  ],
};

/** TAX CALC (progressive) **/
function calculateTaxForAnnual(annualGross: number) {
  const std = TAX_CONFIG.standardDeduction;
  const taxable = Math.max(0, annualGross - std);

  let remaining = taxable;
  let prev = 0;
  let taxBeforeRebate = 0;

  for (const slab of TAX_CONFIG.slabs) {
    const up = slab.upto;
    if (remaining <= 0) break;
    const range = up === Infinity ? Infinity : up - prev;
    const taxableInSlab = Math.min(remaining, range === Infinity ? remaining : range);
    taxBeforeRebate += taxableInSlab * slab.rate;
    remaining -= taxableInSlab;
    prev = up === Infinity ? prev : up;
  }

  const rebate = Math.min(TAX_CONFIG.rebateLimit, taxBeforeRebate);
  const taxAfterRebate = Math.max(0, taxBeforeRebate - rebate);
  const cess = (taxAfterRebate * TAX_CONFIG.cessPercent) / 100;
  const totalTax = taxAfterRebate + cess;

  return {
    annualGross,
    standardDeduction: std,
    taxableIncome: taxable,
    taxBeforeRebate,
    rebate,
    taxAfterRebate,
    cess,
    totalTax,
    monthlyGross: annualGross / 12,
    monthlyTax: totalTax / 12,
    monthlyNet: annualGross / 12 - totalTax / 12,
  };
}

/** Helpers **/
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** UI Component **/
export default function EmployeePayrollPage() {
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [bonuses, setBonuses] = useState<BonusRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // load data
  useEffect(() => {
    void load();

    // realtime subscribe to bonuses so employee sees updates immediately
    const channel = supabase
      .channel('public:employee_bonuses')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bonuses' },
        (payload) => {
          try {
            const newRow = (payload as any).new;
            const oldRow = (payload as any).old;
            // if employee not loaded yet, ignore. load() will fetch later when employee is known
            const empId = employee?.id;
            if (!empId) return;
            const ev = (payload as any).event;
            if (ev === 'INSERT' && newRow?.employee_id === empId) {
              setBonuses((prev) => [newRow as BonusRow, ...prev]);
            } else if (ev === 'UPDATE' && newRow?.employee_id === empId) {
              setBonuses((prev) => prev.map((b) => (b.id === newRow.id ? (newRow as BonusRow) : b)));
            } else if (ev === 'DELETE' && oldRow?.employee_id === empId) {
              setBonuses((prev) => prev.filter((b) => b.id !== oldRow.id));
            }
          } catch {
            void load(); // fallback reload
          }
        }
      )
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch {
        try {
          // older clients
          // @ts-ignore
          supabase.removeChannel?.(channel);
        } catch {
          /* ignore */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const userRes = await supabase.auth.getUser();
      // supabase v2 returns data.user
      const user = (userRes as any)?.data?.user ?? (userRes as any)?.user;
      if (!user?.email) {
        setError('Not authenticated (email not available).');
        setLoading(false);
        return;
      }

      // find employee row by email (your employees table uses email)
      const { data: empData, error: empErr } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (empErr) throw empErr;
      if (!empData) {
        setError('Employee record not found. Ask HR to link your account.');
        setEmployee(null);
        setBonuses([]);
        setLoading(false);
        return;
      }
      setEmployee(empData as EmployeeRow);

      // fetch bonuses for this employee (most recent first)
      const { data: bonusData, error: bonusErr } = await supabase
        .from('bonuses')
        .select('*')
        .eq('employee_id', (empData as any).id)
        .order('assigned_at', { ascending: false });

      if (bonusErr) throw bonusErr;
      setBonuses((bonusData as BonusRow[]) ?? []);
    } catch (err: any) {
      console.error('Payroll load error', err);
      setError(err?.message ?? String(err));
      setEmployee(null);
      setBonuses([]);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // compute base monthly, totals, current in-hand and projected next-month in-hand
  const computed = useMemo(() => {
    const baseYearly = Number(employee?.salary ?? 0);
    const baseMonthly = baseYearly / 12;

    // current month bounds
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    // total bonuses in the year (we assume bonuses[] contains only relevant year entries; if your bonuses table spans multiple years, filter by year)
    const totalBonusesAll = bonuses.reduce((s, b) => s + Number(b.amount ?? 0), 0);

    // bonuses assigned *this month* (these will be applied next month)
    const bonusesThisMonth = bonuses.filter((b) => {
      if (!b.assigned_at) return false;
      const dt = new Date(b.assigned_at);
      return dt >= start && dt <= end;
    });
    const bonusTotalThisMonth = bonusesThisMonth.reduce((s, b) => s + Number(b.amount ?? 0), 0);

    // total bonuses excluding this month's ones
    const totalBonusesExclThisMonth = Math.max(0, totalBonusesAll - bonusTotalThisMonth);

    // compute tax scenarios:
    // - taxWithoutThisMonth: annual gross that excludes this month's newly assigned bonuses (represents current recurring in-hand)
    // - taxWithThisMonth: annual gross that includes this month's bonuses (represents the year if those bonuses are included)
    const annualWithoutThisMonth = baseYearly + totalBonusesExclThisMonth;
    const annualWithThisMonth = baseYearly + totalBonusesAll;

    const taxWithout = calculateTaxForAnnual(annualWithoutThisMonth);
    const taxWith = calculateTaxForAnnual(annualWithThisMonth);

    // current in-hand monthly (what employee effectively receives on average now): monthly net under taxWithout
    const currentInHandMonthly = Math.max(0, taxWithout.monthlyNet);

    // Projected next-month in-hand:
    // Start from current in-hand average, add the bonus amount that will be paid next month,
    // then subtract the incremental tax due to adding those bonuses to the annual tax liability.
    // incremental annual tax caused by this month's bonuses:
    const incrementalAnnualTax = Math.max(0, taxWith.totalTax - taxWithout.totalTax);
    // We assume the bonus is paid next month and the tax for that bonus is applied then;
    // so subtract full incremental tax in that month (simpler, one-time withholding).
    const projectedNextMonthInHand = Math.max(0, currentInHandMonthly + bonusTotalThisMonth - incrementalAnnualTax);

    // For an alternate approach (spread tax across months), you could subtract incrementalAnnualTax/12 instead.
    // We'll show both values in the UI (projectedNextMonthInHand uses immediate tax withholding).

    return {
      baseYearly,
      baseMonthly,
      bonusesThisMonth,
      bonusTotalThisMonth,
      totalBonusesAll,
      totalBonusesExclThisMonth,
      taxWithout,
      taxWith,
      currentInHandMonthly,
      projectedNextMonthInHand,
      incrementalAnnualTax,
    };
  }, [employee?.salary, bonuses]);

  if (loading) return <div className="p-6">Loading payroll...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!employee) return <div className="p-6">No employee record found.</div>;

  const fullName = `${employee.first_name} ${employee.last_name}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{fullName}</h1>
          <p className="text-sm text-slate-500">{employee.role ?? 'Employee'}</p>
          <p className="text-xs text-slate-400 mt-1">Joined: {employee.date_of_joining ? new Date(employee.date_of_joining).toLocaleDateString() : '—'}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => void refresh()} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'animate-spin' : ''} size={16} /> Refresh
          </Button>
        </div>
      </div>

      {/* Top metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet size={18} />
              <CardTitle className="text-base">Monthly Salary (base)</CardTitle>
            </div>
            <CardDescription className="text-sm text-slate-500">Monthly base pay</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">₹ {computed.baseMonthly.toFixed(2)}</div>
            <div className="text-xs text-slate-500 mt-1">Annual base: ₹ {computed.baseYearly.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift size={18} />
              <CardTitle className="text-base">In-hand Monthly</CardTitle>
            </div>
            <CardDescription className="text-sm text-slate-500">Estimated monthly take-home (after tax)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">₹ {computed.currentInHandMonthly.toFixed(2)}</div>
            <div className="text-xs text-slate-500 mt-1">Monthly tax (est): ₹ {computed.taxWithout.monthlyTax.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={18} />
              <CardTitle className="text-base">Projected Next Month (in-hand)</CardTitle>
            </div>
            <CardDescription className="text-sm text-slate-500">Includes bonuses assigned this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <div className="text-2xl font-semibold">₹ {computed.projectedNextMonthInHand.toFixed(2)}</div>
              {computed.bonusTotalThisMonth > 0 ? (
                <Badge variant="outline" className="px-2 py-1">
                  +₹ {computed.bonusTotalThisMonth.toFixed(2)} bonus
                </Badge>
              ) : (
                <Badge variant="outline" className="px-2 py-1">No bonuses</Badge>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1">Incremental tax on bonus (one-time): ₹ {computed.incrementalAnnualTax.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed area: tax breakdown + bonuses */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles size={18} />
              <CardTitle>Bonuses & adjustments</CardTitle>
            </div>
            <CardDescription>Bonuses assigned by admin — bonuses assigned in the current month will be paid next month.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bonuses.length === 0 ? (
                <div className="text-sm text-slate-500">No bonuses assigned.</div>
              ) : (
                bonuses.map((b) => {
                  const isThisMonth =
                    !!b.assigned_at &&
                    new Date(b.assigned_at) >= startOfMonth(new Date()) &&
                    new Date(b.assigned_at) <= endOfMonth(new Date());
                  return (
                    <div key={b.id} className="flex items-center justify-between border rounded p-3">
                      <div>
                        <div className="font-medium">{b.reason ?? 'Bonus'}</div>
                        <div className="text-xs text-slate-500">{b.assigned_at ? format(new Date(b.assigned_at), 'dd MMM yyyy, HH:mm') : '—'}</div>
                        <div className="text-xs text-slate-400 mt-1">Assigned by: {b.assigned_by ?? '—'}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-semibold">₹ {Number(b.amount ?? 0).toFixed(2)}</div>
                        <div className="text-xs mt-1">
                          {isThisMonth ? (
                            <Badge variant="outline">Applied next month</Badge>
                          ) : (
                            <Badge variant="outline">Already applied / past</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax Breakdown (annual)</CardTitle>
            <CardDescription>High-level view</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm mb-2">Gross (excl. this month bonus): ₹ {computed.taxWithout.annualGross.toFixed(2)}</div>
            <div className="text-sm mb-2">Gross (incl. this month bonus): ₹ {computed.taxWith.annualGross.toFixed(2)}</div>

            <div className="text-sm">Standard Deduction: ₹ {computed.taxWithout.standardDeduction.toFixed(2)}</div>
            <div className="text-sm">Tax before rebate: ₹ {computed.taxWithout.taxBeforeRebate.toFixed(2)}</div>
            <div className="text-sm">Rebate: ₹ {computed.taxWithout.rebate.toFixed(2)}</div>
            <div className="text-sm">Cess: ₹ {computed.taxWithout.cess.toFixed(2)}</div>
            <hr className="my-2" />
            <div className="text-lg font-semibold">Annual Tax (current): ₹ {computed.taxWithout.totalTax.toFixed(2)}</div>
            <div className="text-sm text-slate-500 mt-1">Monthly Tax (current est): ₹ {computed.taxWithout.monthlyTax.toFixed(2)}</div>

            <div className="mt-3 text-sm">If this month's bonuses are included in the annual tax:</div>
            <div className="text-sm">Annual Tax (projected): ₹ {computed.taxWith.totalTax.toFixed(2)}</div>
            <div className="text-sm">Monthly Tax (projected): ₹ {computed.taxWith.monthlyTax.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* footer actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-slate-500">
          Note: Estimates only. For production payroll/TDS use exact statutory formulas and rounding rules. Update tax config when rules change.
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void refresh()}><RefreshCw size={14} /> Refresh</Button>
        </div>
      </div>
    </div>
  );
}
