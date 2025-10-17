"use client";

import React from "react";
import CandidateLayout from "@/components/layout/CandidateLayout";
import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const CandidateProfilePage = () => {
  const handleSubmit = async (event: React.FormEvent) => {

    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/candidate/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        console.log("Profile created successfully!");
      } else {
        console.error("Failed to create profile:", response.statusText);
      }
    } catch (error) {
      console.error("Error creating profile:", error);
    }
  };

  return (
    <CandidateLayout>
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-5">Candidate Profile</h1>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="first_name">First Name</Label>
            <Input type="text" id="first_name" name="first_name" />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name</Label>
            <Input type="text" id="last_name" name="last_name" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input type="email" id="email" name="email" />
          </div>
          <div>
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input type="tel" id="phone_number" name="phone_number" />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input type="text" id="address" name="address" />
          </div>
          <div>
            <Label htmlFor="resume_url">Resume URL</Label>
            <Input type="url" id="resume_url" name="resume_url" />
          </div>
          <div>
            <Label htmlFor="display_name">Display Name</Label>
            <Input type="text" id="display_name" name="display_name" />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" />
          </div>
          <div>
            <Label htmlFor="profile_picture_url">Profile Picture URL</Label>
            <Input type="url" id="profile_picture_url" name="profile_picture_url" />
          </div>
          <div>
            <Label htmlFor="cover_photo_url">Cover Photo URL</Label>
            <Input type="url" id="cover_photo_url" name="cover_photo_url" />
          </div>
          <div>
            <Label htmlFor="education">Education</Label>
            <Input type="text" id="education" name="education" />
          </div>
          <div>
            <Label htmlFor="work_experience">Work Experience</Label>
            <Input type="text" id="work_experience" name="work_experience" />
          </div>
          <div>
            <Label htmlFor="certifications">Certifications</Label>
            <Input type="text" id="certifications" name="certifications" />
          </div>
          <div>
            <Label htmlFor="languages_known">Languages Known</Label>
            <Input type="text" id="languages_known" name="languages_known" />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input type="text" id="location" name="location" />
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input type="url" id="website" name="website" />
          </div>
          <div>
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input type="url" id="linkedin" name="linkedin" />
          </div>
          <div>
            <Label htmlFor="github">GitHub</Label>
            <Input type="url" id="github" name="github" />
          </div>
          <div>
            <Label htmlFor="email_job_alerts">Email Job Alerts</Label>
            <Checkbox id="email_job_alerts" name="email_job_alerts" defaultChecked />
          </div>
          <div>
            <Label htmlFor="email_application_updates">Email Application Updates</Label>
            <Checkbox id="email_application_updates" name="email_application_updates" defaultChecked />
          </div>
          <div>
            <Label htmlFor="email_offer_updates">Email Offer Updates</Label>
            <Checkbox id="email_offer_updates" name="email_offer_updates" defaultChecked />
          </div>
          <div>
            <Label htmlFor="email_newsletter">Email Newsletter</Label>
            <Checkbox id="email_newsletter" name="email_newsletter" />
          </div>
          <div className="col-span-full">
            <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700">
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </CandidateLayout>
  );
};

export default CandidateProfilePage;
