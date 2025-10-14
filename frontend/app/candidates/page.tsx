"use client";

import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Filter, Star, Mail, Phone } from 'lucide-react';
import { useState } from 'react';

export default function CandidatesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock candidate data
  const candidates = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '(555) 123-4567',
      position: 'Senior React Developer',
      matchScore: 95,
      status: 'shortlisted',
      skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
      experience: '5 years',
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'mchen@email.com',
      phone: '(555) 234-5678',
      position: 'Product Manager',
      matchScore: 88,
      status: 'interview',
      skills: ['Product Strategy', 'Agile', 'Data Analysis'],
      experience: '7 years',
    },
    {
      id: '3',
      name: 'Emily Rodriguez',
      email: 'emily.r@email.com',
      phone: '(555) 345-6789',
      position: 'UX Designer',
      matchScore: 92,
      status: 'screening',
      skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
      experience: '4 years',
    },
  ];

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      shortlisted: 'bg-success/10 text-success',
      interview: 'bg-accent/10 text-accent',
      screening: 'bg-warning/10 text-warning',
    };
    return colors[status] || 'bg-secondary';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-accent';
    return 'text-warning';
  };

  const filteredCandidates = candidates.filter(candidate =>
    candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    candidate.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Candidates</h1>
          <p className="text-muted-foreground">
            Review and manage candidate applications
          </p>
        </div>

        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates by name or position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="grid gap-6">
          {filteredCandidates.map((candidate) => (
            <Card key={candidate.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {candidate.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl mb-1">{candidate.name}</CardTitle>
                      <CardDescription className="text-base mb-2">
                        {candidate.position}
                      </CardDescription>
                      <div className="flex flex-col sm:flex-row gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {candidate.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {candidate.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getScoreColor(candidate.matchScore)}`}>
                        {candidate.matchScore}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Match Score
                      </div>
                    </div>
                    <Badge className={getStatusColor(candidate.status)}>
                      {candidate.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="text-sm text-muted-foreground mb-2">
                    Experience: {candidate.experience}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill, i) => (
                      <Badge key={i} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline">View Profile</Button>
                  <Button variant="outline">View Resume</Button>
                  <Button>Schedule Interview</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCandidates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No candidates found matching your search.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}