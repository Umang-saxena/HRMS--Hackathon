import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Department = {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  budget: number;
  created_at: string;
  updated_at: string;
};

export type Employee = {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  position: string;
  hire_date: string;
  salary: number | null;
  status: 'active' | 'on_leave' | 'terminated';
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type LearningCourse = {
  id: string;
  title: string;
  description: string | null;
  category: 'technical' | 'soft_skills' | 'leadership' | 'compliance';
  level: 'beginner' | 'intermediate' | 'advanced';
  duration_hours: number;
  instructor: string | null;
  thumbnail_url: string | null;
  ai_recommended: boolean;
  created_at: string;
  updated_at: string;
};

export type EmployeeCourse = {
  id: string;
  employee_id: string;
  course_id: string;
  enrollment_date: string;
  completion_date: string | null;
  progress_percentage: number;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
  score: number | null;
};

export type PerformanceReview = {
  id: string;
  employee_id: string;
  reviewer_id: string | null;
  review_period_start: string;
  review_period_end: string;
  overall_rating: number | null;
  technical_skills: number | null;
  communication: number | null;
  leadership: number | null;
  teamwork: number | null;
  comments: string | null;
  ai_insights: any;
  created_at: string;
};

export type AIInsight = {
  id: string;
  insight_type: 'turnover_risk' | 'skill_gap' | 'performance_trend' | 'learning_recommendation';
  employee_id: string | null;
  department_id: string | null;
  title: string;
  description: string | null;
  confidence_score: number | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  status: 'new' | 'reviewed' | 'actioned' | 'dismissed';
  created_at: string;
};

export type AttendanceLog = {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'work_from_home';
  notes: string | null;
};


export type JobApplicationResponse = {
  id: string;
  job_id: string;
  candidate_id: string;
  ai_score: number | null;
  match_reason: string | null;
  screening_status: string;
  applied_at: string;
  updated_at: string;
  cover_letter: string | null;
  resume_url: string | null;
  additional_info: string | null;
};
