import { Job } from '@/types/job';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Briefcase, MapPin, DollarSign, Calendar, Building } from 'lucide-react';
import { toast } from 'sonner';

interface JobDetailsDialogProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function JobDetailsDialog({ job, open, onOpenChange }: JobDetailsDialogProps) {
  if (!job) return null;

  const handleApply = () => {
    toast.success('Application submitted successfully!', {
      description: `Your application for ${job.title} has been received.`,
    });
    onOpenChange(false);
  };

  const daysAgo = Math.floor((new Date().getTime() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl mb-2">{job.title}</DialogTitle>
              <DialogDescription className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span>{job.company}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    <span>{job.experience}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>{job.salary}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Posted {daysAgo === 0 ? 'today' : `${daysAgo} days ago`}</span>
                  </div>
                </div>
              </DialogDescription>
            </div>
            <Badge variant="secondary">{job.type}</Badge>
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Job Description</h3>
            <p className="text-muted-foreground">{job.description}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Requirements</h3>
            <ul className="space-y-2">
              {job.requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-muted-foreground">{req}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Department</p>
              <p className="font-medium">{job.department}</p>
            </div>
            <Separator orientation="vertical" />
            <div>
              <p className="text-sm text-muted-foreground">Employment Type</p>
              <p className="font-medium">{job.type}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleApply}>
            Apply for this position
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
