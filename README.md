# HRMS - Human Resource Management System

## Description

A full-stack web application designed to streamline human resource management processes. This project features a robust FastAPI backend for API services and a modern Next.js frontend for user interaction, integrated with Supabase for database management.

## Features

- **User Management**: Handle employee data, roles, and permissions
- **API Endpoints**: RESTful APIs for HR operations
- **Database Integration**: Supabase for scalable data storage
- **Modern Frontend**: Responsive UI built with React and TypeScript
- **FastAPI Backend**: High-performance API with automatic documentation

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
- Payroll management
- Performance tracking
- Reporting dashboards
