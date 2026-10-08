@echo off
echo Starting Enterprise Multi-Tenant AI Research Assistant Platform Services...

:: Start the Frontend Service
start "Frontend (React/Vite)" cmd /k "cd frontend && npm run dev"

:: Start the Backend Gateway Service
start "Backend Gateway (.NET 8)" cmd /k "cd backend-api && dotnet run"

:: Start the AI Microservice
start "ML Engine (FastAPI)" cmd /k "cd ai-service && (if exist venv\Scripts\activate call venv\Scripts\activate) && uvicorn main:app --reload"
