import AiInterviewClient from "@/components/AiInterviewClient"; // Adjust path if needed

function getInterviewProps() {
  const jobTitle = "Senior Python Developer";
  const jobDescription = "We are looking for a Senior Python Developer with 5+ years of experience in FastAPI, PostgreSQL, and cloud services like AWS. Strong communication skills are essential.";
  const resumeText = "I am Pratham, a developer with 6 years of Python experience, specializing in FastAPI and data-driven applications. I have worked extensively with PostgreSQL and deployed applications on AWS. I am eager to take on challenging projects.";
  return { jobTitle, jobDescription, resumeText };
}

export default function InterviewPage() {
  const { jobTitle, jobDescription, resumeText } = getInterviewProps();
  return (
    <div style={{ padding: '20px' }}>
      <AiInterviewClient
        jobTitle={jobTitle}
        jobDescription={jobDescription}
        resumeText={resumeText}
      />
    </div>
  );
}