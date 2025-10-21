'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ClipboardList, Eye, Mail, Phone, Calendar, MapPin, Briefcase, FileText } from 'lucide-react';
import type { JobApplicationResponse } from '@/lib/supabase';

interface ApplicationWithDetails extends JobApplicationResponse {
  job_postings?: {
    title: string;
    location: string;
    employment_type: string;
    salary_range?: string;
  };
  candidates?: {
    first_name?: string;
    last_name?: string;
    email: string;
    phone_number?: string;
  };
}


export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadApplications();
  }, [statusFilter, jobFilter]);

  async function loadApplications() {
    try {
      setLoading(true);
      let query = supabase
        .from('applications')
        .select(`
          *,
          job_postings!inner(title, location, employment_type, salary_range, created_by),
          candidates!inner(first_name, last_name, email, phone_number)
        `);


      // Get current HR user to filter by their jobs
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        query = query.eq('job_postings.created_by', user.id);
      }

      if (statusFilter !== 'all') {
        query = query.eq('screening_status', statusFilter);
      }

      if (jobFilter !== 'all') {
        query = query.eq('job_id', jobFilter);
      }

      const { data, error } = await query.order('applied_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error loading applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load applications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function updateApplicationStatus(applicationId: string, newStatus: string) {
    try {
      setUpdatingStatus(applicationId);
      const { error } = await supabase
        .from('applications')
        .update({ screening_status: newStatus })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Application status updated successfully',
      });

      // Reload applications to reflect changes
      loadApplications();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update application status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(null);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Under Review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Shortlisted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Hired':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const uniqueJobs = Array.from(
    new Set(applications.map(app => app.job_postings?.title || '').filter(Boolean))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Applications</h1>
          <p className="text-slate-600 mt-1">Manage job applications and candidate screening</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="status-filter">Status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
                <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Hired">Hired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="job-filter">Job:</Label>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {uniqueJobs.map(job => (
                  <SelectItem key={job} value={job}>{job}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <CardTitle>Job Applications</CardTitle>
          </div>
          <CardDescription>
            {applications.length} application{applications.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-500 mt-2">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">No applications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Job Position</TableHead>
                    <TableHead>Applied Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>AI Score</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-slate-900">
                            {application.candidates?.first_name} {application.candidates?.last_name}
                          </div>
                          <div className="text-sm text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {application.candidates?.email}
                          </div>
                          {application.candidates?.phone_number && (
                            <div className="text-sm text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {application.candidates.phone_number}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <div className="font-medium text-slate-900">
                            {application.job_postings?.title ?? '-'}
                          </div>
                          <div className="text-sm text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {application.job_postings?.location}
                          </div>

                          <div className="text-sm text-slate-500 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {application.job_postings?.employment_type}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Calendar className="w-4 h-4" />
                          {formatDate(application.applied_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={application.screening_status}
                          onValueChange={(value) => updateApplicationStatus(application.id, value)}
                          disabled={updatingStatus === application.id}
                        >
                          <SelectTrigger className="w-32">
                            <Badge
                              variant="outline"
                              className={getStatusColor(application.screening_status)}
                            >
                              {application.screening_status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Under Review">Under Review</SelectItem>
                            <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                            <SelectItem value="Hired">Hired</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {application.ai_score ? (
                          <div className="text-sm font-medium">
                            {application.ai_score}/100
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedApplication(application)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Application Details</DialogTitle>
                              <DialogDescription>
                                Review candidate application and details
                              </DialogDescription>
                            </DialogHeader>
                            {selectedApplication && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Candidate</Label>
                                    <p className="text-sm text-slate-600">{selectedApplication.candidates?.first_name} {selectedApplication.candidates?.last_name}</p>
                                    <p className="text-sm text-slate-600">{selectedApplication.candidates?.email}</p>
                                    {selectedApplication.candidates?.phone_number && (
                                      <p className="text-sm text-slate-600">{selectedApplication.candidates.phone_number}</p>
                                    )}
                                  </div>

                                  <div>
                                    <Label className="text-sm font-medium">Job Position</Label>
                                    <p className="text-sm text-slate-600">{selectedApplication.job_postings?.title}</p>
                                    <p className="text-sm text-slate-600">{selectedApplication.job_postings?.location}</p>
                                    <p className="text-sm text-slate-600">{selectedApplication.job_postings?.employment_type}</p>
                                  </div>
                                </div>

                                {selectedApplication.cover_letter && (
                                  <div>
                                    <Label className="text-sm font-medium">Cover Letter</Label>
                                    <Textarea
                                      value={selectedApplication.cover_letter}
                                      readOnly
                                      className="mt-1"
                                      rows={4}
                                    />
                                  </div>
                                )}

                                {selectedApplication.additional_info && (
                                  <div>
                                    <Label className="text-sm font-medium">Additional Information</Label>
                                    <Textarea
                                      value={selectedApplication.additional_info}
                                      readOnly
                                      className="mt-1"
                                      rows={3}
                                    />
                                  </div>
                                )}

                                {selectedApplication.resume_url && (
                                  <div>
                                    <Label className="text-sm font-medium">Resume</Label>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-1"
                                      onClick={() => selectedApplication.resume_url && window.open(selectedApplication.resume_url, '_blank')}
                                    >
                                      <FileText className="w-4 h-4 mr-1" />
                                      View Resume
                                    </Button>
                                  </div>

                                )}

                                {selectedApplication.ai_score && (
                                  <div>
                                    <Label className="text-sm font-medium">AI Matching Score</Label>
                                    <p className="text-sm text-slate-600">{selectedApplication.ai_score}/100</p>
                                    {selectedApplication.match_reason && (
                                      <p className="text-sm text-slate-600 mt-1">{selectedApplication.match_reason}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
