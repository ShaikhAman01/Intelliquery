# IntelliQuery

IntelliQuery is an AI-powered natural language interface for querying databases.
Users can interact using plain English (text or voice), and the system returns data with visualizations and AI-generated insights.

---

## 📁 Structure

IntelliQuery/
│── backend/ (FastAPI)
│── frontend/ (Next.js)

---

## ⚙️ Requirements

* Python 3.10+
* Node.js 18+

---

## 🔐 Setup

### Backend

cd backend
copy .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload

Runs on: http://127.0.0.1:8000

---

### Frontend

cd frontend
copy .env.example .env
npm install
npm run dev

Runs on: http://localhost:3000

---

## ⚠️ Notes

* Start backend before frontend
* Do not include real API keys
* Use `.env.example` as template

