"use client"
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Briefcase, Calendar, CheckCircle, Clock, TrendingUp } from 'lucide-react';

export default function Dashboard() {
    const { userRole, user } = useAuth();
    const router = useRouter();

    // Redirect employees to their own dashboard
    useEffect(() => {
        if (userRole === 'employee') {
            router.push('/employee/dashboard');
        }
    }, [userRole, router]);

    // Mock data - Replace with actual API calls
    const stats = {
        admin: [
            { title: 'Total Users', value: '248', icon: Users, trend: '+12%' },
            { title: 'Active Jobs', value: '32', icon: Briefcase, trend: '+5%' },
            { title: 'Applications', value: '1,453', icon: CheckCircle, trend: '+18%' },
            { title: 'Interviews Today', value: '14', icon: Calendar, trend: '+3' },
        ],
        hr: [
            { title: 'Open Positions', value: '18', icon: Briefcase, trend: '+3' },
            { title: 'New Applications', value: '86', icon: Users, trend: '+24%' },
            { title: 'Shortlisted', value: '42', icon: CheckCircle, trend: '+8' },
            { title: 'Scheduled Interviews', value: '23', icon: Calendar, trend: '+5' },
        ],
        interviewer: [
            { title: 'Assigned Interviews', value: '8', icon: Calendar, trend: 'Today' },
            { title: 'Pending Reviews', value: '12', icon: Clock, trend: 'Due soon' },
            { title: 'Completed', value: '145', icon: CheckCircle, trend: 'This month' },
            { title: 'Avg Score', value: '7.8', icon: TrendingUp, trend: '+0.3' },
        ],
        candidate: [
            { title: 'Applications', value: '5', icon: Briefcase, trend: 'Active' },
            { title: 'Interviews', value: '2', icon: Calendar, trend: 'Scheduled' },
            { title: 'In Review', value: '3', icon: Clock, trend: 'Pending' },
            { title: 'Response Rate', value: '60%', icon: TrendingUp, trend: '+10%' },
        ],
    };

    const currentStats = stats[userRole as keyof typeof stats] || stats.candidate;

    return (
        <Layout>
            <div className="p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">
                        Welcome back!
                    </h1>
                    <p className="text-muted-foreground">
                        Here's what's happening with your recruitment today.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    {currentStats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <Card key={index} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {stat.title}
                                    </CardTitle>
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stat.value}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {stat.trend}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>Latest updates in your recruitment pipeline</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[
                                    { action: 'New application received', job: 'Senior React Developer', time: '5 mins ago' },
                                    { action: 'Interview scheduled', job: 'Product Manager', time: '1 hour ago' },
                                    { action: 'Candidate shortlisted', job: 'UX Designer', time: '2 hours ago' },
                                    { action: 'Job posting published', job: 'Backend Engineer', time: '3 hours ago' },
                                ].map((activity, i) => (
                                    <div key={i} className="flex items-start gap-3 text-sm">
                                        <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="font-medium">{activity.action}</p>
                                            <p className="text-muted-foreground">{activity.job}</p>
                                        </div>
                                        <span className="text-muted-foreground text-xs">{activity.time}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                            <CardDescription>Common tasks for your role</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {userRole === 'hr' && (
                                    <>
                                        <button className="w-full text-left p-3 rounded-lg hover:bg-secondary transition-colors">
                                            <p className="font-medium">Post New Job</p>
                                            <p className="text-sm text-muted-foreground">Create a new job listing</p>
                                        </button>
                                        <button className="w-full text-left p-3 rounded-lg hover:bg-secondary transition-colors">
                                            <p className="font-medium">Review Applications</p>
                                            <p className="text-sm text-muted-foreground">Check pending applications</p>
                                        </button>
                                    </>
                                )}
                                {userRole === 'interviewer' && (
                                    <>
                                        <button className="w-full text-left p-3 rounded-lg hover:bg-secondary transition-colors">
                                            <p className="font-medium">View Schedule</p>
                                            <p className="text-sm text-muted-foreground">Today's interviews</p>
                                        </button>
                                        <button className="w-full text-left p-3 rounded-lg hover:bg-secondary transition-colors">
                                            <p className="font-medium">Submit Reviews</p>
                                            <p className="text-sm text-muted-foreground">Complete pending reviews</p>
                                        </button>
                                    </>
                                )}
                                {userRole === 'candidate' && (
                                    <>
                                        <button className="w-full text-left p-3 rounded-lg hover:bg-secondary transition-colors">
                                            <p className="font-medium">Browse Jobs</p>
                                            <p className="text-sm text-muted-foreground">Find new opportunities</p>
                                        </button>
                                        <button className="w-full text-left p-3 rounded-lg hover:bg-secondary transition-colors">
                                            <p className="font-medium">Update Profile</p>
                                            <p className="text-sm text-muted-foreground">Keep your profile current</p>
                                        </button>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout>
    );
}
