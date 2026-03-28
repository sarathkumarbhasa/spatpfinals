@echo off

echo Starting FraudShield Platform...

REM Start Backend
start cmd /k "cd backend && if not exist venv (python -m venv venv) && call venv\Scripts\activate && pip install -r requirements.txt && uvicorn main:app --reload"

REM Wait a bit so backend starts first
timeout /t 3 > nul

REM Start Frontend
start cmd /k "cd frontend && if not exist node_modules (npm install) && npm run dev"

echo ====================================================
echo 🚀 FraudShield Platform Started!
echo 🔗 Frontend Dashboard: http://localhost:5173
echo 🔗 Backend API Base:  http://localhost:8000
echo 🔗 Backend API Docs:  http://localhost:8000/docs
echo ====================================================
echo All services started.
pause