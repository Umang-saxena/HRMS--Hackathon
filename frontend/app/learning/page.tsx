'use client';

import { useEffect, useState } from 'react';
import { Plus, GraduationCap, Clock, Users, Star, Sparkles, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/simple-progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import type { LearningCourse } from '@/lib/supabase';

export default function LearningPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'technical',
    level: 'beginner',
    duration_hours: '',
    instructor: '',
    ai_recommended: false,
  });

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    const { data } = await supabase
      .from('learning_courses')
      .select('*, employee_courses(id, status)')
      .order('created_at', { ascending: false });

    setCourses(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.from('learning_courses').insert([
      {
        ...formData,
        duration_hours: parseInt(formData.duration_hours) || 1,
      },
    ]);

    if (!error) {
      setIsDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        category: 'technical',
        level: 'beginner',
        duration_hours: '',
        instructor: '',
        ai_recommended: false,
      });
      loadCourses();
    }
  }

  async function generateSampleCourses() {
    setLoading(true);

    const sampleCourses = [
      {
        title: 'Machine Learning Fundamentals',
        description: 'Learn the basics of machine learning, including supervised and unsupervised learning, neural networks, and practical applications.',
        category: 'technical',
        level: 'intermediate',
        duration_hours: 40,
        instructor: 'Dr. Sarah Chen',
        ai_recommended: true,
        thumbnail_url: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&w=400'
      },
      {
        title: 'Leadership Excellence Program',
        description: 'Develop essential leadership skills including team management, strategic thinking, and effective communication.',
        category: 'leadership',
        level: 'advanced',
        duration_hours: 30,
        instructor: 'Michael Rodriguez',
        ai_recommended: true,
        thumbnail_url: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&w=400'
      },
      {
        title: 'Effective Communication Skills',
        description: 'Master the art of professional communication, presentation skills, and interpersonal relationships.',
        category: 'soft_skills',
        level: 'beginner',
        duration_hours: 20,
        instructor: 'Emma Thompson',
        ai_recommended: false,
        thumbnail_url: 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&w=400'
      },
      {
        title: 'Data Privacy and Security Compliance',
        description: 'Understanding GDPR, data protection regulations, and best practices for maintaining security compliance.',
        category: 'compliance',
        level: 'intermediate',
        duration_hours: 15,
        instructor: 'Robert Zhang',
        ai_recommended: true,
        thumbnail_url: 'https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg?auto=compress&w=400'
      },
      {
        title: 'Agile Project Management',
        description: 'Learn Scrum, Kanban, and other agile methodologies to manage projects effectively.',
        category: 'technical',
        level: 'intermediate',
        duration_hours: 25,
        instructor: 'Jennifer Martinez',
        ai_recommended: false,
        thumbnail_url: 'https://images.pexels.com/photos/3183153/pexels-photo-3183153.jpeg?auto=compress&w=400'
      },
      {
        title: 'Emotional Intelligence at Work',
        description: 'Develop self-awareness, empathy, and social skills to thrive in professional environments.',
        category: 'soft_skills',
        level: 'beginner',
        duration_hours: 18,
        instructor: 'Dr. Amanda Johnson',
        ai_recommended: true,
        thumbnail_url: 'https://images.pexels.com/photos/3184357/pexels-photo-3184357.jpeg?auto=compress&w=400'
      },
      {
        title: 'Cloud Architecture with AWS',
        description: 'Master cloud computing concepts and learn to design scalable solutions using Amazon Web Services.',
        category: 'technical',
        level: 'advanced',
        duration_hours: 50,
        instructor: 'David Kim',
        ai_recommended: true,
        thumbnail_url: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&w=400'
      },
      {
        title: 'Strategic Decision Making',
        description: 'Learn frameworks and techniques for making effective strategic decisions in complex business environments.',
        category: 'leadership',
        level: 'advanced',
        duration_hours: 22,
        instructor: 'Patricia Williams',
        ai_recommended: false,
        thumbnail_url: 'https://images.pexels.com/photos/3183170/pexels-photo-3183170.jpeg?auto=compress&w=400'
      }
    ];

    for (const course of sampleCourses) {
      await supabase.from('learning_courses').insert([course]);
    }

    await loadCourses();
    setLoading(false);
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical':
        return 'bg-blue-100 text-blue-800';
      case 'soft_skills':
        return 'bg-green-100 text-green-800';
      case 'leadership':
        return 'bg-purple-100 text-purple-800';
      case 'compliance':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const CourseCard = ({ course }: { course: any }) => {
    const enrollmentCount = course.employee_courses?.length || 0;

    return (
      <Card className="border-slate-200 hover:shadow-lg transition-shadow duration-200 overflow-hidden">
        {course.thumbnail_url && (
          <div className="relative h-40 overflow-hidden bg-slate-100">
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="w-full h-full object-cover"
            />
            {course.ai_recommended && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Recommended
                </Badge>
              </div>
            )}
          </div>
        )}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
          </div>
          <div className="flex gap-2">
            <Badge className={getCategoryColor(course.category)}>
              {course.category.replace('_', ' ')}
            </Badge>
            <Badge className={getLevelColor(course.level)}>{course.level}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm line-clamp-2 mb-4">
            {course.description}
          </CardDescription>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-slate-600">
              <Clock className="w-4 h-4 mr-2" />
              {course.duration_hours} hours
            </div>
            {course.instructor && (
              <div className="flex items-center text-sm text-slate-600">
                <GraduationCap className="w-4 h-4 mr-2" />
                {course.instructor}
              </div>
            )}
            <div className="flex items-center text-sm text-slate-600">
              <Users className="w-4 h-4 mr-2" />
              {enrollmentCount} enrolled
            </div>
          </div>

          <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
            Enroll Now
          </Button>
        </CardContent>
      </Card>
    );
  };

  const aiRecommendedCourses = courses.filter((c) => c.ai_recommended);
  const allCourses = courses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Learning & Development</h1>
          <p className="text-slate-600 mt-1">Upskill your team with personalized learning paths</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={generateSampleCourses}
            disabled={loading}
            variant="outline"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            {loading ? 'Loading...' : 'Load Sample Courses'}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Course</DialogTitle>
                <DialogDescription>Create a new learning course for your organization.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="title">Course Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="soft_skills">Soft Skills</SelectItem>
                        <SelectItem value="leadership">Leadership</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="level">Level</Label>
                    <Select
                      value={formData.level}
                      onValueChange={(value) => setFormData({ ...formData, level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration_hours">Duration (hours)</Label>
                    <Input
                      id="duration_hours"
                      type="number"
                      value={formData.duration_hours}
                      onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instructor">Instructor</Label>
                    <Input
                      id="instructor"
                      value={formData.instructor}
                      onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-blue-600 to-cyan-600">
                    Create Course
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Courses</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{courses.length}</p>
              </div>
              <GraduationCap className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">AI Recommended</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{aiRecommendedCourses.length}</p>
              </div>
              <Sparkles className="w-8 h-8 text-cyan-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Learners</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {courses.reduce((acc, c) => acc + (c.employee_courses?.length || 0), 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Avg Rating</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">4.8</p>
              </div>
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Courses</TabsTrigger>
          <TabsTrigger value="ai-recommended">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Recommended
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {courses.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="p-12 text-center">
                <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Courses Yet</h3>
                <p className="text-slate-600 mb-4">Load sample courses or create your first course</p>
                <Button
                  onClick={generateSampleCourses}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Load Sample Courses
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ai-recommended" className="space-y-4">
          {aiRecommendedCourses.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="p-12 text-center">
                <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No AI Recommendations</h3>
                <p className="text-slate-600">Load sample courses to see AI-powered recommendations</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aiRecommendedCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
