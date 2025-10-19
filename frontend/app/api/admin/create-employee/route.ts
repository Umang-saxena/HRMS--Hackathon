// app/api/admin/create-employee/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing SUPABASE env variables for create-employee route.');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email || '').toString().trim().toLowerCase();
    let first_name = (body.first_name || '').toString().trim();
    let last_name = (body.last_name || '').toString().trim();

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    // Fallback name derivation if not provided
    if (!first_name) {
      const local = email.split('@')[0];
      first_name = local.split(/[._\-]/)[0] || 'Admin';
    }
    if (!last_name) {
      const local = email.split('@')[0];
      const parts = local.split(/[._\-]/);
      last_name = parts.slice(1).join(' ') || '';
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check existing employees row
    const existing = await supabase
      .from('employees')
      .select('id,email')
      .eq('email', email)
      .maybeSingle();

    if (existing.error) {
      console.error('Error checking existing employee:', existing.error);
      return NextResponse.json({ error: 'DB lookup failed', details: existing.error }, { status: 500 });
    }

    if (existing.data && (existing.data as any).id) {
      // already exists -> return id
      return NextResponse.json({ id: (existing.data as any).id });
    }

    // Insert new employee row
    const insertRow = {
      first_name,
      last_name,
      email,
      phone: null,
      department_id: null,
      company_id: null,
      role: 'admin',
      date_of_joining: new Date().toISOString().slice(0, 10),
      salary: null,
      employment_status: 'active',
    };

    const inserted = await supabase
      .from('employees')
      .insert([insertRow])
      .select('id')
      .maybeSingle();

    if (inserted.error) {
      console.error('Error inserting employee:', inserted.error);
      return NextResponse.json({ error: 'DB insert failed', details: inserted.error }, { status: 500 });
    }

    if (!inserted.data || !(inserted.data as any).id) {
      return NextResponse.json({ error: 'Insert returned no id' }, { status: 500 });
    }

    return NextResponse.json({ id: (inserted.data as any).id });
  } catch (err) {
    console.error('create-employee route error:', err);
    return NextResponse.json({ error: 'Unexpected error', details: String(err) }, { status: 500 });
  }
}
