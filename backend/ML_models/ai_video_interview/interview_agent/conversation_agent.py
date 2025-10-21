import os                                         # To get environment variables
from langchain_groq import ChatGroq               # Groq's fast LLM client
from langchain_core.prompts import ChatPromptTemplate

from .prompt_templates import CONVERSATIONAL_PROMPT
from dotenv import load_dotenv
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("⚠️ Please set the GROQ_API_KEY environment variable in your .env file.")
# Initialize the LLM client
llm = ChatGroq(model="llama-3.1-8b-instant", api_key=GROQ_API_KEY)

def generate_next_question(job_description: str, resume_text: str, history: list) -> str:
    """Generates the next interview question based on the full context."""

    # Create the chat prompt object from LangChain
    prompt = ChatPromptTemplate.from_messages([
        ("system", CONVERSATIONAL_PROMPT),
        *[(msg['role'], msg['content']) for msg in history] # Unpack previous messages
    ])
    
    chain = prompt | llm
    
    # Run the chain to get the AI's response
    response = chain.invoke({
        "job_description": job_description,
        "resume": resume_text,
    })
    
    return response.content # Return the text content of the response

if __name__ == "__main__":
    # Example usage
    job_desc = "Looking for a software engineer with experience in Python and machine learning."
    resume = "Experienced software developer skilled in Python, data analysis, and ML. I know frameworks like TensorFlow and PyTorch. I am passionate about building AI solutions."
    conversation_history = [
        {"role": "assistant", "content": "Can you tell me about your experience with Python?"},
        {"role": "user", "content": "I have 5 years of experience using Python for web development and data science."},
        {"role": "assistant", "content": "Have you worked on any machine learning projects?"},
        {"role": "user", "content": "Yes, I developed a recommendation system using collaborative filtering."},
        {"role": "assistant", "content": "What libraries did you use for that project?"},
        {"role": "user", "content": "I used Pandas for data manipulation and Scikit-learn for building the model."}
    ]
    
    next_question = generate_next_question(job_desc, resume, conversation_history)
    print("Next Interview Question:", next_question)