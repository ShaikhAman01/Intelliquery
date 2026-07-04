# IntelliQuery

IntelliQuery is an AI-powered natural language interface for querying databases.
Ask questions in plain English (text or voice) and get back SQL results, charts, and AI-generated insights.

## ✨ Features

* Natural language → SQL powered by OpenAI (GPT-4o mini), with Gemini as automatic fallback and one-shot SQL error repair
* Voice input via OpenAI Whisper for hands-free querying
* Visualizations and AI analysis of query results
* Connect your own database, or try the one-click sample database
* Auth with email verification, password reset, and Google sign-in
* Teams with email invitations and invite links
* Session history with search

## 📁 Structure

```
IntelliQuery/
├── backend/    # FastAPI + OpenAI/Gemini
└── frontend/   # Next.js 16 + Better Auth
```

## ⚙️ Requirements

* Python 3.10+
* Node.js 18+
* PostgreSQL

## 🔐 Setup

### Backend

```bash
cd backend
cp .env.example .env   # then fill in your keys
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Runs on http://127.0.0.1:8000

### Frontend

```bash
cd frontend
cp .env.example .env.local   # then fill in your keys
npm install
npm run dev
```

Runs on http://localhost:3000

## ⚠️ Notes

* Start the backend before the frontend
