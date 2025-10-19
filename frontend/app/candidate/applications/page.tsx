"use client";
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockApplications } from '@/data/mockData';
import { ApplicationStatus } from '@/types/job';
import ApplicationCard from '@/components/candidate/ApplicationCard';

export default function Applications() {
  const [activeTab, setActiveTab] = useState<string>('all');

  const getFilteredApplications = (status?: ApplicationStatus) => {
    if (!status) return mockApplications;
    return mockApplications.filter(app => app.status === status);
  };

  const statusCounts = {
    all: mockApplications.length,
    pending: getFilteredApplications('pending').length,
    reviewing: getFilteredApplications('reviewing').length,
    shortlisted: getFilteredApplications('shortlisted').length,
    accepted: getFilteredApplications('accepted').length,
    rejected: getFilteredApplications('rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">My Applications</h1>
        <p className="text-muted-foreground">
          Track the status of your {mockApplications.length} applications
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-2">
              {statusCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending
            <Badge variant="secondary" className="ml-2">
              {statusCounts.pending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="reviewing">
            Reviewing
            <Badge variant="secondary" className="ml-2">
              {statusCounts.reviewing}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="shortlisted">
            Shortlisted
            <Badge variant="secondary" className="ml-2">
              {statusCounts.shortlisted}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted
            <Badge variant="secondary" className="ml-2">
              {statusCounts.accepted}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected
            <Badge variant="secondary" className="ml-2">
              {statusCounts.rejected}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <ApplicationList applications={getFilteredApplications()} />
        </TabsContent>
        <TabsContent value="pending" className="mt-6">
          <ApplicationList applications={getFilteredApplications('pending')} />
        </TabsContent>
        <TabsContent value="reviewing" className="mt-6">
          <ApplicationList applications={getFilteredApplications('reviewing')} />
        </TabsContent>
        <TabsContent value="shortlisted" className="mt-6">
          <ApplicationList applications={getFilteredApplications('shortlisted')} />
        </TabsContent>
        <TabsContent value="accepted" className="mt-6">
          <ApplicationList applications={getFilteredApplications('accepted')} />
        </TabsContent>
        <TabsContent value="rejected" className="mt-6">
          <ApplicationList applications={getFilteredApplications('rejected')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ApplicationList({ applications }: { applications: typeof mockApplications }) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No applications found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {applications.map((application) => (
        <ApplicationCard key={application.id} application={application} />
      ))}
    </div>
  );
}
