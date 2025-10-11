import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Next.js uses process.env with NEXT_PUBLIC_ prefix for client-side variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);