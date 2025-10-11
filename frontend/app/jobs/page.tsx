"use client"; // This is the essential change

import { useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, MapPin, Briefcase, DollarSign } from 'lucide-react';
import Link from 'next/link'; // Import Link for navigation

// Renaming to JobsPage is a good convention
export default function JobsPage() {
  const { userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Mock job data - Replace with actual data fetching
  const jobs = [
    {
      id: '1',
      title: 'Senior React Developer',
      department: 'Engineering',
      location: 'San Francisco, CA',
      employment_type: 'Full-time',
      salary_range: '$120k - $160k',
      status: 'open',
      applicants: 24,
      description: 'We are looking for an experienced React developer to join our dynamic team and build amazing user interfaces.',
    },
    {
      id: '2',
      title: 'Product Manager',
      department: 'Product',
      location: 'Remote',
      employment_type: 'Full-time',
      salary_range: '$140k - $180k',
      status: 'open',
      applicants: 18,
      description: 'Join our product team to lead innovative features and define the future of our platform.',
    },
    {
      id: '3',
      title: 'UX Designer',
      department: 'Design',
      location: 'New York, NY',
      employment_type: 'Full-time',
      salary_range: '$90k - $130k',
      status: 'open',
      applicants: 32,
      description: 'Create beautiful and intuitive user experiences that delight our customers across all devices.',
    },
  ];

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canManageJobs = userRole === 'hr' || userRole === 'admin';

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Job Openings</h1>
            <p className="text-muted-foreground">
              {canManageJobs ? 'Manage your job postings' : 'Browse and apply to open positions'}
            </p>
          </div>
          {canManageJobs && (
            // Changed button to a link for navigation
            <Link href="/jobs/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Post New Job
              </Button>
            </Link>
          )}
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-6">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
                    <CardDescription className="flex flex-wrap gap-x-4 gap-y-2 text-base">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {job.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {job.salary_range}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="ml-4">
                    {job.employment_type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 line-clamp-2">{job.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {job.applicants} applicants
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline">View Details</Button>
                    {userRole === 'candidate' && (
                      <Button>Apply Now</Button>
                    )}
                    {canManageJobs && (
                      <Button variant="outline">Edit</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No jobs found matching your search.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}