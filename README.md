# Auditron - Indian SME GST Classification & Anomaly Detection

A production-grade analytics platform built to classify transaction data for Indian Small and Medium Enterprises (SMEs), detect anomalies, and facilitate a human-in-the-loop review queue for data refinement.

## 🏗️ Architecture Stack

This monorepo utilizes a decoupled microservices architecture. It strictly separates analytical boundaries into highly specialized Python services, connected by a unified React frontend.

### Services

* **Frontend (`/frontend`)**
  * **Tech**: React.js, Vite, Recharts, Lucide Icons.
  * **Role**: The main interface for the dashboard. Handles uploading raw transaction CSVs, displaying KPI statistics, rendering time-series trends/forecasts, and managing the human-in-the-loop review queue for flagged anomalies and low-confidence GST categories.

* **Classification Service (`/classification_service`)**
  * **Tech**: FastAPI, Uvicorn, Pandas, Scikit-Learn.
  * **Role**: Parses uploaded transaction records, tokenizes and normalizes item descriptions, and runs transactions through a classification engine to predict generic expense categories and their relative Indian GST Slab brackets (0%, 5%, 12%, 18%, 28%).

* **Anomaly Service (`/anomaly_service`)**
  * **Tech**: FastAPI, Scikit-Learn (Isolation Forest / Outlier Factor).
  * **Role**: Evaluates the pre-classified data streams to flag highly suspicious variances in price or unusual purchasing quantities. Generates severity scores that feed into the Review Queue.

* **Analytics Service (`/analytics_service`)**
  * **Tech**: FastAPI, MLflow, FBProphet / ARIMA.
  * **Role**: Central nervous system for dashboard metrics. Performs rapid dataset aggregations using Thread-Safe Cached memory patterns. Manages the human review engine, persisting SME inputs back onto datasets, bypassing and mitigating hallucinations. Powers dynamic Time Series analysis and forward-looking Forecast projection generation.

* **Local Data Stores (`/storage`, `/mlruns`)**
  * **Role**: Handles raw batch caching, tracked MLflow iterations, and structured artifact persistence. (Excluded from source control via `.gitignore`).

## 🚀 Getting Started

### Prerequisites
* **Python 3.10+** (For backend services backend)
* **Node.js v18+** (For frontend)

### Running the Environment Locally

Each service must run concurrently. You will need multiple terminal windows.

#### 1. Setup Python Services (Run for Analytics, Classification, & Anomaly)
Navigate to each service directory sequentially (`analytics_service`, `classification_service`, `anomaly_service`) and boot them:
```bash
# Example for analytics_service
cd analytics_service
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt

# Boot the FastAPI Server
uvicorn app.main:app --reload --port 8003
```
*(Repeat for the other services, ensuring they bind to their configured ports: 8001, 8002, etc.)*

#### 2. Setup the Frontend
```bash
cd frontend
npm install
npm run dev
```

The platform dashboard will start running at `http://localhost:3000`.

## 🤝 Workflow & Data Feedback Loop
Once online, navigate to the Dashboard -> Upload Data. Processing large batches of SMEs will extract anomalies that propagate to the **Review Queue**. From there, human supervisors can approve or override the algorithms in real-time, effectively updating the ML pipeline for subsequent runs.
