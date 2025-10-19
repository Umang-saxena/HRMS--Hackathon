import Layout from '@/components/layout/EmployeeLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Video, FileText } from 'lucide-react';

// This is now a Server Component by default - no "use client" needed!
export default function InterviewsPage() {
  // Mock interview data - in a real app, you would fetch this from a database here
  const interviews = [
    {
      id: '1',
      candidateName: 'Sarah Johnson',
      position: 'Senior React Developer',
      scheduledAt: '2025-10-15T14:00:00',
      duration: 60,
      type: 'video',
      status: 'scheduled',
      interviewerName: 'John Smith',
    },
    {
      id: '2',
      candidateName: 'Michael Chen',
      position: 'Product Manager',
      scheduledAt: '2025-10-15T16:00:00',
      duration: 45,
      type: 'video',
      status: 'completed',
      score: 8.5,
      interviewerName: 'Jane Doe',
    },
    {
      id: '3',
      candidateName: 'Emily Rodriguez',
      position: 'UX Designer',
      scheduledAt: '2025-10-16T10:00:00',
      duration: 60,
      type: 'in-person',
      status: 'scheduled',
      interviewerName: 'John Smith',
    },
  ];

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      scheduled: 'bg-accent/10 text-accent',
      completed: 'bg-success/10 text-success',
      cancelled: 'bg-destructive/10 text-destructive',
    };
    return colors[status] || 'bg-secondary';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Interviews</h1>
          <p className="text-muted-foreground">
            Manage and review candidate interviews
          </p>
        </div>

        <div className="grid gap-6">
          {interviews.map((interview) => (
            <Card key={interview.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{interview.candidateName}</CardTitle>
                    <CardDescription className="text-base">
                      {interview.position}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(interview.status)}>
                    {interview.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(interview.scheduledAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatTime(interview.scheduledAt)} ({interview.duration} mins)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{interview.type}</span>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Interviewer: {interview.interviewerName}
                  </div>

                  {interview.status === 'completed' && interview.score && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Score:</span>
                      <span className="text-lg font-bold text-success">{interview.score}/10</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {interview.status === 'scheduled' && (
                      <>
                        <Button variant="outline">Reschedule</Button>
                        <Button variant="destructive" className="text-destructive-foreground">Cancel</Button>
                        {interview.type === 'video' && (
                          <Button>Join Video Call</Button>
                        )}
                      </>
                    )}
                    {interview.status === 'completed' && (
                      <>
                        <Button variant="outline" className="gap-2">
                          <FileText className="h-4 w-4" />
                          View Transcript
                        </Button>
                        <Button variant="outline">View Notes</Button>
                        <Button>Review Details</Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {interviews.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No interviews scheduled.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}