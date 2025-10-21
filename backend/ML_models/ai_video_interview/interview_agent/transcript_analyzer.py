import os
import json
from langchain_groq import ChatGroq
from .prompt_templates import TRANSCRIPT_ANALYSIS_PROMPT
from dotenv import load_dotenv
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("⚠️ Please set the GROQ_API_KEY environment variable in your .env file.")

llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY)

def analyze_transcript(transcript: str, job_title: str, job_description: str) -> dict:
    """
    Uses an LLM to perform a final analysis on the interview transcript.
    Returns a dict. If the response is not valid JSON, returns the raw response.
    """
    prompt = TRANSCRIPT_ANALYSIS_PROMPT.format(job_title=job_title, job_description=job_description)
    full_prompt = f"{prompt}\n\n--- INTERVIEW TRANSCRIPT ---\n{transcript}"

    try:
        response = llm.invoke(full_prompt)
        # Try to parse JSON, even if wrapped in markdown code block
        raw = response.content.strip()
        if raw.startswith("```json"):
            raw = raw.removeprefix("```json").strip()
        if raw.startswith("```"):
            raw = raw.removeprefix("```").strip()
        if raw.endswith("```"):
            raw = raw[:-3].strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            print("Warning: LLM response is not valid JSON. Returning raw text.")
            return {"raw_response": response.content}
    except Exception as e:
        print(f"Error analyzing transcript: {e}")
        return {"error": "Failed to generate or parse analysis."}

if __name__ == "__main__":
    # Example usage
    sample_transcript = """
    Assistant: Can you tell me about your experience with Python?
    User: I have 5 years of experience using Python for web development and data science.
    Assistant: Have you worked on any machine learning projects?
    User: Yes, I developed a recommendation system using collaborative filtering.
    Assistant: What libraries did you use for that project?
    User: I used Pandas for data manipulation and Scikit-learn for building the model.
    Assistant: How do you ensure the scalability of your machine learning models?
    User: I focus on optimizing algorithms, using efficient data structures, and leveraging cloud services for deployment.
    Assistant: Can you describe a challenging problem you faced in your projects and how you solved it?
    User: In one project, we had to process large datasets in real-time. I implemented a distributed processing system using Apache Spark, which significantly improved performance and reduced latency.
    """
    job_title = "Cloud Software Engineer"
    job_description = "Looking for a Cloud software engineer with experience in Python and machine learning, AWS and cloud architecture, Priority on cloud."
    analysis = analyze_transcript(sample_transcript, job_title, job_description)
    print("Transcript Analysis:", analysis)