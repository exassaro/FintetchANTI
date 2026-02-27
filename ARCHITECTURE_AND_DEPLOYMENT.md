# 🚀 Retraining Service & Cloud Deployment Architecture Document

## 1️⃣ Retraining Service Implementation Plan

The `retraining_service` will be built as an independent, lightweight FastAPI microservice. Its sole responsibility is securely and reliably retraining classification and anomaly models based on human-reviewed data, preventing automatic interference with the production inference services.

### Core Principles
- **Protected Execution**: Exclusively triggered manually (Admin), scheduled (Cron), or by observed model drift, never automatically per upload.
- **Data Aggregation**: Merges (1) Original Data, (2) Human-Corrected Data (where labels explicitly override predictions), and (3) Approved Historical Processed Data.
- **Model Evaluation & Promotion**: Triggers promotion only when `new_model_score` > `production_model_score` on holdout datasets.
- **Governed MLOps**: Interacts with the central MLflow registry using strict rules (same experiment per schema, no overwriting of artifacts or deletion of old models, proper versioning).

### API Architecture
- `POST /retrain/manual`: Protected endpoint (Admin JWT required) to forcefully trigger a pipeline.
- `POST /retrain/drift`: Private internal endpoint triggered when other services detect concept drift.
- `GET /retrain/status`: Returns current retraining job statuses (to be run as background processes, or via Celery/RQ).

### MLflow & Data Flow
1. **Extract**: Fetch original training dataset CSV, along with human-review inputs from PostgreSQL.
2. **Override**: Using Pandas, apply an overriding logic: `merged_df.update(reviewed_df)` where human labels exist.
3. **Experimentation**: Launch a new MLflow run under the existing schema-specific experiment (`mlflow.set_experiment(schema_name)`).
4. **Evaluation**: Compare new cross-validation KPIs against the current `models:/<model_name>/Production`.
5. **Promote**: If the new model performs better, use the MLflow Client to transition it to "Production" state, which automatically transitions the older active model to "Archived", maintaining auditability.

---

## 2️⃣ Dockerization & Kubernetes (GCP) Approach

To move from a local script/CSV setup to a highly available production environment on GCP (Google Cloud Platform), Docker and Kubernetes (GKE) will provide the necessary scaling and orchestration.

### A. Containerization (Docker)
Each microservice will contain its own `Dockerfile`:
1. `frontend/Dockerfile` (Multi-stage build using Nginx to serve static React/Vite assets).
2. `analytics_service/Dockerfile`
3. `anomaly_service/Dockerfile`
4. `auth_service/Dockerfile`
5. `classification_service/Dockerfile`
6. `retraining_service/Dockerfile` (New)

*Optimization*: Use lightweight base images (`python:3.10-slim`, `node:18-alpine`). Avoid pulling heavy ML dependencies in non-ML services.

### B. Storage & Database Migration
Currently, your architecture relies on local CSV files (`/storage`) and local PostgreSQL. In production:
- **Database (PostgreSQL)**: Migrate to **Google Cloud SQL for PostgreSQL**. It offers automated backups, high availability, and secure connection proxying via GCP SQL Auth Proxy.
- **Files (CSVs)**: Migrate from local `/storage` to **Google Cloud Storage (GCS) buckets**. The Python services must be adapted (e.g., using the `google-cloud-storage` or `gcsfs` libraries in Pandas) to stream data from buckets instead of disk.
- **MLflow Tracking**: Set up a centralized persistent MLflow Tracking server. It will use Cloud SQL for its backend store (metadata) and a GCS bucket for its artifact store (serialized models).

### C. Kubernetes Orchestration (GKE)
Deploying to Google Kubernetes Engine (GKE):
- **Deployments**: Each microservice will have a Kubernetes `Deployment.yaml` governing replicas, memory/CPU bounds, and environment variables (DB URLs, GCS keys).
- **Services**: `Service.yaml` manifests for internal routing between the microservices.
- **Ingress Layer**: NGINX Ingress Controller or GCP LB to route external traffic based on paths (e.g., `/api/classifications` routes to the classification pod cluster).
- **Secrets**: Store database passwords and secret keys using Kubernetes native Secrets or Google Secret Manager.

---

## 3️⃣ CI/CD and MLOps with GitHub Actions

### CI/CD Pipeline Flow (Software Delivery)
1. **Push & PR**: Developer pushes code to GitHub.
2. **Lint & Test**: A GitHub Action workflow `.github/workflows/ci.yml` spins up, running `pytest` on the Python services and `vitest` / `eslint` on the frontend.
3. **Build & Push**: On merging to `main`, docker images are built and pushed to **Google Artifact Registry**.
4. **Deploy**: Update Kubernetes manifests with the new image tags and dynamically apply them to your GKE cluster.

### MLOps Pipeline Flow (Machine Learning Delivery)
1. **Drift Detection**: Analytics runs automated jobs tracking the confidence deviations of daily inferences.
2. **Automated Alerts**: If drift thresholds are exceeded, an alert is sent or the Retraining Service is triggered.
3. **Zero-Downtime Model Rollout**: Inference services (Classification/Anomaly) use `mlflow.pyfunc.load_model("models:/<model_name>/Production")`. When a new model is promoted by the Retraining Service, the system can trigger a rolling restart of the inference pods, ensuring they download and cache the latest "Production" model from the GCS bucket seamlessly without dropping incoming requests.

---

## 💡 Recommended Step-by-Step Action Plan

1. **Implement the Retraining Service Locally**:
    - Create the directory, scaffolding, and FastAPI endpoints.
    - Write the specific Pandas aggregation logic.
    - Connect and test the MLflow logic (`transition_model_version_stage()`).
2. **Dockerize**:
    - Write the 6 Dockerfiles.
    - Create a `docker-compose.yml` that binds everything together locally (including simulated databases and MinIO for S3/GCS simulation if necessary) to test the web tightly.
3. **Application Refactoring**:
    - Refactor any `pandas.read_csv("storage/...")` syntax to safely use abstract storage handlers that can detect whether they are local or in production GCS mode.
4. **Provision GCP Infrastructure**:
    - Cloud SQL (PostgreSQL).
    - GCS Buckets (`fintechanti-data`, `fintechanti-mlflow`).
    - GKE Cluster creation.
5. **Kubernetes Architecture**:
    - Write your `.yaml` manifests mapping to GCP resources and Secrets.
6. **Construct GitHub Actions CI/CD**:
    - Set up `.github/workflows/main.yml` using `google-github-actions/auth`.
