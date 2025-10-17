"use client"
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import { mockJobs } from '@/data/mockData';
import { Job } from '@/types/job';
import JobCard from '@/components/jobs/JobCard';
import JobDetailsDialog from '@/components/jobs/JobDetailsDialog';

export default function Jobs() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredJobs = mockJobs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || job.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleViewDetails = (job: Job) => {
    setSelectedJob(job);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Available Positions</h1>
        <p className="text-muted-foreground">
          Discover and apply to {mockJobs.length} open positions
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by job title or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Job Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Full-time">Full-time</SelectItem>
            <SelectItem value="Part-time">Part-time</SelectItem>
            <SelectItem value="Contract">Contract</SelectItem>
            <SelectItem value="Internship">Internship</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary">
          {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} found
        </Badge>
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery('')}
          >
            Clear search
          </Button>
        )}
      </div>

      {/* Job Cards */}
      {filteredJobs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} onViewDetails={handleViewDetails} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No jobs found matching your criteria</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('all');
            }}
          >
            Clear all filters
          </Button>
        </div>
      )}

      {/* Job Details Dialog */}
      <JobDetailsDialog
        job={selectedJob}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
