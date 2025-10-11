CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    ai_score NUMERIC(5,2),                   -- score from AI screening model
    match_reason TEXT,                       -- optional AI explanation
    screening_status TEXT DEFAULT 'Under Review'
        CHECK (screening_status IN ('Under Review', 'Shortlisted', 'Rejected', 'Hired')),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);







-- Indexes for performance optimization
CREATE INDEX idx_employee_email ON employees(email);
