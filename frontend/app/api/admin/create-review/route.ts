// app/api/admin/create-review/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error('Missing SUPABASE env vars');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const supabaseServer = createClient(SUPABASE_URL, SERVICE_KEY);

    const {
      employee_id,
      overall_score,
      comments,
      review_period,
      reviewer,
      reviewer_employee_id,
    } = body;

    if (!employee_id || overall_score === undefined || overall_score === null) {
      return NextResponse.json({ error: 'Missing employee_id or overall_rating' }, { status: 400 });
    }

    const insertPayload: any = {
      employee_id,
      overall_score,
      comments: comments ?? null,
      review_period: review_period ?? new Date().toISOString().slice(0, 10),
    };

    if (reviewer) insertPayload.reviewer = reviewer;
    if (reviewer_employee_id) insertPayload.reviewer_employee_id = reviewer_employee_id;

    const { data, error } = await supabaseServer
      .from('performance_scores')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error (server):', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.message || error }, { status: 500 });
    }

    return NextResponse.json({ success: true, review: data }, { status: 200 });
  } catch (err: any) {
    console.error('create-review route error:', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
