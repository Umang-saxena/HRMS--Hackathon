import { Application } from '@/types/job';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Briefcase, MapPin, Calendar, Clock } from 'lucide-react';
import { getStatusConfig } from '@/data/mockData';
import Link from 'next/link';
import { Button } from '@/components/ui/button';


interface ApplicationCardProps {
  application: Application;
}

export default function ApplicationCard({ application }: ApplicationCardProps) {
  const statusConfig = getStatusConfig(application.status);
  const appliedDaysAgo = Math.floor(
    (new Date().getTime() - new Date(application.appliedDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">{application.job.title}</h3>
            <p className="text-sm text-muted-foreground">{application.job.company}</p>
          </div>
          <Badge className={statusConfig.color}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{application.job.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            <span>{application.job.type}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Applied {appliedDaysAgo === 0 ? 'today' : `${appliedDaysAgo} days ago`}</span>
          </div>
        </div>

        {application.notes && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{application.notes}</p>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(application.lastUpdated).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </p>

        {application.status === 'shortlisted' && (
          <Link href="/candidate/interview">
            <Button>Start Interview</Button>
          </Link>
        )}

      </CardContent>
    </Card>
  );
}
