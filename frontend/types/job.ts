export type ApplicationStatus = 'pending' | 'reviewing' | 'shortlisted' | 'rejected' | 'accepted';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  experience: string;
  salary: string;
  description: string;
  requirements: string[];
  postedDate: string;
  department: string;
}

export interface Application {
  id: string;
  jobId: string;
  job: Job;
  status: ApplicationStatus;
  appliedDate: string;
  lastUpdated: string;
  notes?: string;
}

export interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  experience: string;
  skills: string[];
  education: string;
  resume?: string;
}
