# GST Analytics Service

Backend analytics microservice for GST classification, anomaly detection, review workflow, forecasting, KPI analytics, and AI-powered chatbot insights.

---

## 🚀 Features

- Dashboard analytics
- KPI computation (financial + compliance)
- Distribution analytics (vendor/category)
- Time-series forecasting (Prophet with ARIMA fallback)
- Human review workflow
- LLM-based anomaly explanations
- Hybrid analytics chatbot
- PostgreSQL integration
- Upload-scoped dataset handling
- Reviewed dataset override logic

---

## 🏗 Architecture

Layered Architecture:

- API Layer (FastAPI)
- Service Layer (Business logic)
- Utility Layer (CSV reader, cache manager)
- Database Layer (SQLAlchemy + PostgreSQL)

---

## ⚙️ Setup

### 1. Clone Repo

```bash
git clone https://github.com/exassaro/analytics_service.git
cd analytics_service
````

### 2. Create Virtual Environment

```bash
conda create -n analytics python=3.11
conda activate analytics
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Create `.env` File

```env
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/gst_db
REVIEW_STORAGE_PATH=storage/reviewed
LOW_CONFIDENCE_THRESHOLD=0.75
LOW_MARGIN_THRESHOLD=0.10
```

### 5. Run Server

```bash
python -m uvicorn app.main:app --reload
```

Swagger available at:

```
http://127.0.0.1:8000/docs
```

---

## 📊 API Modules

* /dashboard
* /distribution
* /time-series
* /kpi
* /forecast
* /review
* /chatbot

---

## 🧠 Forecast Engine

* Prophet (primary)
* ARIMA (fallback)
* Upload-scoped training
* Anomaly exclusion supported

---

## 🔐 Review Workflow

* Eligible rows: anomalies + low confidence
* Reviewed dataset overrides anomaly dataset
* Final dataset used for dashboard + forecast + retraining

---

## 🗃 Database

PostgreSQL required.

Tables:

* uploads
* anomaly_runs
* review_decisions
* llm_explanations
* classification_runs

---

## 🛠 Future Improvements

* Authentication & RBAC
* Alembic migrations
* Intent-classification chatbot
* Monitoring & logging
* CI/CD pipeline

````