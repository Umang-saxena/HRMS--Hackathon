// Re-export the auto-generated Supabase client from Lovable Cloud
export { supabase } from '@/integrations/supabase/client';

// Database Types (extend as needed based on your Supabase schema)
export type UserRole = 'admin' | 'hr' | 'interviewer' | 'candidate' | 'employee';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  salary_range?: string;
  status: 'draft' | 'open' | 'closed';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  job_id: string;
  candidate_id: string;
  resume_url: string;
  cover_letter?: string;
  status: 'applied' | 'screening' | 'interview' | 'shortlisted' | 'rejected' | 'hired';
  match_score?: number;
  created_at: string;
  updated_at: string;
}

export interface ParsedResume {
  id: string;
  application_id: string;
  name: string;
  email: string;
  phone?: string;
  title?: string;
  summary?: string;
  skills: string[];
  experience: Array<{
    company: string;
    position: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    year: string;
  }>;
  parsed_at: string;
}

export interface Interview {
  id: string;
  application_id: string;
  interviewer_id: string;
  scheduled_at: string;
  duration_minutes: number;
  type: 'phone' | 'video' | 'in-person';
  status: 'scheduled' | 'completed' | 'cancelled';
  video_url?: string;
  transcript?: string;
  notes?: string;
  score?: number;
  sentiment?: string;
  filler_word_count?: number;
  created_at: string;
  updated_at: string;
}
