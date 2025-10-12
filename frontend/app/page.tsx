import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Briefcase, CheckCircle, Zap, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="flex justify-center mb-6">
            <Briefcase className="h-16 w-16 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Hire Smarter, Faster
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            AI-powered recruitment platform that helps you find, evaluate, and hire
            the best candidates with intelligent matching and video interviews.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                Get Started
              </Button>
            </Link>
            <Link href="/auth">
              <Button size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything you need to hire efficiently</h2>
          <p className="text-xl text-muted-foreground">
            Powerful features that streamline your entire recruitment process
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
              <Zap className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">AI-Powered Matching</h3>
            <p className="text-muted-foreground">
              Automatically parse resumes and match candidates to jobs with intelligent scoring algorithms.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-accent/10 text-accent mb-4">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Video Interviews</h3>
            <p className="text-muted-foreground">
              Record and review video interviews with automatic transcription and sentiment analysis.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-success/10 text-success mb-4">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Collaborative Hiring</h3>
            <p className="text-muted-foreground">
              Enable your entire team to review candidates, share feedback, and make better hiring decisions.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to transform your hiring?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join forward-thinking companies using RecruitPro
          </p>
          <Link href="/auth">
            <Button size="lg">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}