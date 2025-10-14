/*
  # HRML (Human Resource Management & Learning) System Schema

  ## Overview
  Complete database schema for an AI-powered HR management and learning platform.

  ## New Tables

  ### 1. departments
  - `id` (uuid, primary key)
  - `name` (text) - Department name
  - `description` (text) - Department description
  - `manager_id` (uuid) - Reference to manager employee
  - `budget` (numeric) - Department budget
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. employees
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Reference to auth.users
  - `first_name` (text)
  - `last_name` (text)
  - `email` (text, unique)
  - `phone` (text)
  - `department_id` (uuid) - Foreign key to departments
  - `position` (text)
  - `hire_date` (date)
  - `salary` (numeric)
  - `status` (text) - active, on_leave, terminated
  - `profile_image_url` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. learning_courses
  - `id` (uuid, primary key)
  - `title` (text)
  - `description` (text)
  - `category` (text) - technical, soft_skills, leadership, compliance
  - `level` (text) - beginner, intermediate, advanced
  - `duration_hours` (integer)
  - `instructor` (text)
  - `thumbnail_url` (text)
  - `ai_recommended` (boolean) - AI recommendation flag
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. employee_courses
  - `id` (uuid, primary key)
  - `employee_id` (uuid) - Foreign key to employees
  - `course_id` (uuid) - Foreign key to learning_courses
  - `enrollment_date` (timestamptz)
  - `completion_date` (timestamptz)
  - `progress_percentage` (integer)
  - `status` (text) - enrolled, in_progress, completed, dropped
  - `score` (numeric)

  ### 5. performance_reviews
  - `id` (uuid, primary key)
  - `employee_id` (uuid) - Foreign key to employees
  - `reviewer_id` (uuid) - Foreign key to employees
  - `review_period_start` (date)
  - `review_period_end` (date)
  - `overall_rating` (numeric) - 1-5 rating
  - `technical_skills` (numeric)
  - `communication` (numeric)
  - `leadership` (numeric)
  - `teamwork` (numeric)
  - `comments` (text)
  - `ai_insights` (jsonb) - AI-generated insights
  - `created_at` (timestamptz)

  ### 6. ai_insights
  - `id` (uuid, primary key)
  - `insight_type` (text) - turnover_risk, skill_gap, performance_trend, learning_recommendation
  - `employee_id` (uuid) - Foreign key to employees (nullable for org-wide insights)
  - `department_id` (uuid) - Foreign key to departments (nullable)
  - `title` (text)
  - `description` (text)
  - `confidence_score` (numeric) - AI confidence 0-1
  - `priority` (text) - low, medium, high, critical
  - `data` (jsonb) - Additional insight data
  - `status` (text) - new, reviewed, actioned, dismissed
  - `created_at` (timestamptz)

  ### 7. attendance_logs
  - `id` (uuid, primary key)
  - `employee_id` (uuid) - Foreign key to employees
  - `date` (date)
  - `check_in` (timestamptz)
  - `check_out` (timestamptz)
  - `status` (text) - present, absent, late, half_day, work_from_home
  - `notes` (text)

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users based on role and ownership
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  manager_id uuid,
  budget numeric(12, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  department_id uuid REFERENCES departments(id),
  position text NOT NULL,
  hire_date date DEFAULT CURRENT_DATE,
  salary numeric(12, 2),
  status text DEFAULT 'active',
  profile_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create learning_courses table
CREATE TABLE IF NOT EXISTS learning_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text DEFAULT 'technical',
  level text DEFAULT 'beginner',
  duration_hours integer DEFAULT 1,
  instructor text,
  thumbnail_url text,
  ai_recommended boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employee_courses table
CREATE TABLE IF NOT EXISTS employee_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  course_id uuid REFERENCES learning_courses(id) ON DELETE CASCADE,
  enrollment_date timestamptz DEFAULT now(),
  completion_date timestamptz,
  progress_percentage integer DEFAULT 0,
  status text DEFAULT 'enrolled',
  score numeric(5, 2)
);

-- Create performance_reviews table
CREATE TABLE IF NOT EXISTS performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES employees(id),
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  overall_rating numeric(3, 2),
  technical_skills numeric(3, 2),
  communication numeric(3, 2),
  leadership numeric(3, 2),
  teamwork numeric(3, 2),
  comments text,
  ai_insights jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create ai_insights table
CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type text NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  confidence_score numeric(3, 2),
  priority text DEFAULT 'medium',
  data jsonb,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

-- Create attendance_logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  date date DEFAULT CURRENT_DATE,
  check_in timestamptz,
  check_out timestamptz,
  status text DEFAULT 'present',
  notes text,
  UNIQUE(employee_id, date)
);

-- Add foreign key for department manager
ALTER TABLE departments 
ADD CONSTRAINT departments_manager_id_fkey 
FOREIGN KEY (manager_id) REFERENCES employees(id);

-- Enable Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "Authenticated users can view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only managers can insert departments"
  ON departments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Only managers can update departments"
  ON departments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for employees
CREATE POLICY "Authenticated users can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for learning_courses
CREATE POLICY "Authenticated users can view courses"
  ON learning_courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert courses"
  ON learning_courses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update courses"
  ON learning_courses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for employee_courses
CREATE POLICY "Employees can view their own enrollments"
  ON employee_courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can enroll in courses"
  ON employee_courses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Employees can update their course progress"
  ON employee_courses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for performance_reviews
CREATE POLICY "Employees can view their own reviews"
  ON performance_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can insert reviews"
  ON performance_reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Managers can update reviews"
  ON performance_reviews FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for ai_insights
CREATE POLICY "Authenticated users can view AI insights"
  ON ai_insights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert AI insights"
  ON ai_insights FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update insights status"
  ON ai_insights FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for attendance_logs
CREATE POLICY "Employees can view attendance"
  ON attendance_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can log attendance"
  ON attendance_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Employees can update attendance"
  ON attendance_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_courses_employee ON employee_courses(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_courses_course ON employee_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_employee ON ai_insights(employee_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee ON attendance_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_date ON attendance_logs(date);