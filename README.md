# HRMS - Human Resource Management System

## Description

A full-stack AI-powered web application designed to streamline human resource management processes. This project features a robust FastAPI backend for API services and a modern Next.js frontend for user interaction, integrated with Supabase for database management.

## Features

- **User Management**: Handle employee data, roles, and permissions
- **API Endpoints**: RESTful APIs for HR operations
- **Database Integration**: Supabase for scalable data storage
- **Modern Frontend**: Responsive UI built with React and TypeScript
- **FastAPI Backend**: High-performance API with automatic documentation
- **Ai Features**: Virtual Interview AI Agent, Bulk Resume parsing, Employee Attrition Prediction.

## Tech Stack

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **Supabase**: Open-source Firebase alternative for database and authentication
- **Pydantic**: Data validation and settings management
- **Uvicorn**: ASGI server for running FastAPI

### Frontend
- **Next.js**: React framework for production
- **React 19**: Latest React with concurrent features
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
Here's a brief description of the AI features and tools used:

### AI Features

* **Predictive Attrition Analysis:** Uses machine learning (**XGBoost**, **Scikit-learn**) trained on employee data (including simulated sentiment scores) to predict the likelihood of an employee leaving the company, allowing proactive retention efforts.
* **Resume Parsing & Shortlisting:** Employs a Large Language Model (**Groq - Llama 3.1**, **LangChain**) to extract structured data (skills, experience, education) from resumes (**PyMuPDF**). It then uses semantic similarity (**SentenceTransformers**) to rank candidates against a job description and the LLM again for a concise summary of the top matches.
* **AI Video Interviewer:** A conversational agent powered by an LLM (**Groq - Llama 3.1**, **LangChain**) that conducts initial interviews. It uses the browser's **Web Speech API** for real-time Speech-to-Text and Text-to-Speech during the live interaction.
* **AI Interview Content Analysis:** After the interview, an LLM (**Groq - Llama 3.1**, **LangChain**) analyzes the full, high-accuracy transcript (**faster-whisper**) to evaluate the candidate's technical depth, problem-solving skills, and alignment with the job role, providing a structured summary and score.
* **AI Interview Speech Analysis:** Analyzes the interview audio recording using **Silero VAD** and **Librosa** to extract objective communication style metrics like speech rate (WPM), silence percentage, and filler word count.

## Prerequisites

- Python 3.8 or higher
- Node.js 18 or higher
- Supabase account (for database setup)

## Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   - Copy `.env.example` to `.env` (if available) or create `.env`
   - Add your Supabase credentials:
     ```
     DATABASE_URL=your_supabase_database_url
     SECRET_KEY=your_secret_key
     LANGCHAIN_GROQ=your_key
     HUGGING_FACE_TOKEN = YOUR_HUGGING_FACE_TOKEN
     ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage
## Running celery for Async Tasks:
celery -A ML_models.ai_video_interview.utils.queue_utils.celery_app worker --loglevel=info -P solo
### Running the Backend

1. From the backend directory, start the server:
   ```bash
   uvicorn app.main:app --reload
   ```

2. The API will be available at: http://localhost:8000

3. Access interactive API documentation at: http://localhost:8000/docs

### Running the Frontend

1. From the frontend directory, start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to: http://localhost:3000

## API Documentation

The backend provides comprehensive API documentation through FastAPI's built-in Swagger UI. Key endpoints include:

- `GET /` - Welcome message
- `GET /test-supabase` - Test Supabase connection

Additional endpoints for user management and HR operations are planned for future development.

## Project Structure

```
hrms/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── config.py        # Application settings
│   │   ├── supabase_client.py # Supabase client setup
│   │   ├── models/          # Database models
│   │   └── schemas/         # Pydantic schemas
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables
├── frontend/
│   ├── app/                 # Next.js app directory
│   ├── package.json         # Node dependencies
│   └── next.config.ts       # Next.js configuration
└── README.md                # This file
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Future Enhancements

- Complete user management system
- Employee onboarding workflows
- HR/Admin chatbots querying

