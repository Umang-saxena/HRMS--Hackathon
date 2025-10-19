// app/api/admin/create-performance/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function toInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error('[create-performance] missing env vars');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const supabaseServer = createClient(SUPABASE_URL, SERVICE_KEY);

    const {
      employee_id,
      reviewer_id,
      review_period,
      quality_score,
      productivity_score,
      teamwork_score,
      communication_score,
      overall_score: overallSent,
      comments,
    } = body || {};

    if (!employee_id || !reviewer_id || !review_period) {
      return NextResponse.json({ error: 'Missing required fields: employee_id, reviewer_id, review_period' }, { status: 400 });
    }

    // coerce to integers (round)
    const qs = toInt(quality_score ?? 0);
    const ps = toInt(productivity_score ?? 0);
    const ts = toInt(teamwork_score ?? 0);
    const cs = toInt(communication_score ?? 0);

    if ([qs, ps, ts, cs].some((v) => Number.isNaN(v))) {
      return NextResponse.json({ error: 'Scores must be numeric' }, { status: 400 });
    }

    // enforce 0..25 per-subscore
    const invalid = [
      { name: 'quality', v: qs },
      { name: 'productivity', v: ps },
      { name: 'teamwork', v: ts },
      { name: 'communication', v: cs },
    ].find(x => x.v < 0 || x.v > 25);

    if (invalid) {
      return NextResponse.json({ error: `Subscore ${invalid.name} must be between 0 and 25` }, { status: 400 });
    }

    // compute integer overall as sum
    const overall = qs + ps + ts + cs;

    // optional: compare with sent overall (if you want to be strict)
    if (overallSent !== undefined && overallSent !== null) {
      const osentInt = toInt(overallSent);
      if (Number.isNaN(osentInt)) {
        return NextResponse.json({ error: 'Overall score must be numeric' }, { status: 400 });
      }
      if (osentInt !== overall) {
        // instead of failing silently, communicate clearly
        return NextResponse.json({ error: `Overall must equal sum of subscores (${overall}). Sent overall=${osentInt}` }, { status: 400 });
      }
    }

    if (overall < 0 || overall > 100) {
      return NextResponse.json({ error: 'Overall must be between 0 and 100' }, { status: 400 });
    }

    // verify employee & reviewer exist
    const [{ data: empRow, error: empErr }, { data: revRow, error: revErr }] = await Promise.all([
      supabaseServer.from('employees').select('id').eq('id', employee_id).maybeSingle(),
      supabaseServer.from('employees').select('id').eq('id', reviewer_id).maybeSingle(),
    ]);

    if (empErr) {
      console.error('[create-performance] emp lookup error', empErr);
      return NextResponse.json({ error: 'DB error checking employee' }, { status: 500 });
    }
    if (!empRow) {
      return NextResponse.json({ error: `Employee not found for id ${employee_id}` }, { status: 400 });
    }
    if (revErr) {
      console.error('[create-performance] reviewer lookup error', revErr);
      return NextResponse.json({ error: 'DB error checking reviewer' }, { status: 500 });
    }
    if (!revRow) {
      return NextResponse.json({ error: `Reviewer not found for id ${reviewer_id}` }, { status: 400 });
    }

    // insert with integer fields
    const payload = {
      employee_id,
      reviewer_id,
      review_period,
      quality_score: qs,
      productivity_score: ps,
      teamwork_score: ts,
      communication_score: cs,
      overall_score: overall,
      comments: comments ?? null,
    };

    const { data, error } = await supabaseServer
      .from('performance_scores')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('[create-performance] insert error', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.message || JSON.stringify(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true, performance: data }, { status: 200 });
  } catch (err: any) {
    console.error('[create-performance] unexpected error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
