-- Add new columns to applications table to support job application API
ALTER TABLE applications
ADD COLUMN cover_letter TEXT,
ADD COLUMN resume_url TEXT,
ADD COLUMN additional_info TEXT;

-- Add comment for documentation
COMMENT ON COLUMN applications.cover_letter IS 'Candidate''s cover letter for the job application';
COMMENT ON COLUMN applications.resume_url IS 'URL to candidate''s resume file';
COMMENT ON COLUMN applications.additional_info IS 'Any additional information provided by the candidate';
