CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_id UUID REFERENCES companies(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, company_id)
);

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    department_id UUID REFERENCES departments(id),
    role TEXT,
    date_of_joining DATE,
    salary NUMERIC(10,2),
    employment_status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    date DATE NOT NULL,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    total_hours NUMERIC(5,2),
    status TEXT DEFAULT 'Present',
    created_at TIMESTAMPTZ DEFAULT NOW()
);



CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    resume_text TEXT,                -- extracted plain text from PDF
    embedding VECTOR(768),           -- semantic vector for matching
    experience NUMERIC(4,1),
    skills TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    department_id UUID REFERENCES departments(id),
    created_by UUID REFERENCES employees(id), -- HR/Recruiter
    description TEXT NOT NULL,
    location TEXT,
    job_type TEXT CHECK (job_type IN ('Full-Time', 'Part-Time', 'Internship', 'Contract')),
    experience_required NUMERIC(4,1),
    skills_required TEXT[],             -- e.g. ['Python', 'FastAPI', 'Postgres']
    salary_range TEXT,                  -- e.g. "6–8 LPA"
    openings INT DEFAULT 1,
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Closed', 'On Hold')),
    embedding VECTOR(768),              -- AI semantic embedding of JD
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    cover_letter TEXT,                       -- candidate's cover letter
    resume_url TEXT,                         -- URL to candidate's resume
    additional_info TEXT,                    -- any additional information
    ai_score NUMERIC(5,2),                   -- score from AI screening model
    match_reason TEXT,                       -- optional AI explanation
    screening_status TEXT DEFAULT 'Under Review'
        CHECK (screening_status IN ('Under Review', 'Shortlisted', 'Rejected', 'Hired')),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);







-- Candidate Settings Table
CREATE TABLE candidate_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,  -- References auth.users(id)

    -- Profile Preferences
    display_name TEXT,
    bio TEXT,
    profile_picture_url TEXT,
    cover_photo_url TEXT,
    education TEXT[] DEFAULT '{}',
    work_experience TEXT[] DEFAULT '{}',
    certifications TEXT[] DEFAULT '{}',
    languages_known TEXT[] DEFAULT '{}',

    location TEXT,
    website TEXT,
    linkedin TEXT,
    github TEXT,

    -- Notification Settings
    email_job_alerts BOOLEAN DEFAULT TRUE,
    email_application_updates BOOLEAN DEFAULT TRUE,
    email_offer_updates BOOLEAN DEFAULT TRUE,
    email_newsletter BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX idx_employee_email ON employees(email);
CREATE INDEX idx_candidate_settings_user_id ON candidate_settings(user_id);
