"use client";

import React, { useState } from "react";
import CandidateLayout from "@/components/layout/CandidateLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

const JobSearchPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState(""); // e.g., "Full-time", "Part-time"
  const [experienceLevelFilter, setExperienceLevelFilter] = useState(""); // e.g., "Entry-level", "Mid-level", "Senior"
  const [jobs, setJobs] = useState([
    {
      id: "1",
      title: "Software Engineer",
      company: "Tech Corp",
      location: "San Francisco, CA",
      jobType: "Full-time",
      experienceLevel: "Mid-level",
      description: "We are looking for a talented software engineer...",
    },
    {
      id: "2",
      title: "Data Scientist",
      company: "Data Inc",
      location: "New York, NY",
      jobType: "Full-time",
      experienceLevel: "Senior",
      description: "We are seeking an experienced data scientist...",
    },
    {
      id: "3",
      title: "Frontend Developer",
      company: "Web Solutions",
      location: "Remote",
      jobType: "Contract",
      experienceLevel: "Entry-level",
      description: "We need a skilled frontend developer for a short-term project...",
    },
  ]);

  const handleSearch = () => {
    // Implement search logic here (e.g., call an API)
    console.log("Search term:", searchTerm);
    console.log("Location filter:", locationFilter);
    console.log("Job type filter:", jobTypeFilter);
    console.log("Experience level filter:", experienceLevelFilter);
  };

  const handleApplyJob = (jobId: string) => {
    console.log(`Apply job clicked for job ID: ${jobId}`);
    // Implement apply job logic here (e.g., open a modal or redirect to an application page)
  };

  const handleShareJob = (jobId: string) => {
    console.log(`Share job clicked for job ID: ${jobId}`);
    // Implement share job logic here (e.g., open a share dialog or copy a link to the clipboard)
  };

  const filteredJobs = jobs.filter((job) => {
    const searchTermMatch =
      searchTerm === "" ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase());
    const locationMatch =
      locationFilter === "" ||
      job.location.toLowerCase().includes(locationFilter.toLowerCase());
    const jobTypeMatch =
      jobTypeFilter === "" ||
      job.jobType.toLowerCase().includes(jobTypeFilter.toLowerCase());
    const experienceLevelMatch =
      experienceLevelFilter === "" ||
      job.experienceLevel
        .toLowerCase()
        .includes(experienceLevelFilter.toLowerCase());

    return (
      searchTermMatch && locationMatch && jobTypeMatch && experienceLevelMatch
    );
  });

  return (
    <CandidateLayout>
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-5">Job Search</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
          <div className="md:col-span-1">
            <Label htmlFor="search">Search</Label>
            <Input
              type="text"
              id="search"
              placeholder="Job title or company"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="location">Location</Label>
            <Input
              type="text"
              id="location"
              placeholder="City or state"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="jobType">Job Type</Label>
            <Input
              type="text"
              id="jobType"
              placeholder="Full-time, Part-time, Contract..."
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value)}
            />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="experienceLevel">Experience Level</Label>
            <Input
              type="text"
              id="experienceLevel"
              placeholder="Entry-level, Mid-level, Senior..."
              value={experienceLevelFilter}
              onChange={(e) => setExperienceLevelFilter(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleSearch} className="mb-5">
          Search
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => (
            <Card key={job.id}>
              <CardContent>
                <h2 className="text-lg font-semibold">{job.title}</h2>
                <p className="text-gray-600">{job.company}</p>
                <p className="text-gray-500">{job.location}</p>
                <p className="text-gray-500">
                  {job.jobType} - {job.experienceLevel}
                </p>
                <p className="mt-2">{job.description}</p>
                <Link href={`/candidate/jobs/${job.id}`}>
                  <Button>View Job</Button>
                </Link>
                <Button onClick={() => handleApplyJob(job.id)} className="mt-4">
                  Apply Job
                </Button>
                <Button onClick={() => handleShareJob(job.id)} className="mt-4">
                  Share Job
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </CandidateLayout>
  );
};

export default JobSearchPage;
