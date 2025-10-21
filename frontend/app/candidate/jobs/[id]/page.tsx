import React from "react";
import CandidateLayout from "@/components/layout/CandidateLayout";
import { Button } from "@/components/ui/button";

interface JobDetailsProps {
  params: Promise<{ id: string }>;
}

const JobDetailsPage: React.FC<JobDetailsProps> = async ({ params }) => {
  const { id } = await params;

  // Placeholder job data (replace with API call later)
  const job = {
    id: id,
    title: "Software Engineer",
    company: "Tech Corp",
    location: "San Francisco, CA",
    jobType: "Full-time",
    experienceLevel: "Mid-level",
    description:
      "We are looking for a talented software engineer to join our team. You will be responsible for developing and maintaining high-quality software applications.",
    responsibilities: [
      "Develop and maintain software applications",
      "Write clean, well-documented code",
      "Participate in code reviews",
      "Work with a team of engineers to deliver high-quality software",
    ],
    requirements: [
      "Bachelor's degree in computer science or related field",
      "3+ years of experience in software development",
      "Strong knowledge of data structures and algorithms",
      "Experience with React, Node.js, and SQL",
    ],
  };

  return (
    <CandidateLayout>
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-5">{job.title}</h1>
        <p className="text-gray-600">{job.company}</p>
        <p className="text-gray-500">{job.location}</p>
        <p className="text-gray-500">
          {job.jobType} - {job.experienceLevel}
        </p>
        <p className="mt-2">{job.description}</p>

        <h2 className="text-lg font-semibold mt-5">Responsibilities</h2>
        <ul>
          {job.responsibilities?.map((responsibility, index) => (
            <li key={index}>{responsibility}</li>
          ))}
        </ul>

        <h2 className="text-lg font-semibold mt-5">Requirements</h2>
        <ul>
          {job.requirements?.map((requirement, index) => (
            <li key={index}>{requirement}</li>
          ))}
        </ul>

        <div className="mt-5">
          <Button onClick={() => console.log("Apply job clicked")}>
            Apply Job
          </Button>
        </div>
      </div>
    </CandidateLayout>
  );
};

export default JobDetailsPage;
