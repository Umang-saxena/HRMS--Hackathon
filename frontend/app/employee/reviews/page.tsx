'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type ReviewRow = {
  id: string;
  employee_id: string;
  worklife_score: number | null;
  job_satisfaction_score: number | null;
  company_rating: number | null;
  feedback?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export default function EmployeeCompanyReviewsPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [employeeId, setEmployeeId] = useState<string | null>(null);

  // form state
  const [worklife, setWorklife] = useState<number | ''>('');
  const [jobSat, setJobSat] = useState<number | ''>('');
  const [companyRating, setCompanyRating] = useState<number | ''>('');
  const [feedback, setFeedback] = useState<string>('');

  // reviews loaded
  const [myReviews, setMyReviews] = useState<ReviewRow[]>([]);
  const [allReviews, setAllReviews] = useState<ReviewRow[]>([]);

  useEffect(() => {
    void loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load current user -> employee row -> reviews
  async function loadInitial() {
    setLoading(true);
    try {
      // 1. get auth user
      const { data: userData } = await supabase.auth.getUser();
      const user = (userData as any)?.user ?? null;
      if (!user?.email) {
        toast({ title: 'Not authenticated', description: 'Please login to review', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // 2. resolve employee row by email
      const { data: empData, error: empErr } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (empErr) {
        console.error('Failed to load employee row', empErr);
        toast({ title: 'Failed to load profile', variant: 'destructive' });
        setLoading(false);
        return;
      }
      if (!empData) {
        toast({ title: 'Employee record not found', description: 'Ask HR to link your account', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const empId = (empData as any).id;
      setEmployeeId(empId);

      // 3. load my reviews
      const { data: myRevData, error: myRevErr } = await supabase
        .from('company_reviews')
        .select('*')
        .eq('employee_id', empId)
        .order('created_at', { ascending: false });

      if (myRevErr) console.warn('my reviews fetch:', myRevErr);

      // 4. load all reviews (company-wide = all rows)
      const { data: allRevData, error: allRevErr } = await supabase
        .from('company_reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (allRevErr) console.warn('all reviews fetch:', allRevErr);

      setMyReviews((myRevData ?? []) as ReviewRow[]);
      setAllReviews((allRevData ?? []) as ReviewRow[]);
    } catch (err) {
      console.error('loadInitial error', err);
      toast({ title: 'Error', description: 'Failed to load reviews', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // aggregated company stats across all reviews
  const companyAggregates = useMemo(() => {
    if (!allReviews || allReviews.length === 0) {
      return {
        count: 0,
        avgWorklife: 0,
        avgJobSat: 0,
        avgRating: 0,
      };
    }
    const count = allReviews.length;
    const avgWorklife =
      allReviews.reduce((s, r) => s + (Number(r.worklife_score ?? 0) || 0), 0) / count;
    const avgJobSat =
      allReviews.reduce((s, r) => s + (Number(r.job_satisfaction_score ?? 0) || 0), 0) / count;
    const avgRating =
      allReviews.reduce((s, r) => s + (Number(r.company_rating ?? 0) || 0), 0) / count;

    return {
      count,
      avgWorklife,
      avgJobSat,
      avgRating,
    };
  }, [allReviews]);

  async function handleSubmitReview(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!employeeId) {
      toast({ title: 'No employee', description: 'Could not identify your profile', variant: 'destructive' });
      return;
    }

    const w = Number(worklife);
    const j = Number(jobSat);
    const r = Number(companyRating);

    if (![w, j, r].every((v) => Number.isInteger(v) && v >= 1 && v <= 5)) {
      toast({ title: 'Validation', description: 'Please select a score 1–5 for all rating fields', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employee_id: employeeId,
        worklife_score: w,
        job_satisfaction_score: j,
        company_rating: r,
        feedback: feedback?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('company_reviews').insert([payload]).select('*');

      if (error) {
        console.error('insert review error', error);
        toast({ title: 'Failed', description: error.message || 'Could not submit', variant: 'destructive' });
        return;
      }

      toast({ title: 'Thanks!', description: 'Your review has been recorded' });
      // clear form
      setWorklife('');
      setJobSat('');
      setCompanyRating('');
      setFeedback('');

      // optimistic update
      const inserted = (data ?? [])[0] as ReviewRow;
      setMyReviews((prev) => [inserted, ...prev]);
      setAllReviews((prev) => [inserted, ...prev]);
    } catch (err) {
      console.error('submit error', err);
      toast({ title: 'Error', description: 'Failed to submit review', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading reviews...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Company Reviews</h1>
        <p className="text-sm text-slate-600 mt-1">Share your feedback and ratings for the company</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit a review</CardTitle>
          <CardDescription>All rating fields are 1 (low) to 5 (high). Your feedback helps improve the workplace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitReview} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium">Work-life balance (1–5)</label>
                <select
                  value={worklife}
                  onChange={(e) => setWorklife(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">Select</option>
                  {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium">Job satisfaction (1–5)</label>
                <select
                  value={jobSat}
                  onChange={(e) => setJobSat(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">Select</option>
                  {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium">Rate the company (1–5)</label>
                <select
                  value={companyRating}
                  onChange={(e) => setCompanyRating(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">Select</option>
                  {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium">Feedback (optional)</label>
              <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit review'}</Button>
              <Button variant="ghost" onClick={() => { setWorklife(''); setJobSat(''); setCompanyRating(''); setFeedback(''); }}>Reset</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Company summary</CardTitle>
            <CardDescription>Aggregates from all reviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Reviews</strong>: {companyAggregates.count}</div>
              <div><strong>Avg Work-life</strong>: {companyAggregates.avgWorklife ? companyAggregates.avgWorklife.toFixed(2) : '—'}</div>
              <div><strong>Avg Job Sat.</strong>: {companyAggregates.avgJobSat ? companyAggregates.avgJobSat.toFixed(2) : '—'}</div>
              <div><strong>Avg Rating</strong>: {companyAggregates.avgRating ? companyAggregates.avgRating.toFixed(2) : '—'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your recent reviews</CardTitle>
            <CardDescription>Reviews you submitted (most recent first)</CardDescription>
          </CardHeader>
          <CardContent>
            {myReviews.length === 0 ? (
              <div className="text-sm text-slate-500">You haven't submitted any reviews yet.</div>
            ) : (
              <div className="space-y-2">
                {myReviews.map((r) => (
                  <div key={r.id} className="border rounded p-3">
                    <div className="text-xs text-slate-500">{r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy') : ''}</div>
                    <div className="text-sm font-medium">Rating: {r.company_rating}/5</div>
                    <div className="text-xs">Work-life: {r.worklife_score} · Job Sat: {r.job_satisfaction_score}</div>
                    {r.feedback && <div className="mt-2 text-sm text-slate-700">{r.feedback}</div>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent feedbacks</CardTitle>
            <CardDescription>Public feedback snippets from employees</CardDescription>
          </CardHeader>
          <CardContent>
            {allReviews.filter(r => r.feedback).length === 0 ? (
              <div className="text-sm text-slate-500">No feedbacks yet.</div>
            ) : (
              <div className="space-y-2">
                {allReviews
                  .filter((r) => r.feedback)
                  .slice(0, 5)
                  .map((r) => (
                    <div key={r.id} className="border rounded p-3 text-sm">
                      <div className="text-xs text-slate-500">{r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy') : ''}</div>
                      <div className="mt-1 line-clamp-3">{r.feedback}</div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
