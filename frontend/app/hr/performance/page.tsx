'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Plus, Star, Calendar, User, Brain } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/simple-progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import type { PerformanceReview } from '@/lib/supabase';

export default function PerformancePage() {
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    const { data } = await supabase
      .from('performance_reviews')
      .select('*, employees!performance_reviews_employee_id_fkey(first_name, last_name, position), reviewers:employees!performance_reviews_reviewer_id_fkey(first_name, last_name)')
      .order('created_at', { ascending: false });

    setReviews(data || []);
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-blue-600';
    if (rating >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 4.5) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (rating >= 3.5) return { label: 'Good', color: 'bg-blue-100 text-blue-800' };
    if (rating >= 2.5) return { label: 'Satisfactory', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Needs Improvement', color: 'bg-red-100 text-red-800' };
  };

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + (r.overall_rating || 0), 0) / reviews.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Performance Reviews</h1>
          <p className="text-slate-600 mt-1">Track and evaluate employee performance</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
          <Plus className="w-4 h-4 mr-2" />
          New Review
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Reviews</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{reviews.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Average Rating</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{avgRating.toFixed(1)}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">This Quarter</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {reviews.filter((r) => {
                    const reviewDate = new Date(r.created_at);
                    const threeMonthsAgo = new Date();
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                    return reviewDate > threeMonthsAgo;
                  }).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">AI Insights</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {reviews.filter((r) => r.ai_insights).length}
                </p>
              </div>
              <Brain className="w-8 h-8 text-cyan-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Recent Reviews</CardTitle>
              <CardDescription>Latest performance evaluations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Reviews Yet</h3>
                    <p className="text-slate-600 mb-4">Start evaluating employee performance</p>
                    <Button className="bg-gradient-to-r from-blue-600 to-cyan-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Review
                    </Button>
                  </div>
                ) : (
                  reviews.map((review) => {
                    const badge = getRatingBadge(review.overall_rating || 0);
                    return (
                      <Card key={review.id} className="border-slate-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                                {review.employees?.first_name?.[0]}
                                {review.employees?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h3 className="font-semibold text-slate-900">
                                    {review.employees?.first_name} {review.employees?.last_name}
                                  </h3>
                                  <p className="text-sm text-slate-600">{review.employees?.position}</p>
                                </div>
                                <Badge className={badge.color}>{badge.label}</Badge>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Overall</p>
                                  <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span className={`font-semibold ${getRatingColor(review.overall_rating || 0)}`}>
                                      {review.overall_rating?.toFixed(1) || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Technical</p>
                                  <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span className="font-semibold text-slate-900">
                                      {review.technical_skills?.toFixed(1) || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Communication</p>
                                  <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span className="font-semibold text-slate-900">
                                      {review.communication?.toFixed(1) || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Leadership</p>
                                  <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span className="font-semibold text-slate-900">
                                      {review.leadership?.toFixed(1) || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {review.comments && (
                                <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                                  {review.comments}
                                </p>
                              )}

                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    Reviewed by: {review.reviewers?.first_name} {review.reviewers?.last_name}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(review.review_period_start).toLocaleDateString()} -{' '}
                                    {new Date(review.review_period_end).toLocaleDateString()}
                                  </div>
                                </div>
                                {review.ai_insights && (
                                  <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                                    <Brain className="w-3 h-3 mr-1" />
                                    AI Insights
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Performance Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Excellent (4.5+)</span>
                    <span className="font-semibold text-green-600">
                      {reviews.filter((r) => (r.overall_rating || 0) >= 4.5).length}
                    </span>
                  </div>
                  <Progress
                    value={(reviews.filter((r) => (r.overall_rating || 0) >= 4.5).length / Math.max(reviews.length, 1)) * 100}
                    className="h-2 bg-slate-100"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Good (3.5-4.4)</span>
                    <span className="font-semibold text-blue-600">
                      {
                        reviews.filter(
                          (r) => (r.overall_rating || 0) >= 3.5 && (r.overall_rating || 0) < 4.5
                        ).length
                      }
                    </span>
                  </div>
                  <Progress
                    value={
                      (reviews.filter(
                        (r) => (r.overall_rating || 0) >= 3.5 && (r.overall_rating || 0) < 4.5
                      ).length /
                        Math.max(reviews.length, 1)) *
                      100
                    }
                    className="h-2 bg-slate-100"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Satisfactory (2.5-3.4)</span>
                    <span className="font-semibold text-yellow-600">
                      {
                        reviews.filter(
                          (r) => (r.overall_rating || 0) >= 2.5 && (r.overall_rating || 0) < 3.5
                        ).length
                      }
                    </span>
                  </div>
                  <Progress
                    value={
                      (reviews.filter(
                        (r) => (r.overall_rating || 0) >= 2.5 && (r.overall_rating || 0) < 3.5
                      ).length /
                        Math.max(reviews.length, 1)) *
                      100
                    }
                    className="h-2 bg-slate-100"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Needs Improvement (&lt;2.5)</span>
                    <span className="font-semibold text-red-600">
                      {reviews.filter((r) => (r.overall_rating || 0) < 2.5).length}
                    </span>
                  </div>
                  <Progress
                    value={(reviews.filter((r) => (r.overall_rating || 0) < 2.5).length / Math.max(reviews.length, 1)) * 100}
                    className="h-2 bg-slate-100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">AI Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Brain className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">High Performers Identified</p>
                      <p className="text-xs text-blue-700 mt-1">
                        5 employees showing exceptional growth
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <Brain className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Training Recommended</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        3 employees need skill development
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-2">
                    <Brain className="w-4 h-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Positive Trend</p>
                      <p className="text-xs text-green-700 mt-1">
                        Overall performance up 15% this quarter
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
