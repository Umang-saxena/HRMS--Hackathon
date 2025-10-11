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




-- Indexes for performance optimization
CREATE INDEX idx_employee_email ON employees(email);
