import os
import json
import time
import tempfile
from typing import List, Dict, Any
from pdfminer.high_level import extract_text
from sentence_transformers import SentenceTransformer, util
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from langchain.output_parsers import ResponseSchema, StructuredOutputParser
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("⚠️ Please set the GROQ_API_KEY environment variable.")

print("Loading models...")
embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
llm = ChatGroq(model="llama-3.1-8b-instant", api_key=GROQ_API_KEY)
print("✅ Models loaded successfully!")

jd_embedding_cache: Dict[str, Any] = {}



def extract_text_from_pdf_path(file_path: str) -> str:
    """Extract text from a PDF file path."""
    text = extract_text(file_path)
    return text.strip()



def get_jd_embedding(jd_text: str):
    """Return cached or new embedding for JD."""
    if jd_text in jd_embedding_cache:
        return jd_embedding_cache[jd_text]
    emb = embedder.encode(jd_text, convert_to_tensor=True)
    jd_embedding_cache[jd_text] = emb
    return emb


def compute_resume_embeddings(resume_texts: List[str]):
    """Batch embed all resume texts."""
    return embedder.encode(resume_texts, convert_to_tensor=True)


def get_reasoning_prompt() -> (PromptTemplate, StructuredOutputParser): # type: ignore
    """Creates a structured prompt template for reasoning."""
    response_schemas = [
        ResponseSchema(name="match_score", description="Overall JD match score (0-100)."),
        ResponseSchema(name="key_strengths", description="List of key strengths."),
        ResponseSchema(name="missing_skills", description="List of missing or weak skills."),
        ResponseSchema(name="summary", description="One-line professional summary.")
    ]
    structured_parser = StructuredOutputParser.from_response_schemas(response_schemas)
    format_instructions = structured_parser.get_format_instructions()

    prompt = PromptTemplate(
        template=(
            "You are an AI HR Assistant. Compare the following candidate resume "
            "with the given job description and provide a structured JSON response.\n\n"
            "{format_instructions}\n\n"
            "Job Description:\n{jd_text}\n\n"
            "Candidate Resume:\n{resume_text}"
        ),
        input_variables=["jd_text", "resume_text"],
        partial_variables={"format_instructions": format_instructions}
    )

    return prompt, structured_parser


#Matching logic
def match_resumes_to_jd(
    resume_texts: List[str],
    job_description: str,
    top_n: int = 3
) -> Dict[str, Any]:
    """
    Core logic to match resumes to a JD using cached embeddings and Groq reasoning.
    Returns ranked structured results.
    """

    start = time.time()

    # Get or compute JD embedding
    jd_emb = get_jd_embedding(job_description)

    # Compute resume embeddings in batch
    resume_embs = compute_resume_embeddings(resume_texts)

    #Compute semantic similarity
    similarities = util.cos_sim(resume_embs, jd_emb).cpu().tolist()
    scored_candidates = sorted(
        zip(resume_texts, similarities),
        key=lambda x: x[1],
        reverse=True
    )

    
    reasoning_prompt, structured_parser = get_reasoning_prompt()

    
    top_candidates = []
    for idx, (resume_text, score) in enumerate(scored_candidates[:top_n]):
        prompt = reasoning_prompt.format(
            jd_text=job_description[:1000],
            resume_text=resume_text[:1500]
        )
        response = llm.invoke(prompt)
        parsed = structured_parser.parse(response.content)
        parsed["semantic_score"] = round(float(score), 3)
        parsed["rank"] = idx + 1
        top_candidates.append(parsed)

    latency = round(time.time() - start, 2)
    return {
        "status": "success",
        "latency_seconds": latency,
        "job_description_cached": job_description in jd_embedding_cache,
        "top_candidates": top_candidates
    }


#Wrapper Function for External Use

def process_resume_and_jd(resume_file_paths: List[str], job_description: str, top_n: int = 3):
    """
    High-level function to be called from other scripts.
    Reads resumes from file paths, processes embeddings, and runs Groq reasoning.
    """
    resume_texts = [extract_text_from_pdf_path(path) for path in resume_file_paths]
    result = match_resumes_to_jd(resume_texts, job_description, top_n=top_n)
    return result



#Testing / Demo Execution
if __name__ == "__main__":
    # Example JD for testing
    test_jd = """
    We are hiring an AI/ML Engineer with experience in building deep learning models using PyTorch.
    The candidate should have strong knowledge of data preprocessing, CNNs, transformers, and model optimization.
    Experience with MLOps, cloud deployment, and vector databases is preferred.
    """

    # 🧾 Provide a sample resume file path (change this to your test file)
    resume_file_path = "C:/Users/PRATHAM/OneDrive/Desktop/HRMS--Hackathon/backend/ML_models/Resume_parsing/Resume_1 (11).pdf" 

    print("🔍 Running test for AI/ML Engineer JD...")
    result = process_resume_and_jd([resume_file_path], test_jd)

    print("\n" + "=" * 20 + " FINAL RESULT " + "=" * 20)
    print(json.dumps(result, indent=4))
