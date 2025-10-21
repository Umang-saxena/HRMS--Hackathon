'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center text-center px-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-2xl"
      >
        <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 leading-tight">
          Welcome to <span className="text-blue-600">HRMS</span>
        </h1>

        <p className="mt-4 text-lg sm:text-xl text-gray-600">
          A complete Human Resource Management System for managing employees, leaves, payroll, and
          performance — all in one place.
        </p>

        <div className="mt-8 flex justify-center">
          <Link href="/auth">
            <Button className="px-6 py-3 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 rounded-full shadow-md hover:shadow-lg transition-all duration-200">
              Get Started <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Feature Preview Section */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl"
      >
        <FeatureCard
          title="Smart Leave Management"
          description="Apply, approve, and track leaves with a smooth approval workflow."
          icon="🌿"
        />
        <FeatureCard
          title="Automated Payroll"
          description="Compute employee salaries and bonuses instantly using real-time data."
          icon="💰"
        />
        <FeatureCard
          title="Performance Analytics"
          description="Monitor employee performance with insightful reports and metrics."
          icon="📊"
        />
      </motion.div>

      {/* Footer */}
      <footer className="mt-24 text-gray-500 text-sm">
        © {new Date().getFullYear()} Built With Passion And Efforts 🚀
      </footer>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="p-6 bg-white rounded-2xl shadow-md border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
      <p className="text-gray-600 mt-2 text-sm">{description}</p>
    </div>
  );
}
