import os
import json
import time
from typing import List, Dict, Any
import pymupdf  # modern import (formerly fitz)
from sentence_transformers import SentenceTransformer, util
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from langchain.output_parsers import ResponseSchema, StructuredOutputParser
from dotenv import load_dotenv
import pprint


# ======================================================
# 1️⃣ Load Environment & Initialize Models
# ======================================================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("⚠️ Please set the GROQ_API_KEY environment variable in your .env file.")

print("🚀 Loading models...")
embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
llm = ChatGroq(model="llama-3.1-8b-instant", api_key=GROQ_API_KEY)
print("✅ Models loaded successfully!")

# Cache for JD embeddings
jd_embedding_cache: Dict[str, Any] = {}




def extract_text_from_pdf_path(file_path: str) -> str:
    """Extracts readable text from a PDF using PyMuPDF (layout-aware)."""
    text_content = []
    try:
        with pymupdf.open(file_path) as doc:
            for page in doc:
                text = page.get_text("text").strip()
                if text:
                    text_content.append(text)
        if not text_content:
            print(f"⚠️ No text found in {file_path}")
        return "\n".join(text_content).strip()
    except Exception as e:
        print(f"⚠️ Error extracting text from {file_path}: {e}")
        return ""


# ======================================================
# 3️⃣ Embedding Utilities
# ======================================================

def get_jd_embedding(jd_text: str):
    """Return cached or new embedding for the JD."""
    if jd_text in jd_embedding_cache:
        return jd_embedding_cache[jd_text]
    emb = embedder.encode(jd_text, convert_to_tensor=True)
    jd_embedding_cache[jd_text] = emb
    return emb


def compute_resume_embeddings(resume_texts: List[str]):
    """Batch embed all resume texts."""
    return embedder.encode(resume_texts, convert_to_tensor=True)


# ======================================================
# 4️⃣ Structured Prompt for Reasoning
# ======================================================

def get_reasoning_prompt() -> (PromptTemplate, StructuredOutputParser):
    """Creates a strict structured prompt for HR reasoning."""
    response_schemas = [
        ResponseSchema(name="candidate_name", description="Extracted name of the candidate from the resume."),
        ResponseSchema(name="match_score", description="Overall JD match score (0–100)."),
        ResponseSchema(name="key_strengths", description="List of the candidate’s strongest skills that match the JD."),
        ResponseSchema(name="missing_skills", description="List of missing or weak skills compared to JD."),
        ResponseSchema(name="summary", description="A short 1-line professional fit summary.")
    ]

    structured_parser = StructuredOutputParser.from_response_schemas(response_schemas)
    format_instructions = structured_parser.get_format_instructions()

    prompt = PromptTemplate(
        template=(
            "You are a strict AI HR evaluator. Compare the following candidate resume with the given job description "
            "and return ONLY a valid JSON object with the following fields:\n\n"
            "{format_instructions}\n\n"
            "Do NOT include explanations or any text outside the JSON.\n\n"
            "Job Description:\n{jd_text}\n\n"
            "Candidate Resume:\n{resume_text}"
        ),
        input_variables=["jd_text", "resume_text"],
        partial_variables={"format_instructions": format_instructions},
    )
    return prompt, structured_parser


# ======================================================
# 5️⃣ Core Matching Logic
# ======================================================

def match_resumes_to_jd(
    resume_texts: List[str],
    job_description: str,
    top_n: int = 3
) -> Dict[str, Any]:
    """
    Core logic to match resumes to a JD using semantic embeddings and Groq reasoning.
    Returns ranked structured results.
    """
    start = time.time()

    # Get or compute JD embedding
    jd_emb = get_jd_embedding(job_description)

    # Compute resume embeddings
    resume_embs = compute_resume_embeddings(resume_texts)

    # Compute cosine similarity
    similarities = util.cos_sim(resume_embs, jd_emb).cpu().tolist()

    # Sort by similarity score
    scored_candidates = sorted(
        zip(resume_texts, similarities),
        key=lambda x: x[1],
        reverse=True
    )

    # Prepare prompt and parser
    reasoning_prompt, structured_parser = get_reasoning_prompt()

    # Rank top resumes
    top_candidates = []
    for idx, (resume_text, score) in enumerate(scored_candidates[:top_n]):
        prompt = reasoning_prompt.format(
            jd_text=job_description[:1000],
            resume_text=resume_text[:1500]
        )

        response = llm.invoke(prompt)
        raw_text = response.content.strip()

        # 🧹 Clean: if multiple JSON blocks exist, keep only the first one
        if raw_text.count("{") > 1:
            raw_text = "{" + raw_text.split("{", 1)[1]
            raw_text = raw_text.split("}", 1)[0] + "}"

        # 🧠 Parse safely
        try:
            parsed = json.loads(raw_text)
        except json.JSONDecodeError:
            try:
                parsed = structured_parser.parse(raw_text)
            except Exception as e:
                print(f"⚠️ Failed to parse Groq response: {e}")
                parsed = {
                    "candidate_name": "Unknown",
                    "match_score": 0,
                    "key_strengths": [],
                    "missing_skills": [],
                    "summary": "Parsing error or invalid JSON format"
                }

        parsed["rank"] = idx + 1
        top_candidates.append(parsed)

    latency = round(time.time() - start, 2)

    return {
        "status": "success",
        "latency_seconds": latency,
        "job_description_cached": job_description in jd_embedding_cache,
        "top_candidates": top_candidates,
    }


# ======================================================
# 6️⃣ Wrapper Function (External Use)
# ======================================================

def process_resume_and_jd(resume_file_paths: List[str], job_description: str, top_n: int = 3):
    """Reads resumes, processes embeddings, and runs Groq."""
    resume_texts = [extract_text_from_pdf_path(path) for path in resume_file_paths if os.path.exists(path)]
    if not resume_texts:
        raise ValueError("❌ No valid resumes found or text extraction failed.")
    return match_resumes_to_jd(resume_texts, job_description, top_n=top_n)


# ======================================================
# 7️⃣ Demo / Standalone Test
# ======================================================

if __name__ == "__main__":
    test_jd = """
    We are hiring an AI/ML Engineer with experience in building deep learning models using PyTorch.
    The candidate should have strong knowledge of data preprocessing, CNNs, transformers, and model optimization.
    Experience with MLOps, cloud deployment, and vector databases is preferred.
    """

    resume_file_paths = ["C:/Users/PRATHAM/OneDrive/Desktop/HRMS--Hackathon/backend/ML_models/Resume_parsing/Resume_1 (11).pdf",
                         "C:/Users/PRATHAM/OneDrive/Desktop/HRMS--Hackathon/backend/ML_models/Resume_parsing/Mishika Goyal.pdf"]

    print("🔍 Running test for AI/ML Engineer JD...")
    result = process_resume_and_jd(resume_file_paths, test_jd)

    print("\n" + "=" * 20 + " FINAL RESULT " + "=" * 20)
    pprint.pprint(result, width=120)

    # Optional: Save results
    with open("results.json", "w", encoding="utf-8") as f:
        json.dump(result, f, indent=4, ensure_ascii=False)
    print("\n✅ Clean results saved to results.json")
