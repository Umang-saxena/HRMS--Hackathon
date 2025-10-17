import { Job, Application, CandidateProfile, ApplicationStatus } from '@/types/job';

export const mockJobs: Job[] = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    company: 'TechCorp Solutions',
    location: 'San Francisco, CA',
    type: 'Full-time',
    experience: '5+ years',
    salary: '$120k - $180k',
    description: 'We are looking for an experienced Frontend Developer to join our dynamic team. You will be responsible for building and maintaining web applications using modern frameworks.',
    requirements: [
      'Strong experience with React and TypeScript',
      'Experience with state management (Redux, Context API)',
      'Knowledge of modern CSS frameworks (Tailwind, styled-components)',
      'Understanding of RESTful APIs and GraphQL',
      'Excellent problem-solving skills'
    ],
    postedDate: '2025-10-10',
    department: 'Engineering'
  },
  {
    id: '2',
    title: 'Product Manager',
    company: 'InnovateTech Inc',
    location: 'Remote',
    type: 'Full-time',
    experience: '3-5 years',
    salary: '$100k - $150k',
    description: 'Join our product team to drive the strategy and execution of our SaaS platform. You will work closely with engineering, design, and stakeholders.',
    requirements: [
      'Proven experience as a Product Manager',
      'Strong analytical and problem-solving skills',
      'Excellent communication and leadership abilities',
      'Experience with Agile methodologies',
      'Technical background is a plus'
    ],
    postedDate: '2025-10-12',
    department: 'Product'
  },
  {
    id: '3',
    title: 'UX/UI Designer',
    company: 'DesignHub Studio',
    location: 'New York, NY',
    type: 'Full-time',
    experience: '2-4 years',
    salary: '$80k - $110k',
    description: 'Create beautiful and intuitive user experiences for our web and mobile applications. Collaborate with product and engineering teams.',
    requirements: [
      'Strong portfolio showcasing UX/UI work',
      'Proficiency in Figma, Sketch, or Adobe XD',
      'Understanding of user-centered design principles',
      'Experience with design systems',
      'Good communication skills'
    ],
    postedDate: '2025-10-08',
    department: 'Design'
  },
  {
    id: '4',
    title: 'DevOps Engineer',
    company: 'CloudScale Systems',
    location: 'Austin, TX',
    type: 'Full-time',
    experience: '4+ years',
    salary: '$110k - $160k',
    description: 'Build and maintain our cloud infrastructure. Implement CI/CD pipelines and ensure system reliability and security.',
    requirements: [
      'Experience with AWS/Azure/GCP',
      'Strong knowledge of Docker and Kubernetes',
      'Proficiency in scripting (Python, Bash)',
      'Experience with CI/CD tools (Jenkins, GitLab CI)',
      'Understanding of infrastructure as code'
    ],
    postedDate: '2025-10-15',
    department: 'Operations'
  },
  {
    id: '5',
    title: 'Data Analyst',
    company: 'DataDriven Analytics',
    location: 'Chicago, IL',
    type: 'Full-time',
    experience: '2-3 years',
    salary: '$70k - $95k',
    description: 'Analyze business data to drive insights and support decision-making. Work with cross-functional teams to improve processes.',
    requirements: [
      'Strong SQL and Excel skills',
      'Experience with BI tools (Tableau, Power BI)',
      'Statistical analysis knowledge',
      'Good communication skills',
      'Bachelor\'s degree in related field'
    ],
    postedDate: '2025-10-14',
    department: 'Analytics'
  },
  {
    id: '6',
    title: 'Backend Developer',
    company: 'ServerPro Solutions',
    location: 'Seattle, WA',
    type: 'Full-time',
    experience: '3-5 years',
    salary: '$100k - $140k',
    description: 'Develop and maintain scalable backend services. Work with databases, APIs, and cloud infrastructure.',
    requirements: [
      'Strong experience with Node.js or Python',
      'Database design and optimization',
      'RESTful API development',
      'Experience with microservices architecture',
      'Knowledge of security best practices'
    ],
    postedDate: '2025-10-11',
    department: 'Engineering'
  }
];

export const mockApplications: Application[] = [
  {
    id: 'app-1',
    jobId: '1',
    job: mockJobs[0],
    status: 'reviewing',
    appliedDate: '2025-10-12',
    lastUpdated: '2025-10-15',
    notes: 'Initial screening completed. Technical interview scheduled.'
  },
  {
    id: 'app-2',
    jobId: '3',
    job: mockJobs[2],
    status: 'shortlisted',
    appliedDate: '2025-10-09',
    lastUpdated: '2025-10-16',
    notes: 'Portfolio review passed. Final round interview pending.'
  },
  {
    id: 'app-3',
    jobId: '5',
    job: mockJobs[4],
    status: 'pending',
    appliedDate: '2025-10-16',
    lastUpdated: '2025-10-16'
  }
];

export const mockProfile: CandidateProfile = {
  id: 'candidate-1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1 (555) 123-4567',
  location: 'San Francisco, CA',
  experience: '5 years',
  skills: ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'UI/UX Design'],
  education: 'Bachelor of Science in Computer Science',
  resume: 'john-doe-resume.pdf'
};

export const getStatusConfig = (status: ApplicationStatus) => {
  const configs = {
    pending: { label: 'Pending', color: 'bg-muted text-muted-foreground' },
    reviewing: { label: 'Reviewing', color: 'bg-info text-info-foreground' },
    shortlisted: { label: 'Shortlisted', color: 'bg-warning text-warning-foreground' },
    accepted: { label: 'Accepted', color: 'bg-success text-success-foreground' },
    rejected: { label: 'Rejected', color: 'bg-destructive text-destructive-foreground' }
  };
  return configs[status];
};
